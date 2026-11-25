-- Lotes de produção por OP ou por dia, com alocação a pedidos e rastreabilidade.
begin;

create table if not exists public.erp_configuracoes_producao_lote(
 empresa_id uuid primary key references public.erp_empresas(id) on delete cascade,
 modo_lote text not null default 'PRODUCAO' check(modo_lote in ('DIA','PRODUCAO')),
 updated_at timestamptz not null default now(),
 updated_by uuid
);
alter table public.erp_configuracoes_producao_lote enable row level security;
drop policy if exists erp_config_producao_lote_tenant on public.erp_configuracoes_producao_lote;
create policy erp_config_producao_lote_tenant on public.erp_configuracoes_producao_lote
 for all to authenticated
 using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
 with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert,update on public.erp_configuracoes_producao_lote to authenticated;

alter table public.erp_estoque_lotes
 add column if not exists origem_lote text not null default 'RECEBIMENTO',
 add column if not exists modo_lote text,
 add column if not exists data_producao date,
 add column if not exists ordem_producao_id uuid,
 add column if not exists maquina_id uuid,
 add column if not exists ano_referencia integer,
 add column if not exists pedido_venda_id uuid,
 add column if not exists pedido_item_id uuid,
 add column if not exists numero_op text,
 add column if not exists numero_pedido text;

create index if not exists ix_erp_estoque_lotes_op on public.erp_estoque_lotes(empresa_id,ordem_producao_id);
create unique index if not exists uq_erp_lote_producao_op
 on public.erp_estoque_lotes(empresa_id,ordem_producao_id)
 where modo_lote='PRODUCAO' and ordem_producao_id is not null;
create unique index if not exists uq_erp_lote_producao_dia
 on public.erp_estoque_lotes(empresa_id,produto_id,(coalesce(maquina_id,'00000000-0000-0000-0000-000000000000'::uuid)),data_producao)
 where modo_lote='DIA' and data_producao is not null;

