create or replace function public.erp_criar_rpnc_com_quarentena(
  p_lote_id uuid,
  p_setor_id uuid,
  p_descricao text,
  p_origem text,
  p_quantidade numeric,
  p_disposition text,
  p_whys_text text
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_empresa uuid;
  v_lote_empresa uuid;
  v_lote_interno text;
  v_numero text;
  v_id uuid;
  v_criado_em timestamptz;
  v_codigo_8d text;
  v_quarentena uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_lote_id is null then raise exception 'Selecione um lote.'; end if;
  if p_setor_id is null then raise exception 'Selecione o setor responsável.'; end if;
  if length(trim(coalesce(p_descricao,''))) < 10 then raise exception 'Descreva a não conformidade com pelo menos 10 caracteres.'; end if;
  if p_quantidade is null or p_quantidade < 0 then raise exception 'A quantidade segregada deve ser maior ou igual a zero.'; end if;
  if p_disposition not in ('SUCATEAR','REPROCESSAR','DEVOLVER') then raise exception 'Disposição do material inválida.'; end if;
  if not exists (select 1 from public.erp_setores s where s.id=p_setor_id and s.empresa_id=v_empresa and s.ativo=true) then
    raise exception 'Setor inválido ou fora da empresa atual.';
  end if;
  select l.empresa_id,l.lote_interno into v_lote_empresa,v_lote_interno
  from public.erp_estoque_lotes l where l.id=p_lote_id for update;
  if v_lote_empresa is null then raise exception 'Lote não encontrado.'; end if;
  if not (v_lote_empresa=v_empresa or public.erp_is_master()) then raise exception 'Lote fora da empresa da sessão.'; end if;

  v_numero := 'RPNC-' || to_char(current_date,'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_codigo_8d := '8D-' || to_char(current_date,'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.erp_rpnc(
    empresa_id,numero_rpnc,descricao_nao_conformidade,origem,gravidade,setor_envolvido_id,
    lote_producao,quantidade_segregada,bloqueia_lote,status,investigacao
  ) values (
    v_empresa,v_numero,trim(p_descricao),lower(trim(p_origem)),'menor',p_setor_id,
    v_lote_interno,p_quantidade,true,'aberta',nullif(trim(coalesce(p_whys_text,'')),'')
  ) returning id,criado_em into v_id,v_criado_em;

  insert into public.erp_qualidade_8d(
    empresa_id,codigo,rpnc_id,etapa_atual,d2_problema,d3_contencao,d4_causa_raiz,status,created_by
  ) values (
    v_empresa,v_codigo_8d,v_id,'D3',trim(p_descricao),
    'Disposição física: ' || p_disposition || '. Quantidade segregada: ' || p_quantidade::text || '. Lote: ' || v_lote_interno,
    nullif(trim(coalesce(p_whys_text,'')),''),'EM_ANALISE',auth.uid()
  );

  v_quarentena := public.erp_reter_lote(p_lote_id,'RPNC ' || v_numero || ': ' || left(trim(p_descricao),450));

  return jsonb_build_object(
    'id',v_id,'numero_rpnc',v_numero,'descricao_nao_conformidade',trim(p_descricao),
    'origem',lower(trim(p_origem)),'status','aberta','lote_producao',v_lote_interno,
    'criado_em',v_criado_em,'codigo_8d',v_codigo_8d,'quarentena_id',v_quarentena
  );
end;
$$;
revoke all on function public.erp_criar_rpnc_com_quarentena(uuid,uuid,text,text,numeric,text,text) from public,anon;
grant execute on function public.erp_criar_rpnc_com_quarentena(uuid,uuid,text,text,numeric,text,text) to authenticated;
