begin;

create table if not exists public.erp_financeiro_titulos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  tipo text not null check (tipo in ('PAGAR', 'RECEBER')),
  parceiro_tipo text not null check (parceiro_tipo in ('FORNECEDOR', 'CLIENTE')),
  parceiro_id uuid not null,
  descricao text not null,
  documento text,
  categoria text,
  centro_custo text,
  data_emissao date not null default current_date,
  origem_tipo text not null default 'MANUAL'
    check (origem_tipo in ('MANUAL', 'PEDIDO_VENDA', 'PEDIDO_COMPRA')),
  origem_id uuid,
  chave_idempotencia uuid not null,
  valor_total numeric(18,2) not null check (valor_total > 0),
  status text not null default 'ABERTO'
    check (status in ('ABERTO', 'PARCIAL', 'LIQUIDADO', 'CANCELADO')),
  criado_por uuid not null references public.erp_usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint erp_financeiro_titulo_origem_check check (
    (origem_tipo = 'MANUAL' and origem_id is null)
    or (origem_tipo <> 'MANUAL' and origem_id is not null)
  ),
  constraint erp_financeiro_titulo_tipo_parceiro_check check (
    (tipo = 'PAGAR' and parceiro_tipo = 'FORNECEDOR')
    or (tipo = 'RECEBER' and parceiro_tipo = 'CLIENTE')
  ),
  constraint erp_financeiro_titulo_idempotencia_uk
    unique (empresa_id, chave_idempotencia)
);

create unique index if not exists erp_financeiro_titulos_origem_uk
  on public.erp_financeiro_titulos(empresa_id, tipo, origem_tipo, origem_id)
  where origem_id is not null;
create index if not exists erp_financeiro_titulos_busca_idx
  on public.erp_financeiro_titulos(empresa_id, tipo, status, criado_em desc);

create table if not exists public.erp_financeiro_parcelas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  titulo_id uuid not null references public.erp_financeiro_titulos(id) on delete restrict,
  numero integer not null check (numero > 0),
  vencimento date not null,
  valor numeric(18,2) not null check (valor > 0),
  saldo numeric(18,2) not null check (saldo >= 0 and saldo <= valor),
  status text not null default 'ABERTO'
    check (status in ('ABERTO', 'PARCIAL', 'LIQUIDADO', 'CANCELADO')),
  criado_em timestamptz not null default now(),
  constraint erp_financeiro_parcela_tenant_titulo_uk
    unique (empresa_id, titulo_id, numero)
);
create index if not exists erp_financeiro_parcelas_fluxo_idx
  on public.erp_financeiro_parcelas(empresa_id, vencimento, status);

create table if not exists public.erp_financeiro_baixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  titulo_id uuid not null references public.erp_financeiro_titulos(id) on delete restrict,
  parcela_id uuid not null references public.erp_financeiro_parcelas(id) on delete restrict,
  valor numeric(18,2) not null check (valor > 0),
  ocorrido_em timestamptz not null default now(),
  forma_pagamento text not null,
  referencia text,
  chave_idempotencia uuid not null,
  registrado_por uuid not null references public.erp_usuarios(id) on delete restrict,
  constraint erp_financeiro_baixa_tenant_parcela_uk
    unique (empresa_id, parcela_id, chave_idempotencia)
);
create index if not exists erp_financeiro_baixas_titulo_idx
  on public.erp_financeiro_baixas(empresa_id, titulo_id, ocorrido_em desc);

insert into public.erp_permissions(codigo, nome, modulo, ativo)
values ('financeiro.lancar', 'Lançar e baixar títulos financeiros', 'financeiro', true)
on conflict (codigo) do update
set nome = excluded.nome, modulo = excluded.modulo, ativo = true;

insert into public.erp_role_permissions(role_id, permission_id)
select r.id, p.id
from public.erp_roles r
join public.erp_permissions p on p.codigo = 'financeiro.lancar'
where r.codigo in ('ADMIN', 'MANAGER')
on conflict do nothing;

insert into public.erp_role_permissions(role_id, permission_id)
select r.id, p.id
from public.erp_roles r
join public.erp_permissions p on p.codigo = 'financeiro.ver'
where r.codigo in ('ADMIN', 'MANAGER', 'SUPERVISOR')
on conflict do nothing;

alter table public.erp_financeiro_titulos enable row level security;
alter table public.erp_financeiro_parcelas enable row level security;
alter table public.erp_financeiro_baixas enable row level security;

