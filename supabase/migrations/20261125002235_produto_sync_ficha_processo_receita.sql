-- Sincroniza também o roteiro de processo e a receita que o Chão de Fábrica consome.
create or replace function public.erp_salvar_ficha_tecnica_produto(
 p_produto_id uuid,
 p_operacao text,
 p_maquina_id uuid,
 p_molde_codigo text,
 p_ciclo_seg numeric,
 p_cavidades integer,
 p_componentes jsonb,
 p_parametros jsonb
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_produto public.erp_produtos%rowtype;
 v_ficha uuid;
 v_processo uuid;
 v_receita uuid;
 v_ficha_processo uuid;
 v_molde uuid;
 v_recipe_version integer;
 v_ficha_version integer;
 v_capacidade numeric;
 v_seq integer;
 v_operacao_id uuid;
 v_tipo text;
 v_nome text;
begin
 if auth.uid() is null or v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if not (public.erp_is_master() or public.erp_has_permission('production.create') or public.erp_has_permission('production.update')) then
  raise exception 'SEM_PERMISSAO_PARA_GERAR_FICHA_E_ROTEIRO_DE_PRODUCAO';
 end if;
 select * into v_produto from public.erp_produtos
  where id=p_produto_id and empresa_id=v_empresa and ativo=true;
 if not found then raise exception 'FICHA_PRODUTO_FORA_DO_TENANT'; end if;

 v_ficha:=public.erp_salvar_ficha_tecnica_produto(
  p_produto_id,p_operacao,p_maquina_id,p_molde_codigo,p_ciclo_seg,p_cavidades,p_componentes
 );

 if upper(coalesce(p_operacao,'')) not in ('INJETADO','PRENSADO') then
  return v_ficha;
 end if;
 v_tipo:=case when upper(p_operacao)='INJETADO' then 'INJECAO' else 'PRENSADOS' end;
 v_nome:=case when v_tipo='INJECAO' then 'Injeção Plástica' else 'Prensados' end;
 v_capacidade:=case when p_ciclo_seg>0 then (3600.0/p_ciclo_seg)*greatest(coalesce(p_cavidades,1),1) else null end;

 select id into v_processo from public.erp_processos_industriais
  where empresa_id=v_empresa and tipo=v_tipo and ativo=true
  order by codigo limit 1;
 if v_processo is null then
  insert into public.erp_processos_industriais(
   empresa_id,codigo,nome,tipo,descricao,unidade_capacidade,capacidade_hora,
   setup_padrao_min,ciclo_padrao_seg,parametros_padrao,ativo,criado_por,atualizado_por
  ) values(
   v_empresa,case when v_tipo='INJECAO' then 'INJ' else 'PRE' end,v_nome,v_tipo,
   'Processo industrial sincronizado pelo cadastro técnico de produtos.',
   'PEÇAS/HORA',v_capacidade,0,p_ciclo_seg,coalesce(p_parametros,'{}'::jsonb),true,auth.uid(),auth.uid()
  ) returning id into v_processo;
 else
  update public.erp_processos_industriais set
   capacidade_hora=v_capacidade,ciclo_padrao_seg=p_ciclo_seg,
   parametros_padrao=coalesce(p_parametros,'{}'::jsonb),atualizado_em=now(),atualizado_por=auth.uid()
  where id=v_processo and empresa_id=v_empresa;
 end if;

 select id into v_molde from public.erp_moldes
  where empresa_id=v_empresa and produto_id=p_produto_id
   and codigo=coalesce(p_molde_codigo,'') and ativo=true
  limit 1;

 select coalesce(max(versao),0)+1 into v_recipe_version
  from public.erp_receitas_processos
  where empresa_id=v_empresa and processo_id=v_processo and produto_id=p_produto_id;
 insert into public.erp_receitas_processos(
  empresa_id,processo_id,produto_id,ferramenta_id,maquina_id,versao,status,parametros,
  ciclo_seg,setup_min,rendimento_percent,perda_percent,observacoes,criado_em,atualizado_em,criado_por,atualizado_por
 ) values(
  v_empresa,v_processo,p_produto_id,v_molde,p_maquina_id,v_recipe_version,'RASCUNHO',
  coalesce(p_parametros,'{}'::jsonb),p_ciclo_seg,0,100,null,
  'Receita criada pelo cadastro do produto; exige aprovação de Engenharia/Processo antes do uso no Chão de Fábrica.',
  now(),now(),auth.uid(),auth.uid()
 ) returning id into v_receita;

 select id,coalesce(revisao,0)+1,coalesce(versao_ficha,0)+1
  into v_ficha_processo,v_ficha_version,v_seq
 from public.erp_fichas_processo
 where empresa_id=v_empresa and produto_id=p_produto_id and ativo=true
 order by versao_ficha desc,created_at desc limit 1 for update;
 if v_ficha_processo is null then
  v_ficha_version:=1; v_seq:=1;
  insert into public.erp_fichas_processo(
   empresa_id,produto_id,codigo_ficha,ativo,codigo_cliente,ferramenta_id,maquina_id,
   cavidades_ativas,revisao,status,forca_fechamento,pressao_trabalho,temperatura_trabalho,
   pressao_injecao,ciclo_seg,peso_peca,imagem_url,observacoes_setup,observacoes,
   criado_por,atualizado_por,atualizado_em,categoria_processo,versao_ficha,
   parametros_tecnicos
  ) values(
   v_empresa,p_produto_id,coalesce(v_produto.numero_ficha_processo,v_produto.codigo)||'-FP1',true,
   v_produto.codigo_cliente,v_molde,p_maquina_id,greatest(coalesce(p_cavidades,1),1),1,'RASCUNHO',
   null,null,null,null,p_ciclo_seg,v_produto.peso_peca,v_produto.foto_molde_url,
   'Ficha técnica gerada pelo cadastro mestre; homologar antes de produzir.',
   'Parâmetros sincronizados automaticamente do produto.',
   auth.uid(),auth.uid(),now(),v_tipo,1,coalesce(p_parametros,'{}'::jsonb)
  ) returning id into v_ficha_processo;
 else
  update public.erp_fichas_processo set
   codigo_cliente=v_produto.codigo_cliente,ferramenta_id=v_molde,maquina_id=p_maquina_id,
   cavidades_ativas=greatest(coalesce(p_cavidades,1),1),revisao=v_ficha_version,
   status='RASCUNHO',ciclo_seg=p_ciclo_seg,peso_peca=v_produto.peso_peca,
   imagem_url=v_produto.foto_molde_url,observacoes_setup='Ficha técnica revisada pelo cadastro mestre; homologar antes de produzir.',
   atualizado_por=auth.uid(),atualizado_em=now(),updated_at=now(),
   categoria_processo=v_tipo,versao_ficha=v_seq,parametros_tecnicos=coalesce(p_parametros,'{}'::jsonb),
   data_homologacao=null,assinatura_tecnica=null
  where id=v_ficha_processo and empresa_id=v_empresa;
 end if;

 select id into v_operacao_id from public.erp_ficha_processo_operacoes
  where empresa_id=v_empresa and ficha_processo_id=v_ficha_processo
   and descricao_operacao like '[SYNC_CADASTRO_PRODUTO]%'
  limit 1;
 if v_operacao_id is null then
  select coalesce(max(sequencial_operacao),0)+1 into v_seq
  from public.erp_ficha_processo_operacoes
  where empresa_id=v_empresa and ficha_processo_id=v_ficha_processo;
  insert into public.erp_ficha_processo_operacoes(
   empresa_id,ficha_processo_id,sequencial_operacao,descricao_operacao,posto_trabalho_id,tempo_minutos
  ) values(
   v_empresa,v_ficha_processo,v_seq,
   '[SYNC_CADASTRO_PRODUTO] '||v_nome,p_maquina_id,
   coalesce(p_ciclo_seg,0)/60.0
  );
 else
  update public.erp_ficha_processo_operacoes set
   descricao_operacao='[SYNC_CADASTRO_PRODUTO] '||v_nome,
   posto_trabalho_id=p_maquina_id,tempo_minutos=coalesce(p_ciclo_seg,0)/60.0,updated_at=now()
  where id=v_operacao_id and empresa_id=v_empresa;
 end if;
 return v_ficha;
end;
$$;
revoke all on function public.erp_salvar_ficha_tecnica_produto(uuid,text,uuid,text,numeric,integer,jsonb,jsonb) from public,anon;
grant execute on function public.erp_salvar_ficha_tecnica_produto(uuid,text,uuid,text,numeric,integer,jsonb,jsonb) to authenticated;