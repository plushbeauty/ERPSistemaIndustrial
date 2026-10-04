-- Homologação Plastibor: 50 pedidos internos de venda 1001..1050.
-- Cada pedido recebe um item real do cadastro, quantidade de teste, código da peça e lote de fabricação.
with base as (
  select id as produto_id,codigo,nome,coalesce(preco_venda,0)::numeric as preco,
         row_number() over(order by codigo) rn
  from public.erp_produtos
  where empresa_id='b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22' and ativo=true
  order by codigo limit 20
),
nums as (select generate_series(1001,1050)::bigint as numero),
orders as (
  insert into public.erp_pedidos_venda(empresa_id,numero,cliente_id,status,total,observacoes,pedido_cliente)
  overriding system value
  select 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',n.numero,'e0cf2bac-2996-4b1f-b1e6-c9ba69254351','aberto',
         round(((5+(n.numero-1001)%16)*b.preco)::numeric,2),
         'HOMOLOGAÇÃO PLASTIBOR — pedido interno de teste '||n.numero::text,
         'PI-PLASTIBOR-'||n.numero::text
  from nums n join base b on b.rn=((n.numero-1001)%20)+1
  on conflict do nothing
  returning id,numero
)
insert into public.erp_pedidos_venda_itens(
  empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente,data_fabricacao,lote_fabricacao
)
select 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',o.id,b.produto_id,b.nome,
       (5+(o.numero-1001)%16)::numeric,b.preco,0,
       round(((5+(o.numero-1001)%16)*b.preco)::numeric,2),
       b.codigo,current_date,'PLASTIBOR-TESTE-'||o.numero::text
from orders o
join base b on b.rn=((o.numero-1001)%20)+1
on conflict do nothing;