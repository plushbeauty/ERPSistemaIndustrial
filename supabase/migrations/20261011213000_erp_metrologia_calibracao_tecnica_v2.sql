-- Metrologia industrial: campos técnicos, histórico rastreável e registro atômico.
-- Compatível com as tabelas existentes; preserva isolamento multiempresa e RLS.

begin;

alter table public.erp_equipamentos_medicao
  add column if not exists classe_exatidao text,
  add column if not exists erro_indicacao numeric(14,6),
  add column if not exists incerteza_expandida numeric(14,6),
  add column if not exists fator_abrangencia numeric(8,4),
  add column if not exists temperatura_lab_c numeric(6,2),
  add column if not exists umidade_relativa_pct numeric(5,2),
  add column if not exists rastreabilidade_padrao text,
  add column if not exists identificacao_rbc text,
  add column if not exists desvio_historico text,
  add column if not exists criterio_aceitacao text,
  add column if not exists laboratorio_calibracao text,
  add column if not exists intervalo_calibracao_dias integer,
  add column if not exists criticidade text;

alter table public.erp_qualidade_calibracoes_historico
  add column if not exists certificado_rbc boolean not null default false,
  add column if not exists identificacao_rbc text,
  add column if not exists classe_exatidao text,
  add column if not exists erro_indicacao numeric(14,6),
  add column if not exists incerteza_expandida numeric(14,6),
  add column if not exists fator_abrangencia numeric(8,4),
  add column if not exists temperatura_lab_c numeric(6,2),
  add column if not exists umidade_relativa_pct numeric(5,2),
  add column if not exists rastreabilidade_padrao text,
  add column if not exists desvio_historico text,
  add column if not exists criterio_aceitacao text;

alter table public.erp_equipamentos_medicao
  add constraint erp_equipamentos_medicao_fator_k_check
    check (fator_abrangencia is null or fator_abrangencia > 0) not valid,
  add constraint erp_equipamentos_medicao_umidade_check
    check (umidade_relativa_pct is null or umidade_relativa_pct between 0 and 100) not valid,
  add constraint erp_equipamentos_medicao_intervalo_check
    check (intervalo_calibracao_dias is null or intervalo_calibracao_dias > 0) not valid;

alter table public.erp_qualidade_calibracoes_historico
  add constraint erp_qualidade_calibracoes_fator_k_check
    check (fator_abrangencia is null or fator_abrangencia > 0) not valid,
  add constraint erp_qualidade_calibracoes_umidade_check
    check (umidade_relativa_pct is null or umidade_relativa_pct between 0 and 100) not valid;

create index if not exists ix_erp_cal_hist_empresa_equip_data
  on public.erp_qualidade_calibracoes_historico (empresa_id, equipamento_id, data_calibracao desc);

drop policy if exists erp_cal_hist_insert_tenant on public.erp_qualidade_calibracoes_historico;
create policy erp_cal_hist_insert_tenant
  on public.erp_qualidade_calibracoes_historico
  for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert on public.erp_qualidade_calibracoes_historico to authenticated;

