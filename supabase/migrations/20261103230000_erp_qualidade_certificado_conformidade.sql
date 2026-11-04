begin;

-- Certificado dimensional de qualidade: dados e cotas ficam no banco;
-- o desenho é armazenado em bucket privado, isolado por empresa.
create table if not exists public.erp_qualidade_certificado_contadores (
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ano integer not null check (ano between 2000 and 9999),
  ultimo_numero bigint not null default 0 check (ultimo_numero >= 0),
  primary key (empresa_id, ano)
);

create table if not exists public.erp_qualidade_certificados (
  id uuid primary key,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero_certificado text not null,
  codigo_peca text not null check (length(trim(codigo_peca)) between 1 and 80),
  descricao_peca text not null check (length(trim(descricao_peca)) between 1 and 200),
  ordem_lote text not null check (length(trim(ordem_lote)) between 1 and 120),
  cliente text,
  numero_serie text,
  data_inspecao date not null,
  inspetor_usuario_id uuid not null references public.erp_usuarios(id),
  inspetor_nome text not null,
  desenho_storage_path text not null,
  desenho_nome text not null,
  desenho_mime text not null check (desenho_mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  observacoes text,
  status text not null check (status in ('PENDENTE','APROVADO','REPROVADO')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_certificados_empresa_numero_uq unique (empresa_id, numero_certificado),
  constraint erp_qualidade_certificados_empresa_id_uq unique (empresa_id, id),
  constraint erp_qualidade_certificados_storage_uq unique (desenho_storage_path)
);

create index if not exists erp_qualidade_certificados_empresa_data_idx
  on public.erp_qualidade_certificados (empresa_id, data_inspecao desc, created_at desc);

create table if not exists public.erp_qualidade_certificado_cotas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  certificado_id uuid not null,
  identificador text not null check (length(trim(identificador)) between 1 and 40),
  descricao text not null check (length(trim(descricao)) between 1 and 120),
  nominal_mm numeric(14,3) not null check (nominal_mm >= 0),
  minimo_mm numeric(14,3) not null check (minimo_mm >= 0),
  maximo_mm numeric(14,3) not null check (maximo_mm >= 0),
  medido_mm numeric(14,3) check (medido_mm is null or medido_mm >= 0),
  resultado text not null check (resultado in ('PENDENTE','APROVADO','REPROVADO')),
  created_at timestamptz not null default now(),
  constraint erp_qualidade_certificado_cotas_faixa_ck check (minimo_mm <= nominal_mm and nominal_mm <= maximo_mm),
  constraint erp_qualidade_certificado_cotas_cert_fk
    foreign key (empresa_id, certificado_id)
    references public.erp_qualidade_certificados (empresa_id, id) on delete cascade
);

create index if not exists erp_qualidade_certificado_cotas_cert_idx
  on public.erp_qualidade_certificado_cotas (empresa_id, certificado_id, created_at);

alter table public.erp_qualidade_certificados enable row level security;
alter table public.erp_qualidade_certificado_cotas enable row level security;
alter table public.erp_qualidade_certificado_contadores enable row level security;

drop policy if exists erp_qualidade_certificados_select on public.erp_qualidade_certificados;
create policy erp_qualidade_certificados_select on public.erp_qualidade_certificados
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('qualidade','ver'));

drop policy if exists erp_qualidade_certificado_cotas_select on public.erp_qualidade_certificado_cotas;
create policy erp_qualidade_certificado_cotas_select on public.erp_qualidade_certificado_cotas
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('qualidade','ver'));

revoke all on public.erp_qualidade_certificados from anon, authenticated;
revoke all on public.erp_qualidade_certificado_cotas from anon, authenticated;
revoke all on public.erp_qualidade_certificado_contadores from anon, authenticated;
grant select on public.erp_qualidade_certificados, public.erp_qualidade_certificado_cotas to authenticated;

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
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_auth uuid := auth.uid();
  v_usuario_id uuid;
  v_inspetor text;
  v_ano integer;
  v_numero bigint;
  v_numero_certificado text;
  v_status text;
  v_item jsonb;
  v_identificador text;
  v_descricao text;
  v_nominal numeric(14,3);
  v_minimo numeric(14,3);
  v_maximo numeric(14,3);
  v_medido numeric(14,3);
  v_resultado text;
  v_aprovadas integer := 0;
  v_reprovadas integer := 0;
  v_pendentes integer := 0;
  v_total integer := 0;
