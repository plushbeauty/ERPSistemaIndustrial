import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, PackageX, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useRealtimeAlerts } from "../hooks/useRealtimeAlerts";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

type ChartPoint = { name: string; value: number };
type PendingRow = {
  codigo: string;
  origem: string;
  impacto: string;
  valor: number;
  urgencia: "ALTA" | "MÉDIA" | "BAIXA";
};

type ApontamentoRow = {
  ordem_producao_id: string | null;
  quantidade_boa: number | null;
  quantidade_refugo: number | null;
  setup_min: number | null;
  paradas_min: number | null;
  inicio: string | null;
  fim: string | null;
};
type OrderRow = { id: string; velocidade_nominal_hora: number | null };

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthLabel(value: string): string {
  return value.slice(0, 7);
}

export default function DiretoriaDashboard() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const alertCounts = useRealtimeAlerts(empresaId);
  const [opsAbertas, setOpsAbertas] = useState(0);
  const [rncCount, setRncCount] = useState(0);
  const [calibracoesVencendo, setCalibracoesVencendo] = useState(0);
  const [revenue, setRevenue] = useState<ChartPoint[]>([]);
  const [oee, setOee] = useState<ChartPoint[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    const current = await supabase.rpc("erp_current_empresa_id");
    const empresaAtual = current.error || !current.data ? null : String(current.data);
    if (empresaAtual) setEmpresaId(empresaAtual);
    const [opsResult, rncResult, calibrationResult, nfeResult, apontamentosResult, reservationsResult] = await Promise.all([
      supabase.from("erp_ordens_producao").select("id,status").in("status", ["ABERTA", "PLANEJADA", "EM_PRODUCAO", "EM_ANDAMENTO"]),
      supabase.from("erp_rncs").select("id,status").not("status", "in", "(ENCERRADA,CANCELADA,FECHADA)"),
      supabase.from("erp_equipamentos_medicao").select("id").lte("proxima_calibracao", new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)),
      supabase.from("erp_documentos_fiscais").select("id,valor_total,status,data_emissao").eq("empresa_id", empresaAtual ?? "").eq("status", "Autorizada").order("data_emissao", { ascending: true }).limit(500),
      supabase.from("erp_producao_apontamentos").select("ordem_producao_id,quantidade_boa,quantidade_refugo,setup_min,paradas_min,inicio,fim").order("created_at", { ascending: false }).limit(500),
      supabase.from("erp_estoque_reservas").select("id,quantidade, status, pedido_item_id").eq("status", "ATIVA").order("created_at", { ascending: false }).limit(20),
    ]);

    const queryErrors = [opsResult.error, rncResult.error, calibrationResult.error, nfeResult.error, apontamentosResult.error, reservationsResult.error].filter(Boolean);
    setNotice(queryErrors.length > 0 ? "Alguns indicadores não estão disponíveis para o perfil atual; nenhum valor fictício foi criado." : "");

    setOpsAbertas((opsResult.data ?? []).length);
    setRncCount((rncResult.data ?? []).length);
    setCalibracoesVencendo((calibrationResult.data ?? []).length);

    const monthly = new Map<string, number>();
    for (const row of nfeResult.data ?? []) {
      const month = monthLabel(String(row.data_emissao ?? ""));
      if (month) monthly.set(month, (monthly.get(month) ?? 0) + numberValue(row.valor_total));
    }
    setRevenue([...monthly.entries()].slice(-6).map(([name, value]) => ({ name, value })));

    const apontamentos = (apontamentosResult.data ?? []) as ApontamentoRow[];
    const orderIds = [...new Set(apontamentos.map(row => row.ordem_producao_id).filter((id): id is string => Boolean(id)))];
    let orders: OrderRow[] = [];
    if (orderIds.length > 0) {
      const orderResult = await supabase.from("erp_ordens_producao").select("id,velocidade_nominal_hora").in("id", orderIds);
      orders = (orderResult.data ?? []) as OrderRow[];
    }
    const speedByOrder = new Map(orders.map(row => [row.id, numberValue(row.velocidade_nominal_hora)]));
    let totalBoa = 0;
    let totalRefugo = 0;
    let runMinutes = 0;
    let elapsedMinutes = 0;
    let idealMinutes = 0;
    let downtimeMinutes = 0;
    for (const row of apontamentos) {
      const boa = numberValue(row.quantidade_boa);
      const refugo = numberValue(row.quantidade_refugo);
      const setup = Math.max(0, numberValue(row.setup_min));
      const parada = Math.max(0, numberValue(row.paradas_min));
      totalBoa += boa;
      totalRefugo += refugo;
      downtimeMinutes += parada;
      if (row.inicio && row.fim) {
        const elapsed = (new Date(row.fim).getTime() - new Date(row.inicio).getTime()) / 60000;
        if (Number.isFinite(elapsed) && elapsed > 0) {
          elapsedMinutes += elapsed;
          runMinutes += Math.max(0, elapsed - setup - parada);
        }
      }
      const speed = speedByOrder.get(row.ordem_producao_id ?? "") ?? 0;
      if (speed > 0) idealMinutes += ((boa + refugo) / speed) * 60;
    }
    const total = totalBoa + totalRefugo;
    const quality = total > 0 ? (totalBoa / total) * 100 : 0;
    const availability = elapsedMinutes > 0 ? Math.max(0, Math.min(100, (runMinutes / elapsedMinutes) * 100)) : 0;
    const performance = runMinutes > 0 && idealMinutes > 0 ? Math.max(0, Math.min(100, (idealMinutes / runMinutes) * 100)) : 0;
    const oeeValue = (availability * performance * quality) / 10000;
    setOee([
      { name: "Disponibilidade", value: Number(availability.toFixed(1)) },
      { name: "Performance", value: Number(performance.toFixed(1)) },
      { name: "Qualidade", value: Number(quality.toFixed(1)) },
      { name: "OEE", value: Number(oeeValue.toFixed(1)) },
    ]);

    setPending((reservationsResult.data ?? []).map((row) => ({
      codigo: String(row.pedido_item_id ?? row.id).slice(0, 8).toUpperCase(),
      origem: "MRP / Estoque",
      impacto: `Reserva ${numberValue(row.quantidade)}u`,
      valor: 0,
      urgencia: "MÉDIA",
    })));

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
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_alertas_sistema" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_ordens_producao" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_rncs" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_producao_apontamentos" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "fiscal_nfes" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_equipamentos_medicao" }, () => void load())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { title: "ORDENS DE PRODUÇÃO", value: Math.max(opsAbertas, alertCounts.opsAbertas), subtitle: "OPs abertas na fila do PCP", icon: <ClipboardList size={28} />, tone: "bg-amber-50 border-amber-200 text-amber-950" },
    { title: "NÃO CONFORMIDADES", value: Math.max(rncCount, alertCounts.rncsAtivas), subtitle: "RNCs ativas", icon: <ShieldAlert size={28} />, tone: "bg-rose-100 border-rose-200 text-rose-950" },
    { title: "VENCIMENTOS / BLOQUEIOS", value: Math.max(calibracoesVencendo, alertCounts.materiaisVencendo), subtitle: "Instrumentos com calibração vencida ou próxima", icon: <PackageX size={28} />, tone: "bg-red-50 border-red-200 text-red-950" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6">
        <div className="mx-auto flex max-w-[1700px] items-center gap-4">
          <div className="rounded-md border border-slate-300 p-2 text-slate-900" aria-hidden="true">☰</div>
          <div>
            <p className="text-sm font-black text-slate-600">ERP INDUSTRIAL GLOBAL</p>
            <h1 className="text-xl font-bold text-slate-950">PAINEL DE CONTROLE CENTRAL • GESTÃO À VISTA</h1>
          </div>
          <div className="ml-auto font-bold text-slate-700">ADM / DIRETOR</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1700px] lg:grid-cols-[230px_1fr]">
        <aside className="hidden min-h-[calc(100vh-78px)] border-r border-slate-200 bg-white p-4 lg:block">
          {["🗂️ Cockpit Geral", "🛍️ Módulo de Vendas", "⚙️ PCP / Engenharia", "📐 Gestão da Qualidade", "📦 Estoque / Compras", "⚙️ Configurações Sistema"].map((item, index) => (
            <div key={item} className={`mb-2 rounded-md px-3 py-3 font-bold ${index === 0 ? "bg-sky-50 text-sky-900" : "text-slate-700"}`}>{item}</div>
          ))}
        </aside>

        <section className="min-w-0 space-y-5 p-4 lg:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">MONITORAMENTO DA OPERAÇÃO EM TEMPO REAL</h2>
              <p className="text-sm font-semibold text-slate-600">Dados reais de PCP, qualidade, metrologia e documentos fiscais autorizados.</p>
            </div>
            <button type="button" onClick={() => void load()} className="ml-auto h-11 rounded-md bg-sky-700 px-4 font-black text-white"><RefreshCw size={17} className="mr-2 inline" />ATUALIZAR</button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <article key={card.title} className={`rounded-md border p-5 shadow-sm ${card.tone}`}>
                <div className="flex items-center gap-3">{card.icon}<h3 className="text-base font-black">{card.title}</h3></div>
                <div className="mt-3 text-3xl font-black">{loading ? "…" : card.value}</div>
                <p className="mt-1 font-semibold">{card.subtitle}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-950">FATURAMENTO REAL • NF-e AUTORIZADAS</h2>
              <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={revenue}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#2563eb" /></BarChart></ResponsiveContainer></div>
            </section>
            <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-950">OEE • APONTAMENTOS REAIS + VELOCIDADE NOMINAL</h2>
              <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={oee}><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="value" fill="#0f766e" /></BarChart></ResponsiveContainer></div>
            </section>
          </div>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="p-5"><h2 className="text-xl font-bold text-slate-950">REQUISIÇÕES RECENTES QUE REQUEREM ATENÇÃO</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-100"><tr><th className="h-[54px] px-4 text-left">Cód Doc</th><th className="px-4 text-left">Origem / Setor</th><th className="px-4 text-left">Impacto</th><th className="px-4 text-right">Valor (R$)</th><th className="px-4 text-left">Urgência</th></tr></thead>
                <tbody>
                  {pending.map((row) => <tr key={row.codigo} className="border-t border-slate-100"><td className="h-[54px] px-4 font-bold text-sky-900">{row.codigo}</td><td className="px-4 font-semibold">{row.origem}</td><td className="px-4">{row.impacto}</td><td className="px-4 text-right font-semibold">{row.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td><td className="px-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${row.urgencia === "ALTA" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900"}`}>{row.urgencia}</span></td></tr>)}
                  {pending.length === 0 && <tr><td colSpan={5} className="p-8 text-center font-semibold text-slate-500">Nenhuma requisição pendente encontrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {notice && <div className="rounded-md border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900"><AlertTriangle className="mr-2 inline" size={18} />{notice}</div>}
        </section>
      </div>
    </main>
  );
}
