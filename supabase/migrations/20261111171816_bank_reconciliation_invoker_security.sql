create or replace function public.erp_conciliar_transacao_bancaria(p_transacao_id uuid,p_referencia_interna text default null)
returns uuid language plpgsql security invoker set search_path=public,pg_temp
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
revoke all on function public.erp_conciliar_transacao_bancaria(uuid,text) from public,anon;
grant execute on function public.erp_conciliar_transacao_bancaria(uuid,text) to authenticated;
