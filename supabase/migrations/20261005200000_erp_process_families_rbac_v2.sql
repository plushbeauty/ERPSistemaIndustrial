-- ERP Industrial: RBAC hardening for industrial process families.
-- Process/ferramental/recipe access follows the canonical producao.* permissions.
-- Hard delete is intentionally not exposed; business deactivation uses UPDATE ativo=false.

drop policy if exists erp_processos_industriais_tenant on public.erp_processos_industriais;
drop policy if exists erp_processos_industriais_select on public.erp_processos_industriais;
drop policy if exists erp_processos_industriais_insert on public.erp_processos_industriais;
drop policy if exists erp_processos_industriais_update on public.erp_processos_industriais;

create policy erp_processos_industriais_select
on public.erp_processos_industriais
for select to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.ver'))
  )
);

create policy erp_processos_industriais_insert
on public.erp_processos_industriais
for insert to authenticated
with check (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.criar'))
  )
);

create policy erp_processos_industriais_update
on public.erp_processos_industriais
for update to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.editar'))
  )
)
with check (
  (select public.erp_is_master())
  or empresa_id = (select public.erp_current_empresa_id())
);

drop policy if exists erp_ferramentas_industriais_tenant on public.erp_ferramentas_industriais;
drop policy if exists erp_ferramentas_industriais_select on public.erp_ferramentas_industriais;
drop policy if exists erp_ferramentas_industriais_insert on public.erp_ferramentas_industriais;
drop policy if exists erp_ferramentas_industriais_update on public.erp_ferramentas_industriais;

create policy erp_ferramentas_industriais_select
on public.erp_ferramentas_industriais
for select to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.ver'))
  )
);

create policy erp_ferramentas_industriais_insert
on public.erp_ferramentas_industriais
for insert to authenticated
with check (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.criar'))
  )
);

create policy erp_ferramentas_industriais_update
on public.erp_ferramentas_industriais
for update to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.editar'))
  )
)
with check (
  (select public.erp_is_master())
  or empresa_id = (select public.erp_current_empresa_id())
);

drop policy if exists erp_receitas_processos_tenant on public.erp_receitas_processos;
drop policy if exists erp_receitas_processos_select on public.erp_receitas_processos;
drop policy if exists erp_receitas_processos_insert on public.erp_receitas_processos;
drop policy if exists erp_receitas_processos_update on public.erp_receitas_processos;

create policy erp_receitas_processos_select
on public.erp_receitas_processos
for select to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.ver'))
  )
);

create policy erp_receitas_processos_insert
on public.erp_receitas_processos
for insert to authenticated
with check (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.criar'))
  )
);

create policy erp_receitas_processos_update
on public.erp_receitas_processos
for update to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.editar'))
  )
)
with check (
  (select public.erp_is_master())
  or empresa_id = (select public.erp_current_empresa_id())
);

drop policy if exists erp_apontamentos_processo_tenant on public.erp_apontamentos_processo;
drop policy if exists erp_apontamentos_processo_select on public.erp_apontamentos_processo;
drop policy if exists erp_apontamentos_processo_insert on public.erp_apontamentos_processo;
drop policy if exists erp_apontamentos_processo_update on public.erp_apontamentos_processo;

create policy erp_apontamentos_processo_select
on public.erp_apontamentos_processo
for select to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.ver'))
  )
);

create policy erp_apontamentos_processo_insert
on public.erp_apontamentos_processo
for insert to authenticated
with check (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.apontar'))
  )
);

create policy erp_apontamentos_processo_update
on public.erp_apontamentos_processo
for update to authenticated
using (
  (select public.erp_is_master())
  or (
    empresa_id = (select public.erp_current_empresa_id())
    and (select public.erp_has_permission('producao.apontar'))
  )
)
with check (
  (select public.erp_is_master())
  or empresa_id = (select public.erp_current_empresa_id())
);

revoke delete on public.erp_processos_industriais,
  public.erp_ferramentas_industriais,
  public.erp_receitas_processos,
  public.erp_apontamentos_processo
from authenticated;