create table if not exists public.erp_estoque_lotes_alocacoes(
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 lote_id uuid not null references public.erp_estoque_lotes(id) on delete restrict,
 ordem_producao_id uuid not null,
 pedido_venda_id uuid,
 pedido_item_id uuid,
 numero_op text,
 numero_pedido text,
 ano_pedido integer,
 quantidade_alocada numeric not null check(quantidade_alocada>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists uq_erp_lote_alocacao_op_item
 on public.erp_estoque_lotes_alocacoes(empresa_id,lote_id,ordem_producao_id,(coalesce(pedido_item_id,'00000000-0000-0000-0000-000000000000'::uuid)));
create index if not exists ix_erp_lote_alocacoes_pedido
 on public.erp_estoque_lotes_alocacoes(empresa_id,pedido_venda_id,pedido_item_id);

alter table public.erp_estoque_lotes_alocacoes enable row level security;
drop policy if exists erp_lote_alocacoes_select on public.erp_estoque_lotes_alocacoes;
drop policy if exists erp_lote_alocacoes_insert on public.erp_estoque_lotes_alocacoes;
drop policy if exists erp_lote_alocacoes_update on public.erp_estoque_lotes_alocacoes;
create policy erp_lote_alocacoes_select on public.erp_estoque_lotes_alocacoes
 for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_lote_alocacoes_insert on public.erp_estoque_lotes_alocacoes
 for insert to authenticated with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_lote_alocacoes_update on public.erp_estoque_lotes_alocacoes
 for update to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
 with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert,update on public.erp_estoque_lotes_alocacoes to authenticated;

create or replace function public.erp_gerar_lote_producao(
 p_ordem_producao_id uuid,
 p_quantidade numeric,
 p_data_producao date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_op public.erp_ordens_producao%rowtype;
 v_produto public.erp_produtos%rowtype;
 v_pedido_numero text;
 v_ano_pedido integer;
 v_modo text:='PRODUCAO';
 v_lote public.erp_estoque_lotes%rowtype;
 v_codigo_produto text;
 v_prefixo text;
 v_seq integer;
 v_codigo_lote text;
 v_alocacao uuid;
begin
 if v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if p_ordem_producao_id is null or p_quantidade is null or p_quantidade<=0 then
  raise exception 'LOTE_PRODUCAO_INVALIDO';
 end if;
 select * into v_op from public.erp_ordens_producao
  where id=p_ordem_producao_id and empresa_id=v_empresa for update;
 if not found then raise exception 'OP_FORA_DO_TENANT'; end if;
 select * into v_produto from public.erp_produtos
  where id=v_op.produto_id and empresa_id=v_empresa and ativo=true;
 if not found then raise exception 'PRODUTO_OP_FORA_DO_TENANT'; end if;
 select modo_lote into v_modo from public.erp_configuracoes_producao_lote
  where empresa_id=v_empresa;
 v_modo:=coalesce(v_modo,'PRODUCAO');
 if v_modo not in ('DIA','PRODUCAO') then raise exception 'MODO_LOTE_INVALIDO'; end if;

 if v_op.pedido_venda_id is not null then
  select pv.numero::text,extract(year from coalesce(pv.data_entrada,pv.created_at::date,p_data_producao))::integer
   into v_pedido_numero,v_ano_pedido
  from public.erp_pedidos_venda pv
  where pv.id=v_op.pedido_venda_id and pv.empresa_id=v_empresa;
 end if;
 v_codigo_produto:=left(regexp_replace(upper(coalesce(v_produto.codigo,'PROD')),'[^A-Z0-9]','','g'),12);
 if v_codigo_produto='' then v_codigo_produto:='PROD'; end if;

 if v_modo='PRODUCAO' then
  perform pg_advisory_xact_lock(hashtextextended(v_empresa::text||':OP:'||v_op.id::text,0));
  select * into v_lote from public.erp_estoque_lotes
   where empresa_id=v_empresa and modo_lote='PRODUCAO' and ordem_producao_id=v_op.id
   for update;
  if not found then
   v_codigo_lote:='OP-'||extract(year from p_data_producao)::integer::text||'-'||lpad(regexp_replace(v_op.numero_op,'[^0-9]','','g'),6,'0');
   insert into public.erp_estoque_lotes(
    empresa_id,produto_id,lote_interno,quantidade_recebida,quantidade_disponivel,quantidade_reservada,
    status_inspecao,data_entrada,origem_lote,modo_lote,data_producao,ordem_producao_id,maquina_id,
    ano_referencia,pedido_venda_id,pedido_item_id,numero_op,numero_pedido
   ) values(
    v_empresa,v_op.produto_id,v_codigo_lote,p_quantidade,0,0,'AGUARDANDO',p_data_producao,
    'PRODUCAO','PRODUCAO',p_data_producao,v_op.id,v_op.maquina_id,
    extract(year from p_data_producao)::integer,v_op.pedido_venda_id,v_op.pedido_item_id,v_op.numero_op,v_pedido_numero
   ) returning * into v_lote;
  else
   update public.erp_estoque_lotes set
    quantidade_recebida=coalesce(quantidade_recebida,0)+p_quantidade,
    quantidade_disponivel=0,status_inspecao='AGUARDANDO'
   where id=v_lote.id and empresa_id=v_empresa returning * into v_lote;
  end if;
 else
  perform pg_advisory_xact_lock(hashtextextended(v_empresa::text||':DIA:'||v_op.produto_id::text||':'||coalesce(v_op.maquina_id::text,'SEM-MAQUINA')||':'||p_data_producao::text,0));
  select * into v_lote from public.erp_estoque_lotes
   where empresa_id=v_empresa and modo_lote='DIA' and produto_id=v_op.produto_id
    and maquina_id is not distinct from v_op.maquina_id and data_producao=p_data_producao
   for update;
  if not found then
   v_prefixo:='DIA-'||to_char(p_data_producao,'YYYYMMDD')||'-'||v_codigo_produto||'-';
   select coalesce(max((substring(lote_interno from '([0-9]+)$'))::integer),0)+1 into v_seq
   from public.erp_estoque_lotes where empresa_id=v_empresa and lote_interno like v_prefixo||'%'
    and lote_interno ~ '[0-9]+$';
   v_codigo_lote:=v_prefixo||lpad(v_seq::text,3,'0');
   insert into public.erp_estoque_lotes(
    empresa_id,produto_id,lote_interno,quantidade_recebida,quantidade_disponivel,quantidade_reservada,
    status_inspecao,data_entrada,origem_lote,modo_lote,data_producao,ordem_producao_id,maquina_id,
    ano_referencia,pedido_venda_id,pedido_item_id,numero_op,numero_pedido
   ) values(
    v_empresa,v_op.produto_id,v_codigo_lote,p_quantidade,0,0,'AGUARDANDO',p_data_producao,
    'PRODUCAO','DIA',p_data_producao,null,v_op.maquina_id,
    extract(year from p_data_producao)::integer,null,null,null,null
   ) returning * into v_lote;
  else
   update public.erp_estoque_lotes set
    quantidade_recebida=coalesce(quantidade_recebida,0)+p_quantidade,
    quantidade_disponivel=0,status_inspecao='AGUARDANDO'
   where id=v_lote.id and empresa_id=v_empresa returning * into v_lote;
  end if;
 end if;

 select id into v_alocacao from public.erp_estoque_lotes_alocacoes
  where empresa_id=v_empresa and lote_id=v_lote.id and ordem_producao_id=v_op.id
   and pedido_item_id is not distinct from v_op.pedido_item_id
  for update;
 if v_alocacao is null then
  insert into public.erp_estoque_lotes_alocacoes(
   empresa_id,lote_id,ordem_producao_id,pedido_venda_id,pedido_item_id,numero_op,
   numero_pedido,ano_pedido,quantidade_alocada
  ) values(
   v_empresa,v_lote.id,v_op.id,v_op.pedido_venda_id,v_op.pedido_item_id,v_op.numero_op,
   v_pedido_numero,v_ano_pedido,p_quantidade
  ) returning id into v_alocacao;
 else
  update public.erp_estoque_lotes_alocacoes set
   quantidade_alocada=quantidade_alocada+p_quantidade,updated_at=now()
  where id=v_alocacao and empresa_id=v_empresa;
 end if;

 return jsonb_build_object(
  'id',v_lote.id,'lote_interno',v_lote.lote_interno,'modo_lote',v_modo,
  'quantidade_recebida',v_lote.quantidade_recebida,'status_inspecao',v_lote.status_inspecao,
  'pedido_numero',v_pedido_numero,'ano_pedido',v_ano_pedido
 );
end;
$$;
revoke all on function public.erp_gerar_lote_producao(uuid,numeric,date) from public,anon,authenticated;

create or replace function public.erp_apontamento_finalizar(
 p_apontamento_id uuid,
 p_operador_id uuid,
 p_programacao_id uuid,
 p_quantidade_boa numeric,
 p_quantidade_refugada numeric,
 p_motivo_parada text,
 p_observacoes text
) returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_boa numeric:=greatest(coalesce(p_quantidade_boa,0),0);
 v_refugo numeric:=greatest(coalesce(p_quantidade_refugada,0),0);
 v_inicio timestamptz;
 v_fim timestamptz:=now();
 v_op uuid;
 v_lote jsonb;
begin
 if auth.uid() is null then raise exception 'Sessão autenticada obrigatória para finalizar o apontamento.'; end if;
 if v_empresa is null then raise exception 'Empresa da sessão não identificada; atualização não gravada.'; end if;
 if p_apontamento_id is null or p_operador_id is null then raise exception 'Apontamento incompleto: registre o início antes de finalizar.'; end if;
 if p_quantidade_boa is null or p_quantidade_refugada is null or p_quantidade_boa<0 or p_quantidade_refugada<0 then
  raise exception 'Informe quantidades válidas; peças boas e refugadas não podem ser negativas.';
 end if;
 if v_boa+v_refugo<=0 then raise exception 'A soma de peças boas e refugadas precisa ser maior que zero.'; end if;
 if v_refugo>0 and nullif(trim(coalesce(p_observacoes,'')),'') is null then raise exception 'Descreva o defeito/causa quando houver peças refugadas.'; end if;
 select inicio_em,ordem_producao_id into v_inicio,v_op from public.erp_apontamentos_processo
  where id=p_apontamento_id and empresa_id=v_empresa and operador_id=p_operador_id for update;
 if not found then raise exception 'Apontamento não encontrado para este operador na empresa autenticada.'; end if;
 update public.erp_apontamentos_processo set
  fim_em=v_fim,quantidade_boa=v_boa,quantidade_refugada=v_refugo,
  motivo_parada=nullif(trim(coalesce(p_motivo_parada,'')),''),
  observacoes=nullif(trim(coalesce(p_observacoes,'')),''),
  parametros_reais=coalesce(parametros_reais,'{}'::jsonb)||jsonb_build_object('duracao_seg',greatest(extract(epoch from(v_fim-v_inicio)),0))
 where id=p_apontamento_id and empresa_id=v_empresa and fim_em is null;
 if not found then raise exception 'Nenhum apontamento foi atualizado: o registro já foi fechado. Atualize a tela.'; end if;
 if p_programacao_id is not null then
  update public.erp_pcp_programacoes set
   quantidade_produzida=coalesce(quantidade_produzida,0)+v_boa,
   quantidade_refugada=coalesce(quantidade_refugada,0)+v_refugo
  where id=p_programacao_id and empresa_id=v_empresa;
  if not found then raise exception 'Programação não encontrada na empresa autenticada; baixa não aplicada.'; end if;
 end if;
 if v_op is not null then
  update public.erp_ordens_producao set quantidade_produzida=coalesce(quantidade_produzida,0)+v_boa
   where id=v_op and empresa_id=v_empresa;
  if not found then raise exception 'OP não encontrada na empresa autenticada; produção não baixada.'; end if;
  if v_boa>0 then v_lote:=public.erp_gerar_lote_producao(v_op,v_boa,current_date); end if;
 end if;
 return jsonb_build_object(
  'id',p_apontamento_id,'inicio_em',v_inicio,'fim_em',v_fim,
  'duracao_seg',greatest(extract(epoch from(v_fim-v_inicio)),0),
  'quantidade_boa',v_boa,'quantidade_refugada',v_refugo,
  'ordem_producao_id',v_op,'programacao_id',p_programacao_id,
  'baixa_programacao',p_programacao_id is not null,
  'lote_id',v_lote->>'id','lote_interno',v_lote->>'lote_interno',
  'modo_lote',v_lote->>'modo_lote'
 );
end;
$$;
revoke all on function public.erp_apontamento_finalizar(uuid,uuid,uuid,numeric,numeric,text,text) from public,anon;
grant execute on function public.erp_apontamento_finalizar(uuid,uuid,uuid,numeric,numeric,text,text) to authenticated;
commit;