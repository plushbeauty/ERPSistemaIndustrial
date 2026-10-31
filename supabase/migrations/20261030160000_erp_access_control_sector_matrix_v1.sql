-- SYSNQRA ERP INDUSTRIAL
-- Controle de acesso do chão de fábrica: setores, postos, catálogo de módulos,
-- matriz setor x módulo e modelos de acesso por nível (RBAC já existente).
-- Reusa erp_setores, erp_postos_trabalho, erp_permissoes_modulos, erp_roles,
-- erp_permissions e erp_role_permissions. Não cria dados de exemplo de negócio.
-- Isolamento: todas as funções leem e gravam apenas pela empresa da sessão autenticada
-- e exigem nível administrativo 8/9 (ou Master). Escrita da matriz é feita por
-- função security definer porque erp_permissoes_modulos só tem política de SELECT.
-- Dependências: 20260912160000, 20260913000100, 20261003144000, 20261005180000.
-- Revisão: ACCESS-CONTROL-SECTOR-MATRIX-001 | 2026-10-30 | Fernando Schuinsekel

begin;

-- Catálogo global e somente leitura dos módulos exibidos na matriz.
-- Os nomes seguem as rotinas já publicadas no menu do ERP; rbac_modulo liga cada
-- módulo ao código de permissão real usado por erp_has_permission(p_modulo, p_acao).
create table if not exists public.erp_modulos_acesso (
  modulo text primary key,
  nome text not null,
  grupo text not null,
  ordem integer not null default 0,
  rbac_modulo text,
  descricao text,
  ativo boolean not null default true
);

insert into public.erp_modulos_acesso (modulo, nome, grupo, ordem, rbac_modulo, descricao)
values
  ('compras_inbound',     'Entrada de Materiais / Inbound',   'Suprimentos',  10, 'compras',  'Recebimento, conferência e entrada de compras no sistema.'),
  ('compras',             'Compras / RFQ',                    'Suprimentos',  20, 'compras',  'Solicitações, cotações e pedidos de compra.'),
  ('estoque_inventario',  'Inventário e Contagem',            'Estoque',      30, 'estoque',  'Contagem física, ajuste de saldo e auditoria de inventário.'),
  ('estoque_almox',       'Almoxarifado e Consumo',           'Estoque',      40, 'estoque',  'Requisições, reservas e baixa de consumo por ordem.'),
  ('estoque_outbound',    'Expedição / Outbound',             'Estoque',      50, 'expedicao','Romaneios, separação e saída de material.'),
  ('estoque_transfer',    'Transferências e Endereços',       'Estoque',      60, 'estoque',  'Movimentação entre depósitos, endereços e lotes.'),
  ('producao_op',         'Ordens de Produção (OP)',          'Produção',     70, 'producao', 'Abertura, edição e encerramento de ordens de produção.'),
  ('producao_apontar',    'Chão de Fábrica / Apontamento',    'Produção',     80, 'producao', 'Apontamento de produção boa, refugo, setup e parada.'),
  ('producao_capacidade', 'PCP / Carga e Capacidade',         'Produção',     90, 'pcp',      'Agenda de máquinas, capacidade e programação.'),
  ('engenharia',          'Engenharia e Ficha de Processo',   'Engenharia',  100, null,       'Estrutura do produto, roteiro de operações e parâmetros técnicos.'),
  ('manutencao',          'Manutenção de Máquinas',           'Engenharia',  110, 'manutencao','Ordens de manutenção preventiva e corretiva.'),
  ('qualidade_cq',        'Controle de Qualidade (CQ)',       'Qualidade',   120, 'qualidade','Inspeção, aprovação e liberação de lotes.'),
  ('qualidade_rpnc',      'Não Conformidades (RPNC/CAPA)',    'Qualidade',   130, 'qualidade','Registro de ocorrência, causa raiz e plano de ação.'),
  ('qualidade_documentos','Documentos da Qualidade (GED)',    'Qualidade',   140, 'qualidade','Procedimentos, instruções de trabalho e revisões controladas.'),
  ('qualidade_metrologia','Metrologia e Paquímetro',          'Qualidade',   150, 'qualidade','Medição dimensional e registros de inspeção.'),
  ('vendas',              'Vendas e Pedidos',                 'Comercial',   160, 'vendas',   'Pedidos de venda, clientes e acompanhamento comercial.'),
  ('fiscal',              'Fiscal e NF-e',                    'Gestão',      170, 'fiscal',   'Emissão, classificação e auditoria fiscal.'),
  ('financeiro',          'Financeiro e Contas',              'Gestão',      180, 'financeiro','Títulos, conciliação, comissões e resultado.'),
  ('relatorios',          'Relatórios e Indicadores',         'Gestão',      190, 'relatorios','Painéis e exportações do período apurado.'),
  ('auditoria',           'Trilha de Auditoria',              'Gestão',      200, 'auditoria','Histórico de alterações registradas no banco.'),
  ('configuracoes',       'Configurações e Usuários',         'Administração',210,'usuarios', 'Cadastro de usuários, perfis e matriz de acesso.')
