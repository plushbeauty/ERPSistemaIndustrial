import { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowLeft, BarChart3, ClipboardCheck, ClipboardList, FileText, Gauge, GraduationCap, Ruler, ShieldCheck, TriangleAlert, Wrench, type LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import DocumentoAnexoUpload from '../components/DocumentoAnexoUpload'

type Card = { title: string; desc: string; table: string; icon: LucideIcon; color: string; steps: string[]; href?: string }
type QualityDocument = { id: string; codigo: string; titulo: string; status: string; revisao: number; proxima_revisao: string | null }

const cards: Card[] = [
  { title: 'Dashboard da Qualidade', desc: 'Visão dos indicadores, pendências, prazos e alertas da qualidade.', table: 'erp_nao_conformidades', icon: BarChart3, color: '#0a6f73', steps: ['Confira RPNC abertas e atrasadas.', 'Veja documentos e calibrações próximas do vencimento.', 'Acompanhe auditorias, treinamentos e ações.'] },
  { title: 'Controle de Documentos', desc: 'Procedimentos, instruções, formulários, revisões, aprovação e documentos obsoletos.', table: 'erp_documentos_qualidade', icon: FileText, color: '#2563eb', steps: ['Cadastre código, sigla, área e setor.', 'Anexe o documento e controle a revisão.', 'Defina aprovação, validade e próxima revisão.', 'Nunca mantenha revisão obsoleta como vigente.'], href: '#qualidade-documentos' },
  { title: 'Controle de Registros', desc: 'Retenção, armazenamento, localização e descarte controlado das evidências.', table: 'erp_registros_qualidade', icon: Archive, color: '#7c3aed', steps: ['Defina o registro e responsável.', 'Informe retenção e meio de armazenamento.', 'Controle localização e data prevista para descarte.'] },
  { title: 'Treinamentos', desc: 'Treinamentos ligados a função, setor, competência, documentos e evidências.', table: 'erp_planos_treinamento', icon: GraduationCap, color: '#16a34a', steps: ['Crie o plano anual.', 'Defina treinamentos por setor e competência.', 'Registre presença e conclusão.', 'Anexe certificado ou evidência.'] },
  { title: 'Matriz de Competências', desc: 'Controle de qualificações, certificados, validade e autorização para processos.', table: 'erp_funcionarios_qualificacoes', icon: ShieldCheck, color: '#0891b2', steps: ['Associe competência ao funcionário.', 'Informe nível e validade.', 'Mantenha certificado anexado.', 'Use a situação para identificar lacunas.'] },
  { title: 'Auditorias', desc: 'Planejamento anual, auditorias, critérios, evidências, resultados e ações.', table: 'erp_planos_auditoria', icon: ClipboardList, color: '#ea580c', steps: ['Monte o plano anual.', 'Defina área, auditor, critério e data.', 'Registre evidências e resultado.', 'Gere RPNC quando houver não conformidade.'] },
  { title: 'RPNC / CAPA', desc: 'Registro e acompanhamento das não conformidades até contenção, causa, ação e eficácia.', table: 'erp_nao_conformidades', icon: TriangleAlert, color: '#dc2626', steps: ['Abra a RPNC com descrição e evidência.', 'Classifique o risco.', 'Registre contenção e causa raiz.', 'Defina ação, prazo e responsável.', 'Verifique eficácia e encerre.'], href: '#qualidade-rpnc' },
  { title: 'Metrologia / Calibração', desc: 'Instrumentos de medição, faixa, resolução, exatidão, certificados e vencimentos.', table: 'erp_equipamentos_medicao', icon: Ruler, color: '#9333ea', steps: ['Cadastre o instrumento e código.', 'Informe faixa e unidade.', 'Controle próxima calibração.', 'Bloqueie equipamento vencido quando necessário.'] },
  { title: 'Equipamentos / Manutenção', desc: 'Ordens preventivas e corretivas, periodicidade, checklist, custo e histórico.', table: 'erp_ordens_manutencao', icon: Wrench, color: '#ca8a04', steps: ['Defina o plano preventivo.', 'Programe a ordem.', 'Execute checklist e registre peças/custo.', 'Feche a ordem com evidência.'] },
  { title: 'Inspeções / Refugo', desc: 'Recebimento, processo e final, com quantidade boa, refugo, causa e indicadores.', table: 'erp_inspecoes', icon: ClipboardCheck, color: '#0f766e', steps: ['Defina plano e limites.', 'Registre resultado da inspeção.', 'Informe quantidade boa e refugo.', 'Registre motivo e evidência.', 'Analise tendência e Pareto.'] },
  { title: 'Planos de Inspeção', desc: 'Padrões, frequência, características, limites e instrumentos necessários.', table: 'erp_planos_inspecao', icon: ClipboardCheck, color: '#15803d', steps: ['Defina o que medir.', 'Informe limite inferior e superior.', 'Escolha instrumento.', 'Defina frequência e responsável.'] },
  { title: 'Indicadores e Relatórios', desc: 'Gráficos de RPNC, refugo, inspeções, auditorias, calibração, treinamento e ações.', table: 'erp_nao_conformidades', icon: Gauge, color: '#be123c', steps: ['Escolha período.', 'Filtre setor, produto ou cliente.', 'Compare tendência.', 'Exporte evidências quando necessário.'] },
]

export default function QualidadeIndustrial() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [documents, setDocuments] = useState<QualityDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [tutorial, setTutorial] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<string>('')

  useEffect(() => {
    let alive = true
    void (async () => {
      const uniqueTables = [...new Set(cards.map(card => card.table))]
      const results = await Promise.all(uniqueTables.map(async table => {
        const response = await supabase.from(table).select('id', { count: 'exact', head: true })
        return [table, response.count ?? 0] as const
      }))
      const docs = await supabase.from('erp_documentos_qualidade').select('id,codigo,titulo,status,revisao,proxima_revisao').order('codigo')
      if (alive) {
        setCounts(Object.fromEntries(results))
        setDocuments((docs.data ?? []) as QualityDocument[])
        setSelectedDocument(current => current || docs.data?.[0]?.id || '')
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const total = useMemo(() => Object.values(counts).reduce((sum, value) => sum + value, 0), [counts])
  const selected = documents.find(document => document.id === selectedDocument)

  return (
    <div className="pcp-page" style={{ padding: 28, maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <button className="secondary-v2" type="button" onClick={() => { window.location.href = '/erp-industrial' }} title="Voltar para o painel principal"><ArrowLeft size={18} /> Voltar à Tela Inicial</button>
          <div style={{ marginTop: 16 }}><span className="v2-eyebrow">QMS • QUALIDADE INDUSTRIAL</span><h1 style={{ fontSize: 38, margin: '6px 0' }}>Central da Qualidade</h1><p style={{ margin: 0, color: '#64748b', fontSize: 18 }}>Controle documentos, registros, treinamentos, auditorias, RPNC, metrologia, manutenção, inspeções e indicadores.</p></div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><button className="menu-green" type="button" onClick={() => setTutorial(true)}>Como funciona a Qualidade?</button><div style={{ padding: '13px 17px', borderRadius: 14, background: '#ecfdf5', border: '1px solid #bbf7d0', fontWeight: 900, color: '#166534', fontSize: 15 }}>Qualidade ativa • {loading ? '…' : total} registros</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 17 }}>
        {cards.map(card => {
          const Icon = card.icon
          return <section key={card.title} style={{ background: '#fff', border: '1px solid #dfe7e4', borderRadius: 20, padding: 22, boxShadow: '0 10px 30px rgba(23,32,51,.05)', borderTop: `5px solid ${card.color}` }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, display: 'grid', placeItems: 'center', background: '#f0f7f5', color: card.color }}><Icon size={25} /></div>
            <h3 style={{ fontSize: 23, margin: '14px 0 7px', color: '#172033' }}>{card.title}</h3>
            <p style={{ color: '#5d6f75', fontSize: 16, lineHeight: 1.55, minHeight: 72, margin: '0 0 12px' }}>{card.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><strong style={{ fontSize: 15, color: '#334e56' }}>{loading ? 'Carregando…' : `${counts[card.table] || 0} registro(s)`}</strong><button className="menu-green" type="button" onClick={() => { if (card.href) document.querySelector(card.href)?.scrollIntoView({ behavior: 'smooth' }); else setTutorial(true) }}>Abrir</button></div>
          </section>
        })}
      </div>

      <section id="qualidade-documentos" style={{ marginTop: 20, background: '#fff', border: '1px solid #dfe7e4', borderRadius: 20, padding: 24 }}>
        <span className="v2-eyebrow">CONTROLE DOCUMENTAL</span>
        <h2 style={{ fontSize: 27, margin: '5px 0 8px' }}>Documentos e anexos</h2>
        <p style={{ color: '#64748b', marginTop: 0 }}>Os arquivos ficam no Storage privado do tenant e o caminho é persistido em <code>erp_documentos_anexos</code>.</p>
        <select value={selectedDocument} onChange={event => setSelectedDocument(event.target.value)} style={{ minHeight: 46, width: '100%', maxWidth: 720, border: '1px solid #cbd5e1', borderRadius: 10, padding: '0 12px', fontSize: 15 }}>
          <option value="">Selecione um documento</option>
          {documents.map(document => <option key={document.id} value={document.id}>{document.codigo} • {document.titulo} • Rev. {document.revisao}</option>)}
        </select>
        {selected ? <DocumentoAnexoUpload documentoId={selected.id} titulo={`${selected.codigo} • ${selected.titulo}`} /> : <div style={{ marginTop: 14, color: '#64748b' }}>Cadastre um documento para habilitar os anexos.</div>}
      </section>

      <section id="qualidade-rpnc" style={{ marginTop: 20, background: '#fff', border: '1px solid #dfe7e4', borderRadius: 20, padding: 24 }}><h2 style={{ fontSize: 27, marginTop: 0 }}>Fluxo da Qualidade</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 }}>{['1. Definir padrão', '2. Inspecionar', '3. Registrar evidência', '4. Abrir RPNC', '5. Corrigir', '6. Verificar eficácia', '7. Liberar e controlar'].map(item => <div key={item} style={{ padding: '15px 14px', borderRadius: 12, background: '#f5f8f7', fontSize: 16, fontWeight: 800, color: '#334e56' }}>{item}</div>)}</div></section>

      {tutorial && <div className="modal" onClick={() => setTutorial(false)}><div className="modal-card" style={{ maxWidth: 720, padding: 28 }} onClick={event => event.stopPropagation()}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><span className="v2-eyebrow">GUIA RÁPIDO</span><h2 style={{ fontSize: 30, margin: '5px 0' }}>Como trabalhar com a Qualidade</h2></div><button className="icon-button" type="button" onClick={() => setTutorial(false)} title="Fechar guia">×</button></div><p style={{ fontSize: 17, color: '#5d6f75', lineHeight: 1.55 }}>Siga a sequência operacional:</p><div style={{ display: 'grid', gap: 9 }}>{['Cadastre documentos e defina revisões.', 'Crie planos de inspeção e limites.', 'Treine e qualifique os responsáveis.', 'Registre inspeções e evidências.', 'Quando houver desvio, abra RPNC.', 'Registre contenção, causa e ação corretiva.', 'Verifique a eficácia antes de encerrar.', 'Mantenha registros, auditorias e indicadores atualizados.'].map((text, index) => <div key={text} style={{ display: 'flex', gap: 11, alignItems: 'center', padding: 12, borderRadius: 11, background: '#f7faf9', fontSize: 16 }}><b style={{ width: 30, height: 30, borderRadius: 50, display: 'grid', placeItems: 'center', background: '#e7faf4', color: '#087f70' }}>{index + 1}</b><span>{text}</span></div>)}</div><button className="primary" style={{ width: '100%', marginTop: 18 }} type="button" onClick={() => setTutorial(false)}>Entendi o fluxo</button></div></div>}
    </div>
  )
}
