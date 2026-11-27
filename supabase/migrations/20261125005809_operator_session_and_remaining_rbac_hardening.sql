begin;
alter table public.erp_funcionarios add column if not exists cpf text;
create index if not exists erp_funcionarios_empresa_cpf_idx on public.erp_funcionarios(empresa_id,cpf) where cpf is not null;
create index if not exists erp_funcionarios_empresa_cartao_idx on public.erp_funcionarios(empresa_id,numero_cracha_rfid) where numero_cracha_rfid is not null;

create table if not exists public.erp_operador_identificacao_tentativa (
 id bigserial primary key, empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 auth_user_id uuid references auth.users(id) on delete cascade, cartao_hash text not null,
 sucesso boolean not null, criado_em timestamptz not null default now()
);
alter table public.erp_operador_identificacao_tentativa add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
create index if not exists erp_operador_tentativa_cartao_idx on public.erp_operador_identificacao_tentativa(empresa_id,cartao_hash,criado_em desc);
create index if not exists erp_operador_tentativa_usuario_idx on public.erp_operador_identificacao_tentativa(empresa_id,auth_user_id,criado_em desc);
alter table public.erp_operador_identificacao_tentativa enable row level security;
revoke all on public.erp_operador_identificacao_tentativa from public,anon,authenticated;

create table if not exists public.erp_operador_sessoes (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 funcionario_id uuid not null references public.erp_funcionarios(id) on delete cascade,
 identificado_em timestamptz not null default now(), expira_em timestamptz not null default (now()+interval '12 hours'),
 encerrada_em timestamptz
);
create unique index if not exists erp_operador_sessao_ativa_auth_uidx on public.erp_operador_sessoes(empresa_id,auth_user_id) where encerrada_em is null;
create index if not exists erp_operador_sessao_funcionario_idx on public.erp_operador_sessoes(empresa_id,funcionario_id,expira_em desc) where encerrada_em is null;
alter table public.erp_operador_sessoes enable row level security;
revoke all on public.erp_operador_sessoes from public,anon,authenticated;

comment on table public.erp_operador_sessoes is 'Sessão temporária de identificação de operador por cartão + CPF3, vinculada ao auth.uid() do posto e expira em 12 horas. Sem acesso direto via Data API.';
comment on table public.erp_operador_identificacao_tentativa is 'Tentativas de identificação de operador; armazena somente hash do cartão, auth_user_id e sucesso, nunca o CPF.';

CREATE OR REPLACE FUNCTION public.erp_apontamento_finalizar(p_apontamento_id uuid, p_operador_id uuid, p_programacao_id uuid, p_quantidade_boa numeric, p_quantidade_refugada numeric, p_motivo_parada text, p_observacoes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
 v_empresa uuid:=public.erp_current_empresa_id();
 v_boa numeric:=greatest(coalesce(p_quantidade_boa,0),0);
 v_refugo numeric:=greatest(coalesce(p_quantidade_refugada,0),0);
 v_inicio timestamptz;
 v_fim timestamptz:=now();
 v_op uuid;
 v_lote jsonb;
 v_params jsonb;
 v_maquina uuid;
 v_planejada numeric;
 v_programacao public.erp_pcp_programacoes%rowtype;
begin
 if auth.uid() is null then raise exception 'Sessão autenticada obrigatória para finalizar o apontamento.'; end if;
 if v_empresa is null then raise exception 'Empresa da sessão não identificada; atualização não gravada.'; end if;
 if not exists(select 1 from public.erp_operador_sessoes s join public.erp_funcionarios f on f.id=s.funcionario_id and f.empresa_id=s.empresa_id where s.empresa_id=v_empresa and s.auth_user_id=auth.uid() and s.funcionario_id=p_operador_id and s.encerrada_em is null and s.expira_em>now() and lower(coalesce(f.status,'ativo')) not in ('inativo','desligado','demitido','cancelado','afastado')) then raise exception 'OPERADOR_NAO_IDENTIFICADO_OU_SESSAO_EXPIRADA' using errcode='42501'; end if;
 if p_apontamento_id is null or p_operador_id is null then raise exception 'Apontamento incompleto: registre o início antes de finalizar.'; end if;
 if p_programacao_id is null then raise exception 'PROGRAMACAO_OBRIGATORIA_PARA_FINALIZAR_APONTAMENTO'; end if;
 if p_quantidade_boa is null or p_quantidade_refugada is null or p_quantidade_boa<0 or p_quantidade_refugada<0 then
  raise exception 'Informe quantidades válidas; peças boas e refugadas não podem ser negativas.';
 end if;
 if v_boa+v_refugo<=0 then raise exception 'A soma de peças boas e refugadas precisa ser maior que zero.'; end if;
 if v_refugo>0 and nullif(trim(coalesce(p_observacoes,'')),'') is null then raise exception 'Descreva o defeito/causa quando houver peças refugadas.'; end if;
 select inicio_em,ordem_producao_id,parametros_reais,maquina_id,quantidade_planejada into v_inicio,v_op,v_params,v_maquina,v_planejada from public.erp_apontamentos_processo
  where id=p_apontamento_id and empresa_id=v_empresa and operador_id=p_operador_id and fim_em is null for update;
 if not found then raise exception 'Apontamento não encontrado para este operador na empresa autenticada.'; end if;
 if (v_params->>'programacao_id') is distinct from p_programacao_id::text then raise exception 'PROGRAMACAO_DIVERGE_DO_APONTAMENTO_ORIGINAL'; end if;
 if v_boa+v_refugo>coalesce(v_planejada,0) then raise exception 'QUANTIDADE_FINAL_SUPERA_QUANTIDADE_PLANEJADA_NO_INICIO'; end if;
 select * into v_programacao from public.erp_pcp_programacoes p where p.id=p_programacao_id and p.empresa_id=v_empresa and p.ordem_producao_id=v_op and p.maquina_id=v_maquina and p_operador_id in (p.operador_id,p.operador_a_id,p.operador_b_id,p.operador_frente_id,p.operador_atras_id) for update;
 if not found then raise exception 'PROGRAMACAO_NAO_CORRESPONDE_AO_APONTAMENTO_E_OPERADOR'; end if;
 update public.erp_apontamentos_processo set
  fim_em=v_fim,quantidade_boa=v_boa,quantidade_refugada=v_refugo,
  motivo_parada=nullif(trim(coalesce(p_motivo_parada,'')),''),
  observacoes=nullif(trim(coalesce(p_observacoes,'')),''),
  parametros_reais=coalesce(parametros_reais,'{}'::jsonb)||jsonb_build_object('duracao_seg',greatest(extract(epoch from(v_fim-v_inicio)),0))
 where id=p_apontamento_id and empresa_id=v_empresa and fim_em is null;
 if not found then raise exception 'Nenhum apontamento foi atualizado: o registro já foi fechado. Atualize a tela.'; end if;
 if p_programacao_id is not null then
  update public.erp_pcp_programacoes set
   quantidade_produzida=coalesce(quantidade_produzida,0)+v_boa,
   quantidade_refugada=coalesce(quantidade_refugada,0)+v_refugo
  where id=p_programacao_id and empresa_id=v_empresa;
  if not found then raise exception 'Programação não encontrada na empresa autenticada; baixa não aplicada.'; end if;
 end if;
 if v_op is not null then
  update public.erp_ordens_producao set quantidade_produzida=coalesce(quantidade_produzida,0)+v_boa
   where id=v_op and empresa_id=v_empresa;
  if not found then raise exception 'OP não encontrada na empresa autenticada; produção não baixada.'; end if;
  if v_boa>0 then v_lote:=public.erp_gerar_lote_producao(v_op,v_boa,current_date); end if;
 end if;
 return jsonb_build_object(
  'id',p_apontamento_id,'inicio_em',v_inicio,'fim_em',v_fim,
  'duracao_seg',greatest(extract(epoch from(v_fim-v_inicio)),0),
  'quantidade_boa',v_boa,'quantidade_refugada',v_refugo,
  'ordem_producao_id',v_op,'programacao_id',p_programacao_id,
  'baixa_programacao',p_programacao_id is not null,
  'lote_id',v_lote->>'id','lote_interno',v_lote->>'lote_interno',
  'modo_lote',v_lote->>'modo_lote'
 );
end;
$function$


CREATE OR REPLACE FUNCTION public.erp_apontamento_iniciar(p_programacao_id uuid, p_ordem_producao_id uuid, p_processo_id uuid, p_receita_id uuid, p_maquina_id uuid, p_ferramenta_id uuid, p_operador_id uuid, p_quantidade_planejada numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_receita public.erp_receitas_processos;
  v_apontamento public.erp_apontamentos_processo;
  v_quantidade numeric := greatest(coalesce(p_quantidade_planejada, 0), 0);
  v_produto_op uuid;
  v_programacao public.erp_pcp_programacoes%rowtype;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória para apontar produção.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada; atualização não gravada.'; end if;
  if not exists(select 1 from public.erp_operador_sessoes s join public.erp_funcionarios f on f.id=s.funcionario_id and f.empresa_id=s.empresa_id where s.empresa_id=v_empresa and s.auth_user_id=auth.uid() and s.funcionario_id=p_operador_id and s.encerrada_em is null and s.expira_em>now() and lower(coalesce(f.status,'ativo')) not in ('inativo','desligado','demitido','cancelado','afastado')) then raise exception 'OPERADOR_NAO_IDENTIFICADO_OU_SESSAO_EXPIRADA' using errcode='42501'; end if;
  if p_programacao_id is null or p_ordem_producao_id is null or p_processo_id is null or p_receita_id is null
     or p_maquina_id is null or p_operador_id is null then
    raise exception 'Apontamento incompleto: OP, processo, ficha aprovada, máquina e operador são obrigatórios.';
  end if;
  if v_quantidade <= 0 then raise exception 'Quantidade planejada deve ser maior que zero.'; end if;

  select op.produto_id into v_produto_op from public.erp_ordens_producao op where op.id=p_ordem_producao_id and op.empresa_id=v_empresa and lower(coalesce(op.status,'')) not in ('cancelada','cancelado','concluida','concluido','encerrada','encerrado','finalizada','finalizado') for update;
  if not found then raise exception 'OP_NAO_PERTENCE_A_EMPRESA_OU_JA_FOI_ENCERRADA'; end if;
  if not exists(select 1 from public.erp_processos_industriais p where p.id=p_processo_id and p.empresa_id=v_empresa and p.ativo=true) then raise exception 'PROCESSO_INATIVO_OU_FORA_DO_TENANT'; end if;
  if not exists(select 1 from public.erp_maquinas m where m.id=p_maquina_id and m.empresa_id=v_empresa and m.ativo=true) then raise exception 'MAQUINA_INATIVA_OU_FORA_DO_TENANT'; end if;
  if p_ferramenta_id is not null and not exists(select 1 from public.erp_moldes m where m.id=p_ferramenta_id and m.empresa_id=v_empresa and m.ativo=true) then raise exception 'MOLDE_INATIVO_OU_FORA_DO_TENANT'; end if;

  select * into v_receita
    from public.erp_receitas_processos
    where id = p_receita_id and empresa_id = v_empresa and processo_id = p_processo_id and produto_id=v_produto_op;
  if not found then raise exception 'Ficha de processo não encontrada na empresa autenticada.'; end if;
  if v_receita.status <> 'APROVADA' then raise exception 'Somente ficha de processo aprovada libera o início da produção.'; end if;
  if v_receita.maquina_id is not null and v_receita.maquina_id<>p_maquina_id then raise exception 'MAQUINA_DIVERGE_DA_RECEITA_APROVADA'; end if;
  if v_receita.ferramenta_id is distinct from p_ferramenta_id then raise exception 'MOLDE_DIVERGE_DA_RECEITA_APROVADA'; end if;

  perform 1 from public.erp_funcionarios
    where id = p_operador_id and empresa_id = v_empresa and lower(coalesce(status,'ativo')) not in ('inativo','desligado','demitido','cancelado','afastado');
  if not found then raise exception 'Funcionário fora da empresa autenticada.'; end if;

  select * into v_programacao from public.erp_pcp_programacoes p
   where p.id=p_programacao_id and p.empresa_id=v_empresa and p.ordem_producao_id=p_ordem_producao_id
     and p.produto_id=v_produto_op and p.maquina_id=p_maquina_id
     and p_operador_id in (p.operador_id,p.operador_a_id,p.operador_b_id,p.operador_frente_id,p.operador_atras_id)
     and upper(coalesce(p.status,'')) not in ('CANCELADA','CANCELADO','CONCLUIDA','CONCLUIDO')
   for update;
  if not found then raise exception 'PROGRAMACAO_NAO_ATRIBUIDA_AO_OPERADOR_OU_DIVERGENTE_DA_OP_MAQUINA'; end if;
  if v_quantidade>greatest(coalesce(v_programacao.quantidade_planejada,0)-coalesce(v_programacao.quantidade_produzida,0)-coalesce(v_programacao.quantidade_refugada,0),0) then raise exception 'QUANTIDADE_SUPERA_SALDO_DA_PROGRAMACAO'; end if;

  perform 1 from public.erp_apontamentos_processo
    where empresa_id = v_empresa
      and ordem_producao_id = p_ordem_producao_id
      and operador_id = p_operador_id
      and fim_em is null
    for update;
  if found then raise exception 'Esta OP já tem um apontamento em andamento para seu usuário.'; end if;

  insert into public.erp_apontamentos_processo
    (empresa_id, processo_id, receita_id, ordem_producao_id, maquina_id, ferramenta_id,
     inicio_em, quantidade_planejada, quantidade_boa, quantidade_refugada,
     operador_id, criado_por, parametros_reais)
  values
    (v_empresa, p_processo_id, p_receita_id, p_ordem_producao_id, p_maquina_id, p_ferramenta_id,
     now(), v_quantidade, 0, 0,
     p_operador_id, auth.uid(),
     jsonb_build_object(
       'origem', 'AREA_FUNCIONARIO_CPP',
       'programacao_id', p_programacao_id,
       'revisao_receita', v_receita.versao
     ))
  returning * into v_apontamento;

  return jsonb_build_object(
    'id', v_apontamento.id,
    'inicio_em', v_apontamento.inicio_em,
    'fim_em', v_apontamento.fim_em,
    'quantidade_boa', v_apontamento.quantidade_boa,
    'quantidade_refugada', v_apontamento.quantidade_refugada,
    'ordem_producao_id', v_apontamento.ordem_producao_id,
    'operador_id', v_apontamento.operador_id
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.erp_gerar_codigo(p_config_id uuid, p_grupo_codigo text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_empresa_id uuid;
  v_prefixo text;
  v_sep text;
  v_modo text;
  v_seq integer;
  v_base text;
  v_code text;
  v_group_prefix text;
  v_config public.erp_codigos%rowtype;
begin
  if v_uid is null then raise exception 'Sessão não autenticada'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('products.create') or public.erp_has_permission('products.update')) then raise exception 'SEM_PERMISSAO_PARA_GERAR_CODIGO_DE_PRODUTO' using errcode='42501'; end if;

  select u.empresa_id into v_empresa_id
  from public.erp_usuarios u
  where u.auth_user_id = v_uid and u.ativo = true and u.deleted_at is null
  limit 1;
  if v_empresa_id is null then raise exception 'Usuário sem empresa vinculada'; end if;

  select * into v_config
  from public.erp_codigos
  where id = p_config_id and empresa_id = v_empresa_id
  for update;
  if not found then raise exception 'Configuração de código não encontrada para a empresa'; end if;

  v_prefixo := upper(trim(v_config.prefixo));
  v_sep := coalesce(v_config.separador, '');
  v_modo := upper(trim(v_config.modo_numeracao));

  if v_modo = 'PGR' then
    if nullif(trim(coalesce(p_grupo_codigo, '')), '') is null then
      raise exception 'Grupo é obrigatório para o modo prefixo + grupo + sequência';
    end if;
    select nullif(trim(g.prefixo_codigo), '') into v_group_prefix
    from public.erp_grupos g
    where g.empresa_id = v_empresa_id
      and g.ativo = true
      and (g.id::text = p_grupo_codigo or g.codigo = p_grupo_codigo or lower(g.nome) = lower(p_grupo_codigo))
    limit 1;
    if v_group_prefix is null then
      raise exception 'Grupo não encontrado ou sem prefixo numérico configurado para esta empresa';
    end if;
    if v_group_prefix !~ '^[0-9]{1,3}$' then
      raise exception 'Prefixo do grupo deve conter de 1 a 3 dígitos numéricos';
    end if;
    v_base := v_prefixo || v_sep || v_group_prefix;
  elsif v_modo = 'PS' then
    v_base := v_prefixo;
  elsif v_modo = 'NUM' then
    v_base := '';
  else
    raise exception 'Modo de numeração inválido: %', v_modo;
  end if;

  select coalesce(max(h.sequencia), 0)::integer + 1 into v_seq
  from public.erp_historico_codigos h
  where h.empresa_id = v_empresa_id and h.codigo_base = v_base;

  if v_modo = 'NUM' then
    v_code := lpad(v_seq::text, greatest(v_config.digitos_produto, 3), '0');
  else
    v_code := v_base || v_sep || lpad(v_seq::text, greatest(v_config.digitos_produto, 3), '0');
  end if;

  insert into public.erp_historico_codigos(empresa_id, codigo_completo, codigo_base, sequencia, gerado_por)
  values (v_empresa_id, v_code, v_base, v_seq, v_uid);

  update public.erp_codigos
  set sequencia_atual = greatest(sequencia_atual, v_seq), updated_at = now()
  where id = p_config_id;

  return v_code;
end;
$function$


CREATE OR REPLACE FUNCTION public.erp_gerar_codigo_produto(p_config_id uuid, p_tipo_sigla text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_empresa_id uuid;
  v_prefixo text;
  v_tipo text := upper(trim(coalesce(p_tipo_sigla, '')));
  v_base text;
  v_codigo text;
  v_sequencia integer;
  v_digitos integer;
  v_config public.erp_codigos%rowtype;
  v_usuario_id uuid;
begin
  if v_uid is null then raise exception 'Sessão não autenticada'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('products.create') or public.erp_has_permission('products.update')) then raise exception 'SEM_PERMISSAO_PARA_GERAR_CODIGO_DE_PRODUTO' using errcode='42501'; end if;
  if v_tipo not in ('MP','PA','SA','IN') then raise exception 'Sigla de tipo inválida: %', v_tipo; end if;

  select u.id, u.empresa_id into v_usuario_id, v_empresa_id
  from public.erp_usuarios u
  where u.auth_user_id = v_uid and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_empresa_id is null then raise exception 'Usuário sem empresa vinculada'; end if;

  select * into v_config
  from public.erp_codigos
  where id = p_config_id and empresa_id = v_empresa_id
  for update;

  if not found then raise exception 'Configuração de código não encontrada para a empresa'; end if;

  v_prefixo := upper(trim(v_config.prefixo));
  if v_prefixo = '' then raise exception 'Prefixo de produto não configurado'; end if;

  v_digitos := greatest(3, least(coalesce(v_config.digitos_produto, 3), 6));
  v_base := v_prefixo || v_tipo;

  perform pg_advisory_xact_lock(hashtextextended(v_empresa_id::text || ':' || v_base, 0));

  select coalesce(max(h.sequencia), 0)::integer + 1 into v_sequencia
  from public.erp_historico_codigos h
  where h.empresa_id = v_empresa_id and h.codigo_base = v_base;

  if v_sequencia > (power(10, v_digitos) - 1) then
    raise exception 'Sequência esgotada para %', v_base;
  end if;

  v_codigo := v_base || lpad(v_sequencia::text, v_digitos, '0');

  insert into public.erp_historico_codigos (empresa_id,codigo_completo,codigo_base,sequencia,gerado_por)
  values (v_empresa_id,v_codigo,v_base,v_sequencia,v_usuario_id);

  update public.erp_codigos
  set sequencia_atual=greatest(sequencia_atual,v_sequencia), updated_at=now()
  where id=p_config_id and empresa_id=v_empresa_id;

  return v_codigo;
end;
$function$


CREATE OR REPLACE FUNCTION public.erp_operador_identificar_cartao(p_cartao text, p_cpf3 text)
 RETURNS TABLE(id uuid, empresa_id uuid, matricula text, nome text, nome_completo text, email text, status text, turno_trabalho text, departamento text, cargo text, numero_cracha_rfid text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_cartao text := btrim(coalesce(p_cartao,''));
  v_cpf3 text := right(regexp_replace(coalesce(p_cpf3,''),'\D','','g'),3);
  v_hash text;
  v_falhas integer := 0;
  v_total integer := 0;
  v_func public.erp_funcionarios%rowtype;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
  if v_empresa is null then raise exception 'Sessão corporativa não identificada. Faça login no ERP antes de usar o cartão.' using errcode='28000'; end if;
  if not exists(select 1 from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true and u.deleted_at is null) then
    raise exception 'USUARIO_ERP_FORA_DO_TENANT' using errcode='42501';
  end if;

  v_hash := md5(v_empresa::text||'|'||lower(v_cartao));
  update public.erp_operador_sessoes
     set encerrada_em=now()
   where empresa_id=v_empresa and auth_user_id=auth.uid() and encerrada_em is null;

  select count(*) into v_falhas
    from public.erp_operador_identificacao_tentativa t
   where t.empresa_id=v_empresa
     and t.sucesso=false
     and t.criado_em>now()-interval '15 minutes'
     and (t.cartao_hash=v_hash or t.auth_user_id=auth.uid());
  if v_falhas>=8 then return; end if;

  if length(v_cartao)<2 or length(v_cartao)>32 or length(v_cpf3)<>3 then
    insert into public.erp_operador_identificacao_tentativa(empresa_id,auth_user_id,cartao_hash,sucesso)
    values(v_empresa,auth.uid(),v_hash,false);
    return;
  end if;

  select count(*) into v_total
    from public.erp_funcionarios f
   where f.empresa_id=v_empresa
     and (f.numero_cracha_rfid=v_cartao or f.matricula=v_cartao);
  if v_total>1 then
    insert into public.erp_operador_identificacao_tentativa(empresa_id,auth_user_id,cartao_hash,sucesso)
    values(v_empresa,auth.uid(),v_hash,false);
    return;
  end if;

  select f.* into v_func
    from public.erp_funcionarios f
   where f.empresa_id=v_empresa
     and (f.numero_cracha_rfid=v_cartao or f.matricula=v_cartao)
     and lower(coalesce(f.status,'ativo')) not in ('inativo','desligado','demitido','cancelado','afastado')
     and right(regexp_replace(coalesce(f.cpf,''),'\D','','g'),3)=v_cpf3
   limit 1;
  if v_func.id is null then
    insert into public.erp_operador_identificacao_tentativa(empresa_id,auth_user_id,cartao_hash,sucesso)
    values(v_empresa,auth.uid(),v_hash,false);
    return;
  end if;

  insert into public.erp_operador_identificacao_tentativa(empresa_id,auth_user_id,cartao_hash,sucesso)
  values(v_empresa,auth.uid(),v_hash,true);
  insert into public.erp_operador_sessoes(empresa_id,auth_user_id,funcionario_id,identificado_em,expira_em,encerrada_em)
  values(v_empresa,auth.uid(),v_func.id,now(),now()+interval '12 hours',null)
  on conflict(empresa_id,auth_user_id) where encerrada_em is null
  do update set funcionario_id=excluded.funcionario_id,identificado_em=now(),expira_em=now()+interval '12 hours';

  delete from public.erp_operador_identificacao_tentativa where empresa_id=v_empresa and criado_em<now()-interval '7 days';
  return query
    select v_func.id,v_func.empresa_id,v_func.matricula,v_func.nome,v_func.nome_completo,
           v_func.email,v_func.status,v_func.turno_trabalho,v_func.departamento,v_func.cargo,v_func.numero_cracha_rfid;
end;
$function$


CREATE OR REPLACE FUNCTION public.erp_qualidade_decidir_lote(p_lote_operacional_id uuid, p_acao text, p_observacoes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid := auth.uid();
  v_usuario_id uuid;
  v_nivel_admin integer;
  v_nome text;
  v_email text;
  v_lote record;
  v_existente public.erp_qualidade_liberacao_lotes%ROWTYPE;
  v_decisao public.erp_qualidade_liberacao_lotes%ROWTYPE;
  v_localizacao_original text;
  v_localizacao_nova text;
  v_status_novo text;
  v_status_sgq text;
  v_auditoria_id uuid;
  v_codigo_lote text;
BEGIN
  IF v_user IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'SESSAO_EMPRESA_NAO_IDENTIFICADA' USING ERRCODE = '42501';
  END IF;
  IF p_lote_operacional_id IS NULL OR upper(coalesce(p_acao, '')) NOT IN ('LIBERAR', 'BLOQUEAR') THEN
    RAISE EXCEPTION 'DECISAO_DE_LOTE_INVALIDA' USING ERRCODE = '22023';
  END IF;

  SELECT u.id, coalesce(u.nivel_admin, 0), u.nome, u.email
    INTO v_usuario_id, v_nivel_admin, v_nome, v_email
    FROM public.erp_usuarios u
   WHERE u.auth_user_id = v_user
     AND u.empresa_id = v_empresa
     AND u.ativo = true
     AND u.deleted_at IS NULL
   FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USUARIO_ATIVO_DA_EMPRESA_NAO_ENCONTRADO' USING ERRCODE = '42501'; END IF;
  IF NOT (public.erp_is_master() OR public.erp_has_permission('production.approve')) THEN RAISE EXCEPTION 'SEM_PERMISSAO_PARA_DECISAO_DE_QUALIDADE' USING ERRCODE = '42501'; END IF;
  v_nome := left(coalesce(nullif(btrim(v_nome), ''), nullif(btrim(v_email), ''), 'USUARIO'), 100);

  PERFORM pg_advisory_xact_lock(hashtext(v_empresa::text), hashtext(p_lote_operacional_id::text));

  SELECT l.id, l.empresa_id, l.produto_id, l.lote_interno, l.lote_fornecedor,
         l.quantidade_recebida, l.quantidade_disponivel, l.status_inspecao, l.localizacao
    INTO v_lote
    FROM public.erp_estoque_lotes l
   WHERE l.id = p_lote_operacional_id
     AND l.empresa_id = v_empresa
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LOTE_OPERACIONAL_NAO_ENCONTRADO_NA_EMPRESA';
  END IF;
  IF coalesce(v_lote.quantidade_disponivel, 0) <= 0 THEN
    RAISE EXCEPTION 'LOTE_SEM_QUANTIDADE_DISPONIVEL_PARA_DECISAO';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.erp_produtos p
     WHERE p.id = v_lote.produto_id
       AND p.empresa_id = v_empresa
  ) THEN
    RAISE EXCEPTION 'PRODUTO_DO_LOTE_NAO_PERTENCE_A_EMPRESA';
  END IF;

  SELECT q.*
    INTO v_existente
    FROM public.erp_qualidade_liberacao_lotes q
   WHERE q.empresa_id = v_empresa
     AND q.lote_operacional_id = p_lote_operacional_id
   FOR UPDATE;

  v_localizacao_original := coalesce(
    v_existente.localizacao_anterior,
    CASE
      WHEN lower(coalesce(v_lote.localizacao, '')) = lower('Quarentena') THEN 'Estoque'
      ELSE v_lote.localizacao
    END,
    'Estoque'
  );
  v_codigo_lote := left(coalesce(
    nullif(btrim(v_lote.lote_interno), ''),
    nullif(btrim(v_lote.lote_fornecedor), ''),
    v_lote.id::text
  ), 50);

  IF upper(p_acao) = 'BLOQUEAR' THEN
    IF length(btrim(coalesce(p_observacoes, ''))) < 5 THEN
      RAISE EXCEPTION 'JUSTIFICATIVA_OBRIGATORIA_PARA_BLOQUEAR_LOTE';
    END IF;
    v_status_novo := 'BLOQUEADO';
    v_status_sgq := 'REPROVADO';
    v_localizacao_nova := 'Quarentena';
  ELSE
    IF upper(coalesce(v_lote.status_inspecao, '')) IN ('BLOQUEADO', 'REPROVADO')
       AND length(btrim(coalesce(p_observacoes, ''))) < 5 THEN
      RAISE EXCEPTION 'JUSTIFICATIVA_OBRIGATORIA_PARA_LIBERAR_LOTE_BLOQUEADO';
    END IF;
    v_status_novo := 'APROVADO';
    v_status_sgq := 'APROVADO';
    v_localizacao_nova := v_localizacao_original;
  END IF;

  IF v_existente.id IS NOT NULL
     AND upper(coalesce(v_lote.status_inspecao, '')) = v_status_novo
     AND v_existente.status_sgq = v_status_sgq THEN
    RETURN jsonb_build_object(
      'registro', to_jsonb(v_existente),
      'lote', jsonb_build_object(
        'status_inspecao', v_lote.status_inspecao,
        'localizacao', v_lote.localizacao
      ),
      'auditoria_id', NULL,
      'sem_alteracao', true
    );
  END IF;

  UPDATE public.erp_estoque_lotes
     SET status_inspecao = v_status_novo,
         localizacao = v_localizacao_nova
   WHERE id = p_lote_operacional_id
     AND empresa_id = v_empresa;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FALHA_AO_ATUALIZAR_STATUS_OPERACIONAL_DO_LOTE';
  END IF;

  INSERT INTO public.erp_qualidade_liberacao_lotes (
    empresa_id, lote_operacional_id, codigo_lote, produto_id, quantidade,
    status_sgq, responsavel_liberacao, observacoes, localizacao_anterior, criado_por
  )
  VALUES (
    v_empresa, p_lote_operacional_id, v_codigo_lote, v_lote.produto_id,
    coalesce(v_lote.quantidade_disponivel, v_lote.quantidade_recebida, 0),
    v_status_sgq, v_nome, nullif(btrim(p_observacoes), ''),
    v_localizacao_original, v_user
  )
  ON CONFLICT (empresa_id, lote_operacional_id)
    WHERE lote_operacional_id IS NOT NULL
  DO UPDATE SET
    codigo_lote = EXCLUDED.codigo_lote,
    produto_id = EXCLUDED.produto_id,
    quantidade = EXCLUDED.quantidade,
    status_sgq = EXCLUDED.status_sgq,
    responsavel_liberacao = EXCLUDED.responsavel_liberacao,
    observacoes = EXCLUDED.observacoes,
    localizacao_anterior = EXCLUDED.localizacao_anterior,
    updated_at = now()
  RETURNING * INTO v_decisao;

  INSERT INTO public.erp_qualidade_liberacao_lotes_auditoria (
    empresa_id, lote_operacional_id, liberacao_id, acao,
    status_operacional_anterior, status_operacional_novo,
    localizacao_anterior, localizacao_nova,
    responsavel_id, nivel_admin, observacoes
  )
  VALUES (
    v_empresa, p_lote_operacional_id, v_decisao.id, upper(p_acao),
    v_lote.status_inspecao, v_status_novo,
    v_lote.localizacao, v_localizacao_nova,
    v_usuario_id, v_nivel_admin, nullif(btrim(p_observacoes), '')
  )
  RETURNING id INTO v_auditoria_id;

  RETURN jsonb_build_object(
    'registro', to_jsonb(v_decisao),
    'lote', jsonb_build_object(
      'status_inspecao', v_status_novo,
      'localizacao', v_localizacao_nova
    ),
    'auditoria_id', v_auditoria_id,
    'sem_alteracao', false
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.erp_qualidade_lote_decidir(p_lote_operacional_id uuid, p_status text, p_observacoes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_empresa uuid;
  v_usuario_id uuid;
  v_nivel_admin integer;
  v_lote public.erp_estoque_lotes%rowtype;
  v_registro public.erp_qualidade_liberacao_lotes%rowtype;
  v_tem_registro boolean := false;
  v_localizacao_anterior text;
  v_antes_lote jsonb;
  v_antes_registro jsonb;
  v_depois jsonb;
begin
  if p_lote_operacional_id is null then
    raise exception 'LOTE_OPERACIONAL_OBRIGATORIO';
  end if;
  if p_status not in ('APROVADO', 'REPROVADO') then
    raise exception 'DECISAO_DE_LOTE_INVALIDA';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA';
  end if;

  select u.id, u.nivel_admin
    into v_usuario_id, v_nivel_admin
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo is true
     and u.deleted_at is null
   limit 1;

  if not found then
    raise exception 'USUARIO_ATIVO_DA_EMPRESA_NAO_ENCONTRADO';
  end if;

  if not (public.erp_is_master() or public.erp_has_permission('production.approve')) then
    raise exception 'SEM_PERMISSAO_PARA_DECISAO_DE_QUALIDADE' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_empresa::text || ':' || p_lote_operacional_id::text, 0)
  );

  select l.*
    into v_lote
    from public.erp_estoque_lotes l
   where l.id = p_lote_operacional_id
     and l.empresa_id = v_empresa
   for update;

  if not found then
    raise exception 'LOTE_NAO_PERTENCE_A_EMPRESA_ATUAL';
  end if;

  if coalesce(v_lote.quantidade_recebida, 0) <= 0 then
    raise exception 'LOTE_SEM_QUANTIDADE_RECEBIDA';
  end if;

  if not exists (
    select 1
      from public.erp_produtos p
     where p.id = v_lote.produto_id
       and p.empresa_id = v_empresa
  ) then
    raise exception 'PRODUTO_DO_LOTE_NAO_PERTENCE_A_EMPRESA';
  end if;

  v_antes_lote := to_jsonb(v_lote);

  select r.*
    into v_registro
    from public.erp_qualidade_liberacao_lotes r
   where r.empresa_id = v_empresa
     and (r.lote_operacional_id = p_lote_operacional_id
       or r.codigo_lote = v_lote.lote_interno)
   order by case when r.lote_operacional_id = p_lote_operacional_id then 0 else 1 end
   limit 1
   for update;

  v_tem_registro := found;
  if v_tem_registro then
    v_antes_registro := to_jsonb(v_registro);
    if v_registro.lote_operacional_id is not null
       and v_registro.lote_operacional_id <> p_lote_operacional_id then
      raise exception 'CODIGO_DE_LOTE_JA_VINCULADO_A_OUTRO_LOTE_OPERACIONAL';
    end if;
    if v_registro.codigo_lote <> v_lote.lote_interno then
      raise exception 'CODIGO_DO_LOTE_DIVERGE_DO_REGISTRO_SGQ';
    end if;
  else
    v_antes_registro := null;
  end if;

  if p_status = 'REPROVADO' then
    v_localizacao_anterior := coalesce(
      v_registro.localizacao_anterior,
      nullif(v_lote.localizacao, 'Quarentena')
    );
    update public.erp_estoque_lotes
       set status_inspecao = 'REPROVADO',
           localizacao = 'Quarentena'
     where id = p_lote_operacional_id
       and empresa_id = v_empresa;
  else
    v_localizacao_anterior := null;
    update public.erp_estoque_lotes
       set status_inspecao = 'APROVADO',
           localizacao = case
             when localizacao = 'Quarentena'
               and v_registro.localizacao_anterior is not null
             then v_registro.localizacao_anterior
             else localizacao
           end
     where id = p_lote_operacional_id
       and empresa_id = v_empresa;
  end if;

  select l.*
    into v_lote
    from public.erp_estoque_lotes l
   where l.id = p_lote_operacional_id
     and l.empresa_id = v_empresa;

  if v_tem_registro then
    update public.erp_qualidade_liberacao_lotes
       set lote_operacional_id = p_lote_operacional_id,
           quantidade = v_lote.quantidade_recebida,
           status_sgq = p_status,
           responsavel_liberacao = v_usuario_id::text,
           observacoes = coalesce(nullif(trim(p_observacoes), ''), observacoes),
           localizacao_anterior = v_localizacao_anterior,
           updated_at = now()
     where id = v_registro.id
       and empresa_id = v_empresa
     returning * into v_registro;
  else
    insert into public.erp_qualidade_liberacao_lotes (
      empresa_id,
      codigo_lote,
      produto_id,
      quantidade,
      status_sgq,
      responsavel_liberacao,
      observacoes,
      criado_por,
      lote_operacional_id,
      localizacao_anterior
    ) values (
      v_empresa,
      v_lote.lote_interno,
      v_lote.produto_id,
      v_lote.quantidade_recebida,
      p_status,
      v_usuario_id::text,
      nullif(trim(p_observacoes), ''),
      auth.uid(),
      p_lote_operacional_id,
      v_localizacao_anterior
    )
    returning * into v_registro;
  end if;

  v_depois := jsonb_build_object(
    'lote_operacional', to_jsonb(v_lote),
    'parecer_sgq', to_jsonb(v_registro)
  );

  insert into public.erp_sgq_auditoria (
    empresa_id, entidade, entidade_id, operacao, ator_id, antes, depois
  ) values (
    v_empresa,
    'erp_qualidade_liberacao_lotes',
    v_registro.id,
    case when v_tem_registro then 'UPDATE' else 'INSERT' end,
    v_usuario_id,
    jsonb_build_object('lote_operacional', v_antes_lote, 'parecer_sgq', v_antes_registro),
    v_depois
  );

  return jsonb_build_object('registro', to_jsonb(v_registro), 'lote', to_jsonb(v_lote));
end;
$function$


revoke all on function public.erp_operador_identificar_cartao(text,text) from public,anon;
grant execute on function public.erp_operador_identificar_cartao(text,text) to authenticated;
revoke all on function public.erp_apontamento_iniciar(uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric) from public,anon;
grant execute on function public.erp_apontamento_iniciar(uuid,uuid,uuid,uuid,uuid,uuid,uuid,numeric) to authenticated;
revoke all on function public.erp_apontamento_finalizar(uuid,uuid,uuid,numeric,numeric,text,text) from public,anon;
grant execute on function public.erp_apontamento_finalizar(uuid,uuid,uuid,numeric,numeric,text,text) to authenticated;
revoke all on function public.erp_gerar_codigo(uuid,text) from public,anon;
grant execute on function public.erp_gerar_codigo(uuid,text) to authenticated;
revoke all on function public.erp_gerar_codigo_produto(uuid,text) from public,anon;
grant execute on function public.erp_gerar_codigo_produto(uuid,text) to authenticated;
revoke all on function public.erp_qualidade_decidir_lote(uuid,text,text) from public,anon,authenticated;
revoke all on function public.erp_qualidade_lote_decidir(uuid,text,text) from public,anon,authenticated;
commit;
notify pgrst,'reload schema';