create or replace function public.erp_registrar_calibracao(
  p_equipamento_id uuid,
  p_numero_certificado text,
  p_data_calibracao date,
  p_proxima_calibracao date,
  p_laboratorio text default null,
  p_resultado text default 'Aprovado',
  p_observacao text default null,
  p_certificado_rbc boolean default false,
  p_identificacao_rbc text default null,
  p_classe_exatidao text default null,
  p_erro_indicacao numeric default null,
  p_incerteza_expandida numeric default null,
  p_fator_abrangencia numeric default null,
  p_temperatura_lab_c numeric default null,
  p_umidade_relativa_pct numeric default null,
  p_rastreabilidade_padrao text default null,
  p_desvio_historico text default null,
  p_criterio_aceitacao text default null
) returns table(revisao integer, status text)
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_empresa_id uuid;
  v_revisao integer;
  v_status text;
  v_resultado text := lower(trim(coalesce(p_resultado, '')));
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.';
  end if;

  v_empresa_id := public.erp_current_empresa_id();
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  if nullif(trim(coalesce(p_numero_certificado, '')), '') is null then
    raise exception 'Número do certificado é obrigatório.';
  end if;
  if p_data_calibracao is null then
    raise exception 'Data da calibração é obrigatória.';
  end if;
  if p_proxima_calibracao is not null and p_proxima_calibracao < p_data_calibracao then
    raise exception 'A próxima calibração não pode anteceder a calibração registrada.';
  end if;
  if v_resultado not in ('aprovado', 'reprovado', 'condicional') then
    raise exception 'Resultado de calibração inválido.';
  end if;
  if p_fator_abrangencia is not null and p_fator_abrangencia <= 0 then
    raise exception 'O fator de abrangência k deve ser maior que zero.';
  end if;
  if p_umidade_relativa_pct is not null and p_umidade_relativa_pct not between 0 and 100 then
    raise exception 'A umidade relativa deve estar entre 0 e 100%.';
  end if;

  perform 1
    from public.erp_equipamentos_medicao e
   where e.id = p_equipamento_id
     and e.empresa_id = v_empresa_id
   for update;
  if not found then
    raise exception 'Instrumento não localizado na empresa da sessão.';
  end if;

  select coalesce(max(h.revisao), 0) + 1
    into v_revisao
    from public.erp_qualidade_calibracoes_historico h
   where h.empresa_id = v_empresa_id
     and h.equipamento_id = p_equipamento_id;

  v_status := case
    when v_resultado = 'aprovado'
     and p_proxima_calibracao is not null
     and p_proxima_calibracao >= current_date
    then 'APROVADO'
    else 'BLOQUEADO'
  end;

  insert into public.erp_qualidade_calibracoes_historico (
    empresa_id, equipamento_id, revisao, numero_certificado, data_calibracao,
    proxima_calibracao, laboratorio, resultado, observacao, certificado_rbc,
    identificacao_rbc, classe_exatidao, erro_indicacao, incerteza_expandida,
    fator_abrangencia, temperatura_lab_c, umidade_relativa_pct,
    rastreabilidade_padrao, desvio_historico, criterio_aceitacao
  ) values (
    v_empresa_id, p_equipamento_id, v_revisao, trim(p_numero_certificado),
    p_data_calibracao, p_proxima_calibracao, nullif(trim(p_laboratorio), ''),
    case v_resultado when 'aprovado' then 'Aprovado' when 'reprovado' then 'Reprovado' else 'Condicional' end,
    nullif(trim(p_observacao), ''), coalesce(p_certificado_rbc, false),
    nullif(trim(p_identificacao_rbc), ''), nullif(trim(p_classe_exatidao), ''),
    p_erro_indicacao, p_incerteza_expandida, p_fator_abrangencia,
    p_temperatura_lab_c, p_umidade_relativa_pct,
    nullif(trim(p_rastreabilidade_padrao), ''), nullif(trim(p_desvio_historico), ''),
    nullif(trim(p_criterio_aceitacao), '')
  );

  update public.erp_equipamentos_medicao
     set proxima_calibracao = p_proxima_calibracao,
         ultima_calibracao = p_data_calibracao,
         numero_certificado_atual = trim(p_numero_certificado),
         certificado_validade = p_proxima_calibracao,
         certificado_rbc = coalesce(p_certificado_rbc, false),
         identificacao_rbc = nullif(trim(p_identificacao_rbc), ''),
         classe_exatidao = coalesce(nullif(trim(p_classe_exatidao), ''), classe_exatidao),
         erro_indicacao = p_erro_indicacao,
         incerteza_expandida = p_incerteza_expandida,
         fator_abrangencia = p_fator_abrangencia,
         temperatura_lab_c = p_temperatura_lab_c,
         umidade_relativa_pct = p_umidade_relativa_pct,
         rastreabilidade_padrao = nullif(trim(p_rastreabilidade_padrao), ''),
         desvio_historico = nullif(trim(p_desvio_historico), ''),
         criterio_aceitacao = nullif(trim(p_criterio_aceitacao), ''),
         laboratorio_calibracao = nullif(trim(p_laboratorio), ''),
         status = v_status,
         observacoes = coalesce(nullif(trim(p_observacao), ''), observacoes)
   where id = p_equipamento_id
     and empresa_id = v_empresa_id;

  return query select v_revisao, v_status;
end;
$function$;

revoke all on function public.erp_registrar_calibracao(uuid,text,date,date,text,text,text,boolean,text,text,numeric,numeric,numeric,numeric,numeric,text,text,text) from public, anon;
grant execute on function public.erp_registrar_calibracao(uuid,text,date,date,text,text,text,boolean,text,text,numeric,numeric,numeric,numeric,numeric,text,text,text) to authenticated;

commit;
