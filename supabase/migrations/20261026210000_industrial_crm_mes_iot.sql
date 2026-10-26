-- CRM e coleta MES com acesso restrito por empresa.
create table if not exists public.erp_crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid references public.erp_clientes(id) on delete set null,
  titulo text not null,
  contato_nome text,
  contato_email text,
  contato_telefone text,
  etapa text not null default 'PROSPECCAO' check (etapa in ('PROSPECCAO','QUALIFICACAO','ORCAMENTO','NEGOCIACAO','GANHA','PERDIDA')),
  valor_estimado numeric(18,2) not null default 0 check (valor_estimado >= 0),
  probabilidade numeric(5,2) not null default 0 check (probabilidade between 0 and 100),
  fechamento_previsto date,
  proxima_acao text,
  proxima_acao_em date,
  observacoes text,
  responsavel_id uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists erp_crm_oportunidades_empresa_etapa_idx on public.erp_crm_oportunidades(empresa_id, etapa, updated_at desc);
alter table public.erp_crm_oportunidades enable row level security;
drop policy if exists erp_crm_oportunidades_tenant on public.erp_crm_oportunidades;
create policy erp_crm_oportunidades_tenant on public.erp_crm_oportunidades for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete on public.erp_crm_oportunidades to authenticated;

create table if not exists public.erp_crm_orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  oportunidade_id uuid references public.erp_crm_oportunidades(id) on delete set null,
  codigo_orcamento text not null,
  produto_base_nome text not null default '',
  produto_id uuid references public.erp_produtos(id) on delete set null,
  material_id uuid references public.erp_produtos(id) on delete set null,
  peso_peca_gramas numeric(12,4) not null default 0 check (peso_peca_gramas >= 0),
  peso_galho_gramas numeric(12,4) not null default 0 check (peso_galho_gramas >= 0),
  tempo_ciclo_segundos numeric(12,4) not null default 0 check (tempo_ciclo_segundos >= 0),
  cavidades_molde integer not null default 1 check (cavidades_molde > 0),
  custo_materia_prima_kg numeric(18,6) not null default 0 check (custo_materia_prima_kg >= 0),
  custo_hora_maquina numeric(18,6) not null default 0 check (custo_hora_maquina >= 0),
  margem_lucro_desejada numeric(7,4) not null default 0 check (margem_lucro_desejada between 0 and 99.99),
  custo_material_unitario numeric(18,6) not null default 0 check (custo_material_unitario >= 0),
  custo_maquina_unitario numeric(18,6) not null default 0 check (custo_maquina_unitario >= 0),
  quantidade numeric(18,4) not null check (quantidade > 0),
  custo_unitario numeric(18,6) not null check (custo_unitario >= 0),
  impostos_percentual numeric(7,4) not null default 0 check (impostos_percentual between 0 and 99.99),
  comissao_percentual numeric(7,4) not null default 0 check (comissao_percentual between 0 and 99.99),
  margem_percentual numeric(7,4) not null default 0 check (margem_percentual between 0 and 99.99),
  preco_unitario numeric(18,6) not null check (preco_unitario >= 0),
  total numeric(18,2) not null check (total >= 0),
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','ENVIADO','APROVADO','REJEITADO','CANCELADO')),
  validade date,
  observacoes text,
  criado_por uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo_orcamento)
);
alter table public.erp_crm_orcamentos enable row level security;
drop policy if exists erp_crm_orcamentos_tenant on public.erp_crm_orcamentos;
create policy erp_crm_orcamentos_tenant on public.erp_crm_orcamentos for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete on public.erp_crm_orcamentos to authenticated;
create index if not exists erp_crm_orcamentos_empresa_created_idx on public.erp_crm_orcamentos(empresa_id,created_at desc);

