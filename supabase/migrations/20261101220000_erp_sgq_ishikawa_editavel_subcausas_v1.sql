/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-SGQ-ISHIKAWA-EDITAVEL-20261101-02 — Ishikawa com subcausas aceito no servidor e cadeia de porquês de 5 a 12 níveis
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DESTE ARQUIVO SQL PELO PROPRIETÁRIO (só a anon key existe no frontend)
 */

-- ---------------------------------------------------------------------------
-- Fatos verificados antes de escrever este arquivo
--   * erp_rpnc.ishikawa_data é jsonb NOT NULL com default '{"Metodo":[],...}'
--     (20261029213000 / 20261029233000).
--   * AS DUAS funções que grava o diagrama — erp_sgq_salvar_analise_rpnc
--     (20261029233000:99-105) e erp_sgq_salvar_formulario_rpnc
--     (20261031100000:294-303) — recusam qualquer item de grupo que não seja
--     string. Enquanto isso, sub-causa aninhada é impossível de gravar, e a
--     tela teria que fingir o dado.
--   * As mesmas duas funções travavam a cadeia em exatamente cinco porquês.
--     A ordem de serviço pede "5 Porquês" com cinco OU MAIS níveis, então o
--     piso de cinco continua obrigatório e o teto passa a ser doze.
--   * Este arquivo redefine as duas funções com o MESMO corpo de segurança
--     (empresa da sessão, auth.uid(), erp_has_permission, FOR UPDATE, RLS) e
--     troca apenas: a validação do Ishikawa pela chamada do normalizador e a
--     contagem da cadeia de porquês.
--   * Nada aqui toca em prazo de eficácia, status ou storage: o contrato
--     aprovado dessas partes permanece igual.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1 · Normalizador único do Ishikawa
--    Aceita o formato legado (string solta) e o novo ({texto, subcausas[]}),
--    devolve sempre o formato canônico. É a única fonte de verdade do shape:
--    leitura antiga continua válida e o cliente não decide a estrutura.
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_normalizar_ishikawa(p_ishikawa jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_grupos constant text[] := array['Metodo','Maquina','Medida','MeioAmbiente','MaoDeObra','Material'];
  v_limite_texto constant integer := 240;
  v_max_causas constant integer := 12;
  v_max_subcausas constant integer := 8;
  v_key text;
  v_itens jsonb;
  v_item jsonb;
  v_causas jsonb;
  v_saida jsonb := '{}'::jsonb;
  v_texto text;
  v_sub jsonb;
  v_sub_item jsonb;
  v_sub_saida jsonb;
  v_contador integer;
begin
  if jsonb_typeof(p_ishikawa) is distinct from 'object' then
    raise exception 'Ishikawa deve ser um objeto JSON.';
  end if;

  foreach v_key in array v_grupos loop
    v_itens := coalesce(p_ishikawa -> v_key, '[]'::jsonb);
    if jsonb_typeof(v_itens) is distinct from 'array' then
      raise exception 'Grupo Ishikawa inválido: %.', v_key;
    end if;
    if jsonb_array_length(v_itens) > v_max_causas then
      raise exception 'O grupo % aceita no máximo % causas.', v_key, v_max_causas;
    end if;

    v_causas := '[]'::jsonb;
    v_contador := 0;
    for v_item in select value from jsonb_array_elements(v_itens) loop
      if jsonb_typeof(v_item) = 'string' then
        v_texto := btrim(v_item #>> '{}');
        v_sub := '[]'::jsonb;
      elsif jsonb_typeof(v_item) = 'object' then
        v_texto := btrim(coalesce(v_item ->> 'texto', ''));
        v_sub := coalesce(v_item -> 'subcausas', '[]'::jsonb);
        if jsonb_typeof(v_sub) is distinct from 'array' then
          raise exception 'As subcausas do grupo % devem ser uma lista.', v_key;
        end if;
        if jsonb_array_length(v_sub) > v_max_subcausas then
          raise exception 'Cada causa do grupo % aceita no máximo % subcausas.', v_key, v_max_subcausas;
        end if;
      else
        raise exception 'As causas do grupo % devem ser textos ou objetos com texto e subcausas.', v_key;
      end if;

      continue when v_texto = '';
      v_contador := v_contador + 1;
      if char_length(v_texto) > v_limite_texto then
        raise exception 'Causa do grupo % excede % caracteres.', v_key, v_limite_texto;
      end if;

      v_sub_saida := '[]'::jsonb;
      for v_sub_item in select value from jsonb_array_elements(v_sub) loop
        if jsonb_typeof(v_sub_item) is distinct from 'string' then
          raise exception 'Cada subcausa do grupo % deve ser um texto.', v_key;
        end if;
        continue when btrim(v_sub_item #>> '{}') = '';
        if char_length(btrim(v_sub_item #>> '{}')) > v_limite_texto then
          raise exception 'Subcausa do grupo % excede % caracteres.', v_key, v_limite_texto;
        end if;
        v_sub_saida := v_sub_saida || jsonb_build_array(btrim(v_sub_item #>> '{}'));
      end loop;

      v_causas := v_causas || jsonb_build_array(jsonb_build_object('texto', v_texto, 'subcausas', v_sub_saida));
    end loop;

    v_saida := jsonb_set(v_saida, array[v_key], v_causas, true);
  end loop;

  return v_saida;
end
$$;

revoke all on function public.erp_sgq_normalizar_ishikawa(jsonb) from public;
revoke all on function public.erp_sgq_normalizar_ishikawa(jsonb) from anon;
grant execute on function public.erp_sgq_normalizar_ishikawa(jsonb) to authenticated;

comment on function public.erp_sgq_normalizar_ishikawa(jsonb) is
  'Valida e canoniza o Ishikawa 6M gravado em erp_rpnc.ishikawa_data. Aceita string legada e objeto {texto, subcausas[]}.';

-- ---------------------------------------------------------------------------
-- 2 · erp_sgq_salvar_formulario_rpnc com Ishikawa de dois níveis
--    Corpo idêntico ao de 20261031100000:263-351; muda apenas a validação do
--    p_ishikawa (agora delegada ao normalizador) e o valor gravado.
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_salvar_formulario_rpnc(
  p_rpnc_id uuid,
  p_tratamento jsonb,
  p_ishikawa jsonb,
  p_cinco_porques jsonb,
  p_auditoria_id uuid default null,
  p_codigo_produto text default null,
  p_lote text default null,
  p_data_ocorrencia date default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_produto uuid;
  v_row public.erp_rpnc;
  v_ishikawa jsonb;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'editar') then
    raise exception 'Sem permissão para atualizar o formulário da RPNC.';
  end if;
  if jsonb_typeof(p_tratamento) is distinct from 'object' then
    raise exception 'Os campos do formulário de tratamento devem ser um objeto JSON.';
  end if;

  v_ishikawa := public.erp_sgq_normalizar_ishikawa(p_ishikawa);

  if jsonb_typeof(p_cinco_porques) is distinct from 'array'
     or jsonb_array_length(p_cinco_porques) < 5
     or jsonb_array_length(p_cinco_porques) > 12 then
    raise exception 'A cadeia principal deve conter de 5 a 12 porquês (mínimo de cinco níveis).';
  end if;
  if exists (select 1 from jsonb_array_elements(p_cinco_porques) as item(value) where jsonb_typeof(item.value) <> 'string') then
    raise exception 'Cada porquê deve ser um texto.';
  end if;

  if nullif(btrim(coalesce(p_codigo_produto, '')), '') is not null then
    select pr.id into v_produto from public.erp_produtos pr
      where pr.empresa_id = v_empresa
        and lower(btrim(pr.codigo)) = lower(btrim(p_codigo_produto))
        and coalesce(pr.ativo, true) = true
      limit 1;
    if v_produto is null then
      raise exception 'Código de peça/produto não cadastrado na empresa: %', btrim(p_codigo_produto);
    end if;
  end if;

  if p_auditoria_id is not null and not exists (
    select 1 from public.erp_sgq_auditorias a
    where a.id = p_auditoria_id and a.empresa_id = v_empresa
  ) then raise exception 'Auditoria inválida para a empresa.'; end if;

  select * into v_row from public.erp_rpnc
    where id = p_rpnc_id and empresa_id = v_empresa and sgq_origem is not null
    for update;
  if not found then raise exception 'RPNC não encontrada nesta empresa.'; end if;

  update public.erp_rpnc set
    sgq_tratamento_anomalia = p_tratamento,
    ishikawa_data = v_ishikawa,
    cinco_porques = p_cinco_porques,
    sgq_auditoria_id = p_auditoria_id,
    sgq_produto_id = coalesce(v_produto, sgq_produto_id),
    sgq_lote = coalesce(nullif(btrim(coalesce(p_lote, '')), ''), sgq_lote),
    sgq_data_ocorrencia = coalesce(p_data_ocorrencia, sgq_data_ocorrencia)
  where id = p_rpnc_id and empresa_id = v_empresa
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'numero_rpnc', v_row.numero_rpnc,
    'status', v_row.status,
    'pasta_evidencias', v_row.sgq_pasta_evidencias,
    'salvo_em', now()
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 3 · erp_sgq_salvar_analise_rpnc (tela B do fluxo antigo) — mesma normalização
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_salvar_analise_rpnc(
  p_rpnc_id uuid,
  p_ishikawa jsonb,
  p_cinco_porques jsonb,
  p_prazo_dias integer default 30
) returns public.erp_rpnc
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_row public.erp_rpnc;
  v_ishikawa jsonb;
  v_why jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not public.erp_has_permission('qualidade','editar') then raise exception 'Sem permissão para investigar RPNC.'; end if;
  if p_prazo_dias not in (30,60) then raise exception 'O prazo de eficácia deve ser 30 ou 60 dias.'; end if;

  v_ishikawa := public.erp_sgq_normalizar_ishikawa(p_ishikawa);

  if jsonb_typeof(p_cinco_porques) is distinct from 'array'
     or jsonb_array_length(p_cinco_porques) < 5
     or jsonb_array_length(p_cinco_porques) > 12 then
    raise exception 'É obrigatório informar pelo menos cinco perguntas de causa raiz (máximo de doze níveis).';
  end if;
  for v_why in select value from jsonb_array_elements(p_cinco_porques) loop
    if jsonb_typeof(v_why) <> 'string' or length(btrim(v_why #>> '{}')) < 3 then
      raise exception 'Cada porquê da cadeia deve conter uma resposta de pelo menos 3 caracteres.';
    end if;
  end loop;

  select * into v_row from public.erp_rpnc
    where id=p_rpnc_id and empresa_id=v_empresa and sgq_origem is not null
    for update;
  if not found then raise exception 'RPNC não encontrada nesta empresa.'; end if;
  if v_row.status not in ('aberta','em análise','em tratamento','aguardando eficácia') then
    raise exception 'A RPNC não está em uma etapa que permita editar a investigação.';
  end if;

  update public.erp_rpnc set
    ishikawa_data=v_ishikawa,
    cinco_porques=p_cinco_porques,
    prazo_eficacia_dias=p_prazo_dias,
    data_verificacao_eficacia=(v_row.criado_em::date + p_prazo_dias),
    status=case when status='aberta' then 'em análise' else status end
  where id=p_rpnc_id and empresa_id=v_empresa
  returning * into v_row;
  return v_row;
end
$$;

-- ---------------------------------------------------------------------------
-- 4 · Permissões (mesmo contrato das migrations de origem)
-- ---------------------------------------------------------------------------
revoke all on function public.erp_sgq_salvar_formulario_rpnc(uuid, jsonb, jsonb, jsonb, uuid, text, text, date) from public;
revoke all on function public.erp_sgq_salvar_analise_rpnc(uuid, jsonb, jsonb, integer) from public;

grant execute on function public.erp_sgq_salvar_formulario_rpnc(uuid, jsonb, jsonb, jsonb, uuid, text, text, date) to authenticated;
grant execute on function public.erp_sgq_salvar_analise_rpnc(uuid, jsonb, jsonb, integer) to authenticated;
