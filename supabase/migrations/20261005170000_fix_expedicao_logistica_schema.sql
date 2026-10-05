begin;

create table if not exists public.erp_veiculos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  placa text not null,
  descricao text,
  capacidade_kg numeric(14,3) not null default 0 check (capacidade_kg >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, placa)
);

create table if not exists public.erp_motoristas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  nome text not null,
  documento text,
  cnh text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.erp_expedicoes add column if not exists veiculo_id uuid references public.erp_veiculos(id);
alter table public.erp_expedicoes add column if not exists motorista_id uuid references public.erp_motoristas(id);
alter table public.erp_expedicoes add column if not exists capacidade_kg numeric(14,3);
alter table public.erp_expedicoes add column if not exists peso_total_kg numeric(14,3) not null default 0;
alter table public.erp_expedicoes add column if not exists updated_at timestamptz not null default now();

create table if not exists public.erp_expedicao_notas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  expedicao_id uuid not null references public.erp_expedicoes(id) on delete cascade,
  nota_fiscal_id uuid not null references public.erp_documentos_fiscais(id) on delete restrict,
  peso_kg numeric(14,3) not null default 0,
  cidade text,
  created_at timestamptz not null default now(),
  unique (expedicao_id, nota_fiscal_id)
);

create index if not exists idx_erp_veiculos_empresa on public.erp_veiculos(empresa_id, ativo);
create index if not exists idx_erp_motoristas_empresa on public.erp_motoristas(empresa_id, ativo);
create index if not exists idx_erp_expedicoes_empresa on public.erp_expedicoes(empresa_id, created_at desc);
create index if not exists idx_erp_expedicao_notas_expedicao on public.erp_expedicao_notas(expedicao_id);

alter table public.erp_veiculos enable row level security;
alter table public.erp_motoristas enable row level security;
alter table public.erp_expedicao_notas enable row level security;

grant select,insert,update,delete on public.erp_veiculos, public.erp_motoristas, public.erp_expedicao_notas to authenticated;

drop policy if exists erp_veiculos_select on public.erp_veiculos;
create policy erp_veiculos_select on public.erp_veiculos for select to authenticated using (public.erp_is_master() or empresa_id=public.erp_current_empresa_id());
drop policy if exists erp_veiculos_insert on public.erp_veiculos;
create policy erp_veiculos_insert on public.erp_veiculos for insert to authenticated with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_veiculos_update on public.erp_veiculos;
create policy erp_veiculos_update on public.erp_veiculos for update to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_veiculos_delete on public.erp_veiculos;
create policy erp_veiculos_delete on public.erp_veiculos for delete to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_motoristas_select on public.erp_motoristas;
create policy erp_motoristas_select on public.erp_motoristas for select to authenticated using (public.erp_is_master() or empresa_id=public.erp_current_empresa_id());
drop policy if exists erp_motoristas_insert on public.erp_motoristas;
create policy erp_motoristas_insert on public.erp_motoristas for insert to authenticated with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_motoristas_update on public.erp_motoristas;
create policy erp_motoristas_update on public.erp_motoristas for update to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_motoristas_delete on public.erp_motoristas;
create policy erp_motoristas_delete on public.erp_motoristas for delete to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_expedicao_notas_select on public.erp_expedicao_notas;
create policy erp_expedicao_notas_select on public.erp_expedicao_notas for select to authenticated using (public.erp_is_master() or empresa_id=public.erp_current_empresa_id());
drop policy if exists erp_expedicao_notas_insert on public.erp_expedicao_notas;
create policy erp_expedicao_notas_insert on public.erp_expedicao_notas for insert to authenticated with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_expedicao_notas_delete on public.erp_expedicao_notas;
create policy erp_expedicao_notas_delete on public.erp_expedicao_notas for delete to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

insert into public.erp_permissions (code,name,description) values
('expedicao.ver','Visualizar expedição','Visualizar logística e romaneios'),
('expedicao.criar','Criar romaneios','Criar romaneios de expedição'),
('expedicao.editar','Liberar romaneios','Liberar saídas de expedição'),
('expedicao.excluir','Excluir registros de expedição','Excluir registros de expedição')
on conflict (code) do update set name=excluded.name,description=excluded.description;