on conflict (modulo)
do update set
  nome = excluded.nome,
  grupo = excluded.grupo,
  ordem = excluded.ordem,
  rbac_modulo = excluded.rbac_modulo,
  descricao = excluded.descricao,
  ativo = true;

alter table public.erp_modulos_acesso enable row level security;
drop policy if exists erp_modulos_acesso_select on public.erp_modulos_acesso;
create policy erp_modulos_acesso_select
  on public.erp_modulos_acesso for select to authenticated
  using (ativo = true);
grant select on public.erp_modulos_acesso to authenticated;

-- A matriz coletiva de um setor é a linha com usuario_id nulo. O índice parcial
-- garante uma linha por setor/módulo e acelera a leitura da tela.
do $$
begin
  create unique index if not exists erp_permissoes_modulos_setor_matrix_uidx
    on public.erp_permissoes_modulos (empresa_id, setor_id, modulo)
    where usuario_id is null;
exception when others then
  raise warning 'Índice único da matriz por setor não criado (existem linhas duplicadas em erp_permissoes_modulos). A gravação continua por update/insert, mas revise os duplicados.';
end;
$$;

-- Contexto administrativo da sessão. Função interna: não é exposta ao PostgREST.
create or replace function public.erp_access_control_contexto()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor public.erp_usuarios%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode = '42501';
  end if;

  select * into v_actor
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.ativo = true
     and u.deleted_at is null
   order by coalesce(u.is_master, false) desc, u.updated_at desc nulls last
   limit 1;

  if not found then
    raise exception 'Usuário interno inativo ou sem perfil ERP autorizado.' using errcode = '42501';
  end if;

  if coalesce(v_actor.nivel_admin, 0) < 8 and not public.erp_is_master() then
    raise exception 'Somente administradores (nível 8 ou 9) alteram o controle de acesso.' using errcode = '42501';
  end if;

  if v_actor.empresa_id is null then
    raise exception 'A sessão não está vinculada a uma empresa. Use o Console da Plataforma.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'actor_id', v_actor.id,
    'empresa_id', v_actor.empresa_id,
    'nivel_admin', coalesce(v_actor.nivel_admin, 0)
  );
end;
$$;

-- Módulos que um nível (perfil RBAC) já possui: deriva de erp_role_permissions,
-- sem inventar padrão. A permissão de leitura do módulo é marcada porque qualquer
-- permissão dentro do módulo já implica acesso à rotina.
create or replace function public.erp_access_control_nivel_modulos(p_role_id uuid)
returns table(modulo text, visualizar boolean, criar boolean, editar boolean, excluir boolean)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select c.modulo,
         true as visualizar,
         bool_or(split_part(p.codigo, '.', 2) in ('criar', 'registrar', 'lancar', 'apontar', 'movimentar', 'inventario', 'solicitar_alteracao')) as criar,
         bool_or(split_part(p.codigo, '.', 2) in ('editar', 'retificar')) as editar,
         bool_or(split_part(p.codigo, '.', 2) in ('excluir', 'estornar')) as excluir
    from public.erp_modulos_acesso c
    join public.erp_permissions p
      on p.ativo = true
     and p.modulo = c.rbac_modulo
    join public.erp_role_permissions rp
      on rp.permission_id = p.id
     and rp.role_id = p_role_id
   where c.ativo = true
     and c.rbac_modulo is not null
   group by c.modulo, c.ordem
   order by c.ordem;
$$;

-- Leitura única da tela: setores, postos, catálogo, matriz gravada e modelos por nível.
-- security definer é necessário porque as políticas atuais só devolvem a matriz e as
-- permissões do próprio usuário autenticado.
create or replace function public.erp_access_control_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ctx jsonb;
  v_empresa uuid;
