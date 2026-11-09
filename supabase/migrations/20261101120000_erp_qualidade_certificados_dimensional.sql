begin;

create table if not exists public.erp_qualidade_certificados (
  id uuid primary key,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero_certificado text not null,
  codigo_peca text not null,
  descricao_peca text not null,
  ordem_lote text not null,
  cliente text,
  numero_serie text,
  data_inspecao date not null,
  inspetor_id uuid not null references public.erp_usuarios(id) on delete restrict,
  inspetor_nome text not null,
  desenho_storage_path text not null,
  desenho_nome text not null,
  desenho_mime text not null check (desenho_mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  observacoes text,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','APROVADO','REPROVADO')),
  created_by uuid not null references public.erp_usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_certificados_empresa_numero_uq unique (empresa_id, numero_certificado),
  constraint erp_qualidade_certificados_empresa_id_uq unique (empresa_id, id),
  constraint erp_qualidade_certificados_codigo_ck check (length(btrim(codigo_peca)) between 1 and 80),
  constraint erp_qualidade_certificados_descricao_ck check (length(btrim(descricao_peca)) between 1 and 200),
  constraint erp_qualidade_certificados_ordem_ck check (length(btrim(ordem_lote)) between 1 and 120),
  constraint erp_qualidade_certificados_desenho_nome_ck check (length(btrim(desenho_nome)) between 1 and 200)
);

create table if not exists public.erp_qualidade_certificado_cotas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  certificado_id uuid not null,
  identificador text not null,
  descricao text not null,
  nominal_mm numeric(14,5) not null check (nominal_mm >= 0),
  minimo_mm numeric(14,5) not null check (minimo_mm >= 0),
  maximo_mm numeric(14,5) not null check (maximo_mm >= minimo_mm),
  medido_mm numeric(14,5) check (medido_mm is null or medido_mm >= 0),
  resultado text generated always as (
    case
      when medido_mm is null then 'PENDENTE'
      when medido_mm between minimo_mm and maximo_mm then 'APROVADO'
      else 'REPROVADO'
    end
  ) stored,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_certificado_cotas_certificado_fk
    foreign key (empresa_id, certificado_id)
    references public.erp_qualidade_certificados(empresa_id, id) on delete cascade,
  constraint erp_qualidade_certificado_cotas_identificador_ck
    check (length(btrim(identificador)) between 1 and 40),
  constraint erp_qualidade_certificado_cotas_descricao_ck
    check (length(btrim(descricao)) between 1 and 120),
  constraint erp_qualidade_certificado_cotas_intervalo_ck
    check (minimo_mm <= nominal_mm and nominal_mm <= maximo_mm)
);

create index if not exists idx_erp_qualidade_certificados_empresa_data
  on public.erp_qualidade_certificados (empresa_id, data_inspecao desc, created_at desc);
create index if not exists idx_erp_qualidade_certificado_cotas_certificado
  on public.erp_qualidade_certificado_cotas (empresa_id, certificado_id);

alter table public.erp_qualidade_certificados enable row level security;
alter table public.erp_qualidade_certificado_cotas enable row level security;

drop policy if exists erp_qualidade_certificados_select on public.erp_qualidade_certificados;
create policy erp_qualidade_certificados_select
  on public.erp_qualidade_certificados for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade','ver'));

drop policy if exists erp_qualidade_certificado_cotas_select on public.erp_qualidade_certificado_cotas;
create policy erp_qualidade_certificado_cotas_select
  on public.erp_qualidade_certificado_cotas for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade','ver'));

grant select on public.erp_qualidade_certificados, public.erp_qualidade_certificado_cotas to authenticated;
revoke insert, update, delete on public.erp_qualidade_certificados, public.erp_qualidade_certificado_cotas from anon, authenticated;

drop trigger if exists trg_erp_qualidade_certificados_audit on public.erp_qualidade_certificados;
create trigger trg_erp_qualidade_certificados_audit
  after insert or update or delete on public.erp_qualidade_certificados
  for each row execute function public.erp_sgq_auditar_mutacao();

drop trigger if exists trg_erp_qualidade_certificado_cotas_audit on public.erp_qualidade_certificado_cotas;
create trigger trg_erp_qualidade_certificado_cotas_audit
  after insert or update or delete on public.erp_qualidade_certificado_cotas
  for each row execute function public.erp_sgq_auditar_mutacao();

