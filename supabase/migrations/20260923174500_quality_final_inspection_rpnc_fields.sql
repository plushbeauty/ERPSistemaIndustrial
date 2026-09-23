-- Quality operational fields required by final inspection and RPNC.
do $$ begin
 if to_regclass('public.erp_inspecoes') is not null then
  alter table public.erp_inspecoes add column if not exists produto_id uuid;
  alter table public.erp_inspecoes add column if not exists codigo_produto text;
  alter table public.erp_inspecoes add column if not exists lote_producao text;
  alter table public.erp_inspecoes add column if not exists numero_pedido text;
  alter table public.erp_inspecoes add column if not exists maquina_id uuid;
  alter table public.erp_inspecoes add column if not exists operador text;
  alter table public.erp_inspecoes add column if not exists data_fabricacao date;
  alter table public.erp_inspecoes add column if not exists tipo_defeito text;
 end if;
 if to_regclass('public.erp_rpnc') is not null then
  alter table public.erp_rpnc add column if not exists origem text;
  alter table public.erp_rpnc add column if not exists produto_id uuid;
  alter table public.erp_rpnc add column if not exists codigo_produto text;
  alter table public.erp_rpnc add column if not exists lote text;
  alter table public.erp_rpnc add column if not exists numero_pedido text;
  alter table public.erp_rpnc add column if not exists tipo_ocorrencia text;
  alter table public.erp_rpnc add column if not exists contencao text;
  alter table public.erp_rpnc add column if not exists causa_raiz text;
  alter table public.erp_rpnc add column if not exists responsavel text;
  alter table public.erp_rpnc add column if not exists prazo date;
  alter table public.erp_rpnc add column if not exists data_fechamento date;
  alter table public.erp_rpnc add column if not exists evidencia text;
 end if;
end $$;