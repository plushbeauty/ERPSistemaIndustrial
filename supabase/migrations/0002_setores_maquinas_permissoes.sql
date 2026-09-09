create table if not exists public.setores (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null, nome text not null, ativo boolean not null default true, created_at timestamptz not null default now(),
  unique(empresa_id,codigo), unique(empresa_id,nome)
);
create table if not exists public.maquinas (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null, nome text not null, tipo text not null, fabricante text, modelo text, numero_serie text,
  imagem_url text, setor_id uuid references public.setores(id) on delete set null, status text not null default 'disponivel'
    check(status in ('disponivel','producao','manutencao','parada','bloqueada')), localizacao text, ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(empresa_id,codigo)
);
create table if not exists public.programacoes_maquinas (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
  maquina_id uuid not null references public.maquinas(id) on delete cascade, ordem_id uuid references public.ordens_producao(id) on delete set null,
  data_inicio timestamptz not null, data_fim timestamptz not null, prioridade integer not null default 50,
  status text not null default 'programada' check(status in ('programada','em_execucao','concluida','cancelada')),
  observacao text, created_at timestamptz not null default now(), check(data_fim > data_inicio)
);
create table if not exists public.permissoes_modulos (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete cascade,
  setor_id uuid not null references public.setores(id) on delete cascade, modulo text not null,
  pode_visualizar boolean not null default true, pode_criar boolean not null default false, pode_editar boolean not null default false,
  pode_excluir boolean not null default false, unique(empresa_id,setor_id,modulo)
);
alter table public.setores enable row level security; alter table public.maquinas enable row level security; alter table public.programacoes_maquinas enable row level security; alter table public.permissoes_modulos enable row level security;
create policy tenant_access on public.setores for all to authenticated using ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id())) with check ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id()));
create policy tenant_access on public.maquinas for all to authenticated using ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id())) with check ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id()));
create policy tenant_access on public.programacoes_maquinas for all to authenticated using ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id())) with check ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id()));
create policy tenant_access on public.permissoes_modulos for all to authenticated using ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id())) with check ((select public.usuario_e_master()) or empresa_id=(select public.usuario_empresa_id()));
grant select,insert,update,delete on public.setores,public.maquinas,public.programacoes_maquinas,public.permissoes_modulos to authenticated;
grant usage,select on all sequences in schema public to authenticated;
insert into public.setores(empresa_id,codigo,nome)
select e.id,v.codigo,v.nome from public.empresas e cross join (values
 ('GER','Direção / Gerência'),('PCP','PCP'),('PROD','Produção'),('ALM','Almoxarifado'),('QUA','Qualidade'),('MAN','Manutenção'),('COM','Compras'),('VDA','Vendas / Comercial'),('FIN','Fiscal / Financeiro'),('ENG','Engenharia')
) v(codigo,nome) where e.ativo=true on conflict (empresa_id,nome) do nothing;
