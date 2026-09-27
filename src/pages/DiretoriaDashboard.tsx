import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, PackageX, RefreshCw, ShieldAlert, ShoppingCart } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useRealtimeAlerts } from "../hooks/useRealtimeAlerts";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

type Kpi = { value: number; label: string };
type ChartPoint = { name: string; value: number };

type PendingRow = {
  codigo: string;
  origem: string;
  impacto: string;
  valor: number;
  urgencia: "ALTA" | "MÉDIA" | "BAIXA";
};

async function countRows(table: string): Promise<number | null> {
  const query = supabase.from(table).select("id", { count: "exact", head: true });
  const { count, error } = await query;
  return error ? null : count ?? 0;
}

export default function DiretoriaDashboard() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const alertCounts = useRealtimeAlerts(empresaId);
  const [kpis, setKpis] = useState<Record<string, Kpi>>({});
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [revenue, setRevenue] = useState<ChartPoint[]>([]);
  const [production, setProduction] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    const [ops, rncs, stock, reservations, sales] = await Promise.all([
      countRows("erp_ordens_producao"),
      countRows("erp_rncs"),
      countRows("erp_produto_estoque"),
      countRows("erp_estoque_reservas"),
      supabase.from("erp_pedidos_venda").select("id,numero_pedido,valor_total,status,data_pedido").order("data_pedido", { ascending: false }).limit(100),
    ]);

    setKpis({
      ops: { value: alertCounts.opsAbertas || ops || 0, label: "Ordens de produção abertas" },
      rncs: { value: alertCounts.rncsAtivas || rncs || 0, label: "RNCs ativas" },
      stock: { value: stock ?? 0, label: "Registros de estoque" },
    });

    const salesRows = (sales.data ?? []) as Array<Record<string, unknown>>;
    const monthly = new Map<string, number>();
    for (const row of salesRows) {
      const date = String(row.data_pedido ?? "");
      const month = date.slice(0, 7);
      if (month) monthly.set(month, (monthly.get(month) ?? 0) + Number(row.valor_total ?? 0));
    }
    setRevenue([...monthly.entries()].sort().slice(-6).map(([name, value]) => ({ name, value })));

    const openStatuses = new Set(["aberta", "aberto", "planejada", "planejado", "em_producao", "em produção"]);
    const prodRows = salesRows.slice(0, 12).map((row) => ({
      name: String(row.numero_pedido ?? row.id).slice(-8),
      value: openStatuses.has(String(row.status ?? "").toLowerCase()) ? 1 : 0,
    }));
    setProduction(prodRows);

    const pendingRows: PendingRow[] = [];
    if (reservations !== null) {
      const { data: reservationRows } = await supabase.from("erp_estoque_reservas").select("id,produto_id,quantidade_reservada").limit(20);
      for (const row of (reservationRows ?? []) as Array<Record<string, unknown>>) {
        pendingRows.push({
          codigo: String(row.id).slice(0, 8).toUpperCase(),
          origem: "MRP / Estoque",
          impacto: `Reserva ${Number(row.quantidade_reservada ?? 0)}u`,
          valor: 0,
          urgencia: "MÉDIA",
        });
      }
    }
    setPending(pendingRows.slice(0, 10));
    setNotice([ops, rncs, stock, reservations].some(v => v === null) ? "Alguns indicadores não puderam ser consultados pelas permissões ou pelo esquema atual." : "");
    setLoading(false);
  };

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("erp_usuarios").select("empresa_id").eq("auth_user_id", data.user.id).eq("ativo", true).is("deleted_at", null).maybeSingle();
      setEmpresaId(profile?.empresa_id ?? null);
    });
    void load();
    const channel = supabase
      .channel("diretoria-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_ordens_producao" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_rncs" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_estoque_reservas" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_pedidos_venda" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const alertCards = [
    { key: "ops", title: "ORDENS DE PRODUÇÃO", icon: <ClipboardList size={28} />, tone: "bg-amber-50 border-amber-200 text-amber-950" },
    { key: "rncs", title: "NÃO CONFORMIDADES", icon: <ShieldAlert size={28} />, tone: "bg-rose-100 border-rose-200 text-rose-950" },
    { key: "stock", title: "ALMOXARIFADO", icon: <PackageX size={28} />, tone: "bg-red-50 border-red-200 text-red-950" },
  ];

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6">
      <div className="mx-auto flex max-w-[1700px] items-center gap-4">
        <button className="rounded-md border border-slate-300 p-2 text-slate-900" aria-label="Abrir menu">☰</button>
        <div><p className="text-sm font-black text-slate-600">ERP INDUSTRIAL GLOBAL</p><h1 className="text-xl font-bold text-slate-950">PAINEL DE CONTROLE CENTRAL • GESTÃO À VISTA</h1></div>
        <div className="ml-auto font-bold text-slate-700">👤 ADM / DIRETOR</div>
      </div>
    </header>
    <div className="mx-auto grid max-w-[1700px] lg:grid-cols-[230px_1fr]">
      <aside className="hidden min-h-[calc(100vh-78px)] border-r border-slate-200 bg-white p-4 lg:block">
        {["🗂️ Cockpit Geral","🛍️ Módulo de Vendas","⚙️ PCP / Engenharia","📐 Gestão da Qualidade","📦 Estoque / Compras","⚙️ Configurações Sistema"].map((item, index) =>
          <div key={item} className={`mb-2 rounded-md px-3 py-3 font-bold ${index === 0 ? "bg-sky-50 text-sky-900" : "text-slate-700"}`}>{item}</div>
        )}
      </aside>
      <section className="min-w-0 space-y-5 p-4 lg:p-6">
        <div className="flex flex-wrap items-center gap-3"><div><h2 className="text-xl font-bold text-slate-950">MONITORAMENTO DA OPERAÇÃO EM TEMPO REAL</h2><p className="text-sm font-semibold text-slate-600">Indicadores derivados exclusivamente das tabelas disponíveis.</p></div><button onClick={() => void load()} className="ml-auto h-11 rounded-md bg-sky-700 px-4 font-black text-white"><RefreshCw size={17} className="mr-2 inline"/>ATUALIZAR</button></div>
        <div className="grid gap-4 md:grid-cols-3">{alertCards.map(card => <article key={card.key} className={`rounded-md border p-5 shadow-sm ${card.tone}`}><div className="flex items-center gap-3">{card.icon}<h3 className="text-base font-black">{card.title}</h3></div><div className="mt-3 text-3xl font-black">{loading ? "…" : kpis[card.key]?.value ?? 0}</div><p className="mt-1 font-semibold">{kpis[card.key]?.label}</p></article>)}</div>
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-bold text-slate-950">FATURAMENTO REAL DOS PEDIDOS</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenue}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#2563eb"/></BarChart></ResponsiveContainer></div></section>
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-bold text-slate-950">FILA OPERACIONAL</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={production}><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#f59e0b"/></BarChart></ResponsiveContainer></div></section>
        </div>
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="p-5"><h2 className="text-xl font-bold text-slate-950">REQUISIÇÕES RECENTES QUE REQUEREM ATENÇÃO</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead className="bg-slate-100"><tr><th className="h-[54px] px-4 text-left">Cód Doc</th><th className="px-4 text-left">Origem / Setor</th><th className="px-4 text-left">Impacto</th><th className="px-4 text-right">Valor (R$)</th><th className="px-4 text-left">Urgência</th></tr></thead><tbody>{pending.map(row => <tr key={row.codigo} className="border-t border-slate-100"><td className="h-[54px] px-4 font-bold text-sky-900">{row.codigo}</td><td className="px-4 font-semibold">{row.origem}</td><td className="px-4">{row.impacto}</td><td className="px-4 text-right font-semibold">{row.valor.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td><td className="px-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${row.urgencia === "ALTA" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"}`}>{row.urgencia}</span></td></tr>)}{pending.length===0&&<tr><td colSpan={5} className="p-8 text-center font-semibold text-slate-500">Nenhuma requisição pendente encontrada.</td></tr>}</tbody></table></div></section>
        {notice && <div className="rounded-md border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900"><AlertTriangle className="mr-2 inline" size={18}/>{notice}</div>}
      </section>
    </div>
  </main>;
}
