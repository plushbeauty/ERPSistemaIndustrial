begin;
insert into public.erp_permissions(id,codigo,nome,description,modulo,ativo)
select gen_random_uuid(),v.codigo,v.nome,v.descricao,'rh',true
from (values
 ('hr.read','RH: visualizar','Consultar cadastros e dados de funcionários'),
 ('hr.create','RH: cadastrar','Cadastrar funcionários'),
 ('hr.update','RH: alterar','Alterar cadastros de funcionários'),
 ('hr.delete','RH: excluir','Inativar ou excluir cadastros de funcionários')
) as v(codigo,nome,descricao)
where not exists(select 1 from public.erp_permissions p where p.codigo=v.codigo);
insert into public.erp_role_permissions(role_id,permission_id)
select r.id,p.id from public.erp_roles r join public.erp_permissions p on p.codigo in ('hr.read','hr.create','hr.update','hr.delete')
where r.codigo='ADMIN' and not exists(select 1 from public.erp_role_permissions rp where rp.role_id=r.id and rp.permission_id=p.id);

alter table public.erp_producao_paradas add column if not exists operador_id uuid references public.erp_funcionarios(id);
alter table public.erp_producao_paradas add column if not exists encerrado_por_operador_id uuid references public.erp_funcionarios(id);
create index if not exists erp_producao_paradas_operador_idx on public.erp_producao_paradas(empresa_id,operador_id,inicio desc);
create index if not exists erp_producao_paradas_encerrado_por_idx on public.erp_producao_paradas(empresa_id,encerrado_por_operador_id);
alter table public.erp_funcionarios enable row level security;
alter table public.erp_pcp_programacoes enable row level security;
alter table public.erp_fichas_processo enable row level security;
alter table public.erp_ficha_processo_operacoes enable row level security;
alter table public.erp_producao_paradas enable row level security;
alter table public.erp_maquinas enable row level security;
alter table public.erp_ordens_producao enable row level security;
alter table public.erp_produtos enable row level security;
alter table public.erp_receitas_processos enable row level security;
alter table public.erp_apontamentos_processo enable row level security;
do $$ declare r record; begin
 for r in select tablename,policyname from pg_policies where schemaname='public' and tablename=any(array['erp_funcionarios','erp_pcp_programacoes','erp_fichas_processo','erp_ficha_processo_operacoes','erp_producao_paradas','erp_maquinas','erp_ordens_producao','erp_produtos','erp_receitas_processos','erp_apontamentos_processo'])
 loop execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename); end loop;
