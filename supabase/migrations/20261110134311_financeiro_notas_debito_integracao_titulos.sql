-- Integra notas de débito com parceiros, contas, centros de custo e títulos financeiros.
begin;
alter table public.erp_notas_debito_financeiras
 add column if not exists fornecedor_id uuid references public.erp_fornecedores(id) on delete restrict,
 add column if not exists categoria text,
 add column if not exists titulo_id uuid references public.erp_financeiro_titulos(id) on delete set null;
create unique index if not exists erp_notas_debito_financeiras_empresa_numero_uk on public.erp_notas_debito_financeiras(empresa_id,lower(numero_nota)) where numero_nota is not null;
alter table public.erp_notas_debito_financeiras drop constraint if exists erp_notas_debito_financeiras_parceiro_ck;
alter table public.erp_notas_debito_financeiras add constraint erp_notas_debito_financeiras_parceiro_ck check(num_nonnulls(cliente_id,fornecedor_id)=1);
drop policy if exists erp_notas_debito_financeiras_tenant on public.erp_notas_debito_financeiras;
create policy erp_notas_debito_financeiras_tenant on public.erp_notas_debito_financeiras for all to authenticated
using(empresa_id=public.erp_current_empresa_id())
with check(empresa_id=public.erp_current_empresa_id()
 and exists(select 1 from public.erp_contas_bancarias c where c.id=conta_bancaria_id and c.empresa_id=public.erp_current_empresa_id() and c.ativo)
 and exists(select 1 from public.erp_centros_custos cc where cc.id=centro_custo_id and cc.empresa_id=public.erp_current_empresa_id() and cc.ativo)
 and ((cliente_id is not null and fornecedor_id is null and exists(select 1 from public.erp_clientes cl where cl.id=cliente_id and cl.empresa_id=public.erp_current_empresa_id() and cl.ativo))
 or (fornecedor_id is not null and cliente_id is null and exists(select 1 from public.erp_fornecedores f where f.id=fornecedor_id and f.empresa_id=public.erp_current_empresa_id() and f.ativo))));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('financeiro-notas-debito','financeiro-notas-debito',false,15728640,array['application/pdf','application/x-ofx','application/octet-stream','image/png','image/jpeg','text/plain'])
