-- Quality / inventory hardening: dimensional drawing tolerances, raw-material certificates,
-- controlled attachments and non-blocking cycle-count snapshots.
create table if not exists public.erp_ppap_desenhos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ppap_id uuid not null references public.erp_ppap_ria(id) on delete cascade,
 numero_desenho text not null,
 revisao text not null,
 descricao text,
 arquivo_url text,
 arquivo_nome text,
 created_at timestamptz not null default now()
);
create table if not exists public.erp_ppap_dimensoes (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ppap_id uuid not null references public.erp_ppap_ria(id) on delete cascade,
 sequencia integer not null,
 codigo_caracteristica text not null,
 descricao text not null,
 tipo text not null default 'DIMENSIONAL',
 unidade text,
 nominal numeric(18,6),
 tolerancia_plus numeric(18,6),
 tolerancia_minus numeric(18,6),
 limite_inferior numeric(18,6),
 limite_superior numeric(18,6),
 metodo_medicao text,
 instrumento text,
 amostras numeric(18,6)[] not null default '{}',
 observacao text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.erp_ppap_materiais (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ppap_id uuid not null references public.erp_ppap_ria(id) on delete cascade,
 produto_id uuid references public.erp_produtos(id) on delete set null,
 codigo_material text not null,
 descricao text not null,
 fornecedor text,
 lote text,
 numero_certificado text,
 certificado_url text,
 desenho_url text,
 status text not null default 'PENDENTE',
 observacao text,
 created_at timestamptz not null default now()
);
create table if not exists public.erp_ppap_anexos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ppap_id uuid not null references public.erp_ppap_ria(id) on delete cascade,
 categoria text not null,
 nome_arquivo text not null,
 storage_path text not null,
 mime_type text,
 created_at timestamptz not null default now()
);

create table if not exists public.erp_estoque_inventarios (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 codigo_inventario text not null,
 data_inicio timestamptz not null default now(),
 data_fim timestamptz,
 status text not null default 'EM_CONTAGEM',
 created_at timestamptz not null default now(),
 unique(empresa_id,codigo_inventario)
);
create table if not exists public.erp_estoque_inventarios_itens (
 id uuid primary key default gen_random_uuid(),
 inventario_id uuid not null references public.erp_estoque_inventarios(id) on delete cascade,
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 item_id uuid not null references public.erp_produtos(id) on delete cascade,
 quantidade_sistema_congelada numeric(18,6) not null,
 quantidade_contada_fisica numeric(18,6),
 quantidade_movimento_concorrente numeric(18,6) not null default 0,
 quantidade_venda_concorrente numeric(18,6) not null default 0,
 divergencia numeric(18,6),
 created_at timestamptz not null default now(),
 unique(inventario_id,item_id)
);

create index if not exists idx_ppap_dimensoes_ppap on public.erp_ppap_dimensoes(ppap_id,sequencia);
create index if not exists idx_ppap_materiais_ppap on public.erp_ppap_materiais(ppap_id);
create index if not exists idx_ppap_anexos_ppap on public.erp_ppap_anexos(ppap_id);
create index if not exists idx_inv_itens_inv on public.erp_estoque_inventarios_itens(inventario_id);

do $$ declare t text; begin
 foreach t in array array['erp_ppap_desenhos','erp_ppap_dimensoes','erp_ppap_materiais','erp_ppap_anexos','erp_estoque_inventarios','erp_estoque_inventarios_itens'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I_tenant on public.%I',t,t);
  execute format('create policy %I_tenant on public.%I for all to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())',t,t);
 end loop;
end $$;

create or replace function public.erp_inventario_iniciar(p_codigo text)
returns uuid
language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare v_empresa uuid; v_inv uuid;
begin
 v_empresa:=public.erp_current_empresa_id();
 if v_empresa is null then raise exception 'Empresa não identificada'; end if;
 insert into public.erp_estoque_inventarios(empresa_id,codigo_inventario)
 values(v_empresa,p_codigo) returning id into v_inv;
 insert into public.erp_estoque_inventarios_itens(inventario_id,empresa_id,item_id,quantidade_sistema_congelada)
 select v_inv,v_empresa,p.id,coalesce(p.estoque_atual,0)
 from public.erp_produtos p
 where p.empresa_id=v_empresa and coalesce(p.ativo,true)=true;
 return v_inv;
end $$;

create or replace function public.erp_inventario_processar(p_inventario_id uuid)
returns void
language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare v_empresa uuid;
begin
 v_empresa:=public.erp_current_empresa_id();
 if v_empresa is null then raise exception 'Empresa não identificada'; end if;
 if not exists(select 1 from public.erp_estoque_inventarios where id=p_inventario_id and empresa_id=v_empresa and status='EM_CONTAGEM') then
  raise exception 'Inventário não encontrado ou já processado';
 end if;
 update public.erp_estoque_inventarios_itens i
 set quantidade_movimento_concorrente=coalesce(p.estoque_atual,0)-i.quantidade_sistema_congelada,
     divergencia=coalesce(i.quantidade_contada_fisica,0)-coalesce(p.estoque_atual,0)
 from public.erp_produtos p
 where i.inventario_id=p_inventario_id and p.id=i.item_id and p.empresa_id=v_empresa;
 update public.erp_produtos p
 set estoque_atual=coalesce(i.quantidade_contada_fisica,0)
 from public.erp_estoque_inventarios_itens i
 where i.inventario_id=p_inventario_id and p.id=i.item_id and p.empresa_id=v_empresa
   and i.quantidade_contada_fisica is not null;
 update public.erp_estoque_inventarios set status='PROCESSADO',data_fim=now() where id=p_inventario_id and empresa_id=v_empresa;
end $$;
revoke all on function public.erp_inventario_iniciar(text) from public;
revoke all on function public.erp_inventario_processar(uuid) from public;
grant execute on function public.erp_inventario_iniciar(text) to authenticated;
grant execute on function public.erp_inventario_processar(uuid) to authenticated;
