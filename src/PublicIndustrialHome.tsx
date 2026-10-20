/**
 * APROVADO — página pública restaurada do arquivo enviado em 2026-10-18.
 * Não alterar hero, carrossel, acessibilidade ou planos sem autorização expressa.
 */
/*
 * TELA PRINCIPAL APROVADA PELO USUÁRIO — NÃO ALTERAR SEM ORDEM EXPLÍCITA.
 * Data da aprovação/revisão registrada: 2026-10-16.
 * Fonte visual aprovada: branch fix/clientes-clone-fornecedores-producao, commit 9f1e37a.
 * Escopo: preservar o desenho aprovado; mudanças futuras exigem autorização explícita.
 * Validação: integração no main e publicação ainda pendentes de CI/deploy.
 */
import { ArrowRight, BarChart3, Boxes, ChevronDown, ClipboardCheck, Factory, FileText, PackageCheck, Receipt, ShieldCheck, Truck, Users, Wrench, X, Settings, Bot } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'

type Module = { key: string; title: string; description: string; route: string; Icon: LucideIcon }

const modules: Module[] = [
  { key:'pcp', title:'PCP e Produção', description:'Planejamento, ordens, sequenciamento e acompanhamento do chão de fábrica.', route:'/pcp', Icon:Factory },
  { key:'estoque', title:'Estoque e Materiais', description:'Saldos, movimentações, rastreabilidade e necessidades de materiais.', route:'/estoque', Icon:Boxes },
  { key:'recebimento', title:'Recebimento de Materiais', description:'NF-e XML, conferência, lotes e entrada rastreável.', route:'/modulos/recebimento', Icon:PackageCheck },
  { key:'qualidade', title:'Qualidade', description:'RPNC, auditorias, CAPA, documentos e evidências.', route:'/qualidade', Icon:ClipboardCheck },
  { key:'manutencao', title:'Manutenção', description:'Máquinas, planos preventivos, corretivas e histórico.', route:'/modulos/manutencao', Icon:Wrench },
  { key:'fiscal', title:'Financeiro e Fiscal', description:'Processos financeiros, documentos e visão fiscal.', route:'/fiscal', Icon:Receipt },
  { key:'indicadores', title:'Indicadores', description:'Produção, qualidade, estoque, custos e performance.', route:'/modulos/indicadores', Icon:BarChart3 },
  { key:'engenharia', title:'Engenharia e BOM', description:'Fichas técnicas, versões, estruturas e roteiros.', route:'/modulos/engenharia', Icon:FileText },
  { key:'compras', title:'Compras e Fornecedores', description:'Solicitações, pedidos, fornecedores e recebimento.', route:'/modulos/compras', Icon:Truck },
  { key:'clientes', title:'Clientes', description:'Cadastro, documentos, contatos e histórico comercial.', route:'/modulos/clientes', Icon:Users },
  { key:'rastreabilidade', title:'Rastreabilidade', description:'Lote da matéria-prima até produto acabado e expedição.', route:'/modulos/rastreabilidade', Icon:ShieldCheck },
  { key:'custos', title:'Custos Industriais', description:'Materiais, mão de obra, máquinas, perdas e margem.', route:'/modulos/custos', Icon:BarChart3 },
  { key:'expedicao', title:'Expedição', description:'Separação, conferência, embalagem, romaneio e entrega.', route:'/modulos/expedicao', Icon:Truck },
  { key:'fmea', title:'FMEA e Risco', description:'Análise de modos de falha, RPN e ações preventivas.', route:'/modulos/fmea', Icon:ClipboardCheck },
  { key:'rh', title:'RH e Competências', description:'Pessoas, treinamentos, competências e permissões.', route:'/modulos/rh', Icon:Users },
  { key:'xml', title:'Leitor XML', description:'Importação e conferência de XML fiscal com rastreabilidade documental.', route:'/recebimento-materiais', Icon:FileText },
  { key:'prensa-dupla', title:'PCP de Prensa Dupla', description:'Planejamento de operação síncrona frente/trás e capacidade de produção.', route:'/pcp', Icon:Factory },
  { key:'chao-fabrica', title:'Chão de Fábrica', description:'Apontamentos operacionais, produção, paradas, refugo e rastreabilidade.', route:'/tablet/dashboard', Icon:Factory },
  { key:'metrologia-rbc', title:'Metrologia RBC', description:'Instrumentos, certificados, validade e histórico de calibração.', route:'/qualidade/instrumentos', Icon:ShieldCheck },
  { key:'documentos-obsoletos', title:'Documentos Obsoletos', description:'Controle de documentos vigentes, revisões e registros obsoletos.', route:'/qualidade/documentos', Icon:FileText },
  { key:'matriz-desenhos', title:'Matriz de Desenhos', description:'Revisões, documentos técnicos e estruturas de engenharia controladas.', route:'/engenharia/revisoes-bom', Icon:FileText },
  { key:'manutencao-tpm', title:'Manutenção TPM', description:'Ordens, bloqueio de máquinas, corretiva, preventiva e laudo técnico.', route:'/manutencao', Icon:Wrench },
  { key:'roteirizacao-balanca', title:'Roteirização de Carga', description:'Expedição, roteirização e conferência operacional de cargas.', route:'/expedicao/roteirizacao', Icon:Truck },
]

const plans = [
  { key:'start', name:'Start', monthly:199, description:'Gestão essencial de materiais, cadastros e rotinas para iniciar a organização industrial.' },
  { key:'industrial', name:'Industrial', monthly:349, description:'Integração de PCP, produção, qualidade, estoque e indicadores para a operação.' },
  { key:'enterprise', name:'Enterprise', monthly:null, description:'Escopo personalizado, governança e integração conforme as necessidades da sua operação.' },
] as const

const productMenuModules: Module[] = [
  { key:'materiais', title:'Materiais', description:'Estoque, movimentações, lotes e rastreabilidade.', route:'/estoque', Icon:Boxes },
  { key:'qualidade-menu', title:'Qualidade', description:'Inspeções, não conformidades e documentos controlados.', route:'/qualidade', Icon:ClipboardCheck },
  { key:'producao-menu', title:'Produção (MRP)', description:'Planejamento, ordens e acompanhamento do chão de fábrica.', route:'/pcp', Icon:Factory },
  { key:'financeiro-menu', title:'Financeiro', description:'Processos financeiros e visão fiscal da operação.', route:'/fiscal', Icon:Receipt },
  { key:'rh-menu', title:'RH', description:'Pessoas, treinamentos, competências e permissões.', route:'/modulos/rh', Icon:Users },
]
const visuals = [
  { src:'/images/sgq-erp-pcp.png', label:'Planejamento e produção', eyebrow:'PCP E PRODUÇÃO', alt:'Tela do módulo PCP do ERP Industrial' },
  { src:'/images/sgq-erp-qualidade.png', label:'Gestão da qualidade', eyebrow:'QUALIDADE E SGQ', alt:'Tela do módulo de qualidade do ERP Industrial' },
  { src:'/images/funcionario.png', label:'Equipe industrial', eyebrow:'OPERAÇÃO REAL', alt:'Profissional em ambiente industrial' },
]