on conflict(id) do update set public=false,file_size_limit=15728640,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists financeiro_notas_debito_select on storage.objects;
create policy financeiro_notas_debito_select on storage.objects for select to authenticated using(bucket_id='financeiro-notas-debito' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists financeiro_notas_debito_insert on storage.objects;
create policy financeiro_notas_debito_insert on storage.objects for insert to authenticated with check(bucket_id='financeiro-notas-debito' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
create or replace function public.erp_financeiro_criar_nota_debito(
 p_empresa_id uuid,p_numero_nota text,p_documento_ref text,p_cliente_id uuid,p_fornecedor_id uuid,p_entidade_nome text,
 p_data_emissao date,p_data_vencimento date,p_tipo_lancamento text,p_valor_principal numeric,p_acrescimos numeric,p_descontos numeric,
 p_conta_bancaria_id uuid,p_centro_custo_id uuid,p_categoria text,p_descricao text,p_comprovante_path text,p_gerar_titulo boolean,p_disponibilizar_conciliacao boolean
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $function$
declare v_auth uuid:=auth.uid(); v_user public.erp_usuarios%rowtype; v_note uuid; v_title uuid; v_type text:=upper(btrim(coalesce(p_tipo_lancamento,''))); v_total numeric(18,2); v_partner uuid; v_parcelas jsonb;
begin
 if v_auth is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
 select * into v_user from public.erp_usuarios where auth_user_id=v_auth and ativo=true and deleted_at is null limit 1;
 if v_user.id is null or v_user.empresa_id is distinct from p_empresa_id or p_empresa_id is distinct from public.erp_current_empresa_id() then raise exception 'Empresa da sessão inválida.' using errcode='42501'; end if;
 if public.erp_has_permission('financeiro','lancar') is distinct from true then raise exception 'Usuário sem permissão para lançar notas financeiras.' using errcode='42501'; end if;
 if v_type not in ('A_RECEBER','A_PAGAR') then raise exception 'Tipo de lançamento inválido.' using errcode='22023'; end if;
 if length(btrim(coalesce(p_numero_nota,'')))=0 or length(btrim(coalesce(p_entidade_nome,'')))=0 or length(btrim(coalesce(p_descricao,'')))<5 then raise exception 'Número, entidade e discriminação são obrigatórios.' using errcode='22023'; end if;
 if p_data_emissao is null or p_data_vencimento is null or p_data_vencimento<p_data_emissao then raise exception 'Datas inválidas.' using errcode='22023'; end if;
 if p_valor_principal is null or p_valor_principal<=0 or coalesce(p_acrescimos,0)<0 or coalesce(p_descontos,0)<0 then raise exception 'Valores inválidos.' using errcode='22023'; end if;
 v_total:=round(p_valor_principal+coalesce(p_acrescimos,0)-coalesce(p_descontos,0),2);
 if v_total<=0 then raise exception 'Valor total deve ser positivo.' using errcode='22023'; end if;
 if p_comprovante_path is not null and split_part(p_comprovante_path,'/',1)<>p_empresa_id::text then raise exception 'Comprovante fora da pasta da empresa.' using errcode='42501'; end if;
 if not exists(select 1 from public.erp_contas_bancarias c where c.id=p_conta_bancaria_id and c.empresa_id=p_empresa_id and c.ativo) then raise exception 'Conta bancária inválida.' using errcode='42501'; end if;
 if not exists(select 1 from public.erp_centros_custos cc where cc.id=p_centro_custo_id and cc.empresa_id=p_empresa_id and cc.ativo) then raise exception 'Centro de custo inválido.' using errcode='42501'; end if;
 if v_type='A_RECEBER' then
  if p_cliente_id is null or p_fornecedor_id is not null or not exists(select 1 from public.erp_clientes c where c.id=p_cliente_id and c.empresa_id=p_empresa_id and c.ativo) then raise exception 'Selecione cliente ativo desta empresa.' using errcode='42501'; end if; v_partner:=p_cliente_id;
 else
  if p_fornecedor_id is null or p_cliente_id is not null or not exists(select 1 from public.erp_fornecedores f where f.id=p_fornecedor_id and f.empresa_id=p_empresa_id and f.ativo) then raise exception 'Selecione fornecedor ativo desta empresa.' using errcode='42501'; end if; v_partner:=p_fornecedor_id;
 end if;
 insert into public.erp_notas_debito_financeiras(empresa_id,numero_nota,documento_ref,cliente_id,fornecedor_id,entidade_nome,data_emissao,data_vencimento,tipo_lancamento,valor_principal,acrescimos,descontos,valor_total,conta_bancaria_id,centro_custo_id,categoria,descricao,comprovante_path,gerar_titulo,disponibilizar_conciliacao,status,criado_por)
 values(p_empresa_id,btrim(p_numero_nota),nullif(btrim(coalesce(p_documento_ref,'')),''),p_cliente_id,p_fornecedor_id,btrim(p_entidade_nome),p_data_emissao,p_data_vencimento,v_type,round(p_valor_principal,2),round(coalesce(p_acrescimos,0),2),round(coalesce(p_descontos,0),2),v_total,p_conta_bancaria_id,p_centro_custo_id,nullif(btrim(coalesce(p_categoria,'')),''),btrim(p_descricao),p_comprovante_path,coalesce(p_gerar_titulo,false),coalesce(p_disponibilizar_conciliacao,false),case when coalesce(p_gerar_titulo,false) then 'TITULO_GERADO' else 'ABERTA' end,v_auth) returning id into v_note;
 if coalesce(p_gerar_titulo,false) then
  v_parcelas:=jsonb_build_array(jsonb_build_object('numero',1,'vencimento',p_data_vencimento,'valor',v_total));
  v_title:=public.erp_financeiro_salvar_titulo(null,p_empresa_id,case when v_type='A_RECEBER' then 'RECEBER' else 'PAGAR' end,v_partner,btrim(p_descricao),btrim(p_numero_nota),nullif(btrim(coalesce(p_categoria,'')),''),(select cc.nome from public.erp_centros_custos cc where cc.id=p_centro_custo_id and cc.empresa_id=p_empresa_id),p_data_emissao,'MANUAL',null,v_note,v_parcelas);
  update public.erp_notas_debito_financeiras set titulo_id=v_title where id=v_note and empresa_id=p_empresa_id;
  update public.erp_financeiro_titulos set conta_bancaria_id=p_conta_bancaria_id where id=v_title and empresa_id=p_empresa_id;
 end if;
 insert into public.erp_logs_sistema(empresa_id,usuario_id,modulo,acao,entidade,entidade_id,dados) values(p_empresa_id,v_user.id,'Financeiro','NOTA_DEBITO_CRIADA','erp_notas_debito_financeiras',v_note,jsonb_build_object('tipo',v_type,'valor_total',v_total,'titulo_id',v_title,'gerar_titulo',coalesce(p_gerar_titulo,false)));
 return v_note;
end;$function$;
revoke all on function public.erp_financeiro_criar_nota_debito(uuid,text,text,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,uuid,text,text,text,boolean,boolean) from public,anon,authenticated,service_role;
grant execute on function public.erp_financeiro_criar_nota_debito(uuid,text,text,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,uuid,text,text,text,boolean,boolean) to authenticated;
commit;
