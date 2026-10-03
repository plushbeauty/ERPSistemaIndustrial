create table if not exists public.erp_depreciacao_regras (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null,
 grupo_item text not null,
 dias_sem_giro integer not null check(dias_sem_giro>=0),
 percentual_depreciacao numeric(7,3) not null check(percentual_depreciacao>=0 and percentual_depreciacao<=100),
 ativo boolean not null default true,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create unique index if not exists ux_erp_depreciacao_regras_empresa_grupo_dias on public.erp_depreciacao_regras(empresa_id,grupo_item,dias_sem_giro);
create table if not exists public.erp_inventario_auditoria_saldos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null,
 ajustado_em timestamptz not null default now(),
 operador text not null,
 sku text not null,
 saldo_antigo numeric(18,3) not null,
 saldo_novo numeric(18,3) not null,
 ajuste_financeiro numeric(18,2) not null default 0,
 motivo text not null check(motivo in ('Quebra de Estoque','Sobra de Inventário','Ajuste Técnico')),
 justificativa text not null
);
alter table public.erp_depreciacao_regras enable row level security;
alter table public.erp_inventario_auditoria_saldos enable row level security;
drop policy if exists erp_depreciacao_regras_select on public.erp_depreciacao_regras;
drop policy if exists erp_depreciacao_regras_write on public.erp_depreciacao_regras;
drop policy if exists erp_inventario_auditoria_saldos_select on public.erp_inventario_auditoria_saldos;
create policy erp_depreciacao_regras_select on public.erp_depreciacao_regras for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_depreciacao_regras_write on public.erp_depreciacao_regras for all to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_inventario_auditoria_saldos_select on public.erp_inventario_auditoria_saldos for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create or replace function public.erp_depreciacao_salvar_regra(p_grupo_item text,p_dias_sem_giro integer,p_percentual_depreciacao numeric)
returns uuid language plpgsql security invoker set search_path=public as $$
declare v_empresa uuid; v_id uuid;
begin
 v_empresa:=public.erp_current_empresa_id(); if v_empresa is null and not public.erp_is_master() then raise exception 'Empresa não identificada.'; end if;
 if p_grupo_item is null or btrim(p_grupo_item)='' then raise exception 'Grupo do produto obrigatório.'; end if;
 if p_dias_sem_giro<0 or p_percentual_depreciacao<0 or p_percentual_depreciacao>100 then raise exception 'Parâmetros de depreciação inválidos.'; end if;
 insert into public.erp_depreciacao_regras(empresa_id,grupo_item,dias_sem_giro,percentual_depreciacao)
 values(v_empresa,btrim(p_grupo_item),p_dias_sem_giro,p_percentual_depreciacao)
 on conflict(empresa_id,grupo_item,dias_sem_giro) do update set percentual_depreciacao=excluded.percentual_depreciacao,ativo=true,atualizado_em=now()
 returning id into v_id;
 return v_id;
end; $$;
create or replace function public.erp_depreciacao_desativar_regra(p_regra_id uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 update public.erp_depreciacao_regras set ativo=false,atualizado_em=now()
 where id=p_regra_id and (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
 return found;
end; $$;
revoke all on function public.erp_depreciacao_salvar_regra(text,integer,numeric) from public,anon;
revoke all on function public.erp_depreciacao_desativar_regra(uuid) from public,anon;
grant execute on function public.erp_depreciacao_salvar_regra(text,integer,numeric) to authenticated;
grant execute on function public.erp_depreciacao_desativar_regra(uuid) to authenticated;
grant select,insert,update,delete on public.erp_depreciacao_regras to authenticated;
grant select on public.erp_inventario_auditoria_saldos to authenticated;