create or replace function public.erp_crm_validar_vinculos_tenant()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_table_name='erp_crm_oportunidades' and new.cliente_id is not null and not exists(select 1 from public.erp_clientes c where c.id=new.cliente_id and c.empresa_id=new.empresa_id) then raise exception 'CLIENTE_FORA_DA_EMPRESA'; end if;
  if tg_table_name='erp_crm_orcamentos' then
    if new.oportunidade_id is not null and not exists(select 1 from public.erp_crm_oportunidades o where o.id=new.oportunidade_id and o.empresa_id=new.empresa_id) then raise exception 'OPORTUNIDADE_FORA_DA_EMPRESA'; end if;
    if new.produto_id is not null and not exists(select 1 from public.erp_produtos p where p.id=new.produto_id and p.empresa_id=new.empresa_id) then raise exception 'PRODUTO_FORA_DA_EMPRESA'; end if;
    if new.material_id is not null and not exists(select 1 from public.erp_produtos p where p.id=new.material_id and p.empresa_id=new.empresa_id) then raise exception 'MATERIAL_FORA_DA_EMPRESA'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_erp_crm_oportunidades_tenant on public.erp_crm_oportunidades;
create trigger trg_erp_crm_oportunidades_tenant before insert or update on public.erp_crm_oportunidades for each row execute function public.erp_crm_validar_vinculos_tenant();
drop trigger if exists trg_erp_crm_orcamentos_tenant on public.erp_crm_orcamentos;
create trigger trg_erp_crm_orcamentos_tenant before insert or update on public.erp_crm_orcamentos for each row execute function public.erp_crm_validar_vinculos_tenant();

create table if not exists public.erp_iot_dispositivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  maquina_id uuid not null references public.erp_maquinas(id) on delete restrict,
  nome text not null,
  token_hash text not null,
  ativo boolean not null default true,
  criado_por uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (empresa_id, nome)
);
create table if not exists public.erp_iot_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  dispositivo_id uuid not null references public.erp_iot_dispositivos(id) on delete restrict,
  maquina_id uuid not null references public.erp_maquinas(id) on delete restrict,
  evento_id text not null,
  estado text not null check (estado in ('RODANDO','PARADA','ALARME')),
  contador_ciclos bigint not null default 0 check (contador_ciclos >= 0),
  pecas_boas bigint not null default 0 check (pecas_boas >= 0),
  pecas_refugo bigint not null default 0 check (pecas_refugo >= 0),
  emitido_em timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  recebido_em timestamptz not null default now(),
  unique (dispositivo_id, evento_id)
);
create index if not exists erp_iot_eventos_empresa_maquina_time_idx on public.erp_iot_eventos(empresa_id, maquina_id, emitido_em desc);
alter table public.erp_iot_dispositivos enable row level security;
alter table public.erp_iot_eventos enable row level security;
drop policy if exists erp_iot_dispositivos_tenant on public.erp_iot_dispositivos;
create policy erp_iot_dispositivos_tenant on public.erp_iot_dispositivos for select to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_iot_eventos_tenant on public.erp_iot_eventos;
create policy erp_iot_eventos_tenant on public.erp_iot_eventos for select to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select on public.erp_iot_dispositivos to authenticated;
grant select on public.erp_iot_eventos to authenticated;

-- Snapshot de estoque e produção por competência para conferência interna do Bloco K.
-- A escrituração deve ser validada no PVA EFD conforme leiaute vigente antes da transmissão.
alter table public.erp_ordens_producao
  add column if not exists data_inicio timestamptz,
  add column if not exists data_fim timestamptz;

create or replace function public.erp_bloco_k_registrar_tempo_op()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if coalesce(new.status,'') in ('em_producao','EM_PRODUCAO') and (tg_op='INSERT' or coalesce(old.status,'') not in ('em_producao','EM_PRODUCAO')) then
    new.data_inicio:=coalesce(new.data_inicio,now());
  end if;
  if coalesce(new.status,'') in ('concluida','CONCLUIDA') and (tg_op='INSERT' or coalesce(old.status,'') not in ('concluida','CONCLUIDA')) then
    new.data_inicio:=coalesce(new.data_inicio,now());new.data_fim:=coalesce(new.data_fim,now());
  end if;
  return new;