end $$;
CREATE OR REPLACE FUNCTION public.erp_operador_parada_permitida(p_maquina_id uuid, p_ordem_producao_id uuid, p_operador_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select p_operador_id is not null
   and p_operador_id=public.erp_operador_sessao_funcionario_id()
   and exists(
    select 1 from public.erp_pcp_programacoes p
    where p.empresa_id=public.erp_current_empresa_id()
      and p.maquina_id=p_maquina_id
      and p.ordem_producao_id=p_ordem_producao_id
      and p_operador_id in (p.operador_id,p.operador_a_id,p.operador_b_id,p.operador_frente_id,p.operador_atras_id)
   )
$function$


CREATE OR REPLACE FUNCTION public.erp_operador_programacao_ativa(p_programacao_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select exists(
  select 1
  from public.erp_pcp_programacoes p
  where p.id=p_programacao_id
    and p.empresa_id=public.erp_current_empresa_id()
    and public.erp_operador_sessao_funcionario_id() in (p.operador_id,p.operador_a_id,p.operador_b_id,p.operador_frente_id,p.operador_atras_id)
 )
$function$


CREATE OR REPLACE FUNCTION public.erp_operador_sessao_ativa(p_funcionario_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select p_funcionario_id is not null
    and p_funcionario_id=public.erp_operador_sessao_funcionario_id()
$function$


CREATE OR REPLACE FUNCTION public.erp_operador_sessao_funcionario_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select s.funcionario_id
 from public.erp_operador_sessoes s
 where s.empresa_id=public.erp_current_empresa_id()
   and s.auth_user_id=auth.uid()
   and s.encerrada_em is null
   and s.expira_em>now()
 order by s.identificado_em desc
 limit 1
$function$


CREATE OR REPLACE FUNCTION public.erp_operador_tem_programacao(p_tipo text, p_entidade_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 select exists(
  select 1
  from public.erp_pcp_programacoes p
  where p.empresa_id=public.erp_current_empresa_id()
    and public.erp_operador_sessao_funcionario_id() in (p.operador_id,p.operador_a_id,p.operador_b_id,p.operador_frente_id,p.operador_atras_id)
    and (
      (upper(p_tipo)='OP' and p.ordem_producao_id=p_entidade_id)
      or (upper(p_tipo)='PRODUTO' and p.produto_id=p_entidade_id)
      or (upper(p_tipo)='MAQUINA' and p.maquina_id=p_entidade_id)
      or (upper(p_tipo)='FICHA' and exists(
        select 1 from public.erp_fichas_processo f
        where f.id=p_entidade_id and f.empresa_id=p.empresa_id and f.produto_id=p.produto_id
      ))
    )
 )
$function$


CREATE OR REPLACE FUNCTION public.erp_producao_paradas_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
 if public.erp_is_master() or public.erp_has_permission('production.update') or public.erp_has_permission('manutencao.editar') then
  return new;
 end if;
 if not public.erp_operador_parada_permitida(new.maquina_id,new.ordem_producao_id,new.encerrado_por_operador_id) then
  raise exception 'OPERADOR_SEM_SESSAO_OU_SEM_PROGRAMACAO_PARA_ENCERRAR_PARADA' using errcode='42501';
 end if;
 if new.empresa_id is distinct from old.empresa_id
    or new.maquina_id is distinct from old.maquina_id
    or new.ordem_producao_id is distinct from old.ordem_producao_id
    or new.operador_id is distinct from old.operador_id
    or new.motivo is distinct from old.motivo
    or new.inicio is distinct from old.inicio
    or new.ordem_manutencao_id is distinct from old.ordem_manutencao_id then
  raise exception 'OPERADOR_PODE_APENAS_ENCERRAR_PARADA_EXISTENTE' using errcode='42501';
 end if;
 return new;
end;
$function$


revoke all on function public.erp_operador_sessao_funcionario_id() from public,anon;
grant execute on function public.erp_operador_sessao_funcionario_id() to authenticated;
revoke all on function public.erp_operador_sessao_ativa(uuid) from public,anon;
grant execute on function public.erp_operador_sessao_ativa(uuid) to authenticated;
revoke all on function public.erp_operador_programacao_ativa(uuid) from public,anon;
grant execute on function public.erp_operador_programacao_ativa(uuid) to authenticated;
revoke all on function public.erp_operador_tem_programacao(text,uuid) from public,anon;
grant execute on function public.erp_operador_tem_programacao(text,uuid) to authenticated;
revoke all on function public.erp_operador_parada_permitida(uuid,uuid,uuid) from public,anon;
grant execute on function public.erp_operador_parada_permitida(uuid,uuid,uuid) to authenticated;
revoke all on function public.erp_producao_paradas_guard_update() from public,anon,authenticated;
drop trigger if exists trg_erp_producao_paradas_guard_update on public.erp_producao_paradas;
create trigger trg_erp_producao_paradas_guard_update before update on public.erp_producao_paradas for each row execute function public.erp_producao_paradas_guard_update();

create policy erp_apontamentos_processo_insert on public.erp_apontamentos_processo as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission))));
create policy erp_apontamentos_processo_select on public.erp_apontamentos_processo as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_operador_sessao_ativa(erp_apontamentos_processo.operador_id) AS erp_operador_sessao_ativa)))));
create policy erp_apontamentos_processo_update on public.erp_apontamentos_processo as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR (empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))));
create policy erp_ficha_processo_operacoes_delete_rbac on public.erp_ficha_processo_operacoes as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission))));
create policy erp_ficha_processo_operacoes_insert_rbac on public.erp_ficha_processo_operacoes as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission))));
create policy erp_ficha_processo_operacoes_select_rbac on public.erp_ficha_processo_operacoes as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_operador_tem_programacao('FICHA'::text, erp_ficha_processo_operacoes.ficha_processo_id) AS erp_operador_tem_programacao)))));
create policy erp_ficha_processo_operacoes_update_rbac on public.erp_ficha_processo_operacoes as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission))));
create policy erp_fichas_processo_delete_rbac on public.erp_fichas_processo as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission))));
create policy erp_fichas_processo_insert_rbac on public.erp_fichas_processo as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission))));
create policy erp_fichas_processo_select_rbac on public.erp_fichas_processo as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_operador_tem_programacao('PRODUTO'::text, erp_fichas_processo.produto_id) AS erp_operador_tem_programacao)))));
create policy erp_fichas_processo_update_rbac on public.erp_fichas_processo as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission))));
create policy erp_funcionarios_delete_hr on public.erp_funcionarios as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('hr.delete'::text) AS erp_has_permission))));
create policy erp_funcionarios_insert_hr on public.erp_funcionarios as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('hr.create'::text) AS erp_has_permission))));
create policy erp_funcionarios_select_hr on public.erp_funcionarios as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('hr.read'::text) AS erp_has_permission))));
create policy erp_funcionarios_update_hr on public.erp_funcionarios as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('hr.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('hr.update'::text) AS erp_has_permission))));
create policy erp_maquinas_insert on public.erp_maquinas as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission))));
create policy erp_maquinas_manutencao_insert on public.erp_maquinas as permissive for insert to authenticated with check ((erp_is_master() OR ((empresa_id = erp_current_empresa_id()) AND erp_has_permission('manutencao.criar'::text))));
create policy erp_maquinas_select_rbac on public.erp_maquinas as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('manutencao.ver'::text) AS erp_has_permission) OR ( SELECT erp_operador_tem_programacao('MAQUINA'::text, erp_maquinas.id) AS erp_operador_tem_programacao)))));
create policy erp_maquinas_manutencao_update on public.erp_maquinas as permissive for update to authenticated using ((erp_is_master() OR ((empresa_id = erp_current_empresa_id()) AND erp_has_permission('manutencao.editar'::text)))) with check ((erp_is_master() OR ((empresa_id = erp_current_empresa_id()) AND erp_has_permission('manutencao.editar'::text))));
create policy erp_maquinas_update on public.erp_maquinas as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR (empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))));
create policy erp_ordens_producao_insert_rbac on public.erp_ordens_producao as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission))));
create policy erp_ordens_producao_select_rbac on public.erp_ordens_producao as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission) OR ( SELECT erp_operador_tem_programacao('OP'::text, erp_ordens_producao.id) AS erp_operador_tem_programacao)))));
create policy erp_ordens_producao_update_rbac on public.erp_ordens_producao as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission)))));
create policy erp_pcp_programacoes_delete_rbac on public.erp_pcp_programacoes as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission))));
create policy erp_pcp_programacoes_insert_rbac on public.erp_pcp_programacoes as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission))));
create policy erp_pcp_programacoes_select_rbac on public.erp_pcp_programacoes as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_operador_programacao_ativa(erp_pcp_programacoes.id) AS erp_operador_programacao_ativa)))));
create policy erp_pcp_programacoes_update_rbac on public.erp_pcp_programacoes as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission))));
create policy erp_producao_paradas_delete_rbac on public.erp_producao_paradas as permissive for delete to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('manutencao.excluir'::text) AS erp_has_permission)))));
create policy erp_producao_paradas_insert_rbac on public.erp_producao_paradas as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('manutencao.criar'::text) AS erp_has_permission) OR ((ordem_manutencao_id IS NULL) AND (operador_id = erp_operador_sessao_funcionario_id()) AND ( SELECT erp_operador_parada_permitida(erp_producao_paradas.maquina_id, erp_producao_paradas.ordem_producao_id, erp_producao_paradas.operador_id) AS erp_operador_parada_permitida))))));
create policy erp_producao_paradas_select_rbac on public.erp_producao_paradas as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('manutencao.ver'::text) AS erp_has_permission) OR ((ordem_manutencao_id IS NULL) AND ( SELECT erp_operador_parada_permitida(erp_producao_paradas.maquina_id, erp_producao_paradas.ordem_producao_id, erp_operador_sessao_funcionario_id()) AS erp_operador_parada_permitida))))));
create policy erp_producao_paradas_update_rbac on public.erp_producao_paradas as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('manutencao.editar'::text) AS erp_has_permission) OR ((ordem_manutencao_id IS NULL) AND ( SELECT erp_operador_parada_permitida(erp_producao_paradas.maquina_id, erp_producao_paradas.ordem_producao_id, erp_operador_sessao_funcionario_id()) AS erp_operador_parada_permitida)))))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('manutencao.editar'::text) AS erp_has_permission) OR ((ordem_manutencao_id IS NULL) AND (encerrado_por_operador_id = erp_operador_sessao_funcionario_id()) AND ( SELECT erp_operador_parada_permitida(erp_producao_paradas.maquina_id, erp_producao_paradas.ordem_producao_id, erp_producao_paradas.encerrado_por_operador_id) AS erp_operador_parada_permitida))))));
create policy erp_produtos_tenant_insert on public.erp_produtos as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('products.create'::text) AS erp_has_permission))));
create policy erp_produtos_tenant_select on public.erp_produtos as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('products.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('products.create'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('products.update'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('sales.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('inventory.read'::text) AS erp_has_permission) OR ( SELECT erp_has_permission('purchases.read'::text) AS erp_has_permission) OR ( SELECT erp_operador_tem_programacao('PRODUTO'::text, erp_produtos.id) AS erp_operador_tem_programacao)))));
create policy erp_produtos_tenant_update on public.erp_produtos as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('products.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('products.update'::text) AS erp_has_permission))));
create policy erp_produtos_update_custo_padrao on public.erp_produtos as permissive for update to authenticated using ((erp_is_master() OR ((empresa_id = erp_current_empresa_id()) AND erp_has_permission('financeiro.custo_padrao.editar'::text)))) with check ((erp_is_master() OR ((empresa_id = erp_current_empresa_id()) AND erp_has_permission('financeiro.custo_padrao.editar'::text))));
create policy erp_receitas_processos_insert on public.erp_receitas_processos as permissive for insert to authenticated with check ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.create'::text) AS erp_has_permission))));
create policy erp_receitas_processos_select on public.erp_receitas_processos as permissive for select to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND (( SELECT erp_has_permission('production.read'::text) AS erp_has_permission) OR ( SELECT erp_operador_tem_programacao('PRODUTO'::text, erp_receitas_processos.produto_id) AS erp_operador_tem_programacao)))));
create policy erp_receitas_processos_update on public.erp_receitas_processos as permissive for update to authenticated using ((( SELECT erp_is_master() AS erp_is_master) OR ((empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id)) AND ( SELECT erp_has_permission('production.update'::text) AS erp_has_permission)))) with check ((( SELECT erp_is_master() AS erp_is_master) OR (empresa_id = ( SELECT erp_current_empresa_id() AS erp_current_empresa_id))));
commit;
notify pgrst,'reload schema';