export default function PublicIndustrialHome(){
 const [menuOpen,setMenuOpen]=useState(false),[index,setIndex]=useState(0),[helpOpen,setHelpOpen]=useState(false),[selectedModule,setSelectedModule]=useState<Module|null>(null),[billingPeriod,setBillingPeriod]=useState<'monthly'|'annual'>('monthly'),[reducedMotion,setReducedMotion]=useState(false)
 const current=visuals[index]
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)')
  const updatePreference=()=>setReducedMotion(preference.matches)
  updatePreference()
  preference.addEventListener('change',updatePreference)
  return()=>preference.removeEventListener('change',updatePreference)
 },[])
 useEffect(()=>{
  if(reducedMotion)return
  const timer=window.setInterval(()=>setIndex(value=>(value+1)%visuals.length),5000)
  return()=>window.clearInterval(timer)
 },[reducedMotion])
 const moveSlide=(direction:number)=>setIndex(value=>(value+direction+visuals.length)%visuals.length)
 const handleCarouselKeyDown=(event:KeyboardEvent<HTMLElement>)=>{
  if(event.key==='ArrowLeft'){event.preventDefault();moveSlide(-1)}
  if(event.key==='ArrowRight'){event.preventDefault();moveSlide(1)}
 }
 const featured=useMemo(()=>modules.slice(0,7),[])
 return <main className="sgq-public-home">
  <style>{`
  .sgq-public-home{--ink:#17342f;--muted:#667975;--line:#dce6e1;--brand:#0f766e;--deep:#0b4f4a;--gold:#c6a15a;min-height:100vh;background:#f4f7f5;color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.sgq-public-home *{box-sizing:border-box}.sgq-public-home a{text-decoration:none;color:inherit}.sgq-nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:22px;min-height:74px;padding:0 max(18px,calc((100% - 1320px)/2));background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(18px);box-shadow:0 5px 22px rgba(20,55,49,.06)}.sgq-brand img{width:230px;height:74px;object-fit:contain;display:block}.sgq-nav-links{display:flex;align-items:center;gap:7px}.sgq-nav-link,.sgq-product-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 12px;border:0;border-radius:10px;background:transparent;color:#405852;font-family:inherit;font-size:11px;font-weight:600;line-height:1.2;letter-spacing:0;white-space:nowrap;cursor:pointer}.sgq-nav-link:hover,.sgq-product-button:hover{background:#edf4f1;color:var(--brand)}.sgq-product{position:relative}.sgq-product-menu{position:absolute;top:47px;left:0;width:760px;max-width:calc(100vw - 28px);padding:16px;border:1px solid var(--line);border-radius:20px;background:#fff;box-shadow:0 25px 70px rgba(18,55,49,.18);display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.sgq-product-menu a,.sgq-product-option{display:flex;align-items:flex-start;gap:9px;padding:11px;border-radius:13px;border:0;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer;width:100%}.sgq-product-menu a:hover,.sgq-product-option:hover{background:#f1f6f4}.sgq-product-menu svg{flex:0 0 auto;color:var(--brand);margin-top:2px}.sgq-product-menu strong{display:block;font-size:11px}.sgq-product-menu small{display:block;margin-top:3px;color:#74847f;font-size:9px;line-height:1.4}.sgq-nav-actions{display:flex;align-items:center;gap:8px}.sgq-login,.sgq-contact{padding:10px 14px;border-radius:10px;font-size:11px;font-weight:950}.sgq-owner{display:inline-grid;place-items:center;width:36px;height:36px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#506862}.sgq-owner:hover{color:var(--brand);background:#edf4f1}.sgq-contact{border:1px solid var(--line);background:#fff}.sgq-login{background:var(--brand);color:#fff!important}.sgq-hero{position:relative;isolation:isolate;overflow:hidden;min-height:min(760px,calc(100dvh - 74px));width:100%;padding:30px 20px;display:grid;place-items:center;border-bottom:1px solid var(--line);background:#263330}.sgq-hero-background{display:none}.sgq-hero-inner{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.sgq-hero-copy{min-width:0}.sgq-stage{height:clamp(430px,65vh,680px);width:100%;min-width:0;border-radius:4px;padding:0}.sgq-stage-media{inset:0;border-radius:0;background:#172033}.sgq-stage-media img{object-fit:cover;padding:0;transform:none}.sgq-stage-media img.active{opacity:1;transform:none}.sgq-stage-caption{left:18px;bottom:18px}.sgq-dots{right:18px;bottom:20px}.sgq-hero-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#263330 0%,rgba(38,51,48,.98) 45%,rgba(38,51,48,.72) 100%)}.sgq-wrap{width:min(1320px,calc(100% - 40px));margin:auto}.sgq-hero-inner{position:relative;z-index:1;width:min(1320px,calc(100% - 40px));display:grid;grid-template-columns:minmax(0,1fr) 390px;align-items:center;gap:28px;text-align:left;margin:auto}.sgq-hero-inner>div:first-child{max-width:780px;margin:0}.sgq-hero-inner .sgq-kicker{color:#8FE1ED}.sgq-hero h1{color:#fff}.sgq-hero p{max-width:800px;margin:18px 0;color:#f0f7fa}.sgq-hero p strong{color:#fff}.sgq-hero .sgq-actions,.sgq-hero .sgq-proof{justify-content:flex-start}.sgq-hero .sgq-proof{color:#f0f7fa}.sgq-hero .sgq-secondary{background:rgba(255,255,255,.95);color:#123B50}.sgq-kicker{font-size:10px;font-weight:950;letter-spacing:2px;color:#9a763b}.sgq-hero h1{font-size:clamp(43px,5.2vw,70px);line-height:1;letter-spacing:-3px;margin:14px 0;color:#fff}.sgq-hero p{max-width:800px;margin:18px auto;color:#f0f7fa;font-size:16px;line-height:1.7}.sgq-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.sgq-primary,.sgq-secondary{display:inline-flex;align-items:center;gap:8px;border-radius:12px;padding:13px 17px;font-size:12px;font-weight:950}.sgq-primary{background:var(--brand);color:#fff!important;box-shadow:0 12px 30px rgba(15,118,110,.18)}.sgq-secondary{border:1px solid #d4dfda;background:#fff}.sgq-proof{display:flex;flex-wrap:wrap;gap:14px;margin-top:20px;color:#527069;font-size:10px;font-weight:800}.sgq-proof span{display:inline-flex;align-items:center;gap:5px}.sgq-proof svg{color:var(--brand)}.sgq-stage{position:relative;height:594px;border:1px solid #d6e1dc;border-radius:28px;padding:10px;background:#fff;overflow:hidden;box-shadow:0 28px 70px rgba(22,57,51,.15)}.sgq-stage-media{position:absolute;inset:10px;border-radius:20px;overflow:hidden;background:#eaf1ee}.sgq-stage-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:28px;opacity:0;transform:scale(.94);transition:opacity 1s ease,transform 5s ease}.sgq-stage-media img.active{opacity:1;transform:scale(.94)}.sgq-stage-media img[src*="unsplash"]{object-fit:cover;padding:0}.sgq-stage-caption{position:absolute;left:25px;bottom:25px;z-index:3;padding:11px 14px;border:1px solid rgba(255,255,255,.65);border-radius:14px;background:rgba(11,50,46,.82);color:#fff;backdrop-filter:blur(12px)}.sgq-stage-caption span{display:block;color:#cdb678;font-size:8px;font-weight:950;letter-spacing:1.5px}.sgq-stage-caption strong{display:block;margin-top:3px;font-size:13px}.sgq-dots{position:absolute;right:25px;bottom:28px;z-index:3;display:flex;gap:5px;padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.88)}.sgq-dot{width:8px;height:8px;border:0;border-radius:50%;background:#b8c7c2;cursor:pointer}.sgq-dot.active{background:var(--brand);transform:scale(1.2)}.sgq-section{padding:68px 0;background:#fff}.sgq-section-heading{text-align:center;max-width:820px;margin:0 auto 30px}.sgq-section-heading span{font-size:9px;font-weight:950;letter-spacing:2px;color:#9a763b}.sgq-section-heading h2{margin:8px 0;font-size:38px;letter-spacing:-1.5px}.sgq-section-heading p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}.sgq-modules{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.sgq-module{border:1px solid var(--line);border-radius:18px;padding:19px;background:#fff;box-shadow:0 10px 30px rgba(22,57,51,.05);transition:.18s}.sgq-module:hover{transform:translateY(-3px);box-shadow:0 18px 42px rgba(22,57,51,.1)}.sgq-module-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#eaf4f1;color:var(--brand)}.sgq-module h3{margin:12px 0 5px;font-size:17px}.sgq-module p{min-height:55px;margin:0;color:var(--muted);font-size:11px;line-height:1.6}.sgq-module-link{display:inline-flex;align-items:center;gap:5px;margin-top:13px;color:var(--brand);font-size:11px;font-weight:950}.sgq-module-detail{scroll-margin-top:88px;margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:#f7faf8}.sgq-module-detail-head{display:flex;align-items:center;gap:14px}.sgq-module-detail-head h2{margin:4px 0;font-size:24px}.sgq-module-detail-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.sgq-detail-back{margin-left:auto;white-space:nowrap;color:var(--brand);font-size:11px;font-weight:900}.sgq-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.sgq-detail-grid article{padding:16px;border:1px solid var(--line);border-radius:12px;background:#fff}.sgq-detail-grid h3{margin:0 0 10px;font-size:13px}.sgq-detail-grid ul,.sgq-detail-grid ol{margin:0;padding-left:18px;color:#52645e;font-size:11px;line-height:1.9}.sgq-detail-grid ol{list-style:none;padding:0}.sgq-detail-grid ol li{display:flex;align-items:center;gap:9px}.sgq-detail-grid ol b{color:var(--brand);font-size:10px}.sgq-detail-security{margin:14px 0 0;color:#667975;font-size:10px;line-height:1.6}.sgq-all-modules{margin-top:18px;text-align:center}.sgq-all-modules a{display:inline-flex;align-items:center;gap:7px;padding:11px 15px;border-radius:11px;border:1px solid var(--line);font-size:11px;font-weight:950}.sgq-flow{background:#f4f7f5}.sgq-flow-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.sgq-flow-card{border:1px solid var(--line);border-radius:18px;background:#fff;padding:22px}.sgq-flow-card b{font-size:10px;color:#9a763b;letter-spacing:1.5px}.sgq-flow-card h3{margin:7px 0;font-size:19px}.sgq-flow-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.6}.sgq-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;width:min(1280px,100%);margin:auto}.sgq-plan{border:1px solid var(--line);border-radius:20px;padding:24px;background:#fff}.sgq-plan.featured{border:2px solid var(--gold)}.sgq-plan small{color:#788781}.sgq-plan h3{font-size:24px;margin:7px 0}.sgq-plan strong{font-size:34px}.sgq-plan p{min-height:42px;color:var(--muted);font-size:12px;line-height:1.6}.sgq-plan a{display:flex;justify-content:center;align-items:center;gap:7px;padding:11px;border-radius:10px;background:var(--brand);color:#fff!important;font-size:11px;font-weight:950}.sgq-footer{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:26px max(18px,calc((100% - 1320px)/2));background:#0e3536;color:#d7e5e1}.sgq-footer img{width:140px;height:40px;object-fit:contain}.sgq-help{border:1px solid var(--line);border-radius:10px;padding:10px 14px;background:#2D8DB8;color:#fff;font:inherit;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}.sgq-help-panel{position:fixed;right:20px;bottom:82px;top:auto;z-index:10000;width:330px;max-height:calc(100dvh - 110px);overflow:auto;padding:18px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 25px 65px rgba(20,55,49,.18)}.sgq-help-panel h3{margin:0;font-size:16px}.sgq-help-panel p{color:var(--muted);font-size:12px;line-height:1.6}.sgq-help-panel a{display:block;padding:7px 0;color:var(--brand);font-size:11px;font-weight:900}
  @media(max-width:1050px){.sgq-nav-links{display:none}.sgq-hero-inner{grid-template-columns:1fr}.sgq-stage{height:430px}.sgq-modules{grid-template-columns:repeat(2,1fr)}.sgq-detail-grid{grid-template-columns:1fr}.sgq-plans{grid-template-columns:repeat(2,1fr)}.sgq-flow-grid{grid-template-columns:1fr 1fr}.sgq-product-menu{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:620px){.sgq-hero{min-height:calc(100dvh - 62px);padding:28px 12px}.sgq-hero-inner{width:calc(100% - 24px);grid-template-columns:minmax(0,1fr);gap:22px;text-align:left}.sgq-hero-inner>div:first-child{max-width:none;margin:0}.sgq-stage{height:clamp(320px,52vh,430px);width:100%;border-radius:14px}.sgq-stage-media{inset:7px;border-radius:10px}.sgq-stage-media img{padding:8px}.sgq-stage-caption{left:12px;bottom:12px}.sgq-dots{right:12px;bottom:14px}.sgq-hero h1{font-size:clamp(28px,7vw,43px);letter-spacing:-1.5px}.sgq-hero p{font-size:14px}.sgq-hero .sgq-proof{gap:7px}.sgq-hero-background img.active{opacity:.62}.sgq-wrap{width:calc(100% - 26px)}.sgq-nav{padding:0 13px}.sgq-brand img{width:190px;height:62px}.sgq-contact{display:none}.sgq-hero{padding:40px 0 45px}.sgq-hero h1{font-size:43px}.sgq-hero p{font-size:14px}.sgq-stage{height:320px;border-radius:20px}.sgq-stage-media{inset:8px;border-radius:14px}.sgq-stage-media img{padding:10px}.sgq-stage-caption{left:16px;bottom:16px}.sgq-dots{right:16px;bottom:19px}.sgq-modules,.sgq-flow-grid,.sgq-plans,.sgq-detail-grid{grid-template-columns:1fr}.sgq-module-detail-head{align-items:flex-start;flex-wrap:wrap}.sgq-detail-back{margin-left:0}.sgq-section{padding:52px 0}.sgq-section-heading h2{font-size:31px}.sgq-product-menu{position:fixed;left:13px;right:13px;top:68px;width:auto;max-width:none;grid-template-columns:1fr 1fr;max-height:72vh;overflow:auto}.sgq-nav-actions .sgq-login{padding:9px 11px}.sgq-footer{flex-direction:column;align-items:flex-start}}
  /* HOME HERO: quebra qualquer container limitador e elimina o card em toda a largura da viewport. */
  .sgq-public-home{overflow-x:clip}
  .sgq-hero{position:relative!important;left:50%;width:100vw!important;max-width:100vw!important;margin-left:-50vw!important;height:calc(100dvh - 74px)!important;min-height:400px;padding:0!important;display:block!important;overflow:hidden!important;background:#fff!important;border:0!important;border-radius:0!important}
  .sgq-hero-inner{position:absolute!important;inset:0!important;display:block!important;width:100%!important;max-width:none!important;height:100%!important;margin:0!important;padding:0!important}
  .sgq-hero-copy{display:none!important}
  .sgq-stage{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;min-width:0!important;margin:0!important;border:0!important;border-radius:0!important;padding:0!important;background:#fff!important;box-shadow:none!important;overflow:hidden!important}
  .sgq-stage-media{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;border-radius:0!important;margin:0!important;padding:0!important;background:#fff!important;overflow:hidden!important}
  .sgq-stage-media img{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;object-fit:fill!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;transform:scale(.95)!important;transform-origin:center center!important;translate:none!important;left:0!important}\n  .sgq-product-button{font-size:11px!important;font-weight:600!important;line-height:1.2!important;letter-spacing:0!important}\n  .sgq-help{top:88px!important;bottom:auto!important;right:20px!important;border-radius:10px!important;background:#2D8DB8!important;color:#fff!important;box-shadow:0 8px 22px rgba(45,141,184,.25)!important}
  .sgq-stage-caption,.sgq-dots,.sgq-hero-shade{display:none!important}
  /* Portal público: hero, menu e pricing com geometria consistente e sem sobreposição. */
  .sgq-nav{min-height:70px;gap:12px;padding-top:8px;padding-bottom:8px}
  .sgq-brand img{width:205px;height:58px}
  .sgq-product{position:relative}
  .sgq-product-menu{display:none;top:calc(100% + 8px);left:0;width:560px;max-width:min(560px,calc(100vw - 28px));grid-template-columns:repeat(2,minmax(0,1fr));padding:12px;border-radius:4px;background:#fff;box-shadow:0 18px 48px rgba(18,59,80,.22)}
  .sgq-product:hover .sgq-product-menu,.sgq-product:focus-within .sgq-product-menu{display:grid}
  .sgq-product-menu a{min-width:0;align-items:center;padding:10px;border-radius:4px;overflow-wrap:anywhere}
  .sgq-product-menu a span{min-width:0}
  .sgq-product-menu strong{font-size:12px;color:#123B50}
  .sgq-product-menu small{font-size:10px;line-height:1.45;color:#526b77}
  .sgq-hero{position:relative!important;left:auto!important;width:100%!important;max-width:none!important;margin:0!important;height:auto!important;min-height:0!important;padding:38px 22px 42px!important;display:block!important;overflow:hidden!important;background:linear-gradient(135deg,#123B50 0%,#164f67 56%,#1d6675 100%)!important;border-bottom:0!important}
  .sgq-hero-shade{display:block!important;z-index:0;background:radial-gradient(ellipse at 50% 0%,rgba(72,183,199,.2),transparent 60%)!important}
  .sgq-hero-inner{position:relative!important;inset:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:0!important;width:min(1180px,100%)!important;max-width:1180px!important;height:auto!important;margin:0 auto!important;padding:0!important;text-align:center!important}
  .sgq-hero-copy{display:block!important;position:relative;z-index:2;width:min(850px,100%);min-width:0;margin:0 auto!important;text-align:center!important}
  .sgq-hero-copy .sgq-kicker{display:inline-block;color:#8FE1ED;font-size:10px;font-weight:800;letter-spacing:2px}
  .sgq-hero h1{margin:12px 0 10px!important;color:#fff!important;font-size:clamp(32px,4.2vw,56px)!important;line-height:1.08!important;letter-spacing:-1.2px!important;overflow-wrap:anywhere}
  .sgq-hero-copy p{max-width:740px;margin:0 auto!important;color:#e9f5f8!important;font-size:clamp(13px,1.5vw,16px)!important;line-height:1.6!important}
  .sgq-trial-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;max-width:100%;min-height:44px;margin:20px auto 0;padding:12px 20px;border:1px solid #48B7C7;border-radius:4px;background:#2D8DB8;color:#fff!important;font-size:12px;font-weight:850;line-height:1.35;text-align:center;white-space:normal;overflow-wrap:anywhere;box-shadow:0 8px 22px rgba(0,0,0,.15);transition:background .18s ease,transform .18s ease}
  .sgq-trial-cta:hover{background:#247ba3;transform:translateY(-1px)}
  .sgq-stage{position:relative!important;inset:auto!important;width:min(1050px,100%)!important;height:clamp(250px,42vw,480px)!important;min-width:0!important;margin:28px auto 0!important;padding:0!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:4px!important;background:#fff!important;box-shadow:0 18px 55px rgba(0,0,0,.2)!important;overflow:hidden!important}
  .sgq-stage-media{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;border-radius:0!important;margin:0!important;padding:0!important;background:#fff!important;overflow:hidden!important}
  .sgq-stage-media img{position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;object-fit:contain!important;padding:12px!important;margin:0!important;border:0!important;border-radius:0!important;transform:none!important;transform-origin:center center!important;translate:none!important;left:0!important}
  .sgq-stage-media img.active{opacity:1!important}
  .sgq-stage-caption,.sgq-dots{display:none!important}
  .sgq-pricing{padding:38px 0 44px!important;background:#f4f7f9!important}
  .sgq-pricing .sgq-section-heading{margin-bottom:18px}
  .sgq-billing-toggle{display:flex;align-items:center;justify-content:center;gap:4px;width:max-content;max-width:100%;margin:0 auto 24px;padding:4px;border:1px solid #d5e2e8;border-radius:4px;background:#fff}
  .sgq-billing-toggle button{min-height:32px;padding:7px 14px;border:0;border-radius:3px;background:transparent;color:#526b77;font:inherit;font-size:11px;font-weight:750;cursor:pointer}
  .sgq-billing-toggle button[aria-pressed="true"]{background:#123B50;color:#fff}
  .sgq-billing-savings{align-self:center;color:#247c63;font-size:10px;font-weight:800;padding:0 8px;white-space:nowrap}
  .sgq-plans{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px!important;width:min(1040px,100%)!important;margin:0 auto!important;align-items:stretch}
  .sgq-plan{display:flex;flex-direction:column;min-width:0;padding:22px!important;border:1px solid #d7e4ea!important;border-radius:4px!important;background:#fff!important;box-shadow:0 8px 24px rgba(18,59,80,.06)}
  .sgq-plan.featured{border:1px solid #2D8DB8!important;box-shadow:0 12px 30px rgba(45,141,184,.12)}
  .sgq-plan small{font-size:9px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:#2D8DB8}
  .sgq-plan h3{margin:8px 0 10px!important;color:#123B50;font-size:23px!important;line-height:1.2;overflow-wrap:anywhere}
  .sgq-plan strong{display:block;color:#123B50;font-size:clamp(24px,2.8vw,32px)!important;line-height:1.2;overflow-wrap:anywhere}
  .sgq-plan .sgq-price-period{display:block;margin-top:4px;color:#667d88;font-size:10px;line-height:1.4}
  .sgq-plan p{flex:1;min-height:64px;color:#526b77!important;font-size:12px!important;line-height:1.6!important;overflow-wrap:anywhere}
  .sgq-plan .sgq-annual-total{display:block;margin-top:4px;color:#247c63;font-size:10px;line-height:1.4}
  .sgq-plan a{margin-top:12px;padding:11px!important;border-radius:4px!important;background:#2D8DB8!important;font-size:11px;line-height:1.4;text-align:center;overflow-wrap:anywhere}
  .sgq-plan .sgq-plan-secondary{display:block;margin-top:10px;color:#526b77;font-size:10px;line-height:1.45;text-align:center}
  @media(max-width:1050px){.sgq-nav{flex-wrap:wrap;justify-content:space-between}.sgq-nav-links{display:flex!important;order:3;width:100%;justify-content:center;flex-wrap:wrap}.sgq-nav-actions{margin-left:auto}.sgq-hero{height:auto!important;min-height:0!important}.sgq-hero-inner{display:flex!important;grid-template-columns:1fr!important}.sgq-stage{height:clamp(280px,45vw,420px)!important}.sgq-plans{grid-template-columns:repeat(3,minmax(0,1fr))!important}.sgq-product-menu{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);width:min(560px,calc(100vw - 24px));max-height:70vh;overflow:auto}}
  @media(max-width:620px){.sgq-nav{gap:6px;padding:8px 12px!important}.sgq-brand img{width:154px;height:44px}.sgq-nav-actions{gap:5px}.sgq-owner{width:30px;height:30px}.sgq-nav-actions .sgq-login{padding:8px 10px}.sgq-help{display:none}.sgq-nav-links{gap:2px}.sgq-nav-link,.sgq-product-button{padding:7px 8px;font-size:10px!important}.sgq-product-menu{position:fixed;top:108px;left:10px;right:10px;transform:none;width:auto;max-width:none;grid-template-columns:1fr;max-height:65vh;padding:8px}.sgq-hero{padding:30px 14px 28px!important}.sgq-hero h1{font-size:clamp(29px,9vw,42px)!important;letter-spacing:-.7px!important}.sgq-hero-copy p{font-size:13px!important}.sgq-trial-cta{width:100%;max-width:390px;padding:11px 12px;font-size:11px}.sgq-stage{height:clamp(220px,62vw,320px)!important;margin-top:22px!important}.sgq-stage-media img{padding:6px!important}.sgq-pricing{padding:28px 0 34px!important}.sgq-billing-toggle{flex-wrap:wrap;gap:2px}.sgq-billing-toggle button{padding:7px 10px}.sgq-plans{grid-template-columns:minmax(0,1fr)!important;gap:12px!important}.sgq-plan{padding:18px!important}.sgq-plan h3{font-size:21px!important}.sgq-plan strong{font-size:29px!important}.sgq-section{padding:38px 0}.sgq-section-heading h2{font-size:26px!important}.sgq-footer{flex-direction:column;align-items:flex-start}}
  /* SYNQRA HOME — hero em duas colunas e Ajuda IA flutuante compacta. */
  .sgq-hero{padding:34px 22px 40px!important;background:linear-gradient(135deg,#123B50 0%,#164f67 56%,#1d6675 100%)!important}
  .sgq-hero-inner{display:grid!important;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)!important;align-items:center!important;justify-content:initial!important;gap:clamp(24px,4vw,52px)!important;width:min(1240px,100%)!important;max-width:1240px!important;text-align:left!important}
  .sgq-hero-inner>div:first-child,.sgq-hero-copy{width:100%!important;max-width:680px!important;margin:0!important;text-align:left!important}
  .sgq-hero h1{font-size:clamp(34px,4vw,54px)!important;line-height:1.08!important;letter-spacing:-1.2px!important}
  .sgq-hero-copy p{max-width:590px!important;margin:0!important}
  .sgq-hero .sgq-actions,.sgq-hero .sgq-proof{justify-content:flex-start!important}
  .sgq-trial-cta{margin:20px 0 0!important}
  .sgq-stage{width:100%!important;max-width:550px!important;height:clamp(300px,36vw,460px)!important;margin:0 0 0 auto!important;border:1px solid rgba(255,255,255,.22)!important;border-radius:8px!important;background:#fff!important;box-shadow:0 18px 55px rgba(0,0,0,.2)!important}
  .sgq-stage-media img{object-fit:contain!important;padding:10px!important}
  .sgq-stage-caption{display:block!important;left:16px!important;bottom:16px!important}
  .sgq-dots{display:flex!important;right:16px!important;bottom:20px!important}
  .sgq-help-fab{position:fixed;right:25px;bottom:25px;z-index:9999;display:grid;place-items:center;width:52px;height:52px;min-height:52px;padding:0;border:1px solid #1a365d;border-radius:50%;background:#2b6cb0;color:#fff;box-shadow:0 4px 16px rgba(43,108,176,.35);cursor:pointer}.sgq-help-fab:hover{background:#1a365d}.sgq-hero-inner{grid-template-columns:minmax(0,3fr) minmax(0,2fr)!important;gap:clamp(24px,4vw,52px)!important}.sgq-hero-inner>div:first-child{max-width:none!important}.sgq-stage{width:100%!important;max-width:none!important;height:clamp(430px,65vh,680px)!important;margin:0!important;padding:0!important;border-radius:4px!important}.sgq-stage-media{inset:0!important;border-radius:0!important}.sgq-stage-media img{object-fit:cover!important;padding:0!important}.sgq-help-panel{right:20px!important;top:auto!important;bottom:82px!important;z-index:10000!important}@media(max-width:760px){.sgq-hero-inner{grid-template-columns:minmax(0,1fr)!important}.sgq-stage{height:clamp(250px,65vw,420px)!important}.sgq-hero{min-height:0!important}}
  .sgq-help:hover{background:#1a365d!important;transform:scale(1.06)}
  .sgq-help::before{content:"";width:23px;height:23px;display:block;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/%3E%3C/svg%3E") center/contain no-repeat}
  .sgq-help-panel{top:auto!important;right:25px!important;bottom:88px!important;z-index:9998!important}
  @media(max-width:760px){
    .sgq-hero{padding:30px 16px 34px!important}
    .sgq-hero-inner{grid-template-columns:minmax(0,1fr)!important;gap:24px!important;width:min(100%,620px)!important}
    .sgq-hero-inner>div:first-child,.sgq-hero-copy{max-width:none!important;text-align:left!important}
    .sgq-hero h1{font-size:clamp(30px,7vw,43px)!important}
    .sgq-stage{width:100%!important;max-width:none!important;height:clamp(230px,58vw,360px)!important;margin:0!important}
    .sgq-help-panel{right:16px!important;bottom:86px!important;width:min(330px,calc(100vw - 32px))!important}
  }
  .sgq-public-home{--ink:#123b50;--muted:#627985;--line:#d8e4ea;--brand:#2d8db8;--deep:#071522;--gold:#48b7c7;background:#f3f7fa}
  .sgq-section-heading>span,.sgq-flow-card>b{color:#2d8db8!important}
  .sgq-plan.featured{border-color:#48b7c7!important;box-shadow:0 12px 32px rgba(45,141,184,.14)}
  .sgq-stage{isolation:isolate}
  .sgq-stage-media:after{content:"";position:absolute;inset:45% 0 0;background:linear-gradient(180deg,transparent,rgba(7,21,34,.56));pointer-events:none}
  .sgq-stage-caption{z-index:2;max-width:min(55%,420px);border-color:rgba(72,183,199,.32);border-radius:12px;background:rgba(7,21,34,.82)}
  .sgq-stage-caption span{color:#8fe1ed}
  .sgq-dots{z-index:4;align-items:center;gap:7px;padding:7px;border:1px solid rgba(255,255,255,.3);border-radius:14px;background:rgba(7,21,34,.82);backdrop-filter:blur(12px)}
  .sgq-dot{width:9px;height:9px;padding:0;flex:0 0 auto}
  .sgq-dot:focus-visible,.sgq-carousel-control:focus-visible{outline:3px solid #48b7c7;outline-offset:3px}
  .sgq-carousel-control{display:grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid rgba(255,255,255,.24);border-radius:10px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer}
  .sgq-carousel-control:hover:not(:disabled){background:rgba(72,183,199,.26)}
  .sgq-carousel-control:disabled{opacity:.55;cursor:not-allowed}
  .sgq-plans-page-link{display:flex;justify-content:center;margin:22px auto 0}
  .sgq-plans-page-link a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;padding:0 18px;border:1px solid #2d8db8;border-radius:12px;background:#fff;color:#123b50;font-size:13px;font-weight:800}
  .sgq-plans-page-link a:hover{background:#eaf7fa}
  @media(prefers-reduced-motion:reduce){.sgq-stage-media img,.sgq-module,.sgq-trial-cta,.sgq-help{transition:none!important;animation:none!important}}
  @media(max-width:620px){.sgq-stage-caption{max-width:calc(100% - 18px);left:10px!important;bottom:10px!important}.sgq-dots{right:10px!important;bottom:10px!important;gap:4px;padding:5px}.sgq-carousel-control{width:30px;height:30px}.sgq-dot{width:7px;height:7px}}


  /* HOME APROVADA — carrossel ampliado sem botões flutuantes de anterior/próximo/pausa. */
  .sgq-public-home .sgq-hero{
    position:relative!important;isolation:isolate!important;display:block!important;
    width:100%!important;min-height:0!important;height:calc(100dvh - 74px)!important;
    padding:0!important;overflow:hidden!important;background:#0e1e2f!important;
  }
  .sgq-public-home .sgq-hero-inner{
    position:absolute!important;inset:0!important;z-index:5!important;display:block!important;
    width:100%!important;max-width:none!important;height:100%!important;margin:0!important;padding:0!important;
  }
  .sgq-public-home .sgq-stage{
    position:absolute!important;inset:0!important;z-index:0!important;display:block!important;
    width:100%!important;max-width:none!important;height:100%!important;min-width:0!important;
    margin:0!important;padding:0!important;border:0!important;border-radius:0!important;
    background:#0e1e2f!important;box-shadow:none!important;overflow:hidden!important;
  }
  .sgq-public-home .sgq-stage-media{
    position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
    margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#0e1e2f!important;
  }
  .sgq-public-home .sgq-stage-media img{
    position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;height:100%!important;
    object-fit:cover!important;object-position:center!important;padding:0!important;margin:0!important;
    border:0!important;border-radius:0!important;opacity:0!important;transform:none!important;
    transition:opacity 1.1s ease!important;
  }
  .sgq-public-home .sgq-stage-media img.active{opacity:1!important}
  .sgq-public-home .sgq-stage-media:after{
    content:"";position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(90deg,rgba(14,30,47,.94) 0%,rgba(14,30,47,.82) 30%,rgba(14,30,47,.34) 62%,rgba(14,30,47,.10) 100%);
  }
  .sgq-public-home .sgq-hero-copy{
    position:absolute!important;inset:0 auto 0 0!important;z-index:3!important;
    display:flex!important;flex-direction:column!important;justify-content:center!important;
    width:min(48%,680px)!important;max-width:680px!important;margin:0!important;
    padding:clamp(24px,5vw,76px)!important;text-align:left!important;
    background:linear-gradient(90deg,rgba(14,30,47,.82),rgba(14,30,47,.45) 78%,transparent)!important;
    border:0!important;backdrop-filter:blur(3px)!important;
  }
  .sgq-public-home .sgq-stage-caption{
    display:block!important;position:absolute!important;z-index:4!important;
    right:clamp(14px,3vw,36px)!important;bottom:clamp(14px,3vw,36px)!important;
    left:auto!important;max-width:min(42%,440px)!important;
  }
  .sgq-public-home .sgq-dots{
    display:flex!important;position:absolute!important;z-index:5!important;
    left:clamp(24px,5vw,76px)!important;right:auto!important;bottom:clamp(18px,3vw,34px)!important;
    gap:10px!important;padding:8px 10px!important;border:1px solid rgba(255,255,255,.28)!important;
    border-radius:8px!important;background:rgba(14,30,47,.7)!important;backdrop-filter:blur(10px)!important;
  }
  .sgq-public-home .sgq-carousel-control{display:none!important}
  .sgq-public-home .sgq-dot{width:22px!important;height:3px!important;padding:0!important;border:0!important;border-radius:0!important;background:rgba(244,251,253,.45)!important;cursor:pointer!important}
  .sgq-public-home .sgq-dot.active{width:34px!important;background:#48b7c7!important}
  @media(max-width:760px){
    .sgq-public-home .sgq-hero{height:calc(100dvh - 62px)!important;min-height:540px!important}
    .sgq-public-home .sgq-hero-copy{inset:0!important;width:100%!important;max-width:none!important;padding:28px 22px 90px!important;background:linear-gradient(90deg,rgba(14,30,47,.86),rgba(14,30,47,.56))!important}
    .sgq-public-home .sgq-hero h1{font-size:clamp(30px,8vw,44px)!important;letter-spacing:-1px!important}
    .sgq-public-home .sgq-hero-copy p{max-width:560px!important}
    .sgq-public-home .sgq-stage-caption{right:12px!important;bottom:62px!important;max-width:calc(100% - 24px)!important}
    .sgq-public-home .sgq-dots{left:18px!important;bottom:14px!important}
  }
  @media(prefers-reduced-motion:reduce){.sgq-public-home .sgq-stage-media img{transition:none!important}}

  `}
  </style>
  <header className="sgq-nav">
   <a href="/" className="sgq-brand" aria-label="SYNQRA ERP & SGQ INDUSTRIAL"><img src="/logo/logo.png" alt="SYNQRA ERP & SGQ INDUSTRIAL"/></a>
   <div className="sgq-nav-links"><a className="sgq-nav-link" href="#inicio">Início</a><div className="sgq-product" onMouseEnter={()=>setMenuOpen(true)} onMouseLeave={()=>setMenuOpen(false)}><button className="sgq-product-button" type="button" aria-expanded={menuOpen} aria-haspopup="true" onClick={()=>setMenuOpen(v=>!v)}>Descubra nossos produtos <ChevronDown size={15}/></button>{menuOpen&&<div className="sgq-product-menu">{productMenuModules.map(m=>{const Icon=m.Icon;return <a key={m.key} href="#modulo-detalhe" onClick={()=>{setSelectedModule(m);setMenuOpen(false)}}><Icon size={17}/><span><strong>{m.title}</strong><small>{m.description}</small></span></a>})}</div>}</div><a className="sgq-nav-link" href="#planos">Planos</a><a className="sgq-nav-link" href="/blog">Blog</a><a className="sgq-nav-link" href="/contato">Contato</a></div>
   <div className="sgq-nav-actions"><a className="sgq-owner" href="/cadastro-master" title="Cadastro do proprietário Master" aria-label="Cadastro do proprietário Master"><Settings size={17}/></a><a className="sgq-login" href="/login">Entrar</a></div>
  </header>
  <section id="inicio" className="sgq-hero"><div className="sgq-hero-shade" aria-hidden="true"/><div className="sgq-wrap sgq-hero-inner"><div className="sgq-hero-copy"><span className="sgq-kicker">ERP &amp; SGQ INDUSTRIAL INTEGRADO</span><h1>SYNQRA: controle total da operação industrial.</h1><p>Conecte materiais, produção, qualidade, financeiro e pessoas em um ecossistema industrial com processos rastreáveis e informação integrada.</p><a className="sgq-trial-cta" href="/cadastro-empresa">🚀 TESTAR ERP GRÁTIS POR 14 DIAS <ArrowRight size={16}/></a></div><div className="sgq-stage" role="region" aria-roledescription="carrossel" aria-label="Apresentação visual do SYNQRA ERP Industrial" tabIndex={0} onKeyDown={handleCarouselKeyDown}><div className="sgq-stage-media" aria-live="off">{visuals.map((v,i)=><img key={v.src} src={v.src} alt={i===index?v.alt:''} aria-hidden={i!==index} className={i===index?'active':''} loading={i===index?'eager':'lazy'} decoding="async"/>)}</div><div className="sgq-stage-caption" aria-live="polite"><span>{current.eyebrow}</span><strong>{current.label}</strong></div><div className="sgq-dots" role="group" aria-label="Selecionar imagem do carrossel">{visuals.map((v,i)=><button key={v.src} type="button" className={i===index?'sgq-dot active':'sgq-dot'} aria-label={'Mostrar '+v.label} aria-pressed={i===index} onClick={()=>setIndex(i)}/>)}</div></div></div></section>
  <section id="planos" className="sgq-section sgq-pricing"><div className="sgq-wrap"><div className="sgq-section-heading"><span>NOSSOS PLANOS</span><h2>Escolha o plano certo para sua indústria.</h2><p>Compare as opções e comece pelo nível que faz sentido para a sua operação.</p></div><div className="sgq-billing-toggle" role="group" aria-label="Periodicidade de cobrança"><button type="button" aria-pressed={billingPeriod==='monthly'} onClick={()=>setBillingPeriod('monthly')}>Mensal</button><button type="button" aria-pressed={billingPeriod==='annual'} onClick={()=>setBillingPeriod('annual')}>Anual</button><span className="sgq-billing-savings">15% de desconto no anual</span></div><div className="sgq-plans">{plans.map((p,i)=>{const annualPrice=p.monthly===null?null:Math.round(p.monthly*0.85*100)/100;const shownPrice=p.monthly===null?'Sob consulta':(billingPeriod==='annual'?annualPrice!:p.monthly).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const annualTotal=annualPrice===null?null:annualPrice*12;return <article key={p.key} className={`sgq-plan ${i===1?'featured':''}`}><small>{i===1?'MAIS ESCOLHIDO':i===2?'OPERAÇÃO AVANÇADA':'PLANO DE ENTRADA'}</small><h3>{p.name}</h3><strong>{shownPrice}</strong>{p.monthly!==null&&<span className="sgq-price-period">{billingPeriod==='annual'?'por mês no plano anual':'por mês'}</span>}{billingPeriod==='annual'&&annualTotal!==null&&<span className="sgq-annual-total">Total anual: {annualTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span>}<p>{p.description}</p><a href="/cadastro-empresa">{p.monthly===null?'Falar sobre Enterprise':'Começar agora'} <ArrowRight size={14}/></a>{p.monthly!==null&&<span className="sgq-plan-secondary">{billingPeriod==='annual'?'Cobrança anual com 15% de desconto.':'Altere para anual e economize 15%.'}</span>}</article>})}</div><div className="sgq-plans-page-link"><a href="/planos">Ver catálogo completo de planos <ArrowRight size={16}/></a></div></div></section>
  <section id="modulos" className="sgq-section"><div className="sgq-wrap"><div className="sgq-section-heading"><span>DESCUBRA NOSSOS PRODUTOS</span><h2>Cada módulo tem uma função clara dentro da operação.</h2><p>Clique em qualquer módulo para ver o que ele faz, como trabalha, quais indicadores entrega e qual fluxo ele atende.</p></div><div className="sgq-modules">{featured.map(m=>{const Icon=m.Icon;return <article key={m.key} className="sgq-module"><span className="sgq-module-icon"><Icon size={20}/></span><h3>{m.title}</h3><p>{m.description}</p><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:13}}><a className="sgq-module-link" href="#modulo-detalhe" onClick={()=>setSelectedModule(m)}>Ver como funciona <ArrowRight size={14}/></a></div></article>})}</div><div id="modulo-detalhe" className="sgq-module-detail" aria-live="polite">{selectedModule&&(()=>{const m=selectedModule;const Icon=m.Icon;const details:Record<string,{items:string[];flow:string[];results:string[]}>={pcp:{items:['Planejamento e programação das ordens de produção','Capacidade de máquinas, turnos e recursos','Apontamentos, paradas, setup e perdas','Rastreabilidade e fechamento da produção'],flow:['Planejar','Programar','Produzir','Apontar','Inspecionar','Fechar'],results:['Ordens e quantidades produzidas','Eficiência e paradas','Perdas e refugo','Integração com estoque e qualidade']},estoque:{items:['Consulta de saldo por item e localização','Entradas, saídas e ajustes controlados','Lotes, rastreabilidade e inventário','Materiais críticos e necessidades de reposição'],flow:['Necessidade','Receber','Armazenar','Consumir','Inventariar'],results:['Saldos disponíveis','Movimentações','Itens críticos','Histórico por lote']},qualidade:{items:['Inspeções e critérios de aceitação','Não conformidades e ações corretivas','Auditorias e evidências','Documentos controlados e revisões'],flow:['Inspecionar','Registrar','Analisar risco','Corrigir','Verificar'],results:['Inspeções e ocorrências','Ações em aberto','Auditorias','Documentos vigentes']},recebimento:{items:['Conferência de NF-e XML e itens','Validação de quantidades recebidas','Identificação e controle de lotes','Encaminhamento rastreável ao estoque'],flow:['NF-e','Conferir','Identificar lotes','Registrar','Armazenar'],results:['Recebimentos pendentes','Divergências','Lotes recebidos','Entrada rastreável']},compras:{items:['Solicitações e cotações de compra','Cadastro e acompanhamento de fornecedores','Pedidos e aprovações','Controle de prazos e recebimentos'],flow:['Solicitar','Cotizar','Aprovar','Comprar','Receber'],results:['Pedidos abertos','Prazos de entrega','Fornecedores','Compras do período']},manutencao:{items:['Cadastro e histórico de equipamentos','Planos preventivos e ordens corretivas','Registro de intervenções e paradas','Integração com máquinas e produção'],flow:['Ativo','Planejar','Abrir ordem','Executar','Registrar'],results:['Ordens abertas','Preventivas pendentes','Paradas','Disponibilidade']},fiscal:{items:['Documentos e processos fiscais','Conferência de eventos da operação','Acompanhamento financeiro relacionado','Consultas e relatórios gerenciais'],flow:['Operação','Documento','Validar','Integrar','Analisar'],results:['Pendências fiscais','Documentos processados','Previsões','Movimentações']}};const d=details[m.key]||{items:[m.description,'Cadastros e consultas relacionados ao processo','Acompanhamento de etapas e pendências','Integração com áreas conectadas do ERP'],flow:['Cadastrar','Planejar','Executar','Conferir','Acompanhar'],results:['Status do processo','Pendências','Histórico','Integrações relacionadas']};return <><div className="sgq-module-detail-head"><span className="sgq-module-icon"><Icon size={22}/></span><div><span className="sgq-kicker">{m.title.toUpperCase()}</span><h2>{m.title}</h2><p>{m.description}</p></div><a className="sgq-detail-back" href="#inicio">Voltar ao início ↑</a></div><div className="sgq-detail-grid"><article><h3>O que este módulo contempla</h3><ul>{d.items.map(x=><li key={x}>{x}</li>)}</ul></article><article><h3>Fluxo de trabalho</h3><ol>{d.flow.map((x,i)=><li key={x}><b>{String(i+1).padStart(2,'0')}</b>{x}</li>)}</ol></article><article><h3>O que você acompanha</h3><ul>{d.results.map(x=><li key={x}>{x}</li>)}</ul></article></div><p className="sgq-detail-security">Esta é uma apresentação pública do módulo. Para acessar dados e executar operações reais, é necessário entrar no sistema com usuário e senha.</p></>})()}</div><div className="sgq-all-modules"><button type="button" className="sgq-product-button" onClick={()=>setMenuOpen(true)}>Ver todos os produtos <ChevronDown size={15}/></button></div></div></section>
  <section id="fluxo" className="sgq-section sgq-flow"><div className="sgq-wrap"><div className="sgq-section-heading"><span>COMO O ERP SE CONECTA</span><h2>Da matéria-prima ao resultado.</h2><p>Os módulos se conectam para reduzir retrabalho e manter rastreabilidade entre áreas.</p></div><div className="sgq-flow-grid"><article className="sgq-flow-card"><b>01 · PLANEJAR</b><h3>Engenharia + PCP + MRP</h3><p>Estrutura, capacidade, necessidades e programação antes da execução.</p></article><article className="sgq-flow-card"><b>02 · EXECUTAR</b><h3>Produção + Estoque + Qualidade</h3><p>Apontamentos, materiais, inspeções, lotes, perdas e evidências conectados.</p></article><article className="sgq-flow-card"><b>03 · GERIR</b><h3>Custos + Fiscal + Indicadores</h3><p>Os dados operacionais viram visão financeira, fiscal e gerencial.</p></article></div></div></section>
  
  <footer className="sgq-footer"><img src="/logo/logo.png" alt="SYNQRA ERP & SGQ INDUSTRIAL"/><span>SYNQRA ERP & SGQ INDUSTRIAL · FernandoSch_System</span><div><a href="/contato">Contato</a> · <a href="/blog">Blog</a> · <a href="/login">Entrar</a></div></footer>
  <button className="sgq-help-fab" type="button" aria-label="Abrir Ajuda IA" title="Ajuda IA" onClick={()=>setHelpOpen(v=>!v)} aria-expanded={helpOpen}><Bot size={22}/></button>
  {helpOpen&&<div className="sgq-help-panel"><button type="button" aria-label="Fechar" onClick={()=>setHelpOpen(false)} style={{float:'right',border:0,background:'transparent',cursor:'pointer'}}><X size={16}/></button><h3>Como posso ajudar?</h3><p>Consulte a apresentação dos módulos ou entre no sistema para acessar os dados da sua empresa.</p><a href="#modulos">Ver módulos</a><a href="#planos">Ver planos</a><a href="/contato">Falar com atendimento</a></div>}
 </main>
}