-- SYSNQRA ERP INDUSTRIAL — identificação do operador no chão de fábrica
-- REV-OPERADOR-CARTAO-CPF3-20261108-01 — ordem do proprietário em 2026-11-08:
-- "o chão de fábrica o operador vai usar o número do cartão mais os 3 últimos números do CPF".
--
-- O terminal NÃO autentica no Supabase Auth com cartão+CPF: a sessão do posto continua sendo a
-- sessão corporativa já aberta. O que muda é a identificação do operador, que deixa de ser uma
-- leitura direta de erp_funcionarios no cliente e passa a ser conferida no servidor:
--   cartão/matrícula + 3 últimos dígitos do CPF, na empresa da sessão, com bloqueio após 8 falhas
--   em 15 minutos. A função devolve só os campos públicos do crachá; o CPF nunca é retornado.
--
-- Requisitos: public.erp_funcionarios e public.erp_current_empresa_id() já existem (usados pelas
-- telas atuais). Nenhuma tabela de negócio é alterada além da coluna cpf.
-- Idempotente: pode ser executada mais de uma vez no SQL Editor.

begin;

alter table if exists public.erp_funcionarios
  add column if not exists cpf text;

comment on column public.erp_funcionarios.cpf is
  'CPF do colaborador. Usado somente para conferir os 3 últimos dígitos na identificação do terminal; nunca é retornado por consulta.';

create index if not exists erp_funcionarios_empresa_cpf_idx
  on public.erp_funcionarios (empresa_id, cpf)
  where cpf is not null;

create index if not exists erp_funcionarios_empresa_cartao_idx
  on public.erp_funcionarios (empresa_id, numero_cracha_rfid)
  where numero_cracha_rfid is not null;

-- Registro de tentativas: guarda apenas o hash do cartão, nunca o cartão nem o CPF.
create table if not exists public.erp_operador_identificacao_tentativa (
  id bigserial primary key,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cartao_hash text not null,
  sucesso boolean not null,
  criado_em timestamptz not null default now()
);

create index if not exists erp_operador_tentativa_cartao_idx
  on public.erp_operador_identificacao_tentativa (empresa_id, cartao_hash, criado_em desc);

alter table public.erp_operador_identificacao_tentativa enable row level security;
revoke all on public.erp_operador_identificacao_tentativa from anon, authenticated;

create or replace function public.erp_operador_identificar_cartao(p_cartao text, p_cpf3 text)
returns table (
  id uuid,
  empresa_id uuid,
  matricula text,
  nome text,
  nome_completo text,
  email text,
  status text,
  turno_trabalho text,
  departamento text,
  cargo text,
  numero_cracha_rfid text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_cartao text := btrim(coalesce(p_cartao, ''));
  v_cpf3 text := right(regexp_replace(coalesce(p_cpf3, ''), '\D', '', 'g'), 3);
  v_hash text;
  v_falhas integer;
  v_total integer;
  v_func public.erp_funcionarios%rowtype;
begin
  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'Sessão corporativa não identificada. Faça login no ERP antes de usar o cartão.'
      using errcode = '28000';
  end if;

  if length(v_cartao) < 2 or length(v_cartao) > 32 then
    raise exception 'Número do cartão inválido: use de 2 a 32 caracteres.' using errcode = '22023';
  end if;

  if length(v_cpf3) <> 3 then
    raise exception 'Informe os 3 últimos dígitos numéricos do CPF.' using errcode = '22023';
  end if;

  v_hash := md5(v_empresa::text || '|' || lower(v_cartao));

  select count(*) into v_falhas
    from public.erp_operador_identificacao_tentativa t
   where t.empresa_id = v_empresa
     and t.cartao_hash = v_hash
     and t.sucesso = false
     and t.criado_em > now() - interval '15 minutes';

  if v_falhas >= 8 then
    raise exception 'Muitas tentativas para este cartão. Aguarde 15 minutos ou procure o supervisor.'
      using errcode = 'P0001';
  end if;

  select count(*) into v_total
    from public.erp_funcionarios f
   where f.empresa_id = v_empresa
     and (f.numero_cracha_rfid = v_cartao or f.matricula = v_cartao);

  if v_total > 1 then
    insert into public.erp_operador_identificacao_tentativa (empresa_id, cartao_hash, sucesso)
    values (v_empresa, v_hash, false);
    raise exception 'Cartão duplicado no cadastro do RH. Procure o supervisor para corrigir o cadastro.'
      using errcode = 'P0001';
  end if;

  select f.* into v_func
    from public.erp_funcionarios f
   where f.empresa_id = v_empresa
     and (f.numero_cracha_rfid = v_cartao or f.matricula = v_cartao)
     and lower(coalesce(f.status, 'ativo')) not in ('inativo', 'desligado', 'demitido', 'cancelado', 'afastado')
     and right(regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g'), 3) = v_cpf3
   limit 1;

  if v_func.id is null then
    insert into public.erp_operador_identificacao_tentativa (empresa_id, cartao_hash, sucesso)
    values (v_empresa, v_hash, false);
    raise exception 'Cartão ou CPF não conferem. Confira o número do cartão e os 3 últimos dígitos do CPF.'
      using errcode = 'P0001';
  end if;

  insert into public.erp_operador_identificacao_tentativa (empresa_id, cartao_hash, sucesso)
  values (v_empresa, v_hash, true);

  delete from public.erp_operador_identificacao_tentativa
   where empresa_id = v_empresa
     and criado_em < now() - interval '7 days';

  return query
    select v_func.id, v_func.empresa_id, v_func.matricula, v_func.nome, v_func.nome_completo,
           v_func.email, v_func.status, v_func.turno_trabalho, v_func.departamento,
           v_func.cargo, v_func.numero_cracha_rfid;
end;
$$;

comment on function public.erp_operador_identificar_cartao(text, text) is
  'Identifica o operador na empresa da sessão por cartão/matrícula + 3 últimos dígitos do CPF, com bloqueio após 8 falhas em 15 minutos. Devolve apenas dados públicos do crachá.';

revoke all on function public.erp_operador_identificar_cartao(text, text) from public, anon;
grant execute on function public.erp_operador_identificar_cartao(text, text) to authenticated;

commit;
