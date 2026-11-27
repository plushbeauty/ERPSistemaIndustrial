-- Só o PCP converte uma demanda programada em OP; a carteira comercial nunca cria OP diretamente.
create or replace function public.erp_pcp_converter_demanda_em_op(p_fila_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_demanda public.erp_pcp_fila_demanda%rowtype;
 v_ficha uuid;
 v_op uuid;
 v_numero bigint;
begin
 if v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if p_fila_id is null then raise exception 'PCP_FILA_ID_OBRIGATORIO'; end if;
 select * into v_demanda from public.erp_pcp_fila_demanda
  where id=p_fila_id and empresa_id=v_empresa for update;
 if not found then raise exception 'PCP_DEMANDA_FORA_DO_TENANT'; end if;
 if v_demanda.status<>'PROGRAMADA' or v_demanda.ordem_producao_id is not null then
  raise exception 'PCP_DEMANDA_NAO_ESTA_PROGRAMADA_OU_JA_FOI_CONVERTIDA';
 end if;
 select id into v_ficha from public.erp_fichas_tecnicas
  where empresa_id=v_empresa and produto_id=v_demanda.produto_id and ativa=true
  order by versao desc,updated_at desc limit 1;
 if v_ficha is null then raise exception 'PRODUTO_SEM_FICHA_TECNICA_ATIVA'; end if;
 if exists(select 1 from public.erp_ficha_operacoes
  where empresa_id=v_empresa and ficha_id=v_ficha and upper(operacao) in ('INJECAO','PRENSAGEM'))
 and not exists(
  select 1 from public.erp_receitas_processos r
  join public.erp_processos_industriais p on p.id=r.processo_id and p.empresa_id=v_empresa
  where r.empresa_id=v_empresa and r.produto_id=v_demanda.produto_id
   and r.status='APROVADA' and p.tipo in ('INJECAO','PRENSADOS') and p.ativo=true
 ) then
  raise exception 'RECEITA_DE_PROCESSO_NAO_APROVADA: homologue a ficha em Processo Industrial antes de gerar OP.';
 end if;
 select id,numero_op into v_op,v_numero
 from public.erp_criar_ordem_producao_v2(
  v_demanda.produto_id,v_demanda.quantidade_pcp,v_demanda.pedido_venda_id,
  null,null,false
 );
 update public.erp_ordens_producao set
  pedido_item_id=v_demanda.pedido_item_id,ficha_id=v_ficha
 where id=v_op and empresa_id=v_empresa;
 update public.erp_pcp_fila_demanda set
  status='CONVERTIDA_OP',ordem_producao_id=v_op,analisado_em=coalesce(analisado_em,now()),updated_at=now()
 where id=v_demanda.id and empresa_id=v_empresa;
 return jsonb_build_object('ordem_producao_id',v_op,'numero_op',v_numero,'pedido_numero',v_demanda.pedido_numero,'produto_codigo',v_demanda.produto_codigo);
end;
$$;
revoke all on function public.erp_pcp_converter_demanda_em_op(uuid) from public,anon;
grant execute on function public.erp_pcp_converter_demanda_em_op(uuid) to authenticated;