end; $$;
drop trigger if exists trg_erp_bloco_k_registrar_tempo_op on public.erp_ordens_producao;
create trigger trg_erp_bloco_k_registrar_tempo_op before insert or update of status on public.erp_ordens_producao for each row execute function public.erp_bloco_k_registrar_tempo_op();

create table if not exists public.erp_fiscal_bloco_k_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null,
  data_estoque date not null default current_date,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_estoque numeric(18,6) not null check (quantidade_estoque >= 0),
  indicador_propriedade char(1) not null default '0' check (indicador_propriedade in ('0','1','2')),
  created_at timestamptz not null default now(),
  unique (empresa_id,periodo_referencia,produto_id,indicador_propriedade)
);
create table if not exists public.erp_fiscal_bloco_k_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null,
  ordem_producao_id uuid not null references public.erp_ordens_producao(id) on delete restrict,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_produzida numeric(18,6) not null check (quantidade_produzida >= 0),
  created_at timestamptz not null default now(),
  unique (empresa_id,periodo_referencia,ordem_producao_id)
);
alter table public.erp_fiscal_bloco_k_estoque enable row level security;
alter table public.erp_fiscal_bloco_k_producao enable row level security;
drop policy if exists erp_fiscal_bloco_k_estoque_tenant on public.erp_fiscal_bloco_k_estoque;
create policy erp_fiscal_bloco_k_estoque_tenant on public.erp_fiscal_bloco_k_estoque for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_fiscal_bloco_k_producao_tenant on public.erp_fiscal_bloco_k_producao;
create policy erp_fiscal_bloco_k_producao_tenant on public.erp_fiscal_bloco_k_producao for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert,update,delete on public.erp_fiscal_bloco_k_estoque,public.erp_fiscal_bloco_k_producao to authenticated;
create index if not exists erp_bloco_k_estoque_periodo_idx on public.erp_fiscal_bloco_k_estoque(empresa_id,periodo_referencia);
create index if not exists erp_bloco_k_producao_periodo_idx on public.erp_fiscal_bloco_k_producao(empresa_id,periodo_referencia);

-- Vínculo da conta de autenticação externa com somente um cadastro cliente/fornecedor.
-- Não armazenar tokens de autenticação em texto puro nesta tabela.
create table if not exists public.erp_portal_acessos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  tipo_portal text not null check (tipo_portal in ('CLIENTE','FORNECEDOR')),
  cliente_id uuid references public.erp_clientes(id) on delete cascade,
  fornecedor_id uuid references public.erp_fornecedores(id) on delete cascade,
  ativo boolean not null default false,
  convidado_por uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  ultimo_acesso timestamptz,
  check ((tipo_portal='CLIENTE' and cliente_id is not null and fornecedor_id is null) or (tipo_portal='FORNECEDOR' and fornecedor_id is not null and cliente_id is null)),
  unique (empresa_id,auth_user_id,tipo_portal)
);
alter table public.erp_portal_acessos enable row level security;
drop policy if exists erp_portal_acessos_select_own on public.erp_portal_acessos;
create policy erp_portal_acessos_select_own on public.erp_portal_acessos for select to authenticated
using (auth_user_id=auth.uid() and ativo=true);
drop policy if exists erp_portal_acessos_admin_tenant on public.erp_portal_acessos;
create policy erp_portal_acessos_admin_tenant on public.erp_portal_acessos for all to authenticated
using ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and exists(select 1 from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.ativo and u.deleted_at is null and upper(trim(coalesce(u.perfil,''))) in ('ADMINISTRADOR','MASTER','COMERCIAL','COMPRAS')))
with check ((empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) and exists(select 1 from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.ativo and u.deleted_at is null and upper(trim(coalesce(u.perfil,''))) in ('ADMINISTRADOR','MASTER','COMERCIAL','COMPRAS')));
grant select,insert,update,delete on public.erp_portal_acessos to authenticated;

