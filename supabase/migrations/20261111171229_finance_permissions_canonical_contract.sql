create or replace function public.erp_financeiro_criar_nota_debito(
 p_empresa_id uuid,p_numero_nota text,p_documento_ref text,p_cliente_id uuid,p_fornecedor_id uuid,
 p_entidade_nome text,p_data_emissao date,p_data_vencimento date,p_tipo_lancamento text,
 p_valor_principal numeric,p_acrescimos numeric,p_descontos numeric,p_conta_bancaria_id uuid,
 p_centro_custo_id uuid,p_categoria text,p_descricao text,p_comprovante_path text,
 p_gerar_titulo boolean,p_disponibilizar_conciliacao boolean
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $function$
declare
 v_auth uuid:=auth.uid(); v_user public.erp_usuarios%rowtype; v_note uuid; v_title uuid;
 v_type text:=upper(btrim(coalesce(p_tipo_lancamento,''))); v_total numeric(18,2); v_partner uuid; v_parcelas jsonb;
begin
 if v_auth is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
 select * into v_user from public.erp_usuarios where auth_user_id=v_auth and ativo=true and deleted_at is null limit 1;
 if v_user.id is null or v_user.empresa_id is distinct from p_empresa_id or p_empresa_id is distinct from public.erp_current_empresa_id() then raise exception 'Empresa da sessão inválida.' using errcode='42501'; end if;
 if public.erp_has_permission('finance','create') is distinct from true then raise exception 'Usuário sem permissão para lançar notas financeiras.' using errcode='42501'; end if;
 if v_type not in ('A_RECEBER','A_PAGAR') then raise exception 'Tipo de lançamento inválido.' using errcode='22023'; end if;
 if length(btrim(coalesce(p_numero_nota,'')))=0 or length(btrim(coalesce(p_entidade_nome,'')))=0 or length(btrim(coalesce(p_descricao,'')))<5 then raise exception 'Número, entidade e discriminação são obrigatórios.' using errcode='22023'; end if;
 if p_data_emissao is null or p_data_vencimento is null or p_data_vencimento<p_data_emissao then raise exception 'Informe datas válidas; vencimento não pode anteceder emissão.' using errcode='22023'; end if;
 if p_valor_principal is null or p_valor_principal<=0 or coalesce(p_acrescimos,0)<0 or coalesce(p_descontos,0)<0 then raise exception 'Valores inválidos.' using errcode='22023'; end if;
 v_total:=round(p_valor_principal+coalesce(p_acrescimos,0)-coalesce(p_descontos,0),2);
 if v_total<=0 then raise exception 'Valor total deve ser positivo.' using errcode='22023'; end if;
 if p_comprovante_path is not null and split_part(p_comprovante_path,'/',1)<>p_empresa_id::text then raise exception 'Comprovante fora da pasta da empresa.' using errcode='42501'; end if;
 if not exists(select 1 from public.erp_contas_bancarias c where c.id=p_conta_bancaria_id and c.empresa_id=p_empresa_id and c.ativo) then raise exception 'Conta bancária inválida para esta empresa.' using errcode='42501'; end if;
 if not exists(select 1 from public.erp_centros_custos cc where cc.id=p_centro_custo_id and cc.empresa_id=p_empresa_id and cc.ativo) then raise exception 'Centro de custo inválido para esta empresa.' using errcode='42501'; end if;
 if v_type='A_RECEBER' then
  if p_cliente_id is null or p_fornecedor_id is not null or not exists(select 1 from public.erp_clientes c where c.id=p_cliente_id and c.empresa_id=p_empresa_id and c.ativo) then raise exception 'Selecione um cliente ativo desta empresa.' using errcode='42501'; end if;
  v_partner:=p_cliente_id;
 else
  if p_fornecedor_id is null or p_cliente_id is not null or not exists(select 1 from public.erp_fornecedores f where f.id=p_fornecedor_id and f.empresa_id=p_empresa_id and f.ativo) then raise exception 'Selecione um fornecedor ativo desta empresa.' using errcode='42501'; end if;
  v_partner:=p_fornecedor_id;
 end if;
 insert into public.erp_notas_debito_financeiras(empresa_id,numero_nota,documento_ref,cliente_id,fornecedor_id,entidade_nome,data_emissao,data_vencimento,tipo_lancamento,valor_principal,acrescimos,descontos,valor_total,conta_bancaria_id,centro_custo_id,categoria,descricao,comprovante_path,gerar_titulo,disponibilizar_conciliacao,status,criado_por)
 values(p_empresa_id,btrim(p_numero_nota),nullif(btrim(coalesce(p_documento_ref,'')),''),p_cliente_id,p_fornecedor_id,btrim(p_entidade_nome),p_data_emissao,p_data_vencimento,v_type,round(p_valor_principal,2),round(coalesce(p_acrescimos,0),2),round(coalesce(p_descontos,0),2),v_total,p_conta_bancaria_id,p_centro_custo_id,nullif(btrim(coalesce(p_categoria,'')),''),btrim(p_descricao),p_comprovante_path,coalesce(p_gerar_titulo,false),coalesce(p_disponibilizar_conciliacao,false),case when coalesce(p_gerar_titulo,false) then 'TITULO_GERADO' else 'ABERTA' end,v_auth)
 returning id into v_note;
 if coalesce(p_gerar_titulo,false) then
  v_parcelas:=jsonb_build_array(jsonb_build_object('numero',1,'vencimento',p_data_vencimento,'valor',v_total));
  v_title:=public.erp_financeiro_salvar_titulo(null,p_empresa_id,case when v_type='A_RECEBER' then 'RECEBER' else 'PAGAR' end,v_partner,btrim(p_descricao),btrim(p_numero_nota),nullif(btrim(coalesce(p_categoria,'')),''),(select cc.nome from public.erp_centros_custos cc where cc.id=p_centro_custo_id and cc.empresa_id=p_empresa_id),p_data_emissao,'MANUAL',null,v_note,v_parcelas);
  update public.erp_notas_debito_financeiras set titulo_id=v_title where id=v_note and empresa_id=p_empresa_id;
  update public.erp_financeiro_titulos set conta_bancaria_id=p_conta_bancaria_id where id=v_title and empresa_id=p_empresa_id;
 end if;
 insert into public.erp_logs_sistema(empresa_id,usuario_id,modulo,acao,entidade,entidade_id,dados) values(p_empresa_id,v_user.id,'Financeiro','NOTA_DEBITO_CRIADA','erp_notas_debito_financeiras',v_note,jsonb_build_object('tipo',v_type,'valor_total',v_total,'titulo_id',v_title,'gerar_titulo',coalesce(p_gerar_titulo,false)));
 return v_note;
end;
$function$;

create or replace function public.erp_conciliar_transacao_bancaria(p_transacao_id uuid,p_referencia_interna text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_empresa_id uuid; v_transacao public.erp_transacoes_bancarias%rowtype; v_lancamento_id uuid; v_documento text;
begin
 if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
 v_empresa_id:=public.erp_current_empresa_id();
 if v_empresa_id is null then raise exception 'Empresa ativa não identificada.' using errcode='42501'; end if;
 if not public.erp_has_permission('finance','update') then raise exception 'Usuário sem permissão para conciliar lançamentos bancários.' using errcode='42501'; end if;
 select * into v_transacao from public.erp_transacoes_bancarias where id=p_transacao_id and empresa_id=v_empresa_id for update;
 if not found then raise exception 'Transação bancária não encontrada na empresa ativa.' using errcode='P0002'; end if;
 if v_transacao.status<>'PENDENTE' then raise exception 'Somente transações pendentes podem ser conciliadas.' using errcode='22023'; end if;
 if not exists(select 1 from public.erp_contas_bancarias c where c.id=v_transacao.conta_bancaria_id and c.empresa_id=v_empresa_id and c.ativo=true) then raise exception 'Conta bancária inválida ou inativa para a empresa.' using errcode='42501'; end if;
 v_documento:=coalesce(nullif(btrim(p_referencia_interna),''),nullif(btrim(v_transacao.referencia),''));
 insert into public.erp_fiscal_razao_lancamentos(empresa_id,conta_bancaria_id,documento,descricao,debito,credito,criado_em)
 values(v_empresa_id,v_transacao.conta_bancaria_id,v_documento,'Conciliação bancária · '||v_transacao.descricao,case when upper(v_transacao.tipo)='DEBITO' then abs(v_transacao.valor) else 0 end,case when upper(v_transacao.tipo)='CREDITO' then abs(v_transacao.valor) else 0 end,now())
 returning id into v_lancamento_id;
 update public.erp_transacoes_bancarias set status='CONCILIADO',referencia=coalesce(nullif(btrim(p_referencia_interna),''),referencia) where id=v_transacao.id and empresa_id=v_empresa_id;
 return v_lancamento_id;
end;
$$;
revoke all on function public.erp_financeiro_criar_nota_debito(uuid,text,text,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,uuid,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.erp_financeiro_criar_nota_debito(uuid,text,text,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,uuid,text,text,text,boolean,boolean) to authenticated;
revoke all on function public.erp_conciliar_transacao_bancaria(uuid,text) from public,anon;
grant execute on function public.erp_conciliar_transacao_bancaria(uuid,text) to authenticated;