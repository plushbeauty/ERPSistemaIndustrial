-- Bloqueia vínculo de recebimento a compra cancelada e não deixa lote reprovado liquidar compra.
create or replace function public.erp_validar_lote_recebimento_compra()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare v_status text;
begin
 if new.pedido_compra_id is null then return new; end if;
 select lower(coalesce(status,'')) into v_status
 from public.erp_pedidos_compra
 where id=new.pedido_compra_id and empresa_id=new.empresa_id;
 if not found then raise exception 'PEDIDO_COMPRA_FORA_DO_TENANT'; end if;
 if v_status in ('cancelado','cancelada','concluido','concluida','finalizado','finalizada') then
  raise exception 'PEDIDO_COMPRA_NAO_ACEITA_RECEBIMENTO';
 end if;
 if new.status_qualidade<>'APROVADO' then
  raise exception 'LOTE_REPROVADO_NAO_LIQUIDA_PEDIDO_DE_COMPRA';
 end if;
 return new;
end;
$$;
drop trigger if exists trg_erp_validar_lote_recebimento_compra on public.erp_estoque_lotes_rastreabilidade;
create trigger trg_erp_validar_lote_recebimento_compra
before insert on public.erp_estoque_lotes_rastreabilidade
for each row execute function public.erp_validar_lote_recebimento_compra();