create table if not exists public.erp_rfq_respostas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  rfq_id uuid not null references public.erp_rfq(id) on delete cascade,
  fornecedor_id uuid not null references public.erp_fornecedores(id) on delete restrict,
  respondido_por uuid references auth.users(id) on delete set null,
  valor_total numeric(18,2) not null default 0 check (valor_total>=0),
  prazo_dias integer check (prazo_dias>=0),
  condicao_pagamento text,
  validade date,
  observacoes text,
  status text not null default 'ENVIADA' check (status in ('RASCUNHO','ENVIADA','ACEITA','RECUSADA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id,fornecedor_id)
);
alter table public.erp_rfq_respostas enable row level security;
drop policy if exists erp_rfq_respostas_internal_tenant on public.erp_rfq_respostas;
create policy erp_rfq_respostas_internal_tenant on public.erp_rfq_respostas for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert,update,delete on public.erp_rfq_respostas to authenticated;
create index if not exists erp_rfq_respostas_empresa_idx on public.erp_rfq_respostas(empresa_id,rfq_id,created_at desc);

-- Endpoints do portal filtram pelo vínculo explícito de usuário, nunca apenas pelo tenant.
create or replace function public.erp_portal_cliente_pedidos()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_access public.erp_portal_acessos%rowtype; v_result jsonb;
begin
  select * into v_access from public.erp_portal_acessos where auth_user_id=auth.uid() and tipo_portal='CLIENTE' and ativo=true limit 1;
  if not found then raise exception 'PORTAL_CLIENTE_SEM_ACESSO'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('numero',p.numero,'pedido_cliente',p.pedido_cliente,'status',p.status,'data_entrega_prometida',p.data_entrega_prometida,'total',p.total,'itens',(select coalesce(jsonb_agg(jsonb_build_object('descricao',i.descricao,'quantidade',i.quantidade,'data_fabricacao',i.data_fabricacao)),'[]'::jsonb) from public.erp_pedidos_venda_itens i where i.empresa_id=p.empresa_id and i.pedido_id=p.id)) order by p.created_at desc),'[]'::jsonb)
  into v_result from public.erp_pedidos_venda p where p.empresa_id=v_access.empresa_id and p.cliente_id=v_access.cliente_id;
  return v_result;
end; $$;
revoke all on function public.erp_portal_cliente_pedidos() from public,anon;
grant execute on function public.erp_portal_cliente_pedidos() to authenticated;

create table if not exists public.erp_portal_pedidos_orcamento (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete cascade, criado_por uuid not null references auth.users(id) on delete cascade,
  produto_interesse text not null, quantidade numeric(18,4) not null check(quantidade>0), descricao text,
  status text not null default 'RECEBIDA' check(status in ('RECEBIDA','EM_ANALISE','RESPONDIDA','CANCELADA')),
  created_at timestamptz not null default now()
);
alter table public.erp_portal_pedidos_orcamento enable row level security;
drop policy if exists erp_portal_orcamentos_empresa_leitura on public.erp_portal_pedidos_orcamento;
create policy erp_portal_orcamentos_empresa_leitura on public.erp_portal_pedidos_orcamento for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select on public.erp_portal_pedidos_orcamento to authenticated;
create or replace function public.erp_portal_cliente_solicitar_orcamento(p_produto_interesse text,p_quantidade numeric,p_descricao text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_access public.erp_portal_acessos%rowtype; v_id uuid;
begin
  select * into v_access from public.erp_portal_acessos where auth_user_id=auth.uid() and tipo_portal='CLIENTE' and ativo=true limit 1;
  if not found then raise exception 'PORTAL_CLIENTE_SEM_ACESSO'; end if;
  if length(trim(coalesce(p_produto_interesse,'')))<2 or p_quantidade is null or p_quantidade<=0 then raise exception 'SOLICITACAO_ORCAMENTO_INVALIDA'; end if;
  insert into public.erp_portal_pedidos_orcamento(empresa_id,cliente_id,criado_por,produto_interesse,quantidade,descricao)
  values(v_access.empresa_id,v_access.cliente_id,auth.uid(),trim(p_produto_interesse),p_quantidade,nullif(trim(coalesce(p_descricao,'')),'')) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.erp_portal_cliente_solicitar_orcamento(text,numeric,text) from public,anon;
grant execute on function public.erp_portal_cliente_solicitar_orcamento(text,numeric,text) to authenticated;

create or replace function public.erp_portal_fornecedor_rfqs()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_access public.erp_portal_acessos%rowtype; v_result jsonb;
begin
  select * into v_access from public.erp_portal_acessos where auth_user_id=auth.uid() and tipo_portal='FORNECEDOR' and ativo=true limit 1;
  if not found then raise exception 'PORTAL_FORNECEDOR_SEM_ACESSO'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'numero',r.numero,'status',r.status,'data_necessidade',r.data_necessidade,'prazo_resposta',r.prazo_resposta,'condicao_pagamento',r.condicao_pagamento,'itens',(select coalesce(jsonb_agg(jsonb_build_object('codigo',i.codigo,'descricao',i.descricao,'quantidade',i.quantidade,'unidade',i.unidade,'data_necessidade',i.data_necessidade)),'[]'::jsonb) from public.erp_rfq_itens i where i.empresa_id=r.empresa_id and i.rfq_id=r.id),'resposta',(select to_jsonb(x) from public.erp_rfq_respostas x where x.rfq_id=r.id and x.fornecedor_id=v_access.fornecedor_id)) order by r.created_at desc),'[]'::jsonb)
  into v_result from public.erp_rfq r join public.erp_rfq_fornecedores rf on rf.rfq_id=r.id and rf.empresa_id=r.empresa_id where r.empresa_id=v_access.empresa_id and rf.fornecedor_id=v_access.fornecedor_id and lower(r.status) not in ('cancelada','cancelado');
  return v_result;
