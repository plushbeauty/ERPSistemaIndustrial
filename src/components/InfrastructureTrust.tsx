import { LockKeyhole, ShieldCheck, Smartphone, Zap, Factory } from 'lucide-react'
const items=[
 ['RLS + PostgreSQL',LockKeyhole,'Dados isolados por empresa com Row Level Security diretamente no banco.'],
 ['Anti-conflito transacional',ShieldCheck,'Agenda e programação respeitam restrições no banco para impedir sobreposição quando a regra estiver configurada.'],
 ['Vercel + Supabase',Zap,'Frontend distribuído e Edge Functions para autenticação e integrações server-side.'],
 ['PWA standalone',Smartphone,'Instale no desktop, tablet ou celular como aplicativo leve.'],
 ['PCP + SGQ',Factory,'Lote, produção, refugo, RPNC, CAPA e rastreabilidade conectados.'],
] as const
export default function InfrastructureTrust(){return <section className="infrastructure-trust"><div className="infrastructure-trust-head"><span>INFRAESTRUTURA PROFISSIONAL</span><h2>Segurança e tecnologia que trabalham por trás da operação.</h2><p>Não é apenas aparência: o sistema foi estruturado para separar empresas, controlar transações e preservar rastreabilidade.</p></div><div className="infrastructure-trust-grid">{items.map(([badge,Icon,text])=><article key={badge}><Icon size={22}/><small>{badge}</small><p>{text}</p></article>)}</div></section>}
