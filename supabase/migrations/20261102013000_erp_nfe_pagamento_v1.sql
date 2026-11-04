-- 20261102013000_erp_nfe_pagamento_v1.sql
-- A tela de emissão de NF-e (src/pages/NFeEmissao.tsx) grava e recupera as formas de pagamento do
-- documento pelas rotinas erp_nfe_pagamento_salvar e erp_nfe_pagamento_consultar, anunciadas em
-- src/lib/supabaseRpcStatus.ts, mas o arquivo de migration com este nome não existia no repo: nenhuma
-- migration criava a tabela nem as funções. Este arquivo fecha esse contrato.
-- Escopo: apenas grava/consulta as formas de pagamento informadas pelo operador. Nada aqui emite,
-- autoriza ou consulta a SEFAZ, e nada apaga documento fiscal.

begin;

create table if not exists public.erp_nfe_pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  documento_id uuid not null references public.erp_documentos_fiscais(id) on delete cascade,
  item_numero integer not null default 1,
  forma text not null,
  forma_descricao text,
  condicao text not null default 'a_vista' check (condicao in ('a_vista','a_prazo')),
  valor numeric(18,2) not null default 0 check (valor >= 0),
  troco numeric(18,2) not null default 0 check (troco >= 0),
  bandeira text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_erp_nfe_pagamentos_documento on public.erp_nfe_pagamentos(documento_id, item_numero);
create index if not exists ix_erp_nfe_pagamentos_empresa on public.erp_nfe_pagamentos(empresa_id, created_at desc);

alter table public.erp_nfe_pagamentos enable row level security;

drop policy if exists erp_nfe_pagamentos_tenant on public.erp_nfe_pagamentos;
create policy erp_nfe_pagamentos_tenant on public.erp_nfe_pagamentos
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.erp_nfe_pagamentos to authenticated;

create or replace function public.erp_nfe_pagamento_salvar(
  p_documento_id uuid,
  p_pagamentos jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_documento public.erp_documentos_fiscais%rowtype;
  v_item jsonb;
  v_total numeric(18,2) := 0;
  v_quantidade integer := 0;
begin
  if v_empresa_id is null then raise exception 'Sessão não autenticada com empresa vinculada'; end if;
  if p_documento_id is null then raise exception 'Documento fiscal não informado'; end if;
  if p_pagamentos is null or jsonb_typeof(p_pagamentos) <> 'array' then raise exception 'Lista de pagamentos inválida'; end if;

  select * into v_documento
  from public.erp_documentos_fiscais
  where id = p_documento_id and empresa_id = v_empresa_id
  limit 1;

  if not found then raise exception 'Documento fiscal não encontrado para esta empresa'; end if;

  delete from public.erp_nfe_pagamentos
  where documento_id = p_documento_id and empresa_id = v_empresa_id;

  for v_item in select * from jsonb_array_elements(p_pagamentos) loop
    continue when nullif(trim(coalesce(v_item->>'forma','')), '') is null;
    if jsonb_typeof(v_item->'valor') = 'number' then
      v_total := v_total + (v_item->>'valor')::numeric;
    end if;
    if (v_item->>'valor') is not null and (v_item->>'valor')::numeric < 0 then
      raise exception 'Valor de pagamento não pode ser negativo';
    end if;
    v_quantidade := v_quantidade + 1;
    if v_quantidade > 20 then raise exception 'Máximo de 20 formas de pagamento por documento'; end if;

    insert into public.erp_nfe_pagamentos(
      empresa_id, documento_id, item_numero, forma, forma_descricao, condicao, valor, troco, bandeira, observacao
    ) values (
      v_empresa_id,
      p_documento_id,
      coalesce(nullif(v_item->>'item_numero','')::integer, v_quantidade),
      upper(trim(v_item->>'forma')),
      nullif(trim(coalesce(v_item->>'forma_descricao','')), ''),
      case when v_item->>'condicao' = 'a_prazo' then 'a_prazo' else 'a_vista' end,
      coalesce(nullif(v_item->>'valor','')::numeric, 0),
      coalesce(nullif(v_item->>'troco','')::numeric, 0),
      nullif(trim(coalesce(v_item->>'bandeira','')), ''),
      nullif(trim(coalesce(v_item->>'observacao','')), '')
    );
  end loop;

  return jsonb_build_object(
    'documento_id', p_documento_id,
    'quantidade', v_quantidade,
    'valor_total', v_total,
    'gravado_em', now()
  );
end;
$$;

create or replace function public.erp_nfe_pagamento_consultar(
  p_documento_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
begin
  if v_empresa_id is null then raise exception 'Sessão não autenticada com empresa vinculada'; end if;
  if p_documento_id is null then raise exception 'Documento fiscal não informado'; end if;

  if not exists (
    select 1 from public.erp_documentos_fiscais
    where id = p_documento_id and empresa_id = v_empresa_id
  ) then raise exception 'Documento fiscal não encontrado para esta empresa'; end if;

  return jsonb_build_object(
    'pagamentos', coalesce(
      (select jsonb_agg(jsonb_build_object(
               'item_numero', p.item_numero,
               'forma', p.forma,
               'forma_descricao', coalesce(p.forma_descricao, ''),
               'condicao', p.condicao,
               'valor', p.valor,
               'troco', p.troco,
               'bandeira', coalesce(p.bandeira, ''),
               'observacao', coalesce(p.observacao, '')
             ) order by p.item_numero, p.created_at)
       from public.erp_nfe_pagamentos p
       where p.documento_id = p_documento_id and p.empresa_id = v_empresa_id),
      '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.erp_nfe_pagamento_salvar(uuid, jsonb) from public, anon;
revoke execute on function public.erp_nfe_pagamento_consultar(uuid) from public, anon;
grant execute on function public.erp_nfe_pagamento_salvar(uuid, jsonb) to authenticated;
grant execute on function public.erp_nfe_pagamento_consultar(uuid) to authenticated;

commit;
