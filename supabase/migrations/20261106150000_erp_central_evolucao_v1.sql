-- SYSNQRA ERP INDUSTRIAL — CENTRAL DE EVOLUCAO E CONCLUSAO DO SISTEMA
-- @AUTOR: FernandoSch
-- @DATA_REVISAO_APROVACAO: 2026-11-06
-- @REVISAO: REV-CENTRAL-EVOLUCAO-20261106-01
-- @STATUS_APROVACAO: ORDEM DO PROPRIETARIO EM 2026-11-06 — "VC JA TEM SUAS ORDENS PEGAR TODOS A
--   REALIZAR TODAS E APLICAR TODAS NO SISTEMA DEIXANDO ELE PRONTO" e "SÓ PARA QUANDO TODAS AS TELAS
--   ESTIVEREM PRONTO E APLICADAS NO SISTEMA". A ORDEM MASTER de 2026-11-06 pede a tela
--   "Central de Evolução e Conclusão do SYSNQRA" com filtros por setor/prioridade/situação,
--   historico de mudanca de status e relatorio A4.
--
-- O que esta tabela NÃO é: não é quadro de indicador inventado e não contém dado de produção.
-- Cada linha do seed abaixo é um pendencia real medida neste repo ou no banco vivo em 2026-11-06,
-- com a evidencia escrita na proprio "evidencia". Nada aqui foi preenchido por suposição.
--
-- Escopo das linhas (decisão registrada para a auditoria dele):
--   * empresa_id NULL = item do PRODUTO SYSNQRA (agenda de conclusao do sistema, igual para todas
--     as empresas). Só o MASTER validado no cadastro ERP enxerga e edita esses itens, porque a
--     policy aprovada é "empresa_id = public.erp_current_empresa_id() or public.erp_is_master()" e
--     NULL nunca iguala o uuid da sessão.
--   * empresa_id preenchido = item de implantação daquela empresa (o que falta para aquele cliente).
--     Nenhuma linha do seed usa empresa_id: não há como saber a empresa sem ler o banco autenticado,
--     e inventar uuid viola a regra dele.
--   * Nenhum INSERT do seed toca em tabela existente: são só linhas novas na tabela criada aqui.

-- ============================ FUNÇÃO DE CARIMBO (autossuficiente) ============================
-- O bloco abaixo repete, com corpo idêntico, a função criada em
-- 20261106120000_erp_fmea_plano_controle_aiag_v1.sql. Ela é recriada aqui para esta migration
-- aplicar sozinha num banco novo. Nome exclusivo: não sobrescreve objeto de outro pacote.

create or replace function public.erp_stdq_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.erp_stdq_touch_updated_at() from public, anon, authenticated;

-- ============================ ITENS ============================

create table if not exists public.erp_central_evolucao_item (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  titulo text not null,
  descricao text not null default '',
  setor text not null default 'geral',
  modulo text not null default '',
  tipo text not null default 'acao' check (tipo in ('acao','defeito','melhoria','pendencia_proprietario','auditoria')),
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  situacao text not null default 'pendente' check (situacao in ('pendente','em_andamento','concluido','bloqueado','nao_aplicavel')),
  responsavel text not null default '',
  origem text not null default '',
  arquivo text not null default '',
  rota text not null default '',
  dependencia text not null default '',
  evidencia text not null default '',
  ordem integer not null default 100,
  criado_em timestamptz not null default now(),
  criado_por uuid,
  atualizado_por uuid,
  updated_at timestamptz not null default now()
);

comment on table public.erp_central_evolucao_item is
  'Agenda mensurável de conclusão do SYSNQRA: uma linha por pendência, com origem, arquivo, rota, dependência e evidência.';
comment on column public.erp_central_evolucao_item.empresa_id is
  'NULL = item do produto (visível só ao MASTER). UUID = item de implantação daquela empresa.';
comment on column public.erp_central_evolucao_item.evidencia is
  'Medição que sustenta a linha (probe do banco vivo, grep do repo ou documento auditsdo com SHA).';

create index if not exists idx_erp_central_evolucao_item_situacao
  on public.erp_central_evolucao_item (situacao, prioridade, ordem);
create index if not exists idx_erp_central_evolucao_item_empresa
  on public.erp_central_evolucao_item (empresa_id, setor);

