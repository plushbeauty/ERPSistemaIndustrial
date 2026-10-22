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
];

export function BarraWindows11({ ativo = "pcp", onAbrir, onDesligar }: { ativo?: string; onAbrir?: (id: string) => void; onDesligar?: () => void | Promise<void> }) {
  const [menu, setMenu] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [agora, setAgora] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setMenu(false); setTrayOpen(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); setTrayOpen(false); } };
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
          <button className={`w11-btn small ${trayOpen ? "on" : ""}`} aria-label="Mais opções da bandeja" aria-expanded={trayOpen} onClick={() => setTrayOpen((open) => !open)}><ChevronUp size={14} /></button>
          {trayOpen && <div className="w11-hidden-tray" role="dialog" aria-label="Ícones da bandeja do sistema"><div><Wifi size={16} /><span>Rede</span></div><div><Volume2 size={16} /><span>Áudio</span></div><div><BatteryFull size={16} /><span>Bateria</span></div></div>}
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
.w11-bar{position:fixed;left:0;right:0;bottom:0;height:50px;z-index:50;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,#194b63 0%,#123b50 100%);backdrop-filter:blur(24px) saturate(1.25);border-top:1px solid rgba(117,205,225,.42);box-shadow:0 -5px 18px rgba(18,59,80,.18);font-family:"Segoe UI",system-ui,sans-serif;color:#f4fbfd}
.w11-center{display:flex;gap:5px}
.w11-btn{position:relative;width:40px;height:40px;border:0;border-radius:4px;background:transparent;display:grid;place-items:center;cursor:pointer;color:#f4fbfd;transition:background .15s}
.w11-btn:hover,.w11-btn.on{background:rgba(244,251,253,.16);box-shadow:inset 0 0 0 1px rgba(244,251,253,.12)}
.w11-btn:active{transform:scale(.94)}
.w11-btn.ativo{background:rgba(244,251,253,.10)}
.w11-btn.ativo::after{content:"";position:absolute;bottom:1px;width:18px;height:3px;border-radius:1px;background:#48b7c7}
.w11-btn.small{width:28px}
 .w11-tray{position:absolute;right:8px;display:flex;align-items:center;gap:4px;font-size:12px;color:#f4fbfd}
.w11-hidden-tray{position:absolute;right:0;bottom:56px;display:flex;gap:14px;padding:14px 16px;border:1px solid rgba(72,183,199,.35);border-radius:4px;background:rgba(18,59,80,.97);box-shadow:0 12px 36px rgba(0,0,0,.25);color:#f4fbfd;backdrop-filter:blur(20px);z-index:52}
.w11-hidden-tray>div{display:flex;min-width:52px;flex-direction:column;align-items:center;gap:6px;font-size:11px}
.w11-sys{display:flex;gap:8px;padding:8px 10px;border-radius:4px;color:#f4fbfd}.w11-sys:hover,.w11-clock:hover{background:rgba(244,251,253,.14)}
.w11-clock{display:flex;flex-direction:column;align-items:flex-end;padding:4px 8px;border-radius:4px;line-height:1.3;color:#f4fbfd}
.w11-start{position:fixed;bottom:60px;left:50%;transform:translateX(-50%);width:min(600px,94vw);z-index:51;border-radius:4px;
  background:rgba(242,242,242,.92);backdrop-filter:blur(30px) saturate(1.6);border:1px solid rgba(0,0,0,.1);box-shadow:0 16px 48px rgba(0,0,0,.25);
  font-family:"Segoe UI",system-ui,sans-serif;color:#1f1f1f;animation:w11up .2s ease-out;overflow:hidden}
@keyframes w11up{from{opacity:0;transform:translate(-50%,20px)}to{opacity:1;transform:translate(-50%,0)}}
.w11-search{margin:24px 28px 8px;display:flex;align-items:center;gap:8px;background:#fff;border-radius:20px;padding:8px 14px;border-bottom:2px solid #0078d4}
.w11-search input{border:0;outline:0;flex:1;font-size:14px;background:transparent}
.w11-title{margin:16px 36px 8px;font-weight:600;font-size:14px}
.w11-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:10px;row-gap:16px;padding:4px 24px 24px;min-height:160px;align-content:start}
.w11-app{min-width:0;min-height:76px;border:0;background:transparent;border-radius:4px;padding:12px 4px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;font-size:12px;line-height:16px;cursor:pointer;color:inherit}
.w11-app:hover{background:rgba(255,255,255,.8)}
.w11-appicon{flex:0 0 36px;width:36px;height:36px;border-radius:4px;display:grid;place-items:center}
.w11-app>span:last-child{text-align:center;min-height:16px;max-width:100%;overflow-wrap:anywhere}
.w11-vazio{grid-column:1/-1;text-align:center;color:#666;padding:30px;font-size:13px}
.w11-foot{display:flex;justify-content:space-between;align-items:center;padding:12px 40px;background:rgba(0,0,0,.04);border-top:1px solid rgba(0,0,0,.06)}
.w11-user{display:flex;align-items:center;gap:10px;font-size:13px}
.w11-avatar{width:30px;height:30px;border-radius:50%;background:#ddd;display:grid;place-items:center}
.w11-ico{border:0;background:transparent;border-radius:6px;width:34px;height:34px;display:grid;place-items:center;cursor:pointer}.w11-ico:hover{background:rgba(255,255,255,.8)}
@media(max-width:640px){.w11-grid{grid-template-columns:repeat(3,minmax(0,1fr));column-gap:6px;row-gap:14px;padding:4px 12px 18px}.w11-app{min-height:74px;padding:10px 2px;gap:8px;font-size:11px}.w11-tray .w11-sys{display:none}.w11-center{gap:1px}.w11-btn{width:34px;height:38px}.w11-bar{height:48px}.w11-tray{right:4px}.w11-clock{padding:3px 4px;font-size:10px}}
`;