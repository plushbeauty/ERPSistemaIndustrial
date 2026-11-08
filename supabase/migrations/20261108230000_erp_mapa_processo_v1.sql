-- 20261108230000_erp_mapa_processo_v1.sql
-- MAPA DE PROCESSO (process flow diagram, APQP / IATF 16949) — terceiro documento do trio que o
-- proprietário pediu em 2026-11-08 ("fazer FMEA e Plano de Controle juntos ... e Mapa de Processo ...
-- montar a página igual ao formulário ... aí você junta e elimina os outros").
--
-- O FMEA e o Plano de Controle já têm modelo em 20261106120000_erp_fmea_plano_controle_aiag_v1.sql.
-- Este arquivo acrescenta o mapa do processo: o cabeçalho do documento e a sequência de etapas com o
-- tipo de símbolo (operação, transporte, armazenagem, inspeção, espera, decisão), o setor, a máquina
-- do cadastro real (erp_maquinas), as características de produto e de processo e o registro gerado.
--
-- Regras permanentes respeitadas:
--  * nada de tabela vazia: a tela grava e lê estas duas tabelas de verdade;
--  * isolamento por empresa em todas as operações (RLS por erp_current_empresa_id(), master incluído);
--  * guarda idempotente: IF NOT EXISTS em tabelas, índices, políticas e gatilhos, para aplicar em banco
--    novo e em banco que já recebeu o pacote sem parar a migration;
--  * nenhuma alteração em tabela existente do SGQ;
--  * as ligações com o Plano de Controle são opcionais e só são criadas quando as tabelas do pacote do
--    FMEA já existem, para este arquivo nunca depender da ordem de aplicação.

begin;

-- ============================ Cabeçalho do mapa ============================

create table if not exists public.erp_mapa_processo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero text not null,
  produto_id uuid references public.erp_produtos(id) on delete set null,
  codigo_peca text not null default '',
  nome_peca text not null default '',
  cliente_projeto text not null default '',
  processo text not null default '',
  responsavel text not null default '',
  data_emissao date,
  data_revisao date,
  revisao integer not null default 1 check (revisao > 0),
  aprovado_por text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho','ativo','revisado','obsoleto')),
  versao integer not null default 1 check (versao > 0),
  observacoes text,
  plano_controle_id uuid,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero, versao)
);

create index if not exists idx_erp_mapa_processo_empresa
  on public.erp_mapa_processo (empresa_id, status, data_revisao desc);

alter table public.erp_mapa_processo enable row level security;
drop policy if exists erp_mapa_processo_tenant on public.erp_mapa_processo;
create policy erp_mapa_processo_tenant on public.erp_mapa_processo
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select, insert, update, delete on public.erp_mapa_processo to authenticated;

-- ============================ Etapas do fluxo ============================

create table if not exists public.erp_mapa_processo_etapa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  mapa_id uuid not null references public.erp_mapa_processo(id) on delete cascade,
  ordem integer not null default 1,
  tipo_etapa text not null default 'operacao'
    check (tipo_etapa in ('operacao','transporte','armazenagem','inspecao','espera','decisao')),
  etapa text not null default '',
  descricao text not null default '',
  setor text not null default '',
  maquina_id uuid references public.erp_maquinas(id) on delete set null,
  caracteristica_produto text not null default '',
  caracteristica_processo text not null default '',
  controle text not null default '',
  registro text not null default '',
  tempo_min numeric(12,2) check (tempo_min is null or tempo_min >= 0),
  criticidade text not null default 'normal'
    check (criticidade in ('normal','importante','critica')),
  plano_linha_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_erp_mapa_processo_etapa_mapa
  on public.erp_mapa_processo_etapa (mapa_id, ordem);
create index if not exists idx_erp_mapa_processo_etapa_empresa
  on public.erp_mapa_processo_etapa (empresa_id);

alter table public.erp_mapa_processo_etapa enable row level security;
drop policy if exists erp_mapa_processo_etapa_tenant on public.erp_mapa_processo_etapa;
create policy erp_mapa_processo_etapa_tenant on public.erp_mapa_processo_etapa
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select, insert, update, delete on public.erp_mapa_processo_etapa to authenticated;

-- ============================ Ligações com o Plano de Controle ============================
-- A coluna existe sempre; a chave estrangeira só é criada quando a tabela do CPP já foi criada pelo
-- pacote do FMEA. Assim este arquivo pode ser aplicado antes ou depois daquele, sem erro de referência.

do $$
begin
  if to_regclass('public.erp_plano_controle') is not null
     and not exists (
       select 1 from pg_constraint
        where conname = 'erp_mapa_processo_plano_controle_fk'
          and conrelid = 'public.erp_mapa_processo'::regclass
     ) then
    alter table public.erp_mapa_processo
      add constraint erp_mapa_processo_plano_controle_fk
      foreign key (plano_controle_id) references public.erp_plano_controle(id) on delete set null;
  end if;

  if to_regclass('public.erp_plano_controle_linha') is not null
     and not exists (
       select 1 from pg_constraint
        where conname = 'erp_mapa_processo_etapa_plano_linha_fk'
          and conrelid = 'public.erp_mapa_processo_etapa'::regclass
     ) then
    alter table public.erp_mapa_processo_etapa
      add constraint erp_mapa_processo_etapa_plano_linha_fk
      foreign key (plano_linha_id) references public.erp_plano_controle_linha(id) on delete set null;
  end if;
end;
$$;

-- ============================ Gatilhos de updated_at ============================
-- A função é a mesma usada pela migration do FMEA/Plano de Controle; aqui ela é recriada com o corpo
-- idêntico para que este arquivo funcione sozinho, em qualquer ordem de aplicação, sem depender de o
-- outro pacote estar aplicado.

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

do $$
declare
  t text;
begin
  foreach t in array array['erp_mapa_processo','erp_mapa_processo_etapa'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.erp_stdq_touch_updated_at()', t);
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
