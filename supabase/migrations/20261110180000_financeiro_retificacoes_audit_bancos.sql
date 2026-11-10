begin;

create table if not exists public.erp_instituicoes_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id) on delete cascade,
  codigo_compe varchar(10),
  nome varchar(160) not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint erp_instituicoes_financeiras_codigo_nome_ck check (
    nullif(btrim(nome), '') is not null
  )
);
create unique index if not exists erp_instituicoes_financeiras_global_codigo_uk
  on public.erp_instituicoes_financeiras(codigo_compe)
  where empresa_id is null and codigo_compe is not null;
create unique index if not exists erp_instituicoes_financeiras_empresa_codigo_uk
  on public.erp_instituicoes_financeiras(empresa_id,codigo_compe)
  where empresa_id is not null and codigo_compe is not null;
create unique index if not exists erp_instituicoes_financeiras_empresa_nome_uk
  on public.erp_instituicoes_financeiras(empresa_id,lower(nome))
  where empresa_id is not null;

alter table public.erp_instituicoes_financeiras enable row level security;
drop policy if exists erp_instituicoes_financeiras_select on public.erp_instituicoes_financeiras;
create policy erp_instituicoes_financeiras_select on public.erp_instituicoes_financeiras
  for select to authenticated using (empresa_id is null or empresa_id = public.erp_current_empresa_id());
drop policy if exists erp_instituicoes_financeiras_insert on public.erp_instituicoes_financeiras;
create policy erp_instituicoes_financeiras_insert on public.erp_instituicoes_financeiras
  for insert to authenticated with check (empresa_id = public.erp_current_empresa_id());
grant select,insert on public.erp_instituicoes_financeiras to authenticated;

insert into public.erp_instituicoes_financeiras(empresa_id,codigo_compe,nome) values
(null,'001','Banco do Brasil S.A.'),
(null,'033','Banco Santander (Brasil) S.A.'),
(null,'104','Caixa Econômica Federal'),
(null,'237','Banco Bradesco S.A.'),
(null,'341','Itaú Unibanco S.A.'),
(null,'077','Banco Inter S.A.'),
(null,'260','Nu Pagamentos S.A.'),
(null,'336','Banco C6 S.A.'),
(null,'290','PagSeguro Internet S.A.'),
(null,'380','PicPay Serviços S.A.'),
(null,'756','Banco Cooperativo Sicoob S.A.'),
(null,'748','Banco Cooperativo Sicredi S.A.'),
(null,'655','Banco Votorantim S.A.'),
(null,'212','Banco Original S.A.'),
(null,'623','Banco Pan S.A.')
on conflict do nothing;

alter table public.erp_contas_bancarias
  add column if not exists instituicao_id uuid references public.erp_instituicoes_financeiras(id) on delete set null;
create index if not exists erp_contas_bancarias_instituicao_idx
  on public.erp_contas_bancarias(empresa_id,instituicao_id);

alter table public.erp_financeiro_titulos
  add column if not exists conta_bancaria_id uuid references public.erp_contas_bancarias(id) on delete set null;
alter table public.erp_financeiro_parcelas
  add column if not exists juros numeric(18,2) not null default 0,
  add column if not exists multa numeric(18,2) not null default 0,
  add column if not exists desconto numeric(18,2) not null default 0;

create table if not exists public.erp_financeiro_periodos_fechados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  data_inicio date not null,
  data_fim date not null,
  motivo text not null,
  fechado_por uuid not null references public.erp_usuarios(id) on delete restrict,
  fechado_em timestamptz not null default now(),
  constraint erp_financeiro_periodos_fechados_datas_ck check(data_fim >= data_inicio),
  constraint erp_financeiro_periodos_fechados_empresa_periodo_uk unique(empresa_id,data_inicio,data_fim)
);
alter table public.erp_financeiro_periodos_fechados enable row level security;
drop policy if exists erp_financeiro_periodos_fechados_select on public.erp_financeiro_periodos_fechados;
create policy erp_financeiro_periodos_fechados_select on public.erp_financeiro_periodos_fechados
  for select to authenticated using (empresa_id = public.erp_current_empresa_id());
grant select on public.erp_financeiro_periodos_fechados to authenticated;

