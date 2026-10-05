-- Permissões específicas do fluxo de compras.
insert into public.erp_permissions (codigo,nome,modulo,ativo)
values
  ('compras.aprovar','Aprovar pedidos de compra','compras',true),
  ('fiscal.editar','Validar compras fiscalmente','fiscal',true)
on conflict (codigo) do update
set nome=excluded.nome, modulo=excluded.modulo, ativo=true;

-- Compras: aprovação, validação fiscal e especificações de aquisição.
alter table public.erp_pedidos_compra
  add column if not exists centro_custo text,
  add column if not exists local_entrega text,
  add column if not exists especificacao_tecnica text,
  add column if not exists referencia_cotacao text,
  add column if not exists fiscal_status text not null default 'NAO_ANALISADO',
  add column if not exists fiscal_parecer text,
  add column if not exists fiscal_analisado_por uuid,
  add column if not exists fiscal_analisado_em timestamptz,
  add column if not exists aprovado_por uuid,
  add column if not exists aprovado_em timestamptz,
  add column if not exists motivo_rejeicao text,
  add column if not exists liberado_para_compra_em timestamptz;

do $$ begin
  alter table public.erp_pedidos_compra
    add constraint erp_pedidos_compra_fiscal_status_chk
    check (fiscal_status in ('NAO_ANALISADO','PENDENTE','VALIDADO','BLOQUEADO'));
exception when duplicate_object then null; end $$;

create index if not exists idx_erp_pedidos_compra_empresa_fiscal
  on public.erp_pedidos_compra(empresa_id,fiscal_status,status);

create or replace function public.erp_compras_aprovar_pedido(
  p_pedido_id uuid,
  p_aprovado boolean,
  p_motivo text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_pedido public.erp_pedidos_compra;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('compras','aprovar')) then
    raise exception 'Sem permissão para aprovar pedidos de compra.';
  end if;

  select * into v_pedido
    from public.erp_pedidos_compra
   where id=p_pedido_id and empresa_id=v_empresa
   for update;
  if not found then raise exception 'Pedido de compra não encontrado.'; end if;
  if v_pedido.status not in ('PENDENTE_APROVACAO','REJEITADO') then
    raise exception 'O pedido não está em uma etapa que permita decisão.';
  end if;

  if p_aprovado then
    update public.erp_pedidos_compra
       set status='APROVADO', aprovado_por=(select id from public.erp_usuarios where auth_user_id=auth.uid() and empresa_id=v_empresa limit 1),
           aprovado_em=now(), motivo_rejeicao=null, updated_at=now()
     where id=p_pedido_id and empresa_id=v_empresa;
  else
    update public.erp_pedidos_compra
       set status='REJEITADO', motivo_rejeicao=nullif(btrim(p_motivo),''), updated_at=now()
     where id=p_pedido_id and empresa_id=v_empresa;
  end if;

  return jsonb_build_object('id',p_pedido_id,'status',case when p_aprovado then 'APROVADO' else 'REJEITADO' end);
end;
$$;

create or replace function public.erp_compras_validar_fiscal(
  p_pedido_id uuid,
  p_status text,
  p_parecer text
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('fiscal','editar')) then
    raise exception 'Sem permissão para validar fiscalmente a compra.';
  end if;
  if p_status not in ('PENDENTE','VALIDADO','BLOQUEADO') then
    raise exception 'Status fiscal inválido.';
  end if;
  if not exists (select 1 from public.erp_pedidos_compra where id=p_pedido_id and empresa_id=v_empresa) then
    raise exception 'Pedido de compra não encontrado.';
  end if;

  update public.erp_pedidos_compra
     set fiscal_status=p_status,
         fiscal_parecer=nullif(btrim(p_parecer),''),
         fiscal_analisado_por=(select id from public.erp_usuarios where auth_user_id=auth.uid() and empresa_id=v_empresa limit 1),
         fiscal_analisado_em=now(),
         liberado_para_compra_em=case when p_status='VALIDADO' and status='APROVADO' then now() else liberado_para_compra_em end,
         updated_at=now()
   where id=p_pedido_id and empresa_id=v_empresa;

  return jsonb_build_object('id',p_pedido_id,'fiscal_status',p_status);
end;
$$;

revoke all on function public.erp_compras_aprovar_pedido(uuid,boolean,text) from public,anon;
grant execute on function public.erp_compras_aprovar_pedido(uuid,boolean,text) to authenticated;
revoke all on function public.erp_compras_validar_fiscal(uuid,text,text) from public,anon;
grant execute on function public.erp_compras_validar_fiscal(uuid,text,text) to authenticated;
