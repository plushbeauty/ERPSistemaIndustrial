/**
 * @REVISAO: REV-LIMITE-DE-LISTAGEM-VISIVEL-20261104-02 — as três contagens passaram a head/count exato (o teto de linhas truncava o número mostrado); o faturamento usava as 500 NF-e MAIS ANTIGAS, agora lê a janela de 6 meses do relógio do servidor sem teto; o truncamento do OEE deixou de ser silencioso.
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-04
 * @REVISAO: REV-DIRETORIA-TABELAS-REAIS-20261104-03 — OEE lê erp_apontamentos_processo e erp_producao_paradas; RNC lê erp_rpnc; OPs abertas contadas por "não finalizada" em qualquer grafia; calibração de 30 dias pelo relógio do servidor
 * @STATUS_APROVACAO: AGUARDANDO APROVACAO VISUAL DO PROPRIETARIO (correção do cronograma de 2026-11-03; sem chave real no PC, a conferência visual autenticada não foi feita)
 */
import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, PackageX, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { relogioDoServidor } from "../lib/serverClock";
import { LISTA_STATUS_OP_FECHADAS } from "../lib/statusOrdemProducao";
import { fetchAllPages } from "../lib/supabasePagination";
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
  maquina_id: string | null;
  quantidade_boa: number | null;
  quantidade_refugada: number | null;
  inicio_em: string | null;
  fim_em: string | null;
};
type ParadaRow = { ordem_producao_id: string | null; maquina_id: string | null; inicio: string; fim: string | null };
type OrderRow = { id: string; velocidade_nominal_hora: number | null };
type NfeRow = { id: string; valor_total: number | null; status: string | null; data_emissao: string | null };

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Sobreposição em minutos entre o apontamento e a janela da parada de máquina.
function sobreposicaoMin(aInicio: number, aFim: number, bInicio: number, bFim: number): number {
  return Math.max(0, (Math.min(aFim, bFim) - Math.max(aInicio, bInicio)) / 60000);
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
    // Os 30 dias da metrologia e o fechamento de apontamentos abertos são medidos pelo relógio do Postgres.
    const relogio = await relogioDoServidor();
    const limiteCalibracao = relogio.agora ? new Date(relogio.agora.getTime() + 30 * 86400000).toISOString().slice(0, 10) : null;
    const inicioMeses = relogio.agora ? new Date(relogio.agora.getFullYear(), relogio.agora.getMonth() - 5, 1).toISOString().slice(0, 10) : null;
    const [opsResult, rncResult, calibrationResult, nfeResult, apontamentosResult, reservationsResult, paradasResult] = await Promise.all([
      supabase.from("erp_ordens_producao").select("id", { count: "exact", head: true }).not("status", "in", LISTA_STATUS_OP_FECHADAS),
      supabase.from("erp_rpnc").select("id", { count: "exact", head: true }).not("status", "in", "(encerrada,Encerrada,Cancelada,cancelada)"),
      limiteCalibracao
        ? supabase.from("erp_equipamentos_medicao").select("id", { count: "exact", head: true }).lte("proxima_calibracao", limiteCalibracao)
        : Promise.resolve({ data: null, count: null, error: { message: relogio.aviso || "Relógio do servidor indisponível." } as unknown as Error }),
      // Faturamento dos últimos 6 meses, pela janela do relógio do servidor e sem teto de
      // linhas: antes a consulta pegava as 500 NF-e MAIS ANTIGAS e o gráfico da diretoria
      // mostrava meses de cinco anos atrás como se fossem o faturamento corrente.
      // fetchAllPages lança em erro de consulta, então a falha é capturada aqui para não
      // derrubar o resto da carga da tela.
      inicioMeses
        ? fetchAllPages<NfeRow>((from, to) => supabase
          .from("erp_documentos_fiscais")
          .select("id,valor_total,status,data_emissao", { count: "exact" })
          .eq("empresa_id", empresaAtual ?? "")
          .eq("status", "Autorizada")
          .gte("data_emissao", inicioMeses)
          .order("data_emissao", { ascending: false })
          .range(from, to))
          .then((rows) => ({ rows, error: null as Error | null }))
          .catch((error: unknown) => ({ rows: [] as NfeRow[], error: error instanceof Error ? error : new Error(String(error)) }))
        : Promise.resolve({ rows: [] as NfeRow[], error: null as Error | null }),
      supabase.from("erp_apontamentos_processo").select("ordem_producao_id,maquina_id,quantidade_boa,quantidade_refugada,inicio_em,fim_em", { count: "exact" }).order("inicio_em", { ascending: false }).limit(500),
      supabase.from("erp_estoque_reservas").select("id,quantidade, status, pedido_item_id").eq("status", "ATIVA").order("created_at", { ascending: false }).limit(20),
      supabase.from("erp_producao_paradas").select("id,ordem_producao_id,maquina_id,inicio,fim", { count: "exact" }).order("inicio", { ascending: false }).limit(1000),
    ]);

    const queryErrors = [opsResult.error, rncResult.error, calibrationResult.error, nfeResult.error, apontamentosResult.error, reservationsResult.error, paradasResult.error].filter(Boolean);
    const limites: string[] = [];
    if (typeof apontamentosResult.count === "number" && (apontamentosResult.data ?? []).length < apontamentosResult.count)
      limites.push(`${(apontamentosResult.data ?? []).length} de ${apontamentosResult.count} apontamentos`);
    if (typeof paradasResult.count === "number" && (paradasResult.data ?? []).length < paradasResult.count)
      limites.push(`${(paradasResult.data ?? []).length} de ${paradasResult.count} paradas`);
    setNotice([
      queryErrors.length > 0 ? "Alguns indicadores não estão disponíveis para o perfil atual; nenhum valor fictício foi criado." : "",
      limites.length > 0 ? `OEE da diretoria calculado sobre lista truncada (${limites.join(", ")}): o índice reflete apenas o trecho carregado, não o período inteiro.` : ""
    ].filter(Boolean).join(" "));

    setOpsAbertas(opsResult.count ?? (opsResult.data ?? []).length);
    setRncCount(rncResult.count ?? (rncResult.data ?? []).length);
    setCalibracoesVencendo(calibrationResult.count ?? (calibrationResult.data ?? []).length);

    const monthly = new Map<string, number>();
    for (const row of nfeResult.rows) {
      const month = monthLabel(String(row.data_emissao ?? ""));
      if (month) monthly.set(month, (monthly.get(month) ?? 0) + numberValue(row.valor_total));
    }
    setRevenue([...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([name, value]) => ({ name, value })));

    const apontamentos = (apontamentosResult.data ?? []) as ApontamentoRow[];
    const paradas = (paradasResult.data ?? []) as ParadaRow[];
    const paradasPorOrdem = new Map<string, ParadaRow[]>();
    const paradasPorMaquina = new Map<string, ParadaRow[]>();
    for (const parada of paradas) {
      if (parada.ordem_producao_id) paradasPorOrdem.set(parada.ordem_producao_id, [...(paradasPorOrdem.get(parada.ordem_producao_id) ?? []), parada]);
      if (parada.maquina_id) paradasPorMaquina.set(parada.maquina_id, [...(paradasPorMaquina.get(parada.maquina_id) ?? []), parada]);
    }
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
    for (const row of apontamentos) {
      const boa = numberValue(row.quantidade_boa);
      const refugo = numberValue(row.quantidade_refugada);
      totalBoa += boa;
      totalRefugo += refugo;
      const inicio = row.inicio_em ? new Date(row.inicio_em).getTime() : Number.NaN;
      // Apontamento ainda aberto sem relógio do servidor não tem duração deduzida: é ignorado, não inventado.
      const fim = row.fim_em ? new Date(row.fim_em).getTime() : relogio.agora ? relogio.agora.getTime() : Number.NaN;
      const elapsed = (fim - inicio) / 60000;
      if (Number.isFinite(inicio) && Number.isFinite(fim) && elapsed > 0) {
        const lista = (row.ordem_producao_id && paradasPorOrdem.get(row.ordem_producao_id)) || (row.maquina_id && paradasPorMaquina.get(row.maquina_id)) || [];
        const parada = lista.reduce((s, x) => s + sobreposicaoMin(inicio, fim, new Date(x.inicio).getTime(), x.fim ? new Date(x.fim).getTime() : fim), 0);
        elapsedMinutes += elapsed;
        runMinutes += Math.max(0, elapsed - parada);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_rpnc" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_apontamentos_processo" }, () => void load())
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
