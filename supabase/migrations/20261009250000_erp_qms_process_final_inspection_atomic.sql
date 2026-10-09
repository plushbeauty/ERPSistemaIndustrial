-- Atomic process/final inspection: inspection record, stock hold and RPNC are one transaction.
create or replace function public.erp_qms_registrar_inspecao_processo(
  p_produto_id uuid,
  p_lote_id uuid,
  p_ordem_producao_id uuid,
  p_maquina_id uuid,
  p_tipo text,
  p_resultado text,
  p_quantidade_inspecionada numeric,
  p_quantidade_aprovada numeric,
  p_quantidade_reprovada numeric,
  p_observacao text,
  p_inspetor_nome text,
  p_medicoes jsonb,
  p_acao_bloqueio text,
  p_setor_id uuid default null,
  p_severidade text default null,
  p_descricao_rpnc text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_tipo_plano text;
  v_inspecao public.erp_inspecoes%rowtype;
  v_lote public.erp_estoque_lotes%rowtype;
  v_rpnc public.erp_rpnc;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória para registrar inspeção.';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if not coalesce(public.erp_has_permission('qualidade', 'criar'), false) then
    raise exception 'Permissão Qualidade/Criar necessária para registrar laudo.';
  end if;

  if p_tipo is null or p_tipo not in ('PROCESSO_METROLOGIA', 'FINAL') then
    raise exception 'Tipo de inspeção inválido.';
  end if;
  v_tipo_plano := case when p_tipo = 'FINAL' then 'FINAL' else 'PROCESSO' end;

  if p_resultado is null or p_resultado not in ('APROVADO', 'REPROVADO', 'CONDICIONAL') then
    raise exception 'Resultado de inspeção inválido.';
  end if;
  if p_quantidade_inspecionada is null or p_quantidade_inspecionada <= 0
     or p_quantidade_aprovada is null or p_quantidade_aprovada < 0
     or p_quantidade_reprovada is null or p_quantidade_reprovada < 0
     or p_quantidade_aprovada + p_quantidade_reprovada <> p_quantidade_inspecionada then
    raise exception 'Quantidades inspecionada, aprovada e reprovada são inconsistentes.';
  end if;
  if jsonb_typeof(p_medicoes) is distinct from 'array' then
    raise exception 'O laudo deve conter medições em formato de lista.';
  end if;
  if jsonb_array_length(p_medicoes) = 0 then
    raise exception 'O laudo deve conter ao menos uma medição ou verificação vinculada ao plano mestre.';
  end if;
  if not exists (
    select 1 from public.erp_produtos p
    where p.id = p_produto_id and p.empresa_id = v_empresa and p.ativo = true
  ) then
    raise exception 'Produto ativo não encontrado na empresa atual.';
  end if;
  if p_ordem_producao_id is not null and not exists (
    select 1 from public.erp_ordens_producao op
    where op.id = p_ordem_producao_id and op.empresa_id = v_empresa and op.produto_id = p_produto_id
  ) then
    raise exception 'OP não pertence ao produto e à empresa atuais.';
  end if;
  if p_maquina_id is not null and not exists (
    select 1 from public.erp_maquinas m
    where m.id = p_maquina_id and m.empresa_id = v_empresa and upper(coalesce(m.status, '')) <> 'INATIVA'
  ) then
    raise exception 'Máquina/posto inválido ou inativo para a empresa atual.';
  end if;

  if p_lote_id is not null then
    select * into v_lote
    from public.erp_estoque_lotes
    where id = p_lote_id and empresa_id = v_empresa
    for update;
    if not found or v_lote.produto_id <> p_produto_id then
      raise exception 'Lote não pertence ao produto e à empresa atuais.';
    end if;
  elsif p_tipo = 'FINAL' or p_resultado <> 'APROVADO' then
    raise exception 'Inspeção final ou resultado não aprovado exige lote rastreável.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_medicoes) m
    left join public.erp_planos_inspecao s
      on s.id = nullif(m->>'plano_inspecao_id', '')::uuid
      and s.empresa_id = v_empresa
      and s.produto_id = p_produto_id
    where s.id is null
       or upper(s.tipo_inspecao) <> v_tipo_plano
       or upper(coalesce(s.status, '')) <> 'ATIVO'
       or s.aprovador_id is null
       or s.aprovado_em is null
       or (s.vigencia_inicio is not null and s.vigencia_inicio > current_date)
       or (s.vigencia_fim is not null and s.vigencia_fim < current_date)
       or s.metodo_inspecao is distinct from (m->>'metodo_inspecao')
  ) then
    raise exception 'Laudo contém critério sem plano aprovado/vigente para o produto e etapa selecionados.';
  end if;

  if exists (
    select m->>'plano_inspecao_id'
    from jsonb_array_elements(p_medicoes) m
    group by m->>'plano_inspecao_id'
    having count(*) > 1
  ) then
    raise exception 'O laudo contém característica duplicada.';
  end if;

  if exists (
    select 1
    from public.erp_planos_inspecao s
    where s.empresa_id = v_empresa
      and s.produto_id = p_produto_id
      and upper(s.tipo_inspecao) = v_tipo_plano
      and upper(coalesce(s.status, '')) = 'ATIVO'
      and s.aprovador_id is not null
      and s.aprovado_em is not null
      and (s.vigencia_inicio is null or s.vigencia_inicio <= current_date)
      and (s.vigencia_fim is null or s.vigencia_fim >= current_date)
      and not exists (
        select 1
        from jsonb_array_elements(p_medicoes) m
        where nullif(m->>'plano_inspecao_id', '')::uuid = s.id
      )
  ) then
    raise exception 'Laudo incompleto: inclua todas as características ativas do plano de inspeção.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_medicoes) m
    join public.erp_planos_inspecao s
      on s.id = nullif(m->>'plano_inspecao_id', '')::uuid
      and s.empresa_id = v_empresa
      and s.produto_id = p_produto_id
    where s.metodo_inspecao in ('DIMENSIONAL', 'FUNCIONAL')
      and (
        s.nominal is null
        or s.limite_inferior is null
        or s.limite_superior is null
        or not exists (
          select 1 from public.erp_equipamentos_medicao i
          where i.id = coalesce(nullif(m->>'instrumento_id', '')::uuid, s.instrumento_id)
            and i.empresa_id = v_empresa
            and upper(i.status) = 'APROVADO'
            and i.proxima_calibracao >= current_date
        )
      )
  ) then
    raise exception 'Critério dimensional/funcional exige limites técnicos e instrumento aprovado com calibração vigente.';
  end if;

  if p_resultado = 'APROVADO' then
    if p_quantidade_reprovada > 0 or p_acao_bloqueio is not null then
      raise exception 'Inspeção aprovada não pode ter quantidade reprovada nem ação de bloqueio.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_medicoes) m
      join public.erp_planos_inspecao s
        on s.id = nullif(m->>'plano_inspecao_id', '')::uuid
        and s.empresa_id = v_empresa
        and s.produto_id = p_produto_id
      where coalesce(s.metodo_inspecao, '') not in ('VISUAL', 'DOCUMENTAL')
        and nullif(replace(btrim(coalesce(m->>'encontrado', '')), ',', '.'), '') is null
    ) then
      raise exception 'Características quantitativas exigem valor medido numérico.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_medicoes) m
      join public.erp_planos_inspecao s
        on s.id = nullif(m->>'plano_inspecao_id', '')::uuid
        and s.empresa_id = v_empresa
        and s.produto_id = p_produto_id
      where case
        when s.metodo_inspecao in ('VISUAL', 'DOCUMENTAL') then
          upper(btrim(coalesce(m->>'encontrado', ''))) not in ('OK', 'CONFORME', 'APROVADO', 'SIM')
        else
          nullif(replace(btrim(coalesce(m->>'encontrado', '')), ',', '.'), '') is null
          or (s.limite_inferior is not null and replace(btrim(m->>'encontrado'), ',', '.')::numeric < s.limite_inferior)
          or (s.limite_superior is not null and replace(btrim(m->>'encontrado'), ',', '.')::numeric > s.limite_superior)
      end
    ) then
      raise exception 'Uma ou mais características não atendem aos critérios aprovados; o laudo não pode ser aprovado.';
    end if;
  else
    if p_quantidade_reprovada <= 0 or p_acao_bloqueio is null
       or p_acao_bloqueio not in ('BLOQUEAR_LOTE', 'RETER_RETRABALHO', 'SEGREGAR') then
      raise exception 'Resultado não aprovado exige quantidade reprovada e ação de bloqueio válida.';
    end if;
    if p_setor_id is null or not exists (
      select 1 from public.erp_setores s
      where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
    ) then
      raise exception 'Selecione setor ativo responsável pela RPNC.';
    end if;
    if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then
      raise exception 'Selecione gravidade válida para a RPNC.';
    end if;
    if nullif(btrim(p_descricao_rpnc), '') is null or length(btrim(p_descricao_rpnc)) < 5 then
      raise exception 'Descreva a não conformidade com pelo menos 5 caracteres.';
    end if;
  end if;

  insert into public.erp_inspecoes (
    empresa_id, produto_id, lote_id, ordem_producao_id, maquina_id, tipo, resultado,
    quantidade_inspecionada, quantidade_aprovada, quantidade_reprovada,
    observacao, inspetor_nome, medicoes, acao_bloqueio, criado_por
  ) values (
    v_empresa, p_produto_id, p_lote_id, p_ordem_producao_id, p_maquina_id, p_tipo, p_resultado,
    p_quantidade_inspecionada, p_quantidade_aprovada, p_quantidade_reprovada,
    nullif(btrim(p_observacao), ''), nullif(btrim(p_inspetor_nome), ''), p_medicoes,
    case when p_resultado = 'APROVADO' then 'NENHUMA' else p_acao_bloqueio end, auth.uid()
  ) returning * into v_inspecao;

  if p_resultado <> 'APROVADO' then
    perform public.erp_reter_lote(
      p_lote_id,
      'Inspeção ' || v_tipo_plano || ' ' || p_resultado || ': ' || btrim(p_descricao_rpnc)
    );
    update public.erp_estoque_lotes_rastreabilidade
    set status_qualidade = 'REPROVADO', quantidade_disponivel = 0
    where empresa_id = v_empresa
      and produto_id = p_produto_id
      and lote_fornecedor = v_lote.lote_fornecedor;
    select public.erp_sgq_abrir_rpnc(
      btrim(p_descricao_rpnc),
      case when p_tipo = 'FINAL' then 'Inspeção final' else 'Inspeção em processo' end,
      p_severidade,
      p_setor_id,
      'lote',
      p_lote_id
    ) into v_rpnc;

    return jsonb_build_object(
      'inspecao_id', v_inspecao.id,
      'rpnc_id', v_rpnc.id,
      'numero_rpnc', v_rpnc.numero_rpnc
    );
  end if;

  return jsonb_build_object('inspecao_id', v_inspecao.id, 'rpnc_id', null, 'numero_rpnc', null);
