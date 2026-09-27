-- ERP Industrial: proteção contra duplicidade de chaves de negócio.
-- As regras são por empresa e normalizam espaços/maiúsculas para impedir
-- cadastros semanticamente iguais como ABC, abc ou " ABC ".
create unique index if not exists ux_erp_clientes_empresa_codigo_ci
  on public.erp_clientes (empresa_id, lower(trim(codigo)))
  where codigo is not null and trim(codigo) <> '';

create unique index if not exists ux_erp_fornecedores_empresa_codigo_ci
  on public.erp_fornecedores (empresa_id, lower(trim(codigo)))
  where codigo is not null and trim(codigo) <> '';

create unique index if not exists ux_erp_pedidos_venda_empresa_numero_ci
  on public.erp_pedidos_venda (empresa_id, lower(trim(numero::text)))
  where numero is not null and trim(numero::text) <> '';
