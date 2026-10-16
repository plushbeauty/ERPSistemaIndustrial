/**
 * SYNQRA ERP — FICHA TÉCNICA E IDENTIFICAÇÃO INDUSTRIAL INTEGRADA
 * REVISÃO: 1.5 | DATA: 16/10/2026
 * ID: #AUDIT-ERP-FICHA-COMPLETA-20261016-10
 * ESCOPO: Unificação total do formulário de produtos com as abas de Estoque, PCP e Qualidade.
 * ALTERAÇÃO: Ajustado o Grid de Edits para simetria milimétrica, inclusão de sub-abas industriais e Cardex.
 */

import { Save, AlertCircle, CheckCircle2, Package, Settings, ShieldAlert, BarChart2, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type C = { id: string; prefixo: string; digitos_produto: number }
type P = { 
  id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null;
  peso_liquido?: number; peso_bruto?: number; comprimento?: number; largura?: number; altura?: number;
  material_composicao?: string; dureza_especificada?: string; codigo_molde?: string; centro_custo?: string;
  custo_medio?: number; preco_venda?: number;
}

type SubView = 'estoque' | 'producao' | 'qualidade'

export default function FormFichaTecnica({ productId, onSaved }: { productId?: string; onSaved: () => void }) {
  const [cfg, setCfg] = useState<C[]>([])
  const [configId, setConfigId] = useState('')
  const [tipo, setTipo] = useState('PA')
  const [p, setP] = useState<P | null>(null)
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [unidade, setUnidade] = useState('UN')
  const [cliente, setCliente] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  // Estados Industriais Compartilhados
  const [pesoLiquido, setPesoLiquido] = useState(0)
  const [pesoBruto, setPesoBruto] = useState(0)
  const [comprimento, setComprimento] = useState(0)
  const [largura, setLargura] = useState(0)
  const [altura, setAltura] = useState(0)
  const [material, setMaterial] = useState('')
  const [dureza, setDureza] = useState('')
  const [molde, setMolde] = useState('')
  const [centroCusto, setCentroCusto] = useState('')
  const [custoMedio, setCustoMedio] = useState(0)
  const [precoVenda, setPrecoVenda] = useState(0)

  // Controle de Abas Secundárias Internas
  const [subTab, setSubTab] = useState<SubView>('estoque')

  useEffect(() => {
    void (async () => {
      const u = await supabase.auth.getUser()
      if (!u.data.user) { setError('Sessão não autenticada.'); return }
      const r = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', u.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
      if (r.error || !r.data?.empresa_id) { setError(r.error?.message || 'Empresa não identificada.'); return }
      setEmpresa(r.data.empresa_id)
      
      const c = await supabase.from('erp_codigos').select('id,prefixo,digitos_produto').eq('empresa_id', r.data.empresa_id)
      if (c.error) setError(c.error.message)
      else { setCfg((c.data ?? []) as C[]); if (c.data?.[0]) setConfigId(c.data[0].id) }
      
      if (productId) {
        const x = await supabase.from('erp_produtos').select('*').eq('id', productId).eq('empresa_id', r.data.empresa_id).maybeSingle()
        if (x.data) { 
          const z = x.data as P
          setP(z)
          setNome(z.nome)
          setCategoria(z.categoria || '')
          setUnidade(z.unidade)
          setCliente(z.cliente || '')
          setPesoLiquido(z.peso_liquido || 0)
          setPesoBruto(z.peso_bruto || 0)
          setComprimento(z.comprimento || 0)
          setLargura(z.largura || 0)
          setAltura(z.altura || 0)
          setMaterial(z.material_composicao || '')
          setDureza(z.dureza_especificada || '')
          setMolde(z.codigo_molde || '')
          setCentroCusto(z.centro_custo || '')
          setCustoMedio(z.custo_medio || 0)
          setPrecoVenda(z.preco_venda || 0)
        }
      } else {
        setP(null); setNome(''); setCategoria(''); setCliente('')
        setPesoLiquido(0); setPesoBruto(0); setComprimento(0); setLargura(0); setAltura(0)
        setMaterial(''); setDureza(''); setMolde(''); setCentroCusto(''); setCustoMedio(0); setPrecoVenda(0)
      }
    })()
  }, [productId])

  const c = cfg.find(x => x.id === configId)
  const preview = (c?.prefixo || 'PL') + tipo + '0'.repeat(Math.max(3, Math.min(6, c?.digitos_produto || 3)))

  const save = async () => {
    setError('')
    setOk('')
    if (!empresa || !nome.trim()) { setError('Empresa e nome do produto são obrigatórios.'); return }
    let codigo = p?.codigo || ''
    if (!codigo) {
      if (!configId) { setError('Cadastre uma regra em Regras do Código.'); return }
      const r = await supabase.rpc('erp_gerar_codigo_produto', { p_config_id: configId, p_tipo_sigla: tipo })
      if (r.error) { setError(r.error.message); return }
      codigo = String(r.data)
    }

    const payload = {
      nome: nome.trim(),
      categoria: categoria || null,
      unidade,
      unidade_compra: unidade,
      unidade_venda: unidade,
      cliente: cliente || null,
      peso_liquido: pesoLiquido,
      peso_bruto: pesoBruto,
      comprimento: comprimento,
      largura: largura,
      altura: altura,
      material_composicao: material || null,
      dureza_especificada: dureza || null,
      codigo_molde: molde || null,
      centro_custo: centroCusto || null,
      custo_medio: custoMedio,
      preco_venda: precoVenda
    }

    const r = p
      ? await supabase.from('erp_produtos').update(payload).eq('id', p.id).eq('empresa_id', empresa)
      : await supabase.from('erp_produtos').insert({ empresa_id: empresa, codigo, ativo: true, ...payload }).select('*').single()
    
    if (r.error) { setError(r.error.message); return }
    setOk('Produto salvo com sucesso sob SKU ' + codigo + '.')
    onSaved()
  }

  // Tokens de estilo do Design System Premium
  const labelClass = "flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"
  const field = 'h-8 w-full rounded-[2px] border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100 disabled:text-slate-400'
  const checkboxLabelClass = "flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none"
  const checkboxClass = "h-4 w-4 rounded-[2px] border-slate-300 text-[#2D8DB8] focus:ring-[#2D8DB8]/20"
  const sectionTitle = "text-xs font-extrabold uppercase tracking-widest text-[#2D8DB8] border-b border-slate-200 pb-1 mb-4 block"
  const tableHeaderClass = "bg-slate-100 px-4 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200"
  const tableCellClass = "px-4 py-2 text-xs font-semibold text-slate-800 border-b border-slate-100"

  return (
    <section className="space-y-4 p-4 bg-[#f8fafc]">
      <div className="rounded-[2px] border border-slate-300 bg-white p-5 shadow-sm">
        
        {/* BLOCO 1: IDENTIFICAÇÃO DO PRODUTO */}
        <span className={sectionTitle}>Identificação Geral do Produto</span>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <label className={`${labelClass} md:col-span-2`}>
            SKU / Código do Produto (Somente Leitura)
            <input className={`${field} font-bold text-[#123B50] bg-slate-50`} readOnly value={p?.codigo || preview} />
          </label>
          <label className={labelClass}>
            Tipo de Produto
            <select className={field} disabled={!!p} value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="PA">Produto Acabado (PA)</option>
              <option value="MP">Matéria-Prima (MP)</option>
              <option value="SA">Semiacabado (SA)</option>
              <option value="IN">Insumo (IN)</option>
            </select>
          </label>
          <label className={labelClass}>
            Regra de Código Ativa
            <select className={field} disabled={!!p} value={configId} onChange={e => setConfigId(e.target.value)}>
              {cfg.map(x => <option key={x.id} value={x.id}>{x.prefixo} · {x.digitos_produto} dígitos</option>)}
            </select>
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Nome Completo do Produto
            <input className={field} type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Arruela de Vedação 84X64X10" />
          </label>
          <label className={labelClass}>
            Categoria / Grupo
            <input className={field} type="text" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Prensados" />
          </label>
          <label className={labelClass}>
            Unidade Base
            <input className={field} type="text" value={unidade} onChange={e => setUnidade(e.target.value.toUpperCase())} maxLength={3} />
          </label>
        </div>

        {/* MECANISMO DE ABAS COMPLEMENTARES - Alinhamento Horizontal do LaraERP */}
        <div className="w-full border border-slate-200 rounded-[2px] shadow-sm mb-4">
          <div className="flex border-b border-slate-200 bg-slate-50 px-1">
            <button
              type="button"
              onClick={() => setSubTab('estoque')}
              className={`flex items-center gap-2 px-4 h-10 text-xs font-bold border-b-2 transition-all ${subTab === 'estoque' ? 'border-[#2D8DB8] text-[#2D8DB8] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Package size={14} /> ESTOQUE
            </button>
            <button
              type="button"
              onClick={() => setSubTab('producao')}
className={flex items-center gap-2 px-4 h-10 text-xs font-bold border-b-2 transition-all ${subTab === 'producao' ? 'border-[#2D8DB8] text-[#2D8DB8] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}}
>
 PRODUÇÃO / PCP

<button
type="button"
onClick={() => setSubTab('qualidade')}
className={flex items-center gap-2 px-4 h-10 text-xs font-bold border-b-2 transition-all ${subTab === 'qualidade' ? 'border-[#2D8DB8] text-[#2D8DB8] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}}
>
 QUALIDADE + DOCS

{/* SUB-TAB: ESTOQUE */}
{subTab === 'estoque' && (

Ponto de Reposição 
Estoque Máximo Segurado 
Localização Padrão Almoxarifado
Validade do Lote (Dias) 
 Controla Lote
 Controla Série
 Permite Estoque Negativo
)}
{/* SUB-TAB: PRODUÇÃO / PCP */}
{subTab === 'producao' && (

Peso Líquido (KG) <input className={field} type="number" step="0.001" value={pesoLiquido} onChange={e => setPesoLiquido(Number(e.target.value))} />
Peso Bruto (KG) <input className={field} type="number" step="0.001" value={pesoBruto} onChange={e => setPesoBruto(Number(e.target.value))} />
Comprimento (MM) <input className={field} type="number" value={comprimento} onChange={e => setComprimento(Number(e.target.value))} />
Largura (MM) <input className={field} type="number" value={largura} onChange={e => setLargura(Number(e.target.value))} />
Altura (MM) <input className={field} type="number" value={altura} onChange={e => setAltura(Number(e.target.value))} />
Material / Composição Básica <input className={field} type="text" value={material} onChange={e => setMaterial(e.target.value)} />
Dureza Especificada <input className={field} type="text" value={dureza} onChange={e => setDureza(e.target.value)} />
Código do Molde <input className={field} type="text" value={molde} onChange={e => setMolde(e.target.value)} />
)}
{/* SUB-TAB: QUALIDADE + DOCUMENTOS */}
{subTab === 'qualidade' && (

Inspeção Obrigatória
Nível de Qualidade Aceitável (AQL) 

Data
	OP Relacionada
	Defeito Registrado
	Quantidade

)}

{/* BLOCO 4: CUSTOS E COMERCIALIZAÇÃO */}
Custos e Comercialização
Custo Médio Calculado (R$)
Preço de Venda Praticado (R$)
{/* NOTIFICAÇÕES E BOTÃO DE SALVAMENTO */}


{error && (

 {error}

)}
{ok && (

 {ok}

)}
<button
type="button"
onClick={() => void save()}
className="inline-flex h-9 items-center gap-2 rounded-[2px] bg-[#2D8DB8] px-5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-[#23769b] active:scale-[0.98]"
>

{p ? 'SALVAR ALTERAÇÕES DA FICHA' : 'GERAR SKU INDUSTRIAL E SALVAR'}

)
}

<FollowUp>
