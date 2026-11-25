-- Sincroniza cadastro mestre com ficha técnica, roteiro de processo e BOM estruturada.
create or replace function public.erp_salvar_ficha_tecnica_produto(
 p_produto_id uuid,
 p_operacao text,
 p_maquina_id uuid,
 p_molde_codigo text,
 p_ciclo_seg numeric,
 p_cavidades integer,
 p_componentes jsonb
)
returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_produto public.erp_produtos%rowtype;
 v_ficha uuid;
 v_versao integer;
 v_operacao_id uuid;
 v_molde_id uuid;
 v_maquina_horas numeric;
 v_maquina_codigo text;
 v_capacidade_hora numeric;
 v_capacidade_dia numeric;
 v_item jsonb;
 v_componente uuid;
 v_quantidade numeric;
 v_perda numeric;
 v_unidade text;
 v_seq integer;
begin
 if v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
 if p_produto_id is null then raise exception 'FICHA_PRODUTO_OBRIGATORIO'; end if;
 select * into v_produto from public.erp_produtos
  where id=p_produto_id and empresa_id=v_empresa and ativo=true for update;
 if not found then raise exception 'FICHA_PRODUTO_FORA_DO_TENANT'; end if;
 if p_componentes is not null and jsonb_typeof(p_componentes)<>'array' then
  raise exception 'FICHA_BOM_DEVE_SER_ARRAY';
 end if;

 select id into v_ficha from public.erp_fichas_tecnicas
  where empresa_id=v_empresa and produto_id=p_produto_id and ativa=true
  order by versao desc,created_at desc limit 1 for update;
 if v_ficha is null then
  select coalesce(max(versao),0)+1 into v_versao from public.erp_fichas_tecnicas
   where empresa_id=v_empresa and produto_id=p_produto_id;
  insert into public.erp_fichas_tecnicas(
   empresa_id,produto_id,versao,rendimento,unidade_rendimento,observacoes,ativa,
   codigo,titulo,descricao,status,revisao
  ) values(
   v_empresa,p_produto_id,v_versao,1,coalesce(v_produto.unidade,'UN'),
   'Gerada/sincronizada pelo cadastro mestre de produtos.',true,
   v_produto.codigo,v_produto.nome,coalesce(v_produto.descricao,v_produto.nome),'ATIVA',v_versao::text
  ) returning id into v_ficha;
 else
  update public.erp_fichas_tecnicas set
   codigo=v_produto.codigo,titulo=v_produto.nome,
   descricao=coalesce(v_produto.descricao,v_produto.nome),
   unidade_rendimento=coalesce(v_produto.unidade,'UN'),
   updated_at=now()
  where id=v_ficha and empresa_id=v_empresa;
 end if;

 -- Substitui somente as linhas originadas por este cadastro; BOMs manuais são preservadas.
 delete from public.erp_ficha_itens
  where empresa_id=v_empresa and ficha_id=v_ficha and origem='CADASTRO_PRODUTO';
 v_seq:=0;
 for v_item in select value from jsonb_array_elements(coalesce(p_componentes,'[]'::jsonb))
 loop
  v_seq:=v_seq+1;
  v_componente:=nullif(v_item->>'componente_id','')::uuid;
  v_quantidade:=nullif(v_item->>'quantidade','')::numeric;
  v_perda:=coalesce(nullif(v_item->>'perda_percentual','')::numeric,0);
  if v_componente is null or v_componente=p_produto_id or v_quantidade is null or v_quantidade<=0 or v_perda<0 or v_perda>100 then
   raise exception 'FICHA_BOM_ITEM_INVALIDO';
  end if;
  select coalesce(p.unidade,'UN') into v_unidade from public.erp_produtos p
   where p.id=v_componente and p.empresa_id=v_empresa and p.ativo=true;
  if not found then raise exception 'FICHA_BOM_COMPONENTE_FORA_DO_TENANT'; end if;
  insert into public.erp_ficha_itens(
   empresa_id,ficha_id,componente_id,quantidade,perda_percentual,lote_obrigatorio,
   tipo_item,sequencia,unidade_medida,origem
  ) values(
   v_empresa,v_ficha,v_componente,v_quantidade,v_perda,true,
   'MATERIA_PRIMA',v_seq,coalesce(nullif(v_item->>'unidade_medida',''),v_unidade),'CADASTRO_PRODUTO'
  );
 end loop;

 if upper(coalesce(p_operacao,'')) in ('INJETADO','PRENSADO') then
  if p_maquina_id is not null then
   select horas_capacidade_dia,codigo into v_maquina_horas,v_maquina_codigo
    from public.erp_maquinas
    where id=p_maquina_id and empresa_id=v_empresa and ativo=true;
   if not found then raise exception 'FICHA_MAQUINA_FORA_DO_TENANT'; end if;
  end if;
  if p_ciclo_seg is not null and p_ciclo_seg>0 then
   v_capacidade_hora:=(3600.0/p_ciclo_seg)*greatest(coalesce(p_cavidades,1),1);
   if v_maquina_horas is not null then v_capacidade_dia:=v_capacidade_hora*v_maquina_horas; end if;
  else
   v_capacidade_hora:=null; v_capacidade_dia:=null;
  end if;
  select id into v_molde_id from public.erp_moldes
   where empresa_id=v_empresa and produto_id=p_produto_id and codigo=coalesce(p_molde_codigo,'')
     and ativo=true limit 1;
  select id into v_operacao_id from public.erp_ficha_operacoes
   where empresa_id=v_empresa and ficha_id=v_ficha
     and observacoes='[SYNC_CADASTRO_PRODUTO]' limit 1;
  if v_operacao_id is null then
   select coalesce(max(sequencia),0)+1 into v_seq from public.erp_ficha_operacoes
    where empresa_id=v_empresa and ficha_id=v_ficha;
   insert into public.erp_ficha_operacoes(
    empresa_id,ficha_id,sequencia,operacao,maquina_id,molde_id,ciclo_seg,
    instrucoes,unidade,equipamento,ferramenta,capacidade_hora,capacidade_dia,observacoes
   ) values(
    v_empresa,v_ficha,v_seq,
    case when upper(p_operacao)='INJETADO' then 'INJECAO' else 'PRENSAGEM' end,
    p_maquina_id,v_molde_id,p_ciclo_seg,
    'Roteiro sincronizado a partir dos parâmetros técnicos do cadastro do produto.',
    coalesce(v_produto.unidade,'UN'),v_maquina_codigo,p_molde_codigo,
    v_capacidade_hora,v_capacidade_dia,'[SYNC_CADASTRO_PRODUTO]'
   );
  else
   update public.erp_ficha_operacoes set
    operacao=case when upper(p_operacao)='INJETADO' then 'INJECAO' else 'PRENSAGEM' end,
    maquina_id=p_maquina_id,molde_id=v_molde_id,ciclo_seg=p_ciclo_seg,
    unidade=coalesce(v_produto.unidade,'UN'),equipamento=v_maquina_codigo,
    ferramenta=p_molde_codigo,capacidade_hora=v_capacidade_hora,
    capacidade_dia=v_capacidade_dia,
    instrucoes='Roteiro sincronizado a partir dos parâmetros técnicos do cadastro do produto.'
   where id=v_operacao_id and empresa_id=v_empresa;
  end if;
 end if;
 return v_ficha;
end;
$$;
revoke all on function public.erp_salvar_ficha_tecnica_produto(uuid,text,uuid,text,numeric,integer,jsonb) from public,anon;
grant execute on function public.erp_salvar_ficha_tecnica_produto(uuid,text,uuid,text,numeric,integer,jsonb) to authenticated;