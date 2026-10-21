import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid, Search, CalendarClock, Factory, Package, ClipboardList, Wrench,
  BarChart3, Users, Settings, Power, Wifi, Volume2, BatteryFull, ChevronUp, User,
  ShoppingCart, Truck, ShieldCheck, FileText, Wallet, Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type App = { id: string; nome: string; icone: LucideIcon; cor: string };

const APPS: App[] = [
  { id: "pcp", nome: "Programação", icone: CalendarClock, cor: "#0078d4" },
  { id: "maq", nome: "Máquinas", icone: Factory, cor: "#16a34a" },
  { id: "est", nome: "Estoque", icone: Package, cor: "#d97706" },
  { id: "op", nome: "Ordens de produção", icone: ClipboardList, cor: "#7c3aed" },
  { id: "man", nome: "Manutenção", icone: Wrench, cor: "#dc2626" },
  { id: "ind", nome: "Indicadores PCP", icone: BarChart3, cor: "#0891b2" },
  { id: "vend", nome: "Vendas", icone: ShoppingCart, cor: "#0f766e" },
  { id: "comp", nome: "Compras", icone: Truck, cor: "#b45309" },
  { id: "qual", nome: "Qualidade / SGQ", icone: ShieldCheck, cor: "#0284c7" },
  { id: "fis", nome: "Fiscal / NF-e", icone: FileText, cor: "#475569" },
  { id: "fin", nome: "Financeiro", icone: Wallet, cor: "#15803d" },
  { id: "eng", nome: "Engenharia", icone: Database, cor: "#6d28d9" },
  { id: "usu", nome: "Usuários", icone: Users, cor: "#db2777" },
  { id: "cfg", nome: "Configurações", icone: Settings, cor: "#475569" },
];