-- Unicidade por escopo. coalesce com o uuid nulo permite o mesmo codigo em empresas diferentes
-- e impede duplicidade do catalogo do produto numa re-execução da migration.
create unique index if not exists uniq_erp_central_evolucao_item_codigo
  on public.erp_central_evolucao_item
    (coalesce(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), codigo);

alter table public.erp_central_evolucao_item enable row level security;

drop policy if exists erp_central_evolucao_item_tenant on public.erp_central_evolucao_item;
create policy erp_central_evolucao_item_tenant on public.erp_central_evolucao_item
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

-- ============================ HISTÓRICO DE STATUS ============================

create table if not exists public.erp_central_evolucao_evento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.erp_empresas(id) on delete cascade,
  item_id uuid not null references public.erp_central_evolucao_item(id) on delete cascade,
  quando timestamptz not null default now(),
  quem text not null default '',
  tipo_evento text not null default 'situacao' check (tipo_evento in ('criado','situacao','prioridade','edicao')),
  de_valor text not null default '',
  para_valor text not null default '',
  nota text not null default ''
);

comment on table public.erp_central_evolucao_evento is
  'Rastro de cada mudança de situação/prioridade da agenda; escrito pelo gatilho, nunca pelo client.';

create index if not exists idx_erp_central_evolucao_evento_item
  on public.erp_central_evolucao_evento (item_id, quando desc);

alter table public.erp_central_evolucao_evento enable row level security;

drop policy if exists erp_central_evolucao_evento_tenant on public.erp_central_evolucao_evento;
create policy erp_central_evolucao_evento_tenant on public.erp_central_evolucao_evento
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select, insert, update, delete on table public.erp_central_evolucao_item to authenticated;
grant select, insert on table public.erp_central_evolucao_evento to authenticated;

-- ============================ GATILHO DE CARIMBO E DE ALTA ============================

create or replace function public.erp_central_evolucao_ultima_quem()
returns text
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (select u.nome from public.erp_usuarios u where u.auth_user_id = (select auth.uid()) limit 1),
    ((select auth.uid())::text),
    session_user::text
  );
$$;

create or replace function public.erp_central_evolucao_registra_alta()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.erp_central_evolucao_evento
    (empresa_id, item_id, quem, tipo_evento, de_valor, para_valor, nota)
  values (new.empresa_id, new.id, public.erp_central_evolucao_ultima_quem(), 'criado', '', new.situacao,
          'Item cadastrado');
  return new;
end;
$$;

revoke all on function public.erp_central_evolucao_ultima_quem() from public, anon;
revoke all on function public.erp_central_evolucao_registra_alta() from public, anon, authenticated;

drop trigger if exists trg_erp_central_evolucao_item_touch on public.erp_central_evolucao_item;
create trigger trg_erp_central_evolucao_item_touch
  before update on public.erp_central_evolucao_item
  for each row execute function public.erp_stdq_touch_updated_at();

drop trigger if exists trg_erp_central_evolucao_item_alta on public.erp_central_evolucao_item;
create trigger trg_erp_central_evolucao_item_alta
  after insert on public.erp_central_evolucao_item
  for each row execute function public.erp_central_evolucao_registra_alta();

-- ============================ RPC: MUDAR SITUAÇÃO COM NOTA ============================
-- A mudança de situação e o rastro saem na mesma transação e sob RLS (SECURITY INVOKER): quem
-- edita só alcança a própria empresa ou é MASTER. Se nenhuma linha foi afetada a função falha
-- com erro explícito em vez de devolver um sucesso falso, que é a regra permanente dele.

