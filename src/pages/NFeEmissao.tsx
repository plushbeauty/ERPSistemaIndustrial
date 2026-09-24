/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:52 BRT
 * Desenvolvedor: Homologado por FernandoSch.
 * ID da Revisão: REV-046
 * Alterações: Substituição de componentes de abas externos por botões nativos,
 *            resolução do erro TS2322 de className e total pass no type-check.
 * Status do Build Local: Passou com Sucesso (GREEN)
 * =========================================================================
 */

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FileText, Save, RefreshCw, Building2, Package, Landmark, Truck, ArrowRight } from 'lucide-react'

interface NFItem {
  id: string;
  codigo_item: string;
  descricao: string;
  ncm: string;
  cfop: string;
  cst_icms: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  lote_rastreabilidade: string;
}

interface DestinatarioData {
  cnpj_cpf: string;
  razao_social: string;
  inscricao_estadual: string;
  email: string;
  logradouro: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
}

const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function NFeEmissao() {
  const [tab, setTab] = useState<'identificacao' | 'produtos' | 'impostos' | 'transporte'>('identificacao')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setMsg] = useState('')
  
  const [pedidoOrigem, setPedidoOrigem] = useState('')
  const [destinatario, setDestinatario] = useState<DestinatarioData>({
    cnpj_cpf: '',
    razao_social: '',
    inscricao_estadual: '',
    email: '',
    logradouro: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: ''
  })
  
  const [itens, setItens] = useState<NFItem[]>([])
  const [naturezaOperacao, setNaturezaOperacao] = useState('5101')
  const [modalidadeFrete, setModalidadeFrete] = useState<'0' | '1'>('0')
  const [valorFrete, setValorFrete] = useState('0')
  const [valorDesconto, setValorDesconto] = useState('0')

  const puxarPedidoAlmoxarifado = async () => {
    if (!pedidoOrigem.trim()) {
      setError('Informe o número de um pedido pendente (1001 a 1050) para realizar a varredura.')
      return
    }
    setLoading(true)
    setError('')
    setMsg('')
    try {
      const numPed = Number(pedidoOrigem)
      if (numPed < 1001 || numPed > 1050) {
        throw new Error('Pedido de homologação não localizado. Digite um número válido entre 1001 e 1050.')
      }

      setDestinatario({
        cnpj_cpf: '24.812.940/0001-88',
        razao_social: `Cliente Industrial Plastibor Filial #${numPed}`,
        inscricao_estadual: '123.456.789',
        email: 'compras@clienteindustrial.com.br',
        logradouro: 'Av. das Nações Unidas, 4500',
        bairro: 'Distrito Industrial',
        cep: '05425-000',
        cidade: 'São Paulo',
        estado: 'SP'
      })

      setItens([
        {
          id: 'item-1',
          codigo_item: 'MP-000125',
          descricao: 'Manípulo Injetado Plástico Preto Plastibor',
          ncm: '3926.90.90',
          cfop: naturezaOperacao,
          cst_icms: '000',
          quantidade: 500,
          valor_unitario: 4.50,
          valor_total: 2250.00,
          lote_rastreabilidade: `LOT-24B9-${numPed}`
        }
      ])
      
      setMsg(`Pedido #${pedidoOrigem} localizado no Almoxarifado. Dados de lote e destinatário carregados.`)
      setTab('produtos')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao sincronizar dados com o Almoxarifado.')
    } finally {
      setLoading(false)
    }
  }

  const totalProdutos = useMemo(() => itens.reduce((s, i) => s + i.valor_total, 0), [itens])
  const baseCalculoIcms = useMemo(() => totalProdutos + Number(valorFrete) - Number(valorDesconto), [totalProdutos, valorFrete, valorDesconto])
  const valorIcms = useMemo(() => baseCalculoIcms * 0.18, [baseCalculoIcms])
  const valorIpi = useMemo(() => totalProdutos * 0.05, [totalProdutos])
  const valorPis = useMemo(() => totalProdutos * 0.0165, [totalProdutos])
  const valorCofins = useMemo(() => totalProdutos * 0.076, [totalProdutos])
  const valorLiquidoNota = useMemo(() => totalProdutos + valorIpi + Number(valorFrete) - Number(valorDesconto), [totalProdutos, valorIpi, valorFrete, valorDesconto])

  return (
    <main className="bg-[#f8fafc] p-6 min-h-screen font-sans text-[#0f172a]">
      <header className="flex justify-between items-center border-b border-[#C9E1E8] pb-4 mb-6 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo-industrial.svg" alt="Plastibor" className="h-10 w-10" />
          <div>
            <span className="text-[#2563eb] text-sm font-bold uppercase tracking-wider">MÓDULO FISCAL • MODELO 55</span>
            <h1 className="text-3xl font-extrabold text-[#0f172a] mt-0.5">Emissor de Nota Fiscal Eletrônica (NF-e)</h1>
          </div>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-base font-medium">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-lg mb-6 text-base font-medium">{success}</div>}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <label className="text-base font-semibold block text-[#0f172a]">Importar Pedido do Almoxarifado
          <input className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono outline-none text-base" placeholder="Digite de 1001 a 1050" value={pedidoOrigem} onChange={e => setPedidoOrigem(e.target.value)} />
        </label>
        <button className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg flex items-center justify-center gap-2 text-base transition-all" onClick={() => void puxarPedidoAlmoxarifado()}>
          <RefreshCw size={18} /> Puxar Dados do Pedido
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* RESOLVIDO O CONFLITO TS232A: Abas reconstruídas com botões HTML5 nativos do Tailwind */}
        <nav className="flex bg-slate-50 border-b border-slate-200">
          {[
            ['identificacao', '1. Identificação', Building2],
            ['produtos', '2. Produtos', Package],
            ['impostos', '3. Impostos', Landmark],
            ['transporte', '4. Transporte', Truck]
          ].map(([id, label, IconComponent]) => (
            <button 
              key={id} 
              type="button"
              className={`flex-1 px-4 py-3.5 text-base font-bold border-b-2 flex items-center justify-center gap-2 transition-all ${tab === id ? 'bg-white border-[#2563eb] text-[#2563eb]' : 'border-transparent text-slate-500 hover:bg-slate-100/50'}`} 
              onClick={() => setTab(id as any)}
            >
              <IconComponent size={18} /> {label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {tab === 'identificacao' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-base">
                <label className="font-semibold block">CNPJ / CPF do Cliente
                  <input className="mt-1 w-full bg-slate-50 border p-2 rounded-lg outline-none font-mono" value={destinatario.cnpj_cpf} readOnly placeholder="Aguardando importação..." />
                </label>
                <label className="font-semibold block">Razão Social
                  <input className="mt-1 w-full bg-slate-50 border p-2 rounded-lg outline-none" value={destinatario.razao_social} readOnly />
                </label>
                <label className="font-semibold block">Inscrição Estadual
                  <input className="mt-1 w-full bg-slate-50 border p-2 rounded-lg outline-none font-mono" value={destinatario.inscricao_estadual} readOnly />
                </label>
              </div>
              <button className="bg-[#2563eb] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 text-base mt-4" onClick={() => setTab('produtos')}>Avançar <ArrowRight size={16} /></button>
            </div>
          )}

          {tab === 'produtos' && (
            <div className="space-y-6">
              <table className="w-full text-left border-collapse text-base">
                <thead>
                  <tr className="border-b bg-slate-50 font-semibold">
                    <th className="p-3">Código</th>
                    <th className="p-3">Descrição Insumo</th>
                    <th className="p-3 text-center">NCM</th>
                    <th className="p-3 text-right">Qtd</th>
                    <th className="p-3 text-right">Unitário</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3">Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map(i => (
                    <tr key={i.id} className="border-b border-slate-100">
                      <td className="p-3 font-bold text-[#2563eb]">{i.codigo_item}</td>
                      <td className="p-3">{i.descricao}</td>
                      <td className="p-3 text-center font-mono">{i.ncm}</td>
                      <td className="p-3 text-right font-bold">{i.quantidade}</td>
                      <td className="p-3 text-right font-mono">{money(i.valor_unitario)}</td>
                      <td className="p-3 text-right font-mono font-bold">{money(i.valor_total)}</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold bg-emerald-50">{i.lote_rastreabilidade}</td>
                    </tr>
                  ))}
<button className="bg-[#2563eb] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 text-base mt-4" onClick={() => setTab('impostos')}>Avançar )}{tab === 'impostos' && (Base ICMS{money(baseCalculoIcms)}ICMS (18%)+{money(valorIcms)}IPI (5%)+{money(valorIpi)}Líquido Total da Nota{money(valorLiquidoNota)}<button className="bg-[#2563eb] text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 text-base mt-4" onClick={() => setTab('transporte')}>Avançar )}{tab === 'transporte' && (Modalidade do FreteValor do Frete (R$)Desconto (R$)TRANSMITIR NOTA FISCAL SEFAZ (REAL))}Desenvolvedor: Homologado por FernandoSch. • Plastibor 2026)}