create or replace function public.erp_qualidade_certificado_criar(
  p_certificado_id uuid,
  p_codigo_peca text,
  p_descricao_peca text,
  p_ordem_lote text,
  p_data_inspecao date,
  p_cliente text,
  p_numero_serie text,
  p_observacoes text,
  p_desenho_storage_path text,
  p_desenho_nome text,
  p_desenho_mime text,
  p_cotas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, storage, pg_temp
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_numero bigint;
  v_chave text;
  v_numero_certificado text;
  v_item jsonb;
  v_identificador text;
  v_descricao text;
  v_nominal numeric;
  v_minimo numeric;
  v_maximo numeric;
  v_medido numeric;
  v_aprovadas integer := 0;
  v_reprovadas integer := 0;
  v_pendentes integer := 0;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not public.erp_has_permission('qualidade','criar') then
    raise exception 'Sem permissão para criar certificado de qualidade.';
  end if;
  if p_certificado_id is null then raise exception 'Identificador do certificado inválido.'; end if;

  select * into v_usuario
  from public.erp_usuarios
  where auth_user_id = auth.uid()
    and empresa_id = v_empresa
    and ativo = true
    and deleted_at is null
  limit 1;
  if not found then raise exception 'Perfil ERP ativo da empresa não encontrado.'; end if;

  if nullif(btrim(p_codigo_peca),'') is null or length(btrim(p_codigo_peca)) > 80 then
    raise exception 'Informe o código da peça (até 80 caracteres).';
  end if;
  if nullif(btrim(p_descricao_peca),'') is null or length(btrim(p_descricao_peca)) > 200 then
    raise exception 'Informe a descrição da peça (até 200 caracteres).';
  end if;
  if nullif(btrim(p_ordem_lote),'') is null or length(btrim(p_ordem_lote)) > 120 then
    raise exception 'Informe a ordem de produção ou lote (até 120 caracteres).';
  end if;
  if p_data_inspecao is null then raise exception 'Informe a data da inspeção.'; end if;
  if nullif(btrim(p_desenho_storage_path),'') is null
     or split_part(p_desenho_storage_path,'/',1) <> v_empresa::text
     or split_part(p_desenho_storage_path,'/',2) <> p_certificado_id::text
     or array_length(string_to_array(p_desenho_storage_path,'/'),1) <> 3 then
    raise exception 'O desenho não está no caminho privado deste certificado.';
  end if;
  if p_desenho_mime not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception 'Formato do desenho não permitido.';
  end if;
  if nullif(btrim(p_desenho_nome),'') is null or length(btrim(p_desenho_nome)) > 200 then
    raise exception 'Nome do desenho inválido.';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'qualidade-certificados'
      and o.name = p_desenho_storage_path
  ) then
    raise exception 'O arquivo do desenho não foi enviado ao armazenamento privado.';
  end if;
  if jsonb_typeof(p_cotas) <> 'array' or jsonb_array_length(p_cotas) < 1 or jsonb_array_length(p_cotas) > 100 then
    raise exception 'Informe de 1 a 100 cotas para o certificado.';
  end if;

  v_chave := 'CERT-QUAL-' || to_char(p_data_inspecao,'YYYY');
  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
  values (v_empresa, v_chave, 1)
  on conflict (empresa_id, chave)
  do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
  returning proximo_valor into v_numero;
  v_numero_certificado := 'CQ-' || to_char(p_data_inspecao,'YYYY') || '-' || lpad(v_numero::text,6,'0');

  insert into public.erp_qualidade_certificados (
    id, empresa_id, numero_certificado, codigo_peca, descricao_peca, ordem_lote,
    cliente, numero_serie, data_inspecao, inspetor_id, inspetor_nome,
    desenho_storage_path, desenho_nome, desenho_mime, observacoes, created_by
  ) values (
    p_certificado_id, v_empresa, v_numero_certificado, btrim(p_codigo_peca), btrim(p_descricao_peca),
    btrim(p_ordem_lote), nullif(btrim(p_cliente),''), nullif(btrim(p_numero_serie),''), p_data_inspecao,
    v_usuario.id, v_usuario.nome, p_desenho_storage_path, btrim(p_desenho_nome), p_desenho_mime,
    nullif(btrim(p_observacoes),''), v_usuario.id
  );

  for v_item in select value from jsonb_array_elements(p_cotas)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item->'nominal') <> 'number'
       or jsonb_typeof(v_item->'minimo') <> 'number'
       or jsonb_typeof(v_item->'maximo') <> 'number'
       or (v_item->'medido' is not null and jsonb_typeof(v_item->'medido') not in ('number','null')) then
      raise exception 'Uma cota contém valores numéricos inválidos.';
    end if;
    v_identificador := btrim(coalesce(v_item->>'identificador',''));
    v_descricao := btrim(coalesce(v_item->>'descricao',''));
    v_nominal := (v_item->>'nominal')::numeric;
    v_minimo := (v_item->>'minimo')::numeric;
    v_maximo := (v_item->>'maximo')::numeric;
    v_medido := case when jsonb_typeof(v_item->'medido') = 'number' then (v_item->>'medido')::numeric else null end;
    if length(v_identificador) not between 1 and 40 then raise exception 'Cada cota precisa de identificação (até 40 caracteres).'; end if;
    if length(v_descricao) not between 1 and 120 then raise exception 'Cada cota precisa de descrição (até 120 caracteres).'; end if;
    if v_minimo < 0 or v_minimo > v_nominal or v_nominal > v_maximo or (v_medido is not null and v_medido < 0) then
      raise exception 'Confira nominal, limites e medição: mínimo ≤ nominal ≤ máximo.';
    end if;

    insert into public.erp_qualidade_certificado_cotas (
      empresa_id, certificado_id, identificador, descricao, nominal_mm, minimo_mm, maximo_mm, medido_mm
    ) values (
      v_empresa, p_certificado_id, v_identificador, v_descricao, v_nominal, v_minimo, v_maximo, v_medido
    );

    if v_medido is null then
      v_pendentes := v_pendentes + 1;
    elsif v_medido between v_minimo and v_maximo then
      v_aprovadas := v_aprovadas + 1;
    else
      v_reprovadas := v_reprovadas + 1;
    end if;
  end loop;

  v_status := case when v_reprovadas > 0 then 'REPROVADO' when v_pendentes > 0 then 'PENDENTE' else 'APROVADO' end;
  update public.erp_qualidade_certificados set status = v_status
  where id = p_certificado_id and empresa_id = v_empresa;

  return jsonb_build_object(
    'id', p_certificado_id,
    'empresa_id', v_empresa,
    'numero_certificado', v_numero_certificado,
    'codigo_peca', btrim(p_codigo_peca),
    'descricao_peca', btrim(p_descricao_peca),
    'ordem_lote', btrim(p_ordem_lote),
    'cliente', nullif(btrim(p_cliente),''),
    'numero_serie', nullif(btrim(p_numero_serie),''),
    'data_inspecao', p_data_inspecao,
    'inspetor_nome', v_usuario.nome,
    'desenho_storage_path', p_desenho_storage_path,
    'desenho_nome', btrim(p_desenho_nome),
    'desenho_mime', p_desenho_mime,
    'observacoes', nullif(btrim(p_observacoes),''),
    'status', v_status,
    'aprovadas', v_aprovadas,
    'reprovadas', v_reprovadas,
    'pendentes', v_pendentes
  );
end
$$;

revoke all on function public.erp_qualidade_certificado_criar(uuid,text,text,text,date,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.erp_qualidade_certificado_criar(uuid,text,text,text,date,text,text,text,text,text,text,jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qualidade-certificados',
  'qualidade-certificados',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists qualidade_certificados_storage_select on storage.objects;
create policy qualidade_certificados_storage_select on storage.objects
  for select to authenticated using (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and public.erp_has_permission('qualidade','ver')
  );

drop policy if exists qualidade_certificados_storage_insert on storage.objects;
create policy qualidade_certificados_storage_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and public.erp_has_permission('qualidade','criar')
  );

drop policy if exists qualidade_certificados_storage_delete on storage.objects;
create policy qualidade_certificados_storage_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (public.erp_has_permission('qualidade','criar') or public.erp_has_permission('qualidade','editar'))
  );

commit;