begin
  v_ctx := public.erp_access_control_contexto();
  v_empresa := (v_ctx ->> 'empresa_id')::uuid;

  return jsonb_build_object(
    'empresa_id', v_empresa,
    'nivel_admin', (v_ctx ->> 'nivel_admin')::integer,
    'setores', (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', s.id, 'codigo', s.codigo, 'nome', s.nome)
                  order by s.nome nulls last, s.codigo), '[]'::jsonb)
        from public.erp_setores s
       where s.empresa_id = v_empresa
         and coalesce(s.ativo, true) = true
    ),
    'postos', (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', p.id, 'codigo_posto', p.codigo_posto, 'nome_posto', p.nome_posto)
                  order by p.codigo_posto), '[]'::jsonb)
        from public.erp_postos_trabalho p
       where p.empresa_id = v_empresa
         and p.ativo = true
    ),
    'modulos', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'modulo', item.modulo,
          'nome', item.nome,
          'grupo', item.grupo,
          'ordem', item.ordem,
          'descricao', item.descricao,
          'rbac_modulo', item.rbac_modulo
        ) order by item.ordem, item.modulo), '[]'::jsonb)
        from (
          select c.modulo, c.nome, c.grupo, c.ordem, c.descricao, c.rbac_modulo
            from public.erp_modulos_acesso c
           where c.ativo = true
          union all
          select distinct pm.modulo, pm.modulo, 'Fora do catálogo', 900, null, null
            from public.erp_permissoes_modulos pm
           where pm.empresa_id = v_empresa
             and pm.usuario_id is null
             and not exists (select 1 from public.erp_modulos_acesso c2 where c2.modulo = pm.modulo)
        ) item
    ),
    'matriz', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'setor_id', pm.setor_id,
          'modulo', pm.modulo,
          'visualizar', pm.visualizar,
          'criar', pm.criar,
          'editar', pm.editar,
          'excluir', pm.excluir
        ) order by pm.modulo), '[]'::jsonb)
        from public.erp_permissoes_modulos pm
       where pm.empresa_id = v_empresa
         and pm.usuario_id is null
         and pm.setor_id is not null
    ),
    'niveis', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'role_id', r.id,
          'codigo', r.codigo,
          'nome', r.nome,
          'nivel', r.nivel,
          'global', r.empresa_id is null,
          'modulos', (
            select coalesce(
              jsonb_agg(jsonb_build_object(
                'modulo', nm.modulo,
                'visualizar', nm.visualizar,
                'criar', nm.criar,
                'editar', nm.editar,
                'excluir', nm.excluir
              )), '[]'::jsonb)
              from public.erp_access_control_nivel_modulos(r.id) nm
          )
        ) order by r.nivel desc nulls last, r.nome), '[]'::jsonb)
        from public.erp_roles r
       where r.ativo = true
         and coalesce(r.nivel, 0) < 100
         and (r.empresa_id is null or r.empresa_id = v_empresa)
    )
  );
end;
$$;

-- Grava a matriz coletiva de um setor (uma linha por módulo, usuario_id nulo).
-- Update/insert explícito: o conflict nativo não casa com usuario_id nulo.
create or replace function public.erp_access_control_save_setor_matrix(
  p_setor_id uuid,
  p_matrix jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ctx jsonb;
  v_empresa uuid;
  v_item jsonb;
  v_modulo text;
  v_saved integer := 0;
begin
  v_ctx := public.erp_access_control_contexto();
  v_empresa := (v_ctx ->> 'empresa_id')::uuid;

  if p_setor_id is null then
    raise exception 'Selecione um setor antes de gravar a matriz.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.erp_setores s
     where s.id = p_setor_id
       and s.empresa_id = v_empresa
       and coalesce(s.ativo, true) = true
  ) then
    raise exception 'Setor não encontrado nesta empresa.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_matrix) <> 'array' then
    raise exception 'A matriz deve ser enviada como lista de módulos.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_matrix) > 200 then
    raise exception 'A matriz excede o limite de 200 módulos.' using errcode = '22023';
  end if;
  if (
    select count(distinct nullif(btrim(coalesce(item ->> 'modulo', '')), ''))
      from jsonb_array_elements(p_matrix) item
  ) <> jsonb_array_length(p_matrix) then
    raise exception 'A matriz contém módulos repetidos ou sem código.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_matrix) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Cada linha da matriz deve ser um objeto de módulo.' using errcode = '22023';
    end if;

    v_modulo := nullif(btrim(coalesce(v_item ->> 'modulo', '')), '');
    if v_modulo is null or char_length(v_modulo) > 60 then
      raise exception 'Módulo sem código válido na matriz.' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.erp_modulos_acesso c
       where c.ativo = true and c.modulo = v_modulo
    ) and not exists (
      select 1 from public.erp_permissoes_modulos pm
       where pm.empresa_id = v_empresa and pm.modulo = v_modulo
    ) then
      raise exception 'O módulo % não existe no catálogo de acesso.', v_modulo using errcode = '22023';
    end if;

    update public.erp_permissoes_modulos
       set visualizar = case when jsonb_typeof(v_item -> 'visualizar') = 'boolean' then (v_item ->> 'visualizar')::boolean else false end,
           criar = case when jsonb_typeof(v_item -> 'criar') = 'boolean' then (v_item ->> 'criar')::boolean else false end,
           editar = case when jsonb_typeof(v_item -> 'editar') = 'boolean' then (v_item ->> 'editar')::boolean else false end,
           excluir = case when jsonb_typeof(v_item -> 'excluir') = 'boolean' then (v_item ->> 'excluir')::boolean else false end
     where empresa_id = v_empresa
       and setor_id = p_setor_id
       and modulo = v_modulo
       and usuario_id is null;

    if not found then
      insert into public.erp_permissoes_modulos
        (empresa_id, usuario_id, setor_id, modulo, visualizar, criar, editar, excluir)
      values (
        v_empresa, null, p_setor_id, v_modulo,
        case when jsonb_typeof(v_item -> 'visualizar') = 'boolean' then (v_item ->> 'visualizar')::boolean else false end,
        case when jsonb_typeof(v_item -> 'criar') = 'boolean' then (v_item ->> 'criar')::boolean else false end,
        case when jsonb_typeof(v_item -> 'editar') = 'boolean' then (v_item ->> 'editar')::boolean else false end,
        case when jsonb_typeof(v_item -> 'excluir') = 'boolean' then (v_item ->> 'excluir')::boolean else false end
      );
    end if;

    v_saved := v_saved + 1;
  end loop;

  insert into public.erp_audit_logs
    (empresa_id, actor_user_id, action, entity_type, entity_id, new_data)
  values (
    v_empresa, (v_ctx ->> 'actor_id')::uuid, 'access_control.setor_matrix_saved',
    'erp_permissoes_modulos', p_setor_id,
    jsonb_build_object('setor_id', p_setor_id, 'modulos_gravados', v_saved, 'matriz', p_matrix)
  );

  return v_saved;
