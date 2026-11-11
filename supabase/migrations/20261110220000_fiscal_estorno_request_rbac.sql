-- REV-ESTORNO-REQUEST-RBAC-20261110-01
-- Mantém a assinatura pública e o comportamento de registro da solicitação.
-- Fecha a escrita sem autorização RBAC e exige contexto de empresa, além da RLS tenant.
-- A função continua SECURITY INVOKER; não cria lançamento contábil nem cancela NF-e.
begin;

create or replace function public.erp_fiscal_estornar_documento(
  p_documento text,
  p_data date,
  p_justificativa text
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid;
  v_id uuid;
  v_documento text;
  v_justificativa text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  v_empresa_id := public.erp_current_empresa_id();
  if v_empresa_id is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA' using errcode = '42501';
  end if;

  v_documento := nullif(btrim(coalesce(p_documento, '')), '');
  v_justificativa := nullif(btrim(coalesce(p_justificativa, '')), '');
  if v_documento is null or p_data is null or v_justificativa is null then
    raise exception 'DOCUMENTO_DATA_E_JUSTIFICATIVA_OBRIGATORIOS' using errcode = '22023';
  end if;

  if not public.erp_has_permission('finance.create') then
    raise exception 'FORBIDDEN: finance.create permission required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.erp_fiscal_estornos e
    where e.empresa_id = v_empresa_id
      and e.documento_alvo = v_documento
  ) then
    raise exception 'Already Reversed Warning';
  end if;

  insert into public.erp_fiscal_estornos (
    empresa_id,
    documento_alvo,
    data_estorno,
    justificativa
  )
  values (
    v_empresa_id,
    v_documento,
    p_data,
    v_justificativa
  )
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.erp_fiscal_estornar_documento(text, date, text) from public, anon;
grant execute on function public.erp_fiscal_estornar_documento(text, date, text) to authenticated;

commit;