drop policy if exists erp_financeiro_titulos_guard on public.erp_financeiro_titulos;
drop policy if exists erp_financeiro_titulos_select on public.erp_financeiro_titulos;
create policy erp_financeiro_titulos_guard
  on public.erp_financeiro_titulos as restrictive for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_financeiro_titulos_select
  on public.erp_financeiro_titulos for select to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('financeiro', 'ver')
  );

drop policy if exists erp_financeiro_parcelas_guard on public.erp_financeiro_parcelas;
drop policy if exists erp_financeiro_parcelas_select on public.erp_financeiro_parcelas;
create policy erp_financeiro_parcelas_guard
  on public.erp_financeiro_parcelas as restrictive for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_financeiro_parcelas_select
  on public.erp_financeiro_parcelas for select to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('financeiro', 'ver')
  );

drop policy if exists erp_financeiro_baixas_guard on public.erp_financeiro_baixas;
drop policy if exists erp_financeiro_baixas_select on public.erp_financeiro_baixas;
create policy erp_financeiro_baixas_guard
  on public.erp_financeiro_baixas as restrictive for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_financeiro_baixas_select
  on public.erp_financeiro_baixas for select to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and public.erp_has_permission('financeiro', 'ver')
  );

revoke all on public.erp_financeiro_titulos, public.erp_financeiro_parcelas, public.erp_financeiro_baixas
  from public, anon, authenticated;
grant select on public.erp_financeiro_titulos, public.erp_financeiro_parcelas, public.erp_financeiro_baixas
  to authenticated;