end;
$$;

revoke all on function public.erp_qms_registrar_inspecao_processo(uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, text, jsonb, text, uuid, text, text) from public, anon;
grant execute on function public.erp_qms_registrar_inspecao_processo(uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, text, jsonb, text, uuid, text, text) to authenticated;

  ) then
    raise exception 'Medições dimensionais/funcionais devem conter valores numéricos válidos.';
  end if;

  if p_resultado = 'APROVADO' then
    if p_quantidade_reprovada <> 0 or p_acao_bloqueio is distinct from 'NENHUMA' then
      raise exception 'Inspeção aprovada não pode ter quantidade reprovada nem ação de bloqueio.';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_medicoes) m
      join public.erp_planos_inspecao s
        on s.id = nullif(m->>'plano_inspecao_id', '')::uuid
        and s.empresa_id = v_empresa
        and s.produto_id = p_produto_id
      where
        case
          when s.metodo_inspecao in ('VISUAL', 'DOCUMENTAL') then
            upper(btrim(coalesce(m->>'encontrado', ''))) not in ('OK', 'CONFORME', 'APROVADO', 'SIM')
          else
            nullif(replace(btrim(coalesce(m->>'encontrado', '')), ',', '.'), '') is null
            or (s.limite_inferior is not null and replace(btrim(m->>'encontrado'), ',', '.')::numeric < s.limite_inferior)
            or (s.limite_superior is not null and replace(btrim(m->>'encontrado'), ',', '.')::numeric > s.limite_superior)
        end
    ) then
      raise exception 'Uma ou mais características não atendem aos critérios aprovados; o laudo não pode ser aprovado.';
    end if;
  else
    if p_quantidade_reprovada <= 0 or p_acao_bloqueio is null or p_acao_bloqueio not in ('BLOQUEAR_LOTE', 'RETER_RETRABALHO', 'SEGREGAR') then
      raise exception 'Resultado não aprovado exige quantidade reprovada e ação de bloqueio válida.';
    end if;
    if p_setor_id is null or not exists (
      select 1 from public.erp_setores s
      where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
    ) then
      raise exception 'Selecione setor ativo responsável pela RPNC.';
    end if;
    if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then
      raise exception 'Selecione gravidade válida para a RPNC.';
    end if;
    if nullif(btrim(p_descricao_rpnc), '') is null or length(btrim(p_descricao_rpnc)) < 5 then
      raise exception 'Descreva a não conformidade com pelo menos 5 caracteres.';
    end if;
  end if;

  insert into public.erp_inspecoes (
    empresa_id, produto_id, lote_id, ordem_producao_id, maquina_id, tipo, resultado,
    quantidade_inspecionada, quantidade_aprovada, quantidade_reprovada,
    observacao, inspetor_nome, medicoes, acao_bloqueio, criado_por
  ) values (
    v_empresa, p_produto_id, p_lote_id, p_ordem_producao_id, p_maquina_id, p_tipo, p_resultado,
    p_quantidade_inspecionada, p_quantidade_aprovada, p_quantidade_reprovada,
    nullif(btrim(p_observacao), ''), nullif(btrim(p_inspetor_nome), ''), p_medicoes,
    case when p_resultado = 'APROVADO' then 'NENHUMA' else p_acao_bloqueio end, auth.uid()
  ) returning * into v_inspecao;

  if p_resultado <> 'APROVADO' then
    if upper(coalesce(v_lote.status_inspecao, '')) <> 'RETIDO' then
      perform public.erp_reter_lote(
        p_lote_id,
        'Inspeção ' || v_tipo_plano || ' ' || p_resultado || ': ' || btrim(p_descricao_rpnc)
      );
    end if;
    select public.erp_sgq_abrir_rpnc(
      btrim(p_descricao_rpnc),
      case when p_tipo = 'FINAL' then 'Inspeção final' else 'Inspeção em processo' end,
      p_severidade,
      p_setor_id,
      'lote',
      p_lote_id
    ) into v_rpnc;

    return jsonb_build_object(
      'inspecao_id', v_inspecao.id,
      'rpnc_id', v_rpnc.id,
      'numero_rpnc', v_rpnc.numero_rpnc
    );
  end if;

  return jsonb_build_object('inspecao_id', v_inspecao.id, 'rpnc_id', null, 'numero_rpnc', null);
end;
$$;

revoke all on function public.erp_qms_registrar_inspecao_processo(uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, text, jsonb, text, uuid, text, text) from public, anon;
grant execute on function public.erp_qms_registrar_inspecao_processo(uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, text, jsonb, text, uuid, text, text) to authenticated;
