-- Atomically claim an NF-e draft before calling the real fiscal provider.
-- Prevents two concurrent requests from transmitting the same document.
begin;

create or replace function private.erp_iniciar_emissao_nfe(p_documento_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $claim$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_document public.erp_documentos_fiscais%rowtype;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('fiscal','emitir')) then
    raise exception 'Sem permissão para transmitir NF-e.' using errcode = '42501';
  end if;

  select d.* into v_document
  from public.erp_documentos_fiscais d
  where d.id = p_documento_id
    and d.empresa_id = v_empresa
  for update;

  if not found then
    raise exception 'Documento fiscal não encontrado na empresa ativa.' using errcode = '42501';
  end if;
  if v_document.modelo is distinct from '55' or v_document.tipo is distinct from 'NF-e' then
    raise exception 'Somente NF-e de saída modelo 55 pode ser transmitida.' using errcode = '22023';
  end if;
  if v_document.status is distinct from 'Rascunho' then
    return false;
  end if;

  update public.erp_documentos_fiscais
  set status = 'Processando',
      mensagem_retorno = 'Transmissão reservada atomicamente; aguardando confirmação do provedor fiscal.',
      updated_at = now()
  where id = p_documento_id
    and empresa_id = v_empresa
    and status = 'Rascunho';

  if not found then
    return false;
  end if;
  return true;
end;
$claim$;

revoke all on function private.erp_iniciar_emissao_nfe(uuid) from public, anon;
grant execute on function private.erp_iniciar_emissao_nfe(uuid) to authenticated;

create or replace function public.erp_iniciar_emissao_nfe(p_documento_id uuid)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
as $wrapper$
  select private.erp_iniciar_emissao_nfe(p_documento_id);
$wrapper$;

revoke all on function public.erp_iniciar_emissao_nfe(uuid) from public, anon;
grant execute on function public.erp_iniciar_emissao_nfe(uuid) to authenticated;

commit;