create or replace function public.erp_expedicao_criar_romaneio(
 p_numero bigint,p_veiculo_id uuid,p_motorista_id uuid,p_transportadora text,p_capacidade_kg numeric,p_data_expedicao date,p_documento_fiscal_ids uuid[]
) returns table(id uuid,peso_total_kg numeric)
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id(); v_vehicle_capacity numeric; v_capacity numeric; v_weight numeric; v_count bigint; v_id uuid;
begin
 if auth.uid() is null or v_empresa is null then raise exception 'Sessão ERP autenticada e empresa ativa são obrigatórias.' using errcode='42501'; end if;
 if not public.erp_has_permission('expedicao','ver') or not public.erp_has_permission('expedicao','criar') then raise exception 'Sem permissão para consultar e criar romaneios.' using errcode='42501'; end if;
 if p_numero is null or p_numero<=0 or p_veiculo_id is null or p_motorista_id is null then raise exception 'Número, veículo e motorista são obrigatórios.' using errcode='22023'; end if;
 if p_documento_fiscal_ids is null or cardinality(p_documento_fiscal_ids)=0 or cardinality(p_documento_fiscal_ids)>500 then raise exception 'Selecione entre 1 e 500 notas fiscais.' using errcode='22023'; end if;
 select capacidade_kg into v_vehicle_capacity from public.erp_veiculos where id=p_veiculo_id and empresa_id=v_empresa and ativo=true;
 if not found then raise exception 'Veículo ativo não localizado na empresa atual.' using errcode='23503'; end if;
 if not exists(select 1 from public.erp_motoristas where id=p_motorista_id and empresa_id=v_empresa and ativo=true) then raise exception 'Motorista ativo não localizado na empresa atual.' using errcode='23503'; end if;
 v_capacity:=coalesce(nullif(p_capacidade_kg,0),nullif(v_vehicle_capacity,0));
 if v_vehicle_capacity>0 and coalesce(p_capacidade_kg,0)>v_vehicle_capacity then raise exception 'A capacidade manual não pode exceder a capacidade cadastrada do veículo.' using errcode='22023'; end if;
 select count(*),coalesce(sum(coalesce(peso_bruto,peso_liquido,0)),0) into v_count,v_weight from public.erp_documentos_fiscais where id=any(p_documento_fiscal_ids) and empresa_id=v_empresa and modelo='55' and status='Autorizada';
 if v_count<>cardinality(p_documento_fiscal_ids) then raise exception 'Uma ou mais notas estão fora da empresa, não autorizadas ou não são NF-e modelo 55.' using errcode='23503'; end if;
 if v_capacity is not null and v_capacity>0 and v_weight>v_capacity then raise exception 'A carga excede a capacidade real do veículo.' using errcode='23514'; end if;
 insert into public.erp_expedicoes(empresa_id,numero,status,veiculo_id,motorista_id,transportadora,capacidade_kg,peso_total_kg,data_expedicao)
 values(v_empresa,p_numero,'PREPARACAO',p_veiculo_id,p_motorista_id,nullif(btrim(coalesce(p_transportadora,'')),''),v_capacity,v_weight,p_data_expedicao)
 returning erp_expedicoes.id into v_id;
 insert into public.erp_expedicao_notas(empresa_id,expedicao_id,nota_fiscal_id,peso_kg,cidade)
 select v_empresa,v_id,d.id,coalesce(d.peso_bruto,d.peso_liquido,0),nullif(concat_ws(' / ',nullif(btrim(d.destinatario_cidade),''),nullif(btrim(d.destinatario_uf),'')),'') from public.erp_documentos_fiscais d where d.id=any(p_documento_fiscal_ids) and d.empresa_id=v_empresa;
 return query select v_id,v_weight;
end; $$;

revoke all on function public.erp_expedicao_criar_romaneio(bigint,uuid,uuid,text,numeric,date,uuid[]) from public,anon;
grant execute on function public.erp_expedicao_criar_romaneio(bigint,uuid,uuid,text,numeric,date,uuid[]) to authenticated;

commit;