end;
$$;

-- Cria ou renomeia setor do chão de fábrica na tabela erp_setores já existente.
create or replace function public.erp_access_control_save_setor(
  p_setor_id uuid,
  p_codigo text,
  p_nome text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ctx jsonb;
  v_empresa uuid;
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  v_nome text := btrim(coalesce(p_nome, ''));
  v_id uuid;
begin
  v_ctx := public.erp_access_control_contexto();
  v_empresa := (v_ctx ->> 'empresa_id')::uuid;

  if v_codigo !~ '^[A-Z][A-Z0-9_-]{1,29}$' then
    raise exception 'Código de setor inválido: use 2 a 30 caracteres, iniciando por letra (A-Z, 0-9, _ ou -).' using errcode = '22023';
  end if;
  if char_length(v_nome) < 2 or char_length(v_nome) > 80 then
    raise exception 'O nome do setor deve ter entre 2 e 80 caracteres.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.erp_setores s
     where s.empresa_id = v_empresa
       and upper(btrim(s.codigo)) = v_codigo
       and (p_setor_id is null or s.id <> p_setor_id)
  ) then
    raise exception 'Já existe um setor com este código nesta empresa.' using errcode = '23505';
  end if;

  if p_setor_id is null then
    insert into public.erp_setores (empresa_id, codigo, nome, ativo)
    values (v_empresa, v_codigo, v_nome, true)
    returning id into v_id;
  else
    update public.erp_setores s
       set codigo = v_codigo, nome = v_nome, ativo = true
     where s.id = p_setor_id
       and s.empresa_id = v_empresa
    returning s.id into v_id;
    if v_id is null then
      raise exception 'Setor não encontrado nesta empresa.' using errcode = '42501';
    end if;
  end if;

  insert into public.erp_audit_logs
    (empresa_id, actor_user_id, action, entity_type, entity_id, new_data)
  values (
    v_empresa, (v_ctx ->> 'actor_id')::uuid,
    case when p_setor_id is null then 'access_control.setor_created' else 'access_control.setor_updated' end,
    'erp_setores', v_id,
    jsonb_build_object('codigo', v_codigo, 'nome', v_nome)
  );

  return v_id;
end;
$$;

revoke all on function public.erp_access_control_contexto() from public, anon, authenticated;
revoke all on function public.erp_access_control_nivel_modulos(uuid) from public, anon;

grant execute on function public.erp_access_control_nivel_modulos(uuid) to authenticated;
grant execute on function public.erp_access_control_overview() to authenticated;
grant execute on function public.erp_access_control_save_setor(uuid, text, text) to authenticated;
grant execute on function public.erp_access_control_save_setor_matrix(uuid, jsonb) to authenticated;

comment on function public.erp_access_control_overview() is
  'Controle de acesso (nível 8/9): setores, postos, catálogo de módulos, matriz gravada e modelos por nível da empresa da sessão.';
comment on function public.erp_access_control_save_setor_matrix(uuid, jsonb) is
  'Grava a matriz coletiva setor x módulo em erp_permissoes_modulos com auditoria em erp_audit_logs.';
comment on function public.erp_access_control_save_setor(uuid, text, text) is
  'Cria ou renomeia setor de chão de fábrica em erp_setores com auditoria em erp_audit_logs.';

commit;

notify pgrst, 'reload schema';
