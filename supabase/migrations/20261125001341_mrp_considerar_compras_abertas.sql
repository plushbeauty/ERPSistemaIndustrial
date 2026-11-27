alter table public.erp_mrp_necessidades add column if not exists quantidade_em_compra numeric not null default 0;
create or replace function public.erp_mrp_explodir(p_produto_id uuid,p_quantidade numeric,p_demanda_ref text default null)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $function$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_run uuid;
begin
 if v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if p_produto_id is null or p_quantidade is null or p_quantidade<=0 then raise exception 'MRP_INVALID_INPUT'; end if;
 if not exists(select 1 from public.erp_produtos p where p.id=p_produto_id and p.empresa_id=v_empresa and p.ativo=true) then raise exception 'MRP_PRODUCT_NOT_IN_TENANT'; end if;
 insert into public.erp_mrp_runs(empresa_id,produto_raiz_id,quantidade_raiz,demanda_ref,criado_por)
 select v_empresa,p_produto_id,p_quantidade,p_demanda_ref,u.id from public.erp_usuarios u
 where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true limit 1 returning id into v_run;
 if v_run is null then raise exception 'MRP_USER_NOT_AUTHORIZED'; end if;
 with recursive explosao as (
  select fi.componente_id,1 nivel,p_quantidade*fi.quantidade*(1+coalesce(fi.perda_percentual,0)/100.0) quantidade,
         array[p_produto_id,fi.componente_id]::uuid[] caminho
  from public.erp_ficha_itens fi join public.erp_fichas_tecnicas f
   on f.id=fi.ficha_id and f.empresa_id=v_empresa and f.produto_id=p_produto_id and f.ativa=true
  where fi.empresa_id=v_empresa
  union all
  select child.componente_id,e.nivel+1,e.quantidade*child.quantidade*(1+coalesce(child.perda_percentual,0)/100.0),e.caminho||child.componente_id
  from explosao e join public.erp_fichas_tecnicas cf on cf.empresa_id=v_empresa and cf.produto_id=e.componente_id and cf.ativa=true
  join public.erp_ficha_itens child on child.ficha_id=cf.id and child.empresa_id=v_empresa
  where e.nivel<50 and not child.componente_id=any(e.caminho)
 ), consol as (
  select componente_id,max(nivel) nivel,sum(quantidade) quantidade_bruta from explosao group by componente_id
 ), compras_abertas as (
  select ci.produto_id,sum(ci.quantidade) quantidade
  from public.erp_pedidos_compra_itens ci join public.erp_pedidos_compra pc on pc.id=ci.pedido_id and pc.empresa_id=v_empresa
  where ci.empresa_id=v_empresa and pc.recebido_em is null
   and lower(coalesce(pc.status,'')) not in ('concluido','concluida','cancelado','cancelada','recebido','recebida','finalizado','finalizada')
  group by ci.produto_id
  union all
  select pc.produto_id,sum(pc.quantidade) from public.erp_pedidos_compra pc
  where pc.empresa_id=v_empresa and pc.produto_id is not null and pc.recebido_em is null
   and lower(coalesce(pc.status,'')) not in ('concluido','concluida','cancelado','cancelada','recebido','recebida','finalizado','finalizada')
   and not exists(select 1 from public.erp_pedidos_compra_itens ci where ci.pedido_id=pc.id and ci.empresa_id=v_empresa)
  group by pc.produto_id
 ), compras as (select produto_id,sum(quantidade) quantidade from compras_abertas group by produto_id),
 reservas as (select produto_id,sum(quantidade) quantidade from public.erp_estoque_reservas
  where empresa_id=v_empresa and upper(coalesce(status,''))='ATIVA' group by produto_id)
 insert into public.erp_mrp_necessidades(empresa_id,run_id,produto_raiz_id,componente_id,nivel,quantidade_bruta,
  estoque_atual,reservado,quantidade_disponivel,quantidade_em_compra,necessidade_liquida,sugestao)
 select v_empresa,v_run,p_produto_id,c.componente_id,c.nivel,c.quantidade_bruta,coalesce(p.estoque_atual,0),coalesce(r.quantidade,0),
  greatest(coalesce(p.estoque_atual,0)-coalesce(r.quantidade,0),0),coalesce(cp.quantidade,0),
  greatest(c.quantidade_bruta-greatest(coalesce(p.estoque_atual,0)-coalesce(r.quantidade,0),0)-coalesce(cp.quantidade,0),0),
  case when greatest(c.quantidade_bruta-greatest(coalesce(p.estoque_atual,0)-coalesce(r.quantidade,0),0)-coalesce(cp.quantidade,0),0)=0 then 'SEM_NECESSIDADE'
       when coalesce(p.fabricado,false) then 'PRODUZIR' else 'COMPRAR' end
 from consol c join public.erp_produtos p on p.id=c.componente_id and p.empresa_id=v_empresa
 left join reservas r on r.produto_id=c.componente_id left join compras cp on cp.produto_id=c.componente_id;
 return v_run;
end; $function$;