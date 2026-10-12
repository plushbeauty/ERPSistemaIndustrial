-- Avoid double-counting stock movements in open cycle counts and include
-- invoice-release dispatches in the concurrent-sales snapshot.
drop trigger if exists trg_erp_estoque_venda_concorrente
  on public.erp_estoque_movimentos;

create or replace function public.erp_estoque_registrar_venda_concorrente()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if lower(coalesce(new.origem,'')) in ('venda','liberacao_nf')
     or lower(coalesce(new.tipo,''))='venda' then
    update public.erp_estoque_inventario_itens i
    set quantidade_venda_concorrente=quantidade_venda_concorrente+new.quantidade,
        divergencia=case
          when quantidade_contada is null then null
          else quantidade_contada-(quantidade_sistema_congelada-(quantidade_venda_concorrente+new.quantidade))
        end
    from public.erp_estoque_inventarios inv
    where i.inventario_id=inv.id
      and i.produto_id=new.produto_id
      and i.empresa_id=new.empresa_id
      and inv.status='aberto';
  end if;
  return new;
end;
$function$;

comment on function public.erp_estoque_registrar_venda_concorrente()
is 'Registra cada saída de venda/liberação fiscal uma única vez na contagem cíclica aberta.';