end; $$;
revoke all on function public.erp_portal_fornecedor_rfqs() from public,anon;
grant execute on function public.erp_portal_fornecedor_rfqs() to authenticated;

create or replace function public.erp_portal_fornecedor_responder(p_rfq_id uuid,p_valor_total numeric,p_prazo_dias integer,p_condicao_pagamento text,p_validade date,p_observacoes text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_access public.erp_portal_acessos%rowtype; v_id uuid;
begin
  select * into v_access from public.erp_portal_acessos where auth_user_id=auth.uid() and tipo_portal='FORNECEDOR' and ativo=true limit 1;
  if not found then raise exception 'PORTAL_FORNECEDOR_SEM_ACESSO'; end if;
  if p_valor_total is null or p_valor_total<=0 then raise exception 'VALOR_COTACAO_INVALIDO'; end if;
  if not exists(select 1 from public.erp_rfq_fornecedores rf join public.erp_rfq r on r.id=rf.rfq_id and r.empresa_id=rf.empresa_id where rf.rfq_id=p_rfq_id and rf.empresa_id=v_access.empresa_id and rf.fornecedor_id=v_access.fornecedor_id and lower(r.status) not in ('cancelada','cancelado')) then raise exception 'RFQ_NAO_AUTORIZADA'; end if;
  insert into public.erp_rfq_respostas(empresa_id,rfq_id,fornecedor_id,respondido_por,valor_total,prazo_dias,condicao_pagamento,validade,observacoes,status)
  values(v_access.empresa_id,p_rfq_id,v_access.fornecedor_id,auth.uid(),greatest(coalesce(p_valor_total,0),0),greatest(coalesce(p_prazo_dias,0),0),nullif(trim(coalesce(p_condicao_pagamento,'')),''),p_validade,nullif(trim(coalesce(p_observacoes,'')),''),'ENVIADA')
  on conflict(rfq_id,fornecedor_id) do update set valor_total=excluded.valor_total,prazo_dias=excluded.prazo_dias,condicao_pagamento=excluded.condicao_pagamento,validade=excluded.validade,observacoes=excluded.observacoes,status='ENVIADA',respondido_por=auth.uid(),updated_at=now() returning id into v_id;
  update public.erp_rfq_fornecedores set status='RESPONDIDO',resposta_recebida_em=now() where rfq_id=p_rfq_id and fornecedor_id=v_access.fornecedor_id and empresa_id=v_access.empresa_id;
  return v_id;
end; $$;
revoke all on function public.erp_portal_fornecedor_responder(uuid,numeric,integer,text,date,text) from public,anon;
grant execute on function public.erp_portal_fornecedor_responder(uuid,numeric,integer,text,date,text) to authenticated;

create or replace function public.erp_iot_registrar_dispositivo(p_maquina_id uuid,p_nome text)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_empresa uuid:=public.erp_current_empresa_id(); v_user public.erp_usuarios%rowtype; v_token text; v_id uuid;
begin
  select * into v_user from public.erp_usuarios where auth_user_id=auth.uid() and ativo=true and deleted_at is null limit 1;
  if v_empresa is null or v_user.id is null or not (public.erp_is_master() or upper(trim(coalesce(v_user.perfil,''))) in ('ADMINISTRADOR','PCP','MANUTENCAO','MASTER')) then raise exception 'IOT_NAO_AUTORIZADO'; end if;
  if not exists(select 1 from public.erp_maquinas where id=p_maquina_id and empresa_id=v_empresa and ativo=true) then raise exception 'MAQUINA_NAO_PERTENCE_A_EMPRESA'; end if;
  if length(trim(coalesce(p_nome,'')))<2 then raise exception 'NOME_DISPOSITIVO_INVALIDO'; end if;
  v_token:=encode(gen_random_bytes(32),'hex');
  insert into public.erp_iot_dispositivos(empresa_id,maquina_id,nome,token_hash,criado_por) values(v_empresa,p_maquina_id,trim(p_nome),encode(digest(v_token,'sha256'),'hex'),v_user.id) returning id into v_id;
  return jsonb_build_object('id',v_id,'token',v_token);
end; $$;
revoke all on function public.erp_iot_registrar_dispositivo(uuid,text) from public,anon;
grant execute on function public.erp_iot_registrar_dispositivo(uuid,text) to authenticated;

-- A ingestão não expõe a tabela: token em texto puro só é aceito nesta função,
-- o banco armazena SHA-256 e deduplica pelo ID enviado pelo equipamento.
create or replace function public.erp_iot_ingest_event(
  p_token text, p_evento_id text, p_estado text, p_contador_ciclos bigint,
  p_pecas_boas bigint, p_pecas_refugo bigint, p_emitido_em timestamptz, p_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_device public.erp_iot_dispositivos%rowtype; v_event uuid;
begin
  if coalesce(length(p_token),0)<32 then raise exception 'TOKEN_IOT_INVALIDO'; end if;
  select * into v_device from public.erp_iot_dispositivos d
   where d.token_hash=encode(digest(p_token,'sha256'),'hex') and d.ativo=true limit 1;
  if not found then raise exception 'DISPOSITIVO_IOT_NAO_AUTORIZADO'; end if;
  if p_estado not in ('RODANDO','PARADA','ALARME') then raise exception 'ESTADO_IOT_INVALIDO'; end if;
  if p_emitido_em is null or p_emitido_em > now()+interval '5 minutes' or p_emitido_em < now()-interval '7 days' then raise exception 'DATA_EVENTO_IOT_INVALIDA'; end if;
  insert into public.erp_iot_eventos(empresa_id,dispositivo_id,maquina_id,evento_id,estado,contador_ciclos,pecas_boas,pecas_refugo,emitido_em,payload)
  values(v_device.empresa_id,v_device.id,v_device.maquina_id,p_evento_id,p_estado,greatest(p_contador_ciclos,0),greatest(p_pecas_boas,0),greatest(p_pecas_refugo,0),p_emitido_em,coalesce(p_payload,'{}'::jsonb))
  on conflict(dispositivo_id,evento_id) do update set estado=excluded.estado,contador_ciclos=excluded.contador_ciclos,pecas_boas=excluded.pecas_boas,pecas_refugo=excluded.pecas_refugo,emitido_em=excluded.emitido_em,payload=excluded.payload
  returning id into v_event;
  return v_event;
end; $$;
revoke all on function public.erp_iot_ingest_event(text,text,text,bigint,bigint,bigint,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.erp_iot_ingest_event(text,text,text,bigint,bigint,bigint,timestamptz,jsonb) to service_role;
