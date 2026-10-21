import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, Search, CalendarClock, Factory, Package, ClipboardList, Wrench,
  BarChart3, Users, Settings, Power, Wifi, Volume2, BatteryFull, ChevronUp, User,
} from "lucide-react";

type App = { id: string; nome: string; icone: LucideIcon; cor: string };

const APPS: App[] = [
  { id: "pcp", nome: "Programação", icone: CalendarClock, cor: "#0078d4" },
  { id: "maq", nome: "Máquinas", icone: Factory, cor: "#16a34a" },
  { id: "est", nome: "Estoque", icone: Package, cor: "#d97706" },
  { id: "op", nome: "Ordens", icone: ClipboardList, cor: "#7c3aed" },
  { id: "man", nome: "Manutenção", icone: Wrench, cor: "#dc2626" },
  { id: "ind", nome: "Indicadores", icone: BarChart3, cor: "#0891b2" },
  { id: "usu", nome: "Usuários", icone: Users, cor: "#db2777" },
  { id: "cfg", nome: "Configurações", icone: Settings, cor: "#475569" },
];

export function BarraWindows11({ ativo = "pcp", onAbrir, onDesligar }: { ativo?: string; onAbrir?: (id: string) => void; onDesligar?: () => void | Promise<void> }) {
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
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc); };
  }, []);

  const filtrados = APPS.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase()));
  const abrir = (id: string) => { onAbrir?.(id); setMenu(false); };

  return (
    <div ref={ref}>
      <style>{css}</style>
      {menu && (
        <div className="w11-start" role="dialog" aria-label="Menu Iniciar">
          <div className="w11-search">
            <Search size={16} />
            <input autoFocus placeholder="Pesquisar aplicativos" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="w11-title">Fixados</div>
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
            <div className="w11-user"><span className="w11-avatar"><User size={16} /></span>Operador PCP</div>
            <button className="w11-ico" aria-label="Desligar" onClick={() => { void onDesligar?.(); setMenu(false); }}><Power size={16} /></button>
          </div>
        </div>
      )}

      <nav className="w11-bar">
        <div className="w11-center">
          <button className={`w11-btn ${menu ? "on" : ""}`} aria-label="Iniciar" onClick={() => setMenu((m) => !m)}>
            <LayoutGrid size={20} color="#0078d4" />
          </button>
          <button className="w11-btn" aria-label="Pesquisar" onClick={() => setMenu(true)}><Search size={18} /></button>
          {APPS.slice(0, 6).map((a) => (
            <button key={a.id} className={`w11-btn ${ativo === a.id ? "ativo" : ""}`} title={a.nome} onClick={() => abrir(a.id)}>
              <a.icone size={20} color={a.cor} />
            </button>
          ))}
        </div>
        <div className="w11-tray">
          <button className="w11-btn small" aria-label="Mais"><ChevronUp size={14} /></button>
          <div className="w11-sys"><Wifi size={15} /><Volume2 size={15} /><BatteryFull size={15} /></div>
          <div className="w11-clock">
            <span>{agora?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</span>
            <span>{agora?.toLocaleDateString("pt-BR") ?? ""}</span>
          </div>
        </div>
      </nav>
    </div>
  );
}

const css = `
.w11-bar{position:fixed;left:0;right:0;bottom:0;height:48px;z-index:50;display:flex;align-items:center;justify-content:center;
  background:rgba(243,243,243,.85);backdrop-filter:blur(24px) saturate(1.6);border-top:1px solid rgba(0,0,0,.08);font-family:"Segoe UI",system-ui,sans-serif;color:#1f1f1f}
.w11-center{display:flex;gap:4px}
.w11-btn{position:relative;width:40px;height:40px;border:0;border-radius:6px;background:transparent;display:grid;place-items:center;cursor:pointer;color:#1f1f1f;transition:background .15s}
.w11-btn:hover,.w11-btn.on{background:rgba(255,255,255,.7);box-shadow:0 0 0 1px rgba(0,0,0,.05)}
.w11-btn:active{transform:scale(.94)}
.w11-btn.ativo::after{content:"";position:absolute;bottom:2px;width:16px;height:3px;border-radius:2px;background:#0078d4}
.w11-btn.small{width:28px}
.w11-tray{position:absolute;right:8px;display:flex;align-items:center;gap:4px;font-size:12px}
.w11-sys{display:flex;gap:8px;padding:8px 10px;border-radius:6px}.w11-sys:hover,.w11-clock:hover{background:rgba(255,255,255,.7)}
.w11-clock{display:flex;flex-direction:column;align-items:flex-end;padding:4px 8px;border-radius:6px;line-height:1.3}
.w11-start{position:fixed;bottom:58px;left:50%;transform:translateX(-50%);width:min(600px,94vw);z-index:51;border-radius:10px;
  background:rgba(242,242,242,.92);backdrop-filter:blur(30px) saturate(1.6);border:1px solid rgba(0,0,0,.1);box-shadow:0 16px 48px rgba(0,0,0,.25);
  font-family:"Segoe UI",system-ui,sans-serif;color:#1f1f1f;animation:w11up .2s ease-out;overflow:hidden}
@keyframes w11up{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}
.w11-search{margin:24px 28px 8px;display:flex;align-items:center;gap:8px;background:#fff;border-radius:20px;padding:8px 14px;border-bottom:2px solid #0078d4}
.w11-search input{border:0;outline:0;flex:1;font-size:14px;background:transparent}
.w11-title{margin:16px 36px 8px;font-weight:600;font-size:14px}
.w11-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:0 24px 24px;min-height:200px;align-content:start}
.w11-app{border:0;background:transparent;border-radius:6px;padding:10px 4px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:inherit}
.w11-app:hover{background:rgba(255,255,255,.8)}
.w11-appicon{width:36px;height:36px;border-radius:8px;display:grid;place-items:center}
.w11-vazio{grid-column:1/-1;text-align:center;color:#666;padding:30px;font-size:13px}
.w11-foot{display:flex;justify-content:space-between;align-items:center;padding:12px 40px;background:rgba(0,0,0,.04);border-top:1px solid rgba(0,0,0,.06)}
.w11-user{display:flex;align-items:center;gap:10px;font-size:13px}
.w11-avatar{width:30px;height:30px;border-radius:50%;background:#ddd;display:grid;place-items:center}
.w11-ico{border:0;background:transparent;border-radius:6px;width:34px;height:34px;display:grid;place-items:center;cursor:pointer}.w11-ico:hover{background:rgba(255,255,255,.8)}
@media(max-width:640px){.w11-grid{grid-template-columns:repeat(4,1fr)}.w11-tray .w11-sys{display:none}}
`;