create table if not exists public.erp_financeiro_retificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  titulo_id uuid not null references public.erp_financeiro_titulos(id) on delete restrict,
  parcela_id uuid references public.erp_financeiro_parcelas(id) on delete restrict,
  tipo_retificacao text not null,
  dados_antes jsonb not null,
  dados_depois jsonb not null,
  justificativa text not null,
  anexo_path text,
  usuario_id uuid not null references public.erp_usuarios(id) on delete restrict,
  criado_em timestamptz not null default now()
);
create index if not exists erp_financeiro_retificacoes_titulo_idx
  on public.erp_financeiro_retificacoes(empresa_id,titulo_id,criado_em desc);
alter table public.erp_financeiro_retificacoes enable row level security;
drop policy if exists erp_financeiro_retificacoes_select on public.erp_financeiro_retificacoes;
create policy erp_financeiro_retificacoes_select on public.erp_financeiro_retificacoes
  for select to authenticated using (
    empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('financeiro','ver')
  );
revoke all on public.erp_financeiro_retificacoes from public,anon,authenticated;
grant select on public.erp_financeiro_retificacoes to authenticated;

create or replace function public.erp_financeiro_retificar_parcela(
  p_empresa_id uuid,
  p_titulo_id uuid,
  p_parcela_id uuid,
  p_tipo_retificacao text,
  p_novo_valor numeric,
  p_novo_vencimento date,
  p_nova_conta_id uuid,
  p_nova_categoria text,
  p_novo_centro_custo text,
  p_juros numeric,
  p_multa numeric,
  p_desconto numeric,
  p_justificativa text,
  p_anexo_path text default null
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_auth uuid := auth.uid();
  v_user public.erp_usuarios%rowtype;
  v_title public.erp_financeiro_titulos%rowtype;
  v_part public.erp_financeiro_parcelas%rowtype;
  v_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_paid numeric(18,2);
  v_new_total numeric(18,2);
  v_new_balance numeric(18,2);
  v_type text := upper(btrim(coalesce(p_tipo_retificacao,'')));
  v_due date;
begin
  if v_auth is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
  select * into v_user from public.erp_usuarios
    where auth_user_id=v_auth and ativo=true and deleted_at is null limit 1;
  if v_user.id is null or v_user.empresa_id is distinct from p_empresa_id then
    raise exception 'Usuário não pertence à empresa ativa.' using errcode='42501';
  end if;
  if upper(coalesce(v_user.perfil,'')) not in ('ADMINISTRADOR','FINANCEIRO','CONTROLADORIA') then
    raise exception 'Acesso restrito a Administração, Financeiro ou Controladoria.' using errcode='42501';
  end if;
  if p_empresa_id is distinct from public.erp_current_empresa_id() then
    raise exception 'Empresa informada não corresponde à sessão.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_justificativa,''))) < 20 then
    raise exception 'A justificativa deve conter no mínimo 20 caracteres.' using errcode='22023';
  end if;
  if v_type not in ('CORRECAO_VALOR','ALTERACAO_VENCIMENTO','TROCA_CONTA','RECLASSIFICACAO','ESTORNO') then
    raise exception 'Tipo de retificação inválido.' using errcode='22023';
  end if;

  select * into v_title from public.erp_financeiro_titulos
    where id=p_titulo_id and empresa_id=p_empresa_id for update;
  if not found or v_title.status='CANCELADO' then raise exception 'Título não localizado ou cancelado.'; end if;
  select * into v_part from public.erp_financeiro_parcelas
    where id=p_parcela_id and titulo_id=p_titulo_id and empresa_id=p_empresa_id for update;
  if not found or v_part.status='CANCELADO' then raise exception 'Parcela não localizada ou cancelada.'; end if;

  if exists(select 1 from public.erp_financeiro_periodos_fechados f
    where f.empresa_id=p_empresa_id
      and (v_part.vencimento between f.data_inicio and f.data_fim
        or coalesce(p_novo_vencimento,v_part.vencimento) between f.data_inicio and f.data_fim
        or v_title.data_emissao between f.data_inicio and f.data_fim)) then
    raise exception 'Retificação bloqueada: o período financeiro/contábil está fechado.' using errcode='55000';
  end if;

  if p_anexo_path is not null and split_part(p_anexo_path,'/',1) <> p_empresa_id::text then
    raise exception 'Anexo fora da pasta da empresa.' using errcode='42501';
  end if;

  v_paid := round(v_part.valor-v_part.saldo,2);
  v_old := jsonb_build_object(
    'titulo_id',v_title.id,'tipo',v_title.tipo,'documento',v_title.documento,
    'parceiro_id',v_title.parceiro_id,'data_emissao',v_title.data_emissao,
    'valor_total_titulo',v_title.valor_total,'categoria',v_title.categoria,
    'centro_custo',v_title.centro_custo,'conta_bancaria_id',v_title.conta_bancaria_id,
    'parcela_id',v_part.id,'vencimento',v_part.vencimento,'valor',v_part.valor,
    'saldo',v_part.saldo,'juros',v_part.juros,'multa',v_part.multa,'desconto',v_part.desconto,
    'status',v_part.status,'valor_pago',v_paid
  );

  if v_type='ESTORNO' then
    if exists(select 1 from public.erp_financeiro_parcelas p
      where p.titulo_id=p_titulo_id and p.empresa_id=p_empresa_id
        and p.status<>'CANCELADO' and p.saldo < p.valor) then
      raise exception 'Estorno total bloqueado: existe parcela com pagamento registrado. Faça o ajuste por procedimento de estorno bancário.' using errcode='55000';
    end if;
    update public.erp_financeiro_parcelas set status='CANCELADO',saldo=0
      where titulo_id=p_titulo_id and empresa_id=p_empresa_id and status<>'CANCELADO';
    update public.erp_financeiro_titulos set status='CANCELADO',atualizado_em=now()
      where id=p_titulo_id and empresa_id=p_empresa_id;
  else
    if v_part.status='LIQUIDADO' or v_part.saldo=0 then
      raise exception 'Parcela liquidada não pode ser alterada diretamente. Registre estorno bancário ou título complementar.' using errcode='55000';
    end if;
    if p_novo_valor is null or p_novo_valor <= 0 then raise exception 'Informe novo valor positivo.' using errcode='22023'; end if;
    if coalesce(p_juros,0)<0 or coalesce(p_multa,0)<0 or coalesce(p_desconto,0)<0 then raise exception 'Juros, multa e desconto não podem ser negativos.' using errcode='22023'; end if;
    v_new_total := round(p_novo_valor+coalesce(p_juros,0)+coalesce(p_multa,0)-coalesce(p_desconto,0),2);
    if v_new_total < v_paid or v_new_total <= 0 then raise exception 'Novo total não pode ser menor que o valor já pago.' using errcode='22023'; end if;
    if p_nova_conta_id is not null and not exists(
      select 1 from public.erp_contas_bancarias c where c.id=p_nova_conta_id and c.empresa_id=p_empresa_id and c.ativo=true
    ) then raise exception 'Conta bancária inválida ou pertencente a outra empresa.' using errcode='42501'; end if;
    v_due := coalesce(p_novo_vencimento,v_part.vencimento);
    v_new_balance := round(v_new_total-v_paid,2);
    update public.erp_financeiro_parcelas set
      vencimento=v_due,valor=v_new_total,saldo=v_new_balance,
      juros=coalesce(p_juros,0),multa=coalesce(p_multa,0),desconto=coalesce(p_desconto,0),
      status=case when v_paid>0 then 'PARCIAL' else 'ABERTO' end
    where id=v_part.id and empresa_id=p_empresa_id;
    update public.erp_financeiro_titulos set
      valor_total=(select coalesce(sum(p.valor),0) from public.erp_financeiro_parcelas p where p.titulo_id=p_titulo_id and p.empresa_id=p_empresa_id and p.status<>'CANCELADO'),
      categoria=coalesce(nullif(btrim(p_nova_categoria),''),categoria),
      centro_custo=coalesce(nullif(btrim(p_novo_centro_custo),''),centro_custo),
      conta_bancaria_id=coalesce(p_nova_conta_id,conta_bancaria_id),
      status=case when exists(select 1 from public.erp_financeiro_parcelas p where p.titulo_id=p_titulo_id and p.empresa_id=p_empresa_id and p.status='PARCIAL') then 'PARCIAL' else 'ABERTO' end,
      atualizado_em=now()
    where id=p_titulo_id and empresa_id=p_empresa_id;
  end if;

  select jsonb_build_object(
    'tipo',t.tipo,'documento',t.documento,'valor_total_titulo',t.valor_total,
    'categoria',t.categoria,'centro_custo',t.centro_custo,'conta_bancaria_id',t.conta_bancaria_id,
    'parcela_id',p.id,'vencimento',p.vencimento,'valor',p.valor,'saldo',p.saldo,
    'juros',p.juros,'multa',p.multa,'desconto',p.desconto,'status',p.status
  ) into v_new
  from public.erp_financeiro_titulos t
  left join public.erp_financeiro_parcelas p on p.id=p_parcela_id and p.empresa_id=p_empresa_id
  where t.id=p_titulo_id and t.empresa_id=p_empresa_id;

  insert into public.erp_financeiro_retificacoes(
    empresa_id,titulo_id,parcela_id,tipo_retificacao,dados_antes,dados_depois,
    justificativa,anexo_path,usuario_id
  ) values(
    p_empresa_id,p_titulo_id,p_parcela_id,v_type,v_old,coalesce(v_new,'{}'::jsonb),
    btrim(p_justificativa),p_anexo_path,v_user.id
  ) returning id into v_id;

  insert into public.erp_logs_sistema(empresa_id,usuario_id,modulo,acao,entidade,entidade_id,dados)
  values(p_empresa_id,v_user.id,'Financeiro','TITULO_RETIFICADO','erp_financeiro_titulos',p_titulo_id,
    jsonb_build_object('retificacao_id',v_id,'tipo',v_type,'antes',v_old,'depois',v_new,'justificativa',btrim(p_justificativa)));

  return v_id;
end;
$function$;

revoke all on function public.erp_financeiro_retificar_parcela(uuid,uuid,uuid,text,numeric,date,uuid,text,text,numeric,numeric,numeric,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.erp_financeiro_retificar_parcela(uuid,uuid,uuid,text,numeric,date,uuid,text,text,numeric,numeric,numeric,text,text)
  to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('financeiro-retificacoes','financeiro-retificacoes',false,10485760,
  array['application/pdf','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=10485760,
  allowed_mime_types=array['application/pdf','image/png','image/jpeg'];

drop policy if exists financeiro_retificacoes_storage_select on storage.objects;
create policy financeiro_retificacoes_storage_select on storage.objects
  for select to authenticated using (
    bucket_id='financeiro-retificacoes'
    and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
  );
drop policy if exists financeiro_retificacoes_storage_insert on storage.objects;
create policy financeiro_retificacoes_storage_insert on storage.objects
  for insert to authenticated with check (
    bucket_id='financeiro-retificacoes'
    and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
  );


create or replace function public.erp_financeiro_fechar_periodo(
  p_empresa_id uuid,
  p_data_inicio date,
  p_data_fim date,
  p_motivo text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_auth uuid := auth.uid();
  v_user public.erp_usuarios%rowtype;
  v_id uuid;
begin
  if v_auth is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
  select * into v_user from public.erp_usuarios
    where auth_user_id=v_auth and ativo=true and deleted_at is null limit 1;
  if v_user.id is null or v_user.empresa_id is distinct from p_empresa_id
     or p_empresa_id is distinct from public.erp_current_empresa_id() then
    raise exception 'Empresa da sessão inválida.' using errcode='42501';
  end if;
  if upper(coalesce(v_user.perfil,'')) not in ('ADMINISTRADOR','CONTROLADORIA') then
    raise exception 'Somente Administração ou Controladoria pode fechar período.' using errcode='42501';
  end if;
  if p_data_inicio is null or p_data_fim is null or p_data_fim<p_data_inicio
     or length(btrim(coalesce(p_motivo,'')))<10 then
    raise exception 'Informe período válido e motivo com pelo menos 10 caracteres.' using errcode='22023';
  end if;
  if exists(select 1 from public.erp_financeiro_periodos_fechados f
    where f.empresa_id=p_empresa_id
      and daterange(f.data_inicio,f.data_fim,'[]') && daterange(p_data_inicio,p_data_fim,'[]')) then
    raise exception 'Já existe um período fechado que se sobrepõe às datas informadas.' using errcode='23505';
  end if;
  insert into public.erp_financeiro_periodos_fechados(empresa_id,data_inicio,data_fim,motivo,fechado_por)
  values(p_empresa_id,p_data_inicio,p_data_fim,btrim(p_motivo),v_user.id)
  returning id into v_id;
  return v_id;
end;
$function$;
revoke all on function public.erp_financeiro_fechar_periodo(uuid,date,date,text) from public,anon,authenticated,service_role;
grant execute on function public.erp_financeiro_fechar_periodo(uuid,date,date,text) to authenticated;

commit;