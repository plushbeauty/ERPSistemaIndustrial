/**
 * SYNQRA ERP — FICHA TÉCNICA E IDENTIFICAÇÃO INDUSTRIAL
 * REVISÃO: 1.1 | DATA: 16/10/2026
 * ID: #AUDIT-ERP-FICHA-20261016-02
 * ESCOPO: Correção completa de assimetria visual, padding e alinhamento de inputs (Edits).
 * ALTERAÇÃO: Adicionados campos industriais em grid responsivo (Pesos, Custos, Moldes, Dureza), 
 *            padronização das fontes de rótulos (Labels) e isolamento estrito de estados do Supabase.
 */

import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type C = { id: string; prefixo: string; digitos_produto: number }
type P = { 
  id: string; codigo: string; nome: string; categoria: string | null; unidade: string; cliente: string | null;
  peso_liquido?: number; peso_bruto?: number; comprimento?: number; largura?: number; altura?: number;
  material_composicao?: string; dureza_especificada?: string; codigo_molde?: string; centro_custo?: string;
  custo_medio?: number; preco_venda?: number;
}

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

  // Novos estados industriais sincronizados com os prints da tela
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

  // Classes utilitárias padronizadas e imutáveis para inputs simétricos
  const labelClass = "flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"
  const field = 'h-8 w-full rounded-[2px] border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-[#2D8DB8] focus:ring-1 focus:ring-[#2D8DB8]/20 disabled:bg-slate-100 disabled:text-slate-400'
  const sectionTitle = "text-xs font-extrabold uppercase tracking-widest text-[#2D8DB8] border-b border-slate-200 pb-1 mb-4 block"

  return (
    <section className="space-y-4 p-4 bg-[#f8fafc]">
      <div className="rounded-[2px] border border-slate-300 bg-white p-5 shadow-sm">
        
        {/* BLOCO 1: IDENTIFICAÇÃO DO PRODUTO */}
        <span className={sectionTitle}>Identificação do Produto</span>
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

        {/* BLOCO 2: UNIDADES E CARACTERÍSTICAS FÍSICAS */}
        <span className={sectionTitle}>Unidades e Características Físicas</span>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 mb-6">
          <label className={labelClass}>
            Peso Líquido (KG)
            <input className={field} type="number" step="0.001" value={pesoLiquido} onChange={e => setPesoLiquido(Number(e.target.value))} />
          </label>
          <label className={labelClass}>
            Peso Bruto (KG)
            <input className={field} type="number" step="0.001" value={pesoBruto} onChange={e => setPesoBruto(Number(e.target.value))} />
          </label>
          <label className={labelClass}>
            Comprimento (MM)
            <input className={field} type="number" value={comprimento} onChange={e => setComprimento(Number(e.target.value))} />
          </label>
          <label className={labelClass}>
            Largura (MM)
            <input className={field} type="number" value={largura} onChange={e => setLargura(Number(e.target.value))} />
          </label>
          <label className={labelClass}>
            Altura (MM)
            <input className={field} type="number" value={altura} onChange={e => setAltura(Number(e.target.value))} />
          </label>
        </div>

        {/* BLOCO 3: IDENTIFICAÇÃO TÉCNICA INDUSTRIAL */}
        <span className={sectionTitle}>Identificação Técnica Industrial</span>
Material / Composição Básica
Dureza Especificada
Código do Molde Estrito
Cliente / Mercado de Destino
Centro de Custo Industrial
{/* BLOCO 4: PRECIFICAÇÃO E CUSTOS */}
Custos e Comercialização
Custo Médio Calculado (R$)
Preço de Venda Praticado (R$)
{/* ÁREA DE NOTIFICAÇÃO E AÇÃO */}


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
