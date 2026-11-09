-- 20261102031000_erp_fiscal_liberacao_item_pedido_v1.sql
-- A tela Fiscal (src/pages/Fiscal.tsx) libera itens de pedido de venda pela rotina
-- erp_liberar_item_fiscal e lê o razão de liberações em erp_fiscal_liberacoes_pedido_item. As duas
-- migrations 20260921180000 e 20260925170000 já fazem revoke/grant execute dessa função, o que prova que
-- ela existe no banco em produção, mas o CREATE nunca entrou no repo: em um banco novo a tela ficava sem
-- a rotina e sem a tabela. Este arquivo recria o contrato para ambientes novos.
-- Guarda intencional: se a função já existe, ela NÃO é substituída (não sobrescrever comportamento do
-- cliente que já funciona). A tabela é criada apenas se não existir. Nada aqui apaga pedido ou documento.

begin;

create table if not exists public.erp_fiscal_liberacoes_pedido_item (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  pedido_id uuid not null,
  pedido_item_id uuid not null,
  quantidade numeric(18,4) not null check (quantidade > 0),
  tipo text not null default 'parcial' check (tipo in ('total','parcial')),
  observacao text,
  liberado_por uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists ix_erp_fiscal_liberacoes_item on public.erp_fiscal_liberacoes_pedido_item(empresa_id, pedido_item_id);
create index if not exists ix_erp_fiscal_liberacoes_pedido on public.erp_fiscal_liberacoes_pedido_item(empresa_id, pedido_id);

alter table public.erp_fiscal_liberacoes_pedido_item enable row level security;

drop policy if exists erp_fiscal_liberacoes_pedido_item_tenant on public.erp_fiscal_liberacoes_pedido_item;
create policy erp_fiscal_liberacoes_pedido_item_tenant on public.erp_fiscal_liberacoes_pedido_item
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

grant select, insert on public.erp_fiscal_liberacoes_pedido_item to authenticated;

do $mig$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'erp_liberar_item_fiscal'
  ) then
    raise notice 'erp_liberar_item_fiscal ja existe neste banco; corpo preservado.';
  else
    execute $fn$
      create or replace function public.erp_liberar_item_fiscal(
        p_pedido_item_id uuid,
        p_quantidade numeric,
        p_tipo text,
        p_observacao text
      )
      returns jsonb
      language plpgsql
      security invoker
      set search_path = public
      as $body$
      declare
        v_empresa_id uuid := public.erp_current_empresa_id();
        v_uid uuid := (select auth.uid());
        v_item public.erp_pedidos_venda_itens%rowtype;
        v_liberado numeric(18,4) := 0;
        v_saldo numeric(18,4);
        v_tipo text := case when trim(coalesce(p_tipo,'')) = 'total' then 'total' else 'parcial' end;
      begin
        if v_empresa_id is null then raise exception 'Sessão não autenticada com empresa vinculada'; end if;
        if p_pedido_item_id is null then raise exception 'Item do pedido não informado'; end if;
        if p_quantidade is null or p_quantidade <= 0 then raise exception 'Quantidade liberada deve ser maior que zero'; end if;

        select * into v_item
        from public.erp_pedidos_venda_itens
        where id = p_pedido_item_id and empresa_id = v_empresa_id
        limit 1;

        if not found then raise exception 'Item não encontrado para esta empresa'; end if;

        select coalesce(sum(l.quantidade), 0)::numeric(18,4) into v_liberado
        from public.erp_fiscal_liberacoes_pedido_item l
        where l.pedido_item_id = p_pedido_item_id and l.empresa_id = v_empresa_id;

        v_saldo := coalesce(v_item.quantidade, 0) - v_liberado;

        if v_saldo <= 0 then raise exception 'Este item já está totalmente liberado'; end if;
        if p_quantidade > v_saldo then
          raise exception 'Quantidade maior que o saldo pendente (%)', v_saldo;
        end if;

        insert into public.erp_fiscal_liberacoes_pedido_item(
          empresa_id, pedido_id, pedido_item_id, quantidade, tipo, observacao, liberado_por
        ) values (
          v_empresa_id, v_item.pedido_id, p_pedido_item_id, p_quantidade, v_tipo,
          nullif(trim(coalesce(p_observacao,'')), ''), v_uid
        );

        return jsonb_build_object(
          'pedido_item_id', p_pedido_item_id,
          'liberado_agora', p_quantidade,
          'liberado_total', v_liberado + p_quantidade,
          'saldo_restante', v_saldo - p_quantidade,
          'tipo', case when (v_saldo - p_quantidade) <= 0 then 'total' else v_tipo end,
          'liberado_em', now()
        );
      end;
      $body$;
    $fn$;
  end if;
end
$mig$;

revoke execute on function public.erp_liberar_item_fiscal(uuid, numeric, text, text) from public, anon;
grant execute on function public.erp_liberar_item_fiscal(uuid, numeric, text, text) to authenticated;

commit;
