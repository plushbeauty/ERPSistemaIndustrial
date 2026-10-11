create or replace function public.erp_criar_rpnc_com_quarentena(
  p_lote_id uuid,
  p_setor_id uuid,
  p_descricao text,
  p_origem text,
  p_quantidade numeric,
  p_disposition text,
  p_whys_text text,
  p_whys_json jsonb,
  p_actions_json jsonb
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
  v_capa_lote_id uuid;
  v_origem_capa text;
  v_disposicao_capa text;
  v_whys jsonb;
  v_actions jsonb;
  v_action jsonb;
  v_action_count integer := 0;
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

  v_whys := coalesce(p_whys_json,'[]'::jsonb);
  v_actions := coalesce(p_actions_json,'[]'::jsonb);
  if jsonb_typeof(v_whys) <> 'array' then raise exception 'A análise dos 5 Porquês deve ser uma lista.'; end if;
  if jsonb_typeof(v_actions) <> 'array' then raise exception 'O plano 5W2H deve ser uma lista.'; end if;
  v_origem_capa := case lower(trim(p_origem))
    when 'fornecedor' then 'fornecedor'
    when 'cliente' then 'cliente'
    else 'interna'
  end;
  v_disposicao_capa := case p_disposition
    when 'SUCATEAR' then 'refugar'
    when 'REPROCESSAR' then 'retrabalhar'
    when 'DEVOLVER' then 'devolver'
  end;
  select l.id into v_capa_lote_id from public.estoque_lotes l
  where l.empresa_id=v_empresa and l.numero_lote=v_lote_interno limit 1;

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

  insert into public.qualidade_rnc_capa(
    empresa_id,codigo,lote_id,origem,descricao,disposicao,cinco_porques,ishikawa,plano_5w2h,status,rpnc_id
  ) values (
    v_empresa,v_numero,v_capa_lote_id,v_origem_capa,trim(p_descricao),v_disposicao_capa,
    v_whys,'{}'::jsonb,v_actions,'aberto',v_id
  );

  for v_action in select value from jsonb_array_elements(v_actions)
  loop
    if length(trim(coalesce(v_action->>'what',''))) > 0
       and nullif(v_action->>'who_id','') is not null
       and nullif(v_action->>'when_date','') is not null
       and length(trim(coalesce(v_action->>'how',''))) > 0 then
      insert into public.erp_qualidade_acoes(
        empresa_id,origem_tipo,origem_id,what,why,where_to,when_date,who_id,how,how_much,status
      ) values (
        v_empresa,'RPNC',v_id,trim(v_action->>'what'),nullif(trim(v_action->>'why'),''),
        nullif(trim(v_action->>'where_to'),''),nullif(v_action->>'when_date','')::date,
        nullif(v_action->>'who_id','')::uuid,nullif(trim(v_action->>'how'),''),
        nullif(v_action->>'how_much','')::numeric,'aberta'
      );
      v_action_count := v_action_count + 1;
    end if;
  end loop;

  v_quarentena := public.erp_reter_lote(p_lote_id,'RPNC ' || v_numero || ': ' || left(trim(p_descricao),450));

  return jsonb_build_object(
    'id',v_id,'numero_rpnc',v_numero,'descricao_nao_conformidade',trim(p_descricao),
    'origem',lower(trim(p_origem)),'status','aberta','lote_producao',v_lote_interno,
    'criado_em',v_criado_em,'codigo_8d',v_codigo_8d,'quarentena_id',v_quarentena,'acoes_gravadas',v_action_count
  );
end;
$$;
revoke all on function public.erp_criar_rpnc_com_quarentena(uuid,uuid,text,text,numeric,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.erp_criar_rpnc_com_quarentena(uuid,uuid,text,text,numeric,text,text,jsonb,jsonb) to authenticated;

create or replace function public.erp_salvar_acoes_rnc(
  p_rpnc_id uuid,
  p_actions_json jsonb
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_empresa uuid;
  v_action jsonb;
  v_capa_id uuid;
  v_count integer := 0;
  v_actions jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  v_actions := coalesce(p_actions_json,'[]'::jsonb);
  if jsonb_typeof(v_actions) <> 'array' then raise exception 'As ações devem ser enviadas como lista.'; end if;
  if not exists(select 1 from public.erp_rpnc r where r.id=p_rpnc_id and r.empresa_id=v_empresa) then
    raise exception 'RPNC não encontrada na empresa atual.';
  end if;
  select c.id into v_capa_id from public.qualidade_rnc_capa c
  where c.empresa_id=v_empresa and c.rpnc_id=p_rpnc_id for update;
  if v_capa_id is null then raise exception 'CAPA da RPNC não encontrada.'; end if;

  for v_action in select value from jsonb_array_elements(v_actions)
  loop
    if length(trim(coalesce(v_action->>'what',''))) < 1
       or nullif(v_action->>'who_id','') is null
       or nullif(v_action->>'when_date','') is null
       or length(trim(coalesce(v_action->>'how',''))) < 1 then
      raise exception 'Cada ação precisa conter O QUÊ, QUEM, QUANDO e COMO.';
    end if;
    insert into public.erp_qualidade_acoes(
      empresa_id,origem_tipo,origem_id,what,why,where_to,when_date,who_id,how,how_much,status
    ) values (
      v_empresa,'RPNC',p_rpnc_id,trim(v_action->>'what'),nullif(trim(v_action->>'why'),''),
      nullif(trim(v_action->>'where_to'),''),nullif(v_action->>'when_date','')::date,
      nullif(v_action->>'who_id','')::uuid,nullif(trim(v_action->>'how'),''),
      nullif(v_action->>'how_much','')::numeric,'aberta'
    );
    v_count := v_count + 1;
  end loop;

  update public.qualidade_rnc_capa
  set plano_5w2h=coalesce(plano_5w2h,'[]'::jsonb) || v_actions,
      status='em_execucao'
  where id=v_capa_id and empresa_id=v_empresa;

  return jsonb_build_object('count',v_count,'capa_id',v_capa_id);
end;
$$;
revoke all on function public.erp_salvar_acoes_rnc(uuid,jsonb) from public,anon;
grant execute on function public.erp_salvar_acoes_rnc(uuid,jsonb) to authenticated;
