create table if not exists public.erp_planos_catalogo (
 id uuid primary key default gen_random_uuid(), codigo text not null unique, nome text not null, ordem integer not null default 0,
 preco_mensal numeric(14,2) not null default 0, descricao text, ativo boolean not null default true,
 criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table if not exists public.erp_plano_modulos (
 id uuid primary key default gen_random_uuid(), plano_codigo text not null references public.erp_planos_catalogo(codigo) on update cascade on delete cascade,
 modulo_codigo text not null, modulo_nome text not null, acesso boolean not null default true,
 limite_usuarios integer, limite_empresas integer, recursos jsonb not null default '{}'::jsonb,
 criado_em timestamptz not null default now(), unique(plano_codigo,modulo_codigo)
);
alter table public.erp_planos_catalogo enable row level security;
alter table public.erp_plano_modulos enable row level security;
create policy if not exists erp_planos_catalogo_select on public.erp_planos_catalogo for select to authenticated using (ativo=true or public.erp_is_master());
create policy if not exists erp_plano_modulos_select on public.erp_plano_modulos for select to authenticated using (exists(select 1 from public.erp_planos_catalogo p where p.codigo=plano_codigo and (p.ativo=true or public.erp_is_master())));
insert into public.erp_planos_catalogo(codigo,nome,ordem,preco_mensal,descricao) values
('essencial','Essencial',1,199,'Base operacional industrial'),('profissional','Profissional',2,349,'Operação industrial integrada'),('diamante','Diamante',3,549,'Gestão industrial avançada e completa')
on conflict(codigo) do update set nome=excluded.nome,ordem=excluded.ordem,preco_mensal=excluded.preco_mensal,descricao=excluded.descricao,atualizado_em=now();