begin
  if v_auth is null then raise exception 'Sessão não autenticada.' using errcode = '28000'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.' using errcode = '42501'; end if;
  if not public.erp_has_permission('qualidade','criar')
     and not public.erp_has_permission('qualidade','editar') then
    raise exception 'Sem permissão para emitir certificado de qualidade.' using errcode = '42501';
  end if;
  if p_certificado_id is null then raise exception 'Identificador do certificado obrigatório.'; end if;
  if nullif(trim(coalesce(p_codigo_peca,'')),'') is null
     or nullif(trim(coalesce(p_descricao_peca,'')),'') is null
     or nullif(trim(coalesce(p_ordem_lote,'')),'') is null
     or p_data_inspecao is null then
    raise exception 'Código, descrição, OP/lote e data da inspeção são obrigatórios.';
  end if;
  if p_desenho_mime not in ('image/jpeg','image/png','image/webp','application/pdf')
     or nullif(trim(coalesce(p_desenho_nome,'')),'') is null then
    raise exception 'Desenho técnico ou formato inválido.';
  end if;
  if p_desenho_storage_path is null
     or split_part(p_desenho_storage_path,'/',1) <> v_empresa::text
     or split_part(p_desenho_storage_path,'/',2) <> p_certificado_id::text
     or (select count(*) from storage.objects o
          where o.bucket_id = 'qualidade-certificados'
            and o.name = p_desenho_storage_path) <> 1 then
    raise exception 'O desenho enviado não foi localizado no diretório privado da empresa.';
  end if;
  if jsonb_typeof(p_cotas) is distinct from 'array'
     or jsonb_array_length(p_cotas) < 1 or jsonb_array_length(p_cotas) > 100 then
    raise exception 'Informe entre 1 e 100 cotas dimensionais.';
  end if;

  select u.id, coalesce(nullif(trim(u.nome),''), auth.jwt() ->> 'email', 'Inspetor autenticado')
    into v_usuario_id, v_inspetor
    from public.erp_usuarios u
   where u.auth_user_id = v_auth
     and u.empresa_id = v_empresa
     and u.ativo = true
     and u.deleted_at is null
   limit 1;
  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não identificado para esta empresa.' using errcode = '42501';
  end if;

  v_ano := extract(year from p_data_inspecao)::integer;
  insert into public.erp_qualidade_certificado_contadores (empresa_id, ano, ultimo_numero)
  values (v_empresa, v_ano, 1)
  on conflict (empresa_id, ano)
  do update set ultimo_numero = public.erp_qualidade_certificado_contadores.ultimo_numero + 1
  returning ultimo_numero into v_numero;
  v_numero_certificado := 'CQ-' || v_ano::text || '-' || lpad(v_numero::text, 6, '0');

  insert into public.erp_qualidade_certificados (
    id, empresa_id, numero_certificado, codigo_peca, descricao_peca, ordem_lote,
    cliente, numero_serie, data_inspecao, inspetor_usuario_id, inspetor_nome,
    desenho_storage_path, desenho_nome, desenho_mime, observacoes, status, created_by
  ) values (
    p_certificado_id, v_empresa, v_numero_certificado, trim(p_codigo_peca), trim(p_descricao_peca),
    trim(p_ordem_lote), nullif(trim(coalesce(p_cliente,'')),''), nullif(trim(coalesce(p_numero_serie,'')),''),
    p_data_inspecao, v_usuario_id, v_inspetor, p_desenho_storage_path, trim(p_desenho_nome),
    p_desenho_mime, nullif(trim(coalesce(p_observacoes,'')),''), 'PENDENTE', v_auth
  );

  for v_item in select value from jsonb_array_elements(p_cotas) loop
    if jsonb_typeof(v_item) is distinct from 'object' then raise exception 'Cada cota deve ser um objeto.'; end if;
    v_identificador := trim(coalesce(v_item ->> 'identificador',''));
    v_descricao := trim(coalesce(v_item ->> 'descricao',''));
    if v_identificador = '' or v_descricao = '' then raise exception 'Identificação e descrição da cota são obrigatórias.'; end if;
    v_nominal := (v_item ->> 'nominal')::numeric;
    v_minimo := (v_item ->> 'minimo')::numeric;
    v_maximo := (v_item ->> 'maximo')::numeric;
    v_medido := nullif(v_item ->> 'medido','')::numeric;
    if v_minimo < 0 or v_minimo > v_nominal or v_nominal > v_maximo
       or (v_medido is not null and v_medido < 0) then
      raise exception 'Faixa dimensional inválida na cota %.', v_identificador;
    end if;
    if v_medido is null then
      v_resultado := 'PENDENTE'; v_pendentes := v_pendentes + 1;
    elsif v_medido between v_minimo and v_maximo then
      v_resultado := 'APROVADO'; v_aprovadas := v_aprovadas + 1;
    else
      v_resultado := 'REPROVADO'; v_reprovadas := v_reprovadas + 1;
    end if;
    insert into public.erp_qualidade_certificado_cotas (
      empresa_id, certificado_id, identificador, descricao,
      nominal_mm, minimo_mm, maximo_mm, medido_mm, resultado
    ) values (
      v_empresa, p_certificado_id, v_identificador, v_descricao,
      v_nominal, v_minimo, v_maximo, v_medido, v_resultado
    );
    v_total := v_total + 1;
  end loop;

  v_status := case when v_reprovadas > 0 then 'REPROVADO'
                   when v_pendentes > 0 then 'PENDENTE'
                   else 'APROVADO' end;
  update public.erp_qualidade_certificados
     set status = v_status
   where id = p_certificado_id and empresa_id = v_empresa;

  return jsonb_build_object(
    'id', p_certificado_id,
    'numero_certificado', v_numero_certificado,
    'codigo_peca', trim(p_codigo_peca),
    'descricao_peca', trim(p_descricao_peca),
    'ordem_lote', trim(p_ordem_lote),
    'cliente', nullif(trim(coalesce(p_cliente,'')),''),
    'numero_serie', nullif(trim(coalesce(p_numero_serie,'')),''),
    'data_inspecao', p_data_inspecao,
    'inspetor_nome', v_inspetor,
    'desenho_storage_path', p_desenho_storage_path,
    'desenho_nome', trim(p_desenho_nome),
    'desenho_mime', p_desenho_mime,
    'observacoes', nullif(trim(coalesce(p_observacoes,'')),''),
    'status', v_status,
    'aprovadas', v_aprovadas,
    'reprovadas', v_reprovadas,
    'pendentes', v_pendentes,
    'total_cotas', v_total
  );
end;
$$;

revoke all on function public.erp_qualidade_certificado_criar(uuid,text,text,text,date,text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.erp_qualidade_certificado_criar(uuid,text,text,text,date,text,text,text,text,text,text,jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qualidade-certificados','qualidade-certificados',false,15728640,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists qualidade_certificados_upload on storage.objects;
create policy qualidade_certificados_upload on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.erp_has_permission('qualidade','criar')
  );

drop policy if exists qualidade_certificados_select on storage.objects;
create policy qualidade_certificados_select on storage.objects
  for select to authenticated using (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_qualidade_certificados c
       where c.empresa_id = public.erp_current_empresa_id()
         and c.desenho_storage_path = storage.objects.name
         and public.erp_has_permission('qualidade','ver')
    )
  );

drop policy if exists qualidade_certificados_delete on storage.objects;
create policy qualidade_certificados_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'qualidade-certificados'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and public.erp_has_permission('qualidade','criar')
  );

notify pgrst, 'reload schema';
commit;