export function BarraWindows11({
  ativo = "pcp",
  onAbrir,
  onDesligar,
  operador = "Operador ERP",
}: {
  ativo?: string;
  onAbrir?: (id: string) => void;
  onDesligar?: () => void;
  operador?: string;
}) {
  const [menu, setMenu] = useState(false);
  const [busca, setBusca] = useState("");
  const [agora, setAgora] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const filtrados = APPS.filter((a) => a.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  const abrir = (id: string) => { onAbrir?.(id); setMenu(false); };

  return (
    <div ref={ref}>
      <style>{css}</style>
      {menu && (
        <div className="w11-start" role="dialog" aria-label="Menu Iniciar do ERP">
          <div className="w11-search">
            <Search size={16} />
            <input autoFocus placeholder="Pesquisar aplicativos e módulos" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="w11-title">Fixados e módulos</div>
          <div className="w11-grid">
            {filtrados.map((a) => (
              <button key={a.id} className="w11-app" onClick={() => abrir(a.id)}>
                <span className="w11-appicon" style={{ background: a.cor }}><a.icone size={20} color="#fff" /></span>
                <span>{a.nome}</span>
              </button>
            ))}
            {filtrados.length === 0 && <div className="w11-vazio">Nada encontrado</div>}
          </div>
          <div className="w11-foot">
            <div className="w11-user"><span className="w11-avatar"><User size={16} /></span>{operador}</div>
            <button className="w11-ico" aria-label="Sair da sessão" title="Sair da sessão" onClick={onDesligar}><Power size={16} /></button>
          </div>
        </div>
      )}

      <nav className="w11-bar" aria-label="Barra de tarefas ERP">
        <div className="w11-center">
          <button className={`w11-btn ${menu ? "on" : ""}`} aria-label="Iniciar" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <LayoutGrid size={20} color="#0078d4" />
          </button>
          <button className="w11-btn" aria-label="Pesquisar aplicativos" onClick={() => setMenu(true)}><Search size={18} /></button>
          {APPS.slice(0, 6).map((a) => (
            <button key={a.id} className={`w11-btn ${ativo === a.id ? "ativo" : ""}`} title={a.nome} aria-label={a.nome} onClick={() => abrir(a.id)}>
              <a.icone size={20} color={a.cor} />
            </button>
          ))}
        </div>
        <div className="w11-tray">
          <button className="w11-btn small" aria-label="Mais aplicativos" title="Abrir menu de aplicativos" onClick={() => setMenu(true)}><ChevronUp size={14} /></button>
          <div className="w11-sys" aria-label="Indicadores visuais do sistema"><Wifi size={15} /><Volume2 size={15} /><BatteryFull size={15} /></div>
          <div className="w11-clock" aria-label="Data e hora">
            <span>{agora?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</span>
            <span>{agora?.toLocaleDateString("pt-BR") ?? ""}</span>
          </div>
        </div>
      </nav>
    </div>
  );
}

const css = `
.w11-bar{position:fixed;left:0;right:0;bottom:0;height:48px;z-index:1700;display:flex;align-items:center;justify-content:center;background:rgba(243,243,243,.92);backdrop-filter:blur(24px) saturate(1.6);border-top:1px solid rgba(0,0,0,.08);font-family:"Segoe UI",system-ui,sans-serif;color:#1f1f1f}
.w11-center{display:flex;gap:4px}
.w11-btn{position:relative;width:40px;height:40px;border:0;border-radius:6px;background:transparent;display:grid;place-items:center;cursor:pointer;color:#1f1f1f;transition:background .15s}
.w11-btn:hover,.w11-btn.on{background:rgba(255,255,255,.7);box-shadow:0 0 0 1px rgba(0,0,0,.05)}
.w11-btn:active{transform:scale(.94)}
.w11-btn.ativo::after{content:"";position:absolute;bottom:2px;width:16px;height:3px;border-radius:2px;background:#0078d4}
.w11-btn.small{width:28px}
.w11-tray{position:absolute;right:8px;display:flex;align-items:center;gap:4px;font-size:12px}
.w11-sys{display:flex;gap:8px;padding:8px 10px;border-radius:6px}.w11-sys:hover,.w11-clock:hover{background:rgba(255,255,255,.7)}
.w11-clock{display:flex;flex-direction:column;align-items:flex-end;padding:4px 8px;border-radius:6px;line-height:1.3;font-variant-numeric:tabular-nums}
.w11-start{position:fixed;bottom:56px;left:50%;transform:translateX(-50%);width:min(600px,94vw);max-height:calc(100vh - 76px);overflow:auto;z-index:1701;border-radius:10px;background:rgba(242,242,242,.96);backdrop-filter:blur(30px) saturate(1.6);border:1px solid rgba(0,0,0,.1);box-shadow:0 16px 48px rgba(0,0,0,.25);font-family:"Segoe UI",system-ui,sans-serif;color:#1f1f1f;animation:w11up .2s ease-out}
@keyframes w11up{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}
.w11-search{margin:18px 28px 8px;display:flex;align-items:center;gap:8px;background:#fff;border-radius:20px;padding:8px 14px;border-bottom:2px solid #0078d4}
.w11-search input{border:0;outline:0;flex:1;min-width:0;font-size:14px;background:transparent}
.w11-title{margin:16px 36px 8px;font-weight:600;font-size:14px}
.w11-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;padding:0 24px 24px;min-height:200px;align-content:start}
.w11-app{min-width:0;border:0;background:transparent;border-radius:6px;padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:inherit}
.w11-app span:last-child{text-align:center;overflow-wrap:anywhere}
.w11-app:hover{background:rgba(255,255,255,.8)}
.w11-appicon{width:36px;height:36px;border-radius:8px;display:grid;place-items:center}
.w11-vazio{grid-column:1/-1;text-align:center;color:#666;padding:30px;font-size:13px}
.w11-foot{display:flex;justify-content:space-between;align-items:center;padding:12px 40px;background:rgba(0,0,0,.04);border-top:1px solid rgba(0,0,0,.06)}
.w11-user{display:flex;align-items:center;gap:10px;min-width:0;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.w11-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:#ddd;display:grid;place-items:center}
.w11-ico{border:0;background:transparent;border-radius:6px;width:34px;height:34px;display:grid;place-items:center;cursor:pointer}.w11-ico:hover{background:rgba(255,255,255,.8)}
@media(max-width:640px){.w11-grid{grid-template-columns:repeat(4,minmax(0,1fr));padding:0 12px 16px}.w11-tray .w11-sys{display:none}.w11-center{gap:0}.w11-btn{width:34px}.w11-tray{right:3px}.w11-clock{font-size:10px}.w11-start{bottom:54px}}
@media(prefers-reduced-motion:reduce){.w11-start{animation:none}}
`;