create or replace function public.erp_financeiro_salvar_titulo(
  p_titulo_id uuid,
  p_empresa_id uuid,
  p_tipo text,
  p_parceiro_id uuid,
  p_descricao text,
  p_documento text,
  p_categoria text,
  p_centro_custo text,
  p_data_emissao date,
  p_origem_tipo text,
  p_origem_id uuid,
  p_chave_idempotencia uuid,
  p_parcelas jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_auth_user uuid := auth.uid();
  v_user_id uuid;
  v_user_empresa uuid;
  v_empresa_id uuid;
  v_is_master boolean;
  v_tipo text := upper(btrim(coalesce(p_tipo, '')));
  v_origem text := upper(btrim(coalesce(p_origem_tipo, 'MANUAL')));
  v_parceiro_tipo text;
  v_parceiro_empresa uuid;
  v_source_total numeric(18,2);
  v_source_partner uuid;
  v_existing_id uuid;
  v_existing_title public.erp_financeiro_titulos%rowtype;
  v_title_id uuid;
  v_total numeric(18,2) := 0;
  v_count integer := 0;
  v_item jsonb;
  v_numero integer;
  v_vencimento date;
  v_valor numeric(18,2);
begin
  if v_auth_user is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode = '42501';
  end if;
  if p_empresa_id is null or p_parceiro_id is null or p_chave_idempotencia is null then
    raise exception 'Empresa, parceiro e chave de idempotência são obrigatórios.' using errcode = '22023';
  end if;
  if v_tipo not in ('PAGAR', 'RECEBER') then
    raise exception 'Tipo financeiro inválido.' using errcode = '22023';
  end if;
  if btrim(coalesce(p_descricao, '')) = '' then
    raise exception 'Informe a descrição do título.' using errcode = '22023';
  end if;
  if p_parcelas is null or jsonb_typeof(p_parcelas) is distinct from 'array'
     or jsonb_array_length(p_parcelas) = 0 then
    raise exception 'Informe pelo menos uma parcela.' using errcode = '22023';
  end if;
  if public.erp_has_permission('financeiro', 'lancar') is distinct from true then
    raise exception 'Usuário sem permissão para lançar títulos financeiros.' using errcode = '42501';
  end if;

  select u.id, u.empresa_id into v_user_id, v_user_empresa
  from public.erp_usuarios u
  where u.auth_user_id = v_auth_user and u.ativo = true and u.deleted_at is null
  limit 1;
  if v_user_id is null then
    raise exception 'Usuário ERP ativo não localizado.' using errcode = '42501';
  end if;

  v_is_master := public.erp_is_master();
  if v_is_master then
    if v_user_empresa is not null or public.erp_current_empresa_id() is not null then
      raise exception 'Perfil Master não corresponde ao contrato de empresa nula.' using errcode = '42501';
    end if;
    v_empresa_id := p_empresa_id;
  else
    if v_user_empresa is null or v_user_empresa is distinct from public.erp_current_empresa_id()
       or p_empresa_id is distinct from v_user_empresa then
      raise exception 'Empresa do título não corresponde à empresa ativa da sessão.' using errcode = '42501';
    end if;
    v_empresa_id := v_user_empresa;
  end if;

  if not exists (select 1 from public.erp_empresas e where e.id = v_empresa_id and e.ativo = true) then
    raise exception 'Empresa inexistente ou inativa.' using errcode = '42501';
  end if;

  v_parceiro_tipo := case when v_tipo = 'PAGAR' then 'FORNECEDOR' else 'CLIENTE' end;
  if v_parceiro_tipo = 'FORNECEDOR' then
    select f.empresa_id into v_parceiro_empresa
    from public.erp_fornecedores f
    where f.id = p_parceiro_id and f.empresa_id = v_empresa_id and f.ativo = true;
  else
    select c.empresa_id into v_parceiro_empresa
    from public.erp_clientes c
    where c.id = p_parceiro_id and c.empresa_id = v_empresa_id and c.ativo = true;
  end if;
  if v_parceiro_empresa is distinct from v_empresa_id then
    raise exception 'Parceiro inexistente, inativo ou pertencente a outra empresa.' using errcode = '42501';
  end if;

  if v_origem = 'PEDIDO_VENDA' then
    if v_tipo <> 'RECEBER' or p_origem_id is null then
      raise exception 'Origem de venda só pode gerar título a receber.' using errcode = '22023';
    end if;
    select p.total, p.cliente_id into v_source_total, v_source_partner
    from public.erp_pedidos_venda p
    where p.id = p_origem_id
      and p.empresa_id = v_empresa_id
      and lower(coalesce(p.status, '')) = 'faturado';
    if v_source_total is null or v_source_total <= 0 or v_source_partner is distinct from p_parceiro_id then
      raise exception 'Pedido de venda não está faturável nesta empresa ou cliente divergente.' using errcode = '42501';
    end if;
  elsif v_origem = 'PEDIDO_COMPRA' then
    if v_tipo <> 'PAGAR' or p_origem_id is null then
      raise exception 'Origem de compra só pode gerar título a pagar.' using errcode = '22023';
    end if;
    select p.total, p.fornecedor_id into v_source_total, v_source_partner
    from public.erp_pedidos_compra p
    where p.id = p_origem_id
      and p.empresa_id = v_empresa_id
      and p.status in ('APROVADO','RECEBIMENTO_PARCIAL','RECEBIDO');
    if v_source_total is null or v_source_total <= 0 or v_source_partner is distinct from p_parceiro_id then
      raise exception 'Pedido de compra não está aprovado/recebido nesta empresa ou fornecedor divergente.' using errcode = '42501';
    end if;
  elsif v_origem <> 'MANUAL' or p_origem_id is not null then
    raise exception 'Tipo de origem financeira inválido.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_parcelas)
  loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or jsonb_typeof(v_item->'numero') is distinct from 'number'
       or jsonb_typeof(v_item->'valor') is distinct from 'number'
       or coalesce(v_item->>'vencimento', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'Parcela inválida: número, vencimento ISO e valor são obrigatórios.' using errcode = '22023';
    end if;
    v_numero := (v_item->>'numero')::integer;
    v_vencimento := (v_item->>'vencimento')::date;
    v_valor := (v_item->>'valor')::numeric(18,2);
    if v_numero <> v_count + 1 or v_valor <= 0 then
      raise exception 'Parcelas precisam estar numeradas em sequência e ter valor positivo.' using errcode = '22023';
    end if;
    v_count := v_count + 1;
    v_total := v_total + v_valor;
  end loop;
  if v_count > 120 then
    raise exception 'O parcelamento excede o limite de 120 parcelas.' using errcode = '22023';
  end if;
  if v_source_total is not null and round(v_total,2) <> round(v_source_total,2) then
    raise exception 'A soma das parcelas deve corresponder ao total do pedido de origem.' using errcode = '22023';
  end if;

  if p_titulo_id is null then
    select t.id into v_existing_id
    from public.erp_financeiro_titulos t
    where t.empresa_id = v_empresa_id
      and t.chave_idempotencia = p_chave_idempotencia;
    if v_existing_id is not null then return v_existing_id; end if;
    if v_origem <> 'MANUAL' then
      select t.id into v_existing_id
      from public.erp_financeiro_titulos t
      where t.empresa_id = v_empresa_id and t.tipo = v_tipo
        and t.origem_tipo = v_origem and t.origem_id = p_origem_id;
      if v_existing_id is not null then return v_existing_id; end if;
    end if;
    insert into public.erp_financeiro_titulos(
      empresa_id,tipo,parceiro_tipo,parceiro_id,descricao,documento,categoria,centro_custo,
      data_emissao,origem_tipo,origem_id,chave_idempotencia,valor_total,criado_por
    ) values (
      v_empresa_id,v_tipo,v_parceiro_tipo,p_parceiro_id,btrim(p_descricao),
      nullif(btrim(coalesce(p_documento,'')),''),nullif(btrim(coalesce(p_categoria,'')), ''),
      nullif(btrim(coalesce(p_centro_custo,'')), ''),coalesce(p_data_emissao,current_date),
      v_origem,p_origem_id,p_chave_idempotencia,round(v_total,2),v_user_id
    ) returning id into v_title_id;
  else
    if v_origem <> 'MANUAL' or p_origem_id is not null then
      raise exception 'A edição só aceita títulos manuais existentes.' using errcode = '22023';
    end if;
    select t.* into v_existing_title
    from public.erp_financeiro_titulos t
    where t.id = p_titulo_id and t.empresa_id = v_empresa_id
      and t.origem_tipo = 'MANUAL' and t.status = 'ABERTO'
      and t.tipo = v_tipo and t.parceiro_tipo = v_parceiro_tipo
    for update;
    if not found then
      raise exception 'Somente títulos manuais abertos podem ser editados.' using errcode = '42501';
    end if;
    if exists (
      select 1 from public.erp_financeiro_baixas b
      where b.titulo_id = p_titulo_id and b.empresa_id = v_empresa_id
    ) then
      raise exception 'Título com baixa financeira registrada não pode ser editado.' using errcode = '42501';
    end if;
    update public.erp_financeiro_titulos
    set parceiro_id = p_parceiro_id, descricao = btrim(p_descricao),
        documento = nullif(btrim(coalesce(p_documento,'')), ''),
        categoria = nullif(btrim(coalesce(p_categoria,'')), ''),
        centro_custo = nullif(btrim(coalesce(p_centro_custo,'')), ''),
        data_emissao = coalesce(p_data_emissao,current_date),
        chave_idempotencia = p_chave_idempotencia,
        valor_total = round(v_total,2), atualizado_em = now()
    where id = p_titulo_id and empresa_id = v_empresa_id;
    delete from public.erp_financeiro_parcelas
    where titulo_id = p_titulo_id and empresa_id = v_empresa_id;
    v_title_id := p_titulo_id;
  end if;

  insert into public.erp_financeiro_parcelas(empresa_id,titulo_id,numero,vencimento,valor,saldo)
  select v_empresa_id, v_title_id, (item->>'numero')::integer,
         (item->>'vencimento')::date, (item->>'valor')::numeric(18,2),
         (item->>'valor')::numeric(18,2)
  from jsonb_array_elements(p_parcelas) item;

  insert into public.erp_logs_sistema(empresa_id,usuario_id,modulo,acao,entidade,entidade_id,dados)
  values(v_empresa_id,v_user_id,'Financeiro',case when p_titulo_id is null then 'TITULO_CRIADO' else 'TITULO_EDITADO' end,
         'erp_financeiro_titulos',v_title_id,jsonb_build_object('tipo',v_tipo,'origem_tipo',v_origem,'origem_id',p_origem_id,'parcelas',v_count,'total',v_total));
  return v_title_id;
end;
$function$;

create or replace function public.erp_financeiro_registrar_baixa(
  p_empresa_id uuid,
  p_parcela_id uuid,
  p_valor numeric,
  p_ocorrido_em timestamptz,
  p_forma_pagamento text,
  p_referencia text,
  p_chave_idempotencia uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid;
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_is_master boolean := public.erp_is_master();
  v_user_empresa uuid;
  v_parcela public.erp_financeiro_parcelas%rowtype;
  v_title public.erp_financeiro_titulos%rowtype;
  v_baixa_id uuid;
  v_existente uuid;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.' using errcode='42501'; end if;
  if p_parcela_id is null or p_chave_idempotencia is null or p_valor is null
     or p_ocorrido_em is null or btrim(coalesce(p_forma_pagamento,'')) = '' then
    raise exception 'Parcela, valor, data, forma de pagamento e chave idempotente são obrigatórios.' using errcode='22023';
  end if;
  if public.erp_has_permission('financeiro','lancar') is distinct from true then
    raise exception 'Usuário sem permissão para registrar baixa financeira.' using errcode='42501';
  end if;
  select u.id into v_user_id from public.erp_usuarios u
  where u.auth_user_id=auth.uid() and u.ativo=true and u.deleted_at is null limit 1;
  if v_user_id is null then raise exception 'Usuário ERP ativo não localizado.' using errcode='42501'; end if;
  select u.empresa_id into v_user_empresa from public.erp_usuarios u where u.id=v_user_id;
  if v_is_master then
    if v_user_empresa is not null or v_empresa_id is not null or p_empresa_id is null then
      raise exception 'Empresa explícita obrigatória para baixa Master.' using errcode='42501';
    end if;
  elsif v_user_empresa is null or v_empresa_id is distinct from v_user_empresa or p_empresa_id is distinct from v_user_empresa then
    raise exception 'Empresa da baixa não corresponde à empresa ativa da sessão.' using errcode='42501';
  end if;

  select b.id into v_existente from public.erp_financeiro_baixas b
  where b.empresa_id=p_empresa_id and b.parcela_id=p_parcela_id and b.chave_idempotencia=p_chave_idempotencia;
  if v_existente is not null then return v_existente; end if;

  select p.* into v_parcela from public.erp_financeiro_parcelas p
  where p.id=p_parcela_id and p.empresa_id=p_empresa_id
  for update;
  if not found then raise exception 'Parcela não localizada na empresa autorizada.' using errcode='42501'; end if;

  select t.* into v_title from public.erp_financeiro_titulos t
  where t.id=v_parcela.titulo_id and t.empresa_id=p_empresa_id
  for update;
  if not found or v_title.status='CANCELADO' then
    raise exception 'Título inexistente ou cancelado.' using errcode='42501';
  end if;
  if p_valor <= 0 or p_valor <> round(p_valor,2) or p_valor > v_parcela.saldo then
    raise exception 'O valor da baixa deve ser positivo, ter no máximo dois decimais e não exceder o saldo da parcela.' using errcode='22023';
  end if;

  insert into public.erp_financeiro_baixas(
    empresa_id,titulo_id,parcela_id,valor,ocorrido_em,forma_pagamento,referencia,chave_idempotencia,registrado_por
  ) values (
    v_parcela.empresa_id,v_title.id,v_parcela.id,p_valor,p_ocorrido_em,
    btrim(p_forma_pagamento),nullif(btrim(coalesce(p_referencia,'')),''),p_chave_idempotencia,v_user_id
  ) returning id into v_baixa_id;

  update public.erp_financeiro_parcelas
  set saldo=round(saldo-p_valor,2),
      status=case when round(saldo-p_valor,2)=0 then 'LIQUIDADO' else 'PARCIAL' end
  where id=v_parcela.id and empresa_id=v_parcela.empresa_id;

  update public.erp_financeiro_titulos t
  set status=case
    when not exists(select 1 from public.erp_financeiro_parcelas p where p.titulo_id=t.id and p.empresa_id=t.empresa_id and p.status<>'LIQUIDADO') then 'LIQUIDADO'
    when exists(select 1 from public.erp_financeiro_parcelas p where p.titulo_id=t.id and p.empresa_id=t.empresa_id and p.status='PARCIAL') then 'PARCIAL'
    else 'ABERTO'
  end,
  atualizado_em=now()
  where t.id=v_title.id and t.empresa_id=v_title.empresa_id;

  insert into public.erp_logs_sistema(empresa_id,usuario_id,modulo,acao,entidade,entidade_id,dados)
  values(v_parcela.empresa_id,v_user_id,'Financeiro','BAIXA_REGISTRADA','erp_financeiro_baixas',v_baixa_id,
         jsonb_build_object('titulo_id',v_title.id,'parcela_id',v_parcela.id,'valor',p_valor,'forma_pagamento',p_forma_pagamento));
  return v_baixa_id;
end;
$function$;

revoke all on function public.erp_financeiro_salvar_titulo(uuid,uuid,text,uuid,text,text,text,text,date,text,uuid,uuid,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.erp_financeiro_salvar_titulo(uuid,uuid,text,uuid,text,text,text,text,date,text,uuid,uuid,jsonb)
  to authenticated;
revoke all on function public.erp_financeiro_registrar_baixa(uuid,uuid,numeric,timestamptz,text,text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.erp_financeiro_registrar_baixa(uuid,uuid,numeric,timestamptz,text,text,uuid)
  to authenticated;

commit;
