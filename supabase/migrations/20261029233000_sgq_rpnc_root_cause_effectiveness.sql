-- SYSNQRA ERP INDUSTRIAL — RPNC causa raiz e eficácia
-- Aditiva e tenant-safe; preserva o protocolo atômico existente.
alter table public.erp_rpnc
  add column if not exists ishikawa_data jsonb not null default '{"Metodo":[],"Maquina":[],"Medida":[],"MeioAmbiente":[],"MaoDeObra":[],"Material":[]}'::jsonb,
  add column if not exists cinco_porques jsonb not null default '[]'::jsonb,
  add column if not exists prazo_eficacia_dias integer,
  add column if not exists data_verificacao_eficacia date,
  add column if not exists parecer_eficacia text,
  add column if not exists eficacia_aprovada boolean;

alter table public.erp_rpnc
  drop constraint if exists erp_rpnc_prazo_eficacia_dias_check;
alter table public.erp_rpnc
  add constraint erp_rpnc_prazo_eficacia_dias_check
  check (prazo_eficacia_dias is null or prazo_eficacia_dias in (30, 60));

create or replace function public.erp_sgq_salvar_analise_rpnc(
  p_rpnc_id uuid,
  p_ishikawa jsonb,
  p_cinco_porques jsonb,
  p_prazo_dias integer default 30
) returns public.erp_rpnc
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_row public.erp_rpnc;
  v_key text;
  v_value jsonb;
  v_why jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not public.erp_has_permission('qualidade','editar') then raise exception 'Sem permissão para investigar RPNC.'; end if;
  if p_prazo_dias not in (30,60) then raise exception 'O prazo de eficácia deve ser 30 ou 60 dias.'; end if;
  if jsonb_typeof(p_ishikawa) <> 'object' then raise exception 'Ishikawa deve ser um objeto JSON.'; end if;
  foreach v_key in array array['Metodo','Maquina','Medida','MeioAmbiente','MaoDeObra','Material'] loop
    v_value := p_ishikawa -> v_key;
    if jsonb_typeof(v_value) <> 'array' then raise exception 'Grupo Ishikawa inválido: %.', v_key; end if;
    if exists (select 1 from jsonb_array_elements(v_value) e where jsonb_typeof(e) <> 'string') then
      raise exception 'As causas do grupo % devem ser textos.', v_key;
    end if;
  end loop;
  if jsonb_typeof(p_cinco_porques) <> 'array' or jsonb_array_length(p_cinco_porques) <> 5 then
    raise exception 'É obrigatório informar as cinco perguntas de causa raiz.';
  end if;
  for v_why in select value from jsonb_array_elements(p_cinco_porques) loop
    if jsonb_typeof(v_why) <> 'string' or length(btrim(v_why #>> '{}')) < 3 then
      raise exception 'Cada um dos cinco porquês deve conter uma resposta de pelo menos 3 caracteres.';
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
    ishikawa_data=p_ishikawa,
    cinco_porques=p_cinco_porques,
    prazo_eficacia_dias=p_prazo_dias,
    data_verificacao_eficacia=(v_row.criado_em::date + p_prazo_dias),
    status=case when status='aberta' then 'em análise' else status end
  where id=p_rpnc_id and empresa_id=v_empresa
  returning * into v_row;
  return v_row;
end
$$;

create or replace function public.erp_sgq_registrar_eficacia_rpnc(
  p_rpnc_id uuid,
  p_parecer text,
  p_eficaz boolean
) returns public.erp_rpnc
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_row public.erp_rpnc;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not public.erp_has_permission('qualidade','verificar') then raise exception 'Sem permissão para verificar eficácia.'; end if;
  if nullif(btrim(p_parecer),'') is null or length(btrim(p_parecer)) < 10 then
    raise exception 'O parecer de eficácia deve conter pelo menos 10 caracteres.';
  end if;
  select u.id into v_usuario from public.erp_usuarios u
    where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true and u.deleted_at is null
    limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;
  select * into v_row from public.erp_rpnc
    where id=p_rpnc_id and empresa_id=v_empresa and sgq_origem is not null
    for update;
  if not found then raise exception 'RPNC não encontrada nesta empresa.'; end if;
  if v_row.prazo_eficacia_dias not in (30,60) or v_row.data_verificacao_eficacia is null then
    raise exception 'Defina e salve o prazo de eficácia na investigação antes de verificar.';
  end if;
  if current_date < v_row.data_verificacao_eficacia then
    raise exception 'A carência de eficácia termina em %.', v_row.data_verificacao_eficacia;
  end if;
  if v_row.status not in ('aguardando eficácia','em tratamento','em análise') then
    raise exception 'A RPNC não está apta para verificação de eficácia.';
  end if;
  update public.erp_rpnc set
    parecer_eficacia=btrim(p_parecer),
    eficacia_aprovada=p_eficaz,
    status=case when p_eficaz then 'encerrada' else 'em análise' end,
    sgq_encerrado_por=case when p_eficaz then v_usuario else null end,
    sgq_encerrado_em=case when p_eficaz then now() else null end
  where id=p_rpnc_id and empresa_id=v_empresa
  returning * into v_row;
  return v_row;
end
$$;

revoke all on function public.erp_sgq_salvar_analise_rpnc(uuid,jsonb,jsonb,integer) from public;
revoke all on function public.erp_sgq_registrar_eficacia_rpnc(uuid,text,boolean) from public;
grant execute on function public.erp_sgq_salvar_analise_rpnc(uuid,jsonb,jsonb,integer) to authenticated;
grant execute on function public.erp_sgq_registrar_eficacia_rpnc(uuid,text,boolean) to authenticated;
