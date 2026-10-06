-- Estoque: movimento manual transacional com RBAC e tenant.
create or replace function public.erp_estoque_registrar_movimento(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_tipo text,
  p_quantidade numeric,
  p_origem text,
  p_documento text default null,
  p_observacao text default null,
  p_localizacao_origem_id uuid default null,
  p_localizacao_destino_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_id uuid;
  v_estoque numeric;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
  if v_empresa is null or p_empresa_id is distinct from v_empresa then raise exception 'Empresa do movimento não corresponde à sessão.' using errcode='42501'; end if;
  if not public.erp_has_permission('estoque','movimentar') then raise exception 'Usuário sem permissão estoque.movimentar.' using errcode='42501'; end if;
  if p_produto_id is null or coalesce(p_quantidade,0)<=0 then raise exception 'Produto e quantidade positiva são obrigatórios.' using errcode='22023'; end if;
  if lower(coalesce(p_tipo,'')) not in ('entrada','saida','transferencia') then raise exception 'Tipo de movimento inválido.' using errcode='22023'; end if;
  if not exists(select 1 from public.erp_produtos p where p.id=p_produto_id and p.empresa_id=v_empresa and p.ativo=true) then raise exception 'Produto inexistente, inativo ou de outra empresa.' using errcode='42501'; end if;
  if lower(p_tipo)='saida' then
    select estoque_atual into v_estoque from public.erp_produtos where id=p_produto_id and empresa_id=v_empresa for update;
    if coalesce(v_estoque,0)<p_quantidade then raise exception 'Saldo insuficiente para a saída.' using errcode='22023'; end if;
  end if;
  if lower(p_tipo)='transferencia' and (p_localizacao_origem_id is null or p_localizacao_destino_id is null or p_localizacao_origem_id=p_localizacao_destino_id) then
    raise exception 'Transferência exige origem e destino diferentes.' using errcode='22023';
  end if;
  insert into public.erp_estoque_movimentos(
    empresa_id,produto_id,tipo,quantidade,origem,documento,observacao,localizacao_origem_id,localizacao_destino_id
  ) values (
    v_empresa,p_produto_id,lower(p_tipo),p_quantidade,nullif(btrim(coalesce(p_origem,'')),''),
    nullif(btrim(coalesce(p_documento,'')),''),nullif(btrim(coalesce(p_observacao,'')),''),
    p_localizacao_origem_id,p_localizacao_destino_id
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.erp_estoque_registrar_movimento(uuid,uuid,text,numeric,text,text,text,uuid,uuid) from public,anon;
grant execute on function public.erp_estoque_registrar_movimento(uuid,uuid,text,numeric,text,text,text,uuid,uuid) to authenticated;