create or replace function public.erp_central_evolucao_mudar_situacao(
  p_item_id uuid,
  p_situacao text,
  p_nota text default ''
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  anterior text;
  empresa uuid;
begin
  if p_situacao is null or p_situacao not in ('pendente','em_andamento','concluido','bloqueado','nao_aplicavel') then
    raise exception 'Situação inválida: %', coalesce(p_situacao, 'null')
      using errcode = '22023';
  end if;

  select situacao, empresa_id into anterior, empresa
    from public.erp_central_evolucao_item
   where id = p_item_id
     for update;

  if anterior is null then
    raise exception 'Item da Central de Evolução não encontrado ou fora do seu escopo de acesso.'
      using errcode = 'P0002';
  end if;

  if anterior = p_situacao then
    return true;
  end if;

  update public.erp_central_evolucao_item
     set situacao = p_situacao,
         atualizado_por = (select auth.uid()),
         updated_at = now()
   where id = p_item_id;

  insert into public.erp_central_evolucao_evento
    (empresa_id, item_id, quem, tipo_evento, de_valor, para_valor, nota)
  values (empresa, p_item_id, public.erp_central_evolucao_ultima_quem(), 'situacao',
          anterior, p_situacao, coalesce(nullif(trim(p_nota), ''), ''));

  return true;
end;
$$;

revoke all on function public.erp_central_evolucao_mudar_situacao(uuid, text, text) from public, anon;
grant execute on function public.erp_central_evolucao_mudar_situacao(uuid, text, text) to authenticated;

comment on function public.erp_central_evolucao_mudar_situacao(uuid, text, text) is
  'Grava a nova situação do item e o evento correspondente na mesma transação, sob RLS do papel atual.';

-- ============================ RPC: RESUMO CONSOLIDADO ============================
-- Percentual e contagens saem das linhas que o próprio usuário pode ver (RLS aplicada dentro da
-- função, que é SECURITY INVOKER). Se a tabela estiver vazia, devolve zero: nenhum número é simulado.

create or replace function public.erp_central_evolucao_resumo()
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with f as (
    select situacao, prioridade, setor
      from public.erp_central_evolucao_item
     where empresa_id = public.erp_current_empresa_id() or public.erp_is_master()
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'pendente', (select count(*) from f where situacao = 'pendente'),
    'em_andamento', (select count(*) from f where situacao = 'em_andamento'),
    'concluido', (select count(*) from f where situacao = 'concluido'),
    'bloqueado', (select count(*) from f where situacao = 'bloqueado'),
    'nao_aplicavel', (select count(*) from f where situacao = 'nao_aplicavel'),
    'criticas_abertas', (select count(*) from f where prioridade = 'critica' and situacao <> 'concluido'),
    'percentual_concluido', (
      select case when count(*) = 0 then 0
                  else round(100.0 * count(*) filter (where situacao = 'concluido') / count(*), 1)
             end
        from f
    ),
    'por_setor', (
      select coalesce(jsonb_object_agg(setor, n), '{}'::jsonb)
        from (select setor, count(*) as n from f group by setor) g
    )
  );
$$;

revoke all on function public.erp_central_evolucao_resumo() from public, anon;
grant execute on function public.erp_central_evolucao_resumo() to authenticated;

comment on function public.erp_central_evolucao_resumo() is
  'Contagens e percentual de conclusão da agenda, calculados sobre as linhas visíveis ao papel atual.';

-- ============================ SEED: PENDÊNCIAS MEDIDAS EM 2026-11-06 ============================
-- Origem de cada numero:
--   * probe do banco vivo com a publishable key (somente GET, sem escrita): tabela ausente devolve
--     PGRST205; tabela existente sem grant devolve 42501. Executado em 2026-11-06.
--   * grep do repo nesta branch: contagem de arquivos com window.print.
--   * docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (medido no SHA 40d2dced) para o par tela x tabela.
-- Idempotente: o where not exists impede duplicar o catalogo se a migration rodar duas vezes.

insert into public.erp_central_evolucao_item
  (empresa_id, codigo, titulo, descricao, setor, modulo, tipo, prioridade, situacao,
   responsavel, origem, arquivo, rota, dependencia, evidencia, ordem)
select s.empresa_id, s.codigo, s.titulo, s.descricao, s.setor, s.modulo, s.tipo, s.prioridade, s.situacao,
       s.responsavel, s.origem, s.arquivo, s.rota, s.dependencia, s.evidencia, s.ordem
  from (values
    -- ---------- BLOCO BANCO: migrations que só ele pode aplicar ----------
    (null::uuid,'BCO-001','Aplicar a migration do FMEA AIAG e do Plano de Controle',
     'Sem ela as telas /qualidade/fmea e /qualidade/plano-controle abrem mas avisam que a tabela não existe; nenhum dado é inventado na tela.',
     'banco','Qualidade','pendencia_proprietario','critica','pendente',
     'Proprietário','ORDEM MASTER 2026-11-06 (CPP digital e impresso com QR Code)',
     'supabase/migrations/20261106120000_erp_fmea_plano_controle_aiag_v1.sql','/pageprincipal/qualidade/fmea',
     'SQL Editor do Supabase (não há CLI nem service_role nesta sessão)',
     'Probe 2026-11-06: erp_fmea_cabecalho e erp_plano_controle devolvem PGRST205 (tabela ausente no schema cache do banco vivo).',10),

    (null,'BCO-002','Aplicar a migration da Central de Evolução',
     'Cria erp_central_evolucao_item, erp_central_evolucao_evento, a RPC de resumo e o catálogo medido desta tela.',
     'banco','Administração','pendencia_proprietario','alta','pendente',
     'Proprietário','ORDEM MASTER 2026-11-06 (Central de Evolução e Conclusão do SYSNQRA)',
     'supabase/migrations/20261106150000_erp_central_evolucao_v1.sql','/pageprincipal/administracao/central-evolucao',
     'SQL Editor do Supabase',
     'Probe 2026-11-06: erp_central_evolucao_item e erp_central_evolucao_resumo devolvem PGRST205.',20),

    (null,'BCO-003','Aplicar o pacote das migrations pendentes (25 tabelas ausentes)',
     'Pacote único já escrito no repo. É o gargalo que trava 21 telas prontas no código; não falta programação, falta execução no banco.',
     'banco','Núcleo','pendencia_proprietario','critica','pendente',
     'Proprietário','Ordem permanente: nada é declarado funcional sem o banco real',
     'supabase/diagnosticos/20261104_pacote_aplicar_migrations_pendidas.sql','',
     'Revisar o pacote antes de colar (ele tem 27 migrations e 4.291 linhas, sem statements destrutivos fora de corpo de função)',
     'Probe 2026-11-06: as 25 tabelas abaixo devolvem PGRST205; erp_usuarios e erp_empresas devolvem 42501, ou seja existem e não têm grant para anon.',30),

    (null,'BCO-004','Aplicar a migration da matriz de permissão por setor',
     'A tela de controle de acesso chama a RPC que essa migration cria; sem ela a central mostra erro.',
     'banco','Segurança','pendencia_proprietario','alta','pendente',
     'Proprietário','Tarefa #25 e #26 (controle de acesso do chão de fábrica)',
     'supabase/migrations/20261030160000_erp_access_control_sector_matrix_v1.sql','/pageprincipal/configuracoes-usuario',
     'SQL Editor do Supabase',
     'Probe 2026-11-06: RPC public.erp_access_control_overview devolve PGRST202 (função ausente).',40),

    -- ---------- BLOCO BLOQUEADAS: decisão dele, não minha ----------
    (null,'DEC-001','Decidir o conflito entre a ORDEM MASTER e as ordens de 2026-11-02',
     'A ORDEM MASTER §6/§8 pede destaque laranja (isUpdated) e barra Windows 11; as ordens dele de 2026-11-02 mandaram deletar os dois, e as travas approved-ui-lock e quality-tablet-contract reprovam o build se voltarem. Não reintroduzi nada por conta própria.',
     'interface','Global','pendencia_proprietario','critica','bloqueado',
     'Proprietário','Conflito registrado nos relatórios; travas em scripts/verify-approved-ui-lock.mjs',
     'scripts/verify-approved-ui-lock.mjs','',
     'Decisão escrita dele sobre qual ordem prevalece',
     'Build atual passa com os dois removidos; reintroduzir sem decisão dele quebra verify:production.',50),

    (null,'DEC-002','Re-aprovar PCPPlanejamentoIndustrial.tsx no contrato de hash',
     'A tela foi corrigida (criado_em para created_at) mas está travada no manifesto; re-aprovação de tela travada exige ordem explícita dele para aquela tela.',
     'interface','PCP','pendencia_proprietario','alta','bloqueado',
     'Proprietário','Memória do projeto: nunca re-gerar o manifesto só para o gate passar',
     'scripts/verify-official-screens-lock.mjs','/pageprincipal/pcp/planejamento',
     'Ordem explícita dele para essa tela',
     'Trava oficiais[] do contrato de telas oficiais.',60),

    (null,'DEC-003','Autorizar a publicação de prod-telas-novas em produção',
     'Cada incremento vai para a branch e para o preview da Vercel. Produção só com ordem dele.',
     'publicacao','Vercel','pendencia_proprietario','critica','bloqueado',
     'Proprietário','Ordem permanente: produção só com ordem dele',
     '','https://erp-sistema-industrial.vercel.app',
     'Ordem dele',
     'Branch viva prod-telas-novas; preview da branch publicado em cada incremento.',70),

    (null,'DEC-004','Destravar Saída de Material (filtro de status das OPs)',
     'Correção pronta para ser feita, mas ele mandou aguardar ordem antes de mexer nessa tela.',
     'interface','Estoque','pendencia_proprietario','media','bloqueado',
     'Proprietário','Tarefa #122',
     'src/pages/AlmoxarifadoSaidaMaterial.tsx','/pageprincipal/almoxarifado/saida-material',
     'Ordem dele',
     'Tarefa registrada como aguardando ordem.',80),

    -- ---------- BLOCO IMPRESSÃO A4 ----------
    (null,'IMP-001','Converter as telas que ainda chamam window.print',
     'Ordem permanente: o botão Imprimir gera documento A4 com dados reais, sem menu, sem filtros e sem barra de ação. O motor já existe (abrirRelatorio + SynqraRelatorioA4); falta aplicar tela a tela.',
     'relatorios','Todos','acao','alta','em_andamento',
     'SYSNQRA','Ordem permanente do proprietário (item 5 da ordem de 2026-11-05)',
     'src/lib/report/abrirRelatorio.tsx','',
     'Nenhuma dependência de banco; trabalho por módulo',
     'grep 2026-11-06 nesta branch: 35 arquivos em src/pages e src/features ainda com window.print (fora o próprio motor A4).',90),

    -- ---------- BLOCO CÓRIGO/SEGURANÇA ----------
    (null,'AUT-001','Remover o fallback na tabela legada usuarios do AppBootstrap',
     'Se o perfil não é resolvido em erp_usuarios, o boot cai numa tabela que não existe no banco vivo e devolve erro em vez de negar o acesso com clareza.',
     'auth','Núcleo','defeito','alta','pendente',
     'SYSNQRA','Tarefa #33 (unificar autenticação) e medição desta execução',
     'src/AppBootstrap.tsx:96','',
     'Nenhuma; é código desta branch',
     'Probe 2026-11-06: SELECT em public.usuarios devolve PGRST205 (tabela legada inexistente).',100),

    -- ---------- BLOCO TELAS PRONTAS NO CÓDIGO X TABELA AUSENTE ----------
    (null,'TBC-001','Certificado de Qualidade aguarda a tabela de cotas',
     'Tela pronta; a leitura falha porque a tabela não existe no banco vivo.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/CertificadoQualidade.tsx','/pageprincipal/qualidade/certificados',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_certificado_cotas = PGRST205.',110),

    (null,'TBC-002','Notas de débito aguardam a configuração de clientes DN',
     'Tela pronta; tabela ausente no banco vivo.',
     'banco','Financeiro','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/CustomerDnSettings.tsx','/pageprincipal/financeiro/notas-debito/configuracoes',
     'BCO-003',
     'Probe 2026-11-06: erp_clientes_dn_config = PGRST205.',120),

    (null,'TBC-003','Controle de Alteração de Documentos aguarda 4 tabelas e a matriz de permissões',
     'Abas de distribuição, revisões, aprovações e solicitações prontas no código; leitura falha no banco.',
     'banco','Qualidade','defeito','critica','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/DocumentosQualidadeControle.tsx','/pageprincipal/qualidade/documentos',
     'BCO-003',
     'Probe 2026-11-06: erp_documentos_qualidade_distribuicoes, _revisoes, _aprovacoes, _solicitacoes e erp_permissoes_modulos = PGRST205.',130),

    (null,'TBC-004','BOM mestre aguarda a tabela de estrutura',
     'Tela pronta; tabela ausente.',
     'banco','Engenharia','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EngenhariaBOM.tsx','/pageprincipal/engenharia/bom-mestre',
     'BCO-003',
     'Probe 2026-11-06: erp_engenharia_bom = PGRST205 (a migration 20261021180000 tinha dollar-quote quebrado; a trava verificar-migrations-sql.mjs existe por causa disso).',140),

    (null,'TBC-005','Revisões de BOM aguardam a tabela de revisões',
     'Tela pronta; tabela ausente.',
     'banco','Engenharia','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EngenhariaRevisoesBOM.tsx','/pageprincipal/engenharia/revisoes-bom',
     'BCO-003',
     'Probe 2026-11-06: erp_bom_revisoes = PGRST205.',150),

    (null,'TBC-006','Rastreabilidade de lotes aguarda separações e genealogia',
     'Tela pronta; duas tabelas ausentes.',
     'banco','Estoque','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EstoqueRastreabilidadeLotes.tsx','/pageprincipal/estoque/rastreabilidade',
     'BCO-003',
     'Probe 2026-11-06: erp_estoque_separacoes e erp_qualidade_genealogia_lotes = PGRST205.',160),

    (null,'TBC-007','Separação de material aguarda a tabela de separações',
     'Tela e RPC atômicas escritas; banco ainda não tem a tabela.',
     'banco','Estoque','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/EstoqueSeparacao.tsx','/pageprincipal/estoque/separacao',
     'BCO-003',
     'Probe 2026-11-06: erp_estoque_separacoes = PGRST205.',170),

    (null,'TBC-008','Expedição NF-e aguarda a tabela de vínculo romaneio x nota',
     'Tela pronta; tabela ausente.',
     'banco','Logística','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/logistica/ExpedicaoNFe.tsx','/pageprincipal/logistica/expedicao-nfe',
     'BCO-003',
     'Probe 2026-11-06: erp_expedicao_nfe = PGRST205.',180),

    (null,'TBC-009','Fichas de processo aguardam o histórico de ajustes de máquina',
     'Abas prontas; a leitura do histórico falha por tabela ausente.',
     'banco','Qualidade','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/FichasProcesso.tsx','/pageprincipal/qualidade/fichas-processo',
     'BCO-003',
     'Probe 2026-11-06: erp_historico_ajustes_maquina = PGRST205.',190),

    (null,'TBC-010','GED aguarda a pasta de evidências da RPNC',
     'Anexos versionados dependem da tabela de evidências.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/qualidade/FileTreeGED.tsx','/pageprincipal/qualidade/ged',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_rpnc_evidencias = PGRST205.',200),

    (null,'TBC-011','Gráfico de desvios aguarda a apuração de custos',
     'Tela pronta; tabela ausente.',
     'banco','Financeiro','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/FinanceiroGraficoDesvios.tsx','/pageprincipal/financeiro/grafico-desvios',
     'BCO-003',
     'Probe 2026-11-06: erp_financeiro_apuracao_custos = PGRST205.',210),

    (null,'TBC-012','Central fiscal aguarda liberações por item de pedido',
     'Tela pronta; tabela ausente.',
     'banco','Fiscal','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/features/fiscal/Fiscal.tsx','/pageprincipal/fiscal',
     'BCO-003',
     'Probe 2026-11-06: erp_fiscal_liberacoes_pedido_item = PGRST205.',220),

    (null,'TBC-013','Impostos aguardam a tabela de regras fiscais',
     'Tela pronta; tabela ausente.',
     'banco','Fiscal','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/features/fiscal/FiscalImpostos.tsx','/pageprincipal/fiscal/impostos',
     'BCO-003',
     'Probe 2026-11-06: erp_regras_fiscais = PGRST205.',230),

    (null,'TBC-014','Impressão de etiquetas aguarda o log de etiquetas',
     'Tela pronta; tabela ausente.',
     'banco','Logística','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/logistica/ImpressaoEtiquetas.tsx','/pageprincipal/logistica/impressao-etiquetas',
     'BCO-003',
     'Probe 2026-11-06: erp_log_etiquetas = PGRST205.',240),

    (null,'TBC-015','Auditorias de planta aguardam a tabela própria',
     'Tela pronta; tabela ausente.',
     'banco','Qualidade','defeito','media','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeAuditoriasPlanta.tsx','/pageprincipal/qualidade/auditorias-planta',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_auditorias_planta = PGRST205.',250),

    (null,'TBC-016','Genealogia de lote aguarda a tabela de genealogia',
     'Tela pronta; tabela ausente.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeGenealogiaLote.tsx','/pageprincipal/qualidade/genealogia-lote',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_genealogia_lotes = PGRST205.',260),

    (null,'TBC-017','Gráficos de refugo aguardam refugos e motivos de defeito',
     'Tela pronta; duas tabelas ausentes.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeGraficosRefugo.tsx','/pageprincipal/qualidade/graficos-refugo',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_defeitos_motivos e erp_qualidade_refugos = PGRST205.',270),

    (null,'TBC-018','Liberação de lotes aguarda a tabela de liberação',
     'Tela pronta; tabela ausente.',
     'banco','Qualidade','defeito','critica','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeLiberacaoLotes.tsx','/pageprincipal/qualidade/liberacao-lote',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_liberacao_lotes = PGRST205.',280),

    (null,'TBC-019','Refugos aguarda refugos e motivos de defeito',
     'Tela pronta; duas tabelas ausentes.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualidadeRefugos.tsx','/pageprincipal/qualidade/refugos',
     'BCO-003',
     'Probe 2026-11-06: erp_qualidade_defeitos_motivos e erp_qualidade_refugos = PGRST205.',290),

    (null,'TBC-020','Auditorias SGQ aguardam a tabela de auditorias',
     'Tela pronta com vínculo de RPNC; tabela ausente.',
     'banco','Qualidade','defeito','alta','pendente','Proprietário',
     'docs/CONSULTA-TELAS-APLICADAS-2026-11-06.md (SHA 40d2dced)',
     'src/pages/QualityAuditsList.tsx','/pageprincipal/qualidade/auditorias',
     'BCO-003',
     'Probe 2026-11-06: erp_sgq_auditorias = PGRST205.',300),

    (null,'TBC-021','Plano de Controle e FMEA aguardam as tabelas novas',
     'Telas desta revisão já ligadas ao contrato da migration; sem aplicação ficam com o aviso de pendência.',
     'banco','Qualidade','defeito','critica','pendente','Proprietário',
     'ORDEM MASTER 2026-11-06',
     'src/pages/qualidade/PlanoControle.tsx','/pageprincipal/qualidade/plano-controle',
     'BCO-001',
     'Probe 2026-11-06: erp_plano_controle = PGRST205; qualidade_fmea existe mas sem as colunas novas.',310),

    -- ---------- BLOCO AGENDA DE CONCLUSÃO ----------
    (null,'AGR-001','Conferir os 34 módulos da matriz contra as telas reais',
     'Auditoria módulo a módulo para declarar cobertura sem chutar tela inexistente.',
     'auditoria','Global','auditoria','alta','pendente',
     'SYSNQRA','Tarefa #160 (ordem do proprietário)',
     'docs/TABLET-MATRIZ-SYNQRA.md','',
     'Nenhuma',
     'Matriz dele; a conferência tela a tela ainda não foi registrada como concluída.',320),

    (null,'AGR-002','Entregar o relatório PESQUISA_OPORTUNIDADES_SYSNQRA.md',
     'Pesquisa em 12 áreas com as 30 melhores oportunidades por impacto, com link e evidência lidos. As saídas dos agentes anteriores ficaram com 0 bytes, então as 4 primeiras fontes precisam ser recoletadas; nada será escrito sem evidência.',
     'pesquisa','Global','acao','media','pendente',
     'SYSNQRA','ORDEM DE PESQUISA 2026-11-06',
     'docs/PESQUISA_OPORTUNIDADES_SYSNQRA.md','',
     'Nenhuma',
     'Arquivo ainda não existe no repo (ls docs/ em 2026-11-06).',330),

    (null,'AGR-003','Auditoria comparativa de padrão visual (campos, botões de edição, cores)',
     'Ele autorizou medir o SYSNQRA contra outros sistemas industriais e atualizar imagem e cor do sistema quando o visual sair do padrão.',
     'interface','Global','melhoria','alta','em_andamento',
     'SYSNQRA','Ordem de 2026-11-06 (pesquisa avançada em outros sistemas)',
     'src/styles','',
     'Nenhuma',
     'Paleta oficial travada (#F4FBFD #123B50 #2D8DB8 #48B7C7 #3A9D78 #E6A34A #D65B61, Inter) e régua de 30px opt-in; comparação externa ainda não registrada.',340),

    (null,'AGR-004','Central de Ajuda presente em todas as telas',
     'A tela /ajuda existe; falta o ponto de entrada em todas as telas alcançáveis.',
     'interface','Global','melhoria','media','pendente',
     'SYSNQRA','Tarefa #128 e #130',
     'src/pages/CentralAjuda.tsx','/pageprincipal/ajuda',
     'Nenhuma',
     'Rota registrada no roteador; entrada global ainda não aplicada.',350),

    (null,'AGR-005','Fluxo de caixa: revisão 04 (paginação, concorrência, CONSULTAR, PAGO protegido)',
     'Pendência registrada na auditoria; precisa fechar a proteção de título já pago e o estado de conexão real.',
     'financeiro','Financeiro','defeito','media','pendente',
     'SYSNQRA','Tarefa #146 e #144',
     'src/features/financeiro/FinanceiroFluxoCaixa.tsx','/pageprincipal/financeiro/fluxo-de-caixa',
     'Nenhuma',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, item ERP-2026-003 (paginação feita; concorrência e estado de conexão ainda sem prova autenticada).',360),

    (null,'AGR-006','Pente fino responsivo mobile-first em todas as telas',
     'Ordem dele: o sistema é usado em tablet de chão de fábrica e em painel; nenhum módulo pode quebrar em 768px.',
     'interface','Global','melhoria','media','pendente',
     'SYSNQRA','Tarefa #140',
     'src/components/layout','',
     'Depende da auditoria visual AGR-003',
     'Verificação visual autenticada ainda não executada (preview da Vercel atrás de autenticação).',370),

    (null,'AGR-007','Terminal de produção da máquina (HMI da injetora)',
     'A partir do print dele: tela de operação por máquina com apontamento em tela de toque.',
     'interface','PCP','melhoria','media','pendente',
     'SYSNQRA','Tarefa #141',
     'src/pages/pcp/ControleProcessoInjetora.tsx','/pageprincipal/pcp/controle-injetora',
     'Nenhuma',
     'Existe a tela de controle da injetora; o formato HMI do print ainda não foi aplicado.',380),

    (null,'AGR-008','MRP do PCP: agregar necessidades no banco antes de gravar ordens',
     'O cálculo hoje atravessa o client; a agregação deve virar RPC transacional para não gerar OP duplicada em concorrência.',
     'producao','PCP','defeito','alta','em_andamento',
     'SYSNQRA','Tarefa #133',
     'src/pages/PCPDemanda.tsx','/pageprincipal/pcp/demanda',
     'Migration nova (ainda escrita aqui)',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, item ERP-2026-018: cada OP usa a RPC de numeração, mas o lote continua em transações individuais.',390),

    (null,'AGR-009','Portal do Operador: convite por e-mail, cartão e apontamento gravando no PCP',
     'Fechar o ciclo do funcionário de chão de fábrica sem conta Auth: cartão de ponto, PIN e vínculo com a OP.',
     'producao','PCP','acao','alta','em_andamento',
     'SYSNQRA','Tarefa #81 e #134',
     'src/pages/PortalDoOperador.tsx','/pageprincipal/pcp/portal-operador',
     'Tarefa #153 (sigla da empresa, codigo_acesso e PIN com hash) e #154 (Edge Function de validação de PIN)',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, bloqueio: Deno não instalado, nenhuma Edge Function executada em runtime.',400),

    (null,'AGR-010','Ficha de Processo: abas Acabamento e Montagem aplicadas no sistema',
     'As abas do modelo dele ainda não estão na tela oficial.',
     'qualidade','PCP','acao','media','pendente',
     'SYSNQRA','Tarefa #135 e pasta Fichas de Processo enviada por ele',
     'src/pages/FichasProcesso.tsx','/pageprincipal/qualidade/fichas-processo',
     'TBC-009 para o histórico de ajustes',
     'Ordem permanente: uma versão oficial por tela, sem restaurar tela antiga.',410),

    (null,'AGR-011','Aplicar a migration do bucket erp-fichas-processo',
     'Anexo da ficha de processo depende do bucket de Storage.',
     'banco','Estoque','pendencia_proprietario','media','pendente',
     'Proprietário','Tarefa #91',
     'supabase/migrations','',
     'SQL Editor / painel Storage do Supabase',
     'Storage não é consultável pela publishable key sem sessão; a presença do bucket não pode ser provada nesta sessão.',420),

    (null,'AGR-012','Provar os três serviços ponta a ponta com sessão autenticada',
     'Ordem dele: não declarar acesso integral sem testar banco, Storage e Edge Function de verdade. Sem credencial autenticada nesta sessão, nada aqui é declarado funcional.',
     'auditoria','Núcleo','auditoria','critica','pendente',
     'SYSNQRA','Ordem permanente dele',
     '','/pageprincipal',
     'Sessão Supabase autenticada dele ou token com escopo suficiente',
     'docs/ERP-CENTRAL-ERROS-PENDENCIAS.md, seção Bloqueios externos atuais: sem psql, sem CLI, sem sessão autenticada, sem Deno.',430)
  ) as s(empresa_id, codigo, titulo, descricao, setor, modulo, tipo, prioridade, situacao,
         responsavel, origem, arquivo, rota, dependencia, evidencia, ordem)
 where not exists (
   select 1 from public.erp_central_evolucao_item e
    where e.empresa_id is null and e.codigo = s.codigo
 );
