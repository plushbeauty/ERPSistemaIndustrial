/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-FISCAL-NFE-EMISSOR-20261102-01 — tela reorganizada no formato do Emissor Gratuito da SEFAZ (abas, barra de ações, painel de advertências e grade Gerenciar/Transmitir notas); numeração reservada pelo banco, modalidade de frete real, cobrança pela RPC do banco, travamento automático quando o documento sai de Rascunho
 * @STATUS_APROVACAO: REGRAS CONFERIDAS NAS MIGRATIONS E NA EDGE FUNCTION emitir-nfe · VALIDAÇÃO ESTÁTICA (TYPECHECK, LINT, GUARDS, BUILD) · HOMOLOGAÇÃO NA SEFAZ PENDENTE DE CERTIFICADO DIGITAL E CREDENCIAIS DO CLIENTE
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileWarning, FolderSearch, Plus, Printer, RefreshCw, Save, Search, Send, ShieldAlert, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { erroBancoNaoInstalado, MIGRACAO_NFE_PAGAMENTO } from '../lib/supabaseRpcStatus'

type Aba = 'identificacao' | 'emitente' | 'destinatario' | 'produtos' | 'transporte' | 'volumens' | 'cobranca' | 'tributos' | 'status'
type Visao = 'emissao' | 'gerenciar'

const ABAS: { id: Aba; titulo: string }[] = [
  { id: 'identificacao', titulo: 'Identificação' },
  { id: 'emitente', titulo: 'Emitente' },
  { id: 'destinatario', titulo: 'Destinatário' },
  { id: 'produtos', titulo: 'Produtos e Serviços' },
  { id: 'transporte', titulo: 'Transporte' },
  { id: 'volumens', titulo: 'Volumens' },
  { id: 'cobranca', titulo: 'Cobrança' },
  { id: 'tributos', titulo: 'Tributos' },
  { id: 'status', titulo: 'Status SEFAZ' },
]

// Tabela oficial de formas de pagamento da NF-e (código tPag), a mesma usada pelo integrador Focus.
const FORMAS_PAGAMENTO: { codigo: string; descricao: string }[] = [
  { codigo: '01', descricao: 'Dinheiro' },
  { codigo: '02', descricao: 'Cheque' },
  { codigo: '03', descricao: 'Cartão de crédito' },
  { codigo: '04', descricao: 'Cartão de débito' },
  { codigo: '05', descricao: 'Crédito loja/crediário' },
  { codigo: '10', descricao: 'Vale alimentação' },
  { codigo: '11', descricao: 'Vale refeição' },
  { codigo: '12', descricao: 'Vale presente' },
  { codigo: '13', descricao: 'Vale transporte' },
  { codigo: '14', descricao: 'Requisição de pagamento' },
  { codigo: '15', descricao: 'Boleto bancário' },
  { codigo: '16', descricao: 'Depósito bancário' },
  { codigo: '17', descricao: 'Cartão de crédito - loja' },
  { codigo: '18', descricao: 'Cartão de débito - loja' },
  { codigo: '19', descricao: 'Benefício eventuais' },
  { codigo: '20', descricao: 'Pagamento prévio - VA' },
  { codigo: '21', descricao: 'Pix' },
  { codigo: '23', descricao: 'Transferência eletrônica - TED/DOC/TET' },
  { codigo: '24', descricao: 'Vale digital - Marketplace' },
  { codigo: '90', descricao: 'Inexistência de pagamento' },
  { codigo: '91', descricao: 'Operação em nome do emitente (autorização)' },
  { codigo: '99', descricao: 'Outros' },
]

const MODALIDADES_FRETE: { codigo: string; descricao: string }[] = [
  { codigo: '0', descricao: '0 - Por conta do emitente (CIF)' },
  { codigo: '1', descricao: '1 - Por conta do destinatário (FOB)' },
  { codigo: '2', descricao: '2 - Por conta de terceiros' },
  { codigo: '3', descricao: '3 - Transporte próprio (emitente)' },
  { codigo: '4', descricao: '4 - Transporte próprio (destinatário)' },
  { codigo: '9', descricao: '9 - Sem ocorrência de transporte' },
]

type Cliente = { id: string; nome: string | null; documento: string | null; email: string | null; endereco: string | null; cidade: string | null; estado: string | null }
type Produto = { id: string; codigo: string; nome: string; unidade: string | null; ncm: string | null; estoque_atual: number | null; preco_venda: number | null; cfop_saida: string | null; cst_icms: string | null; aliquota_icms: number | null; aliquota_ipi: number | null; aliquota_pis: number | null; aliquota_cofins: number | null }
type Item = { produto_id: string; codigo_produto: string; descricao_produto: string; ncm: string; cfop: string; origem: string; cst_csosn: string; unidade: string; quantidade: string; valor_unitario: string; valor_desconto: string; icms_aliquota: string; ipi_aliquota: string; pis_aliquota: string; cofins_aliquota: string; pis_cst: string; cofins_cst: string; lote: string }
type Pagamento = { forma: string; forma_descricao: string; condicao: 'a_vista' | 'a_prazo'; valor: string; troco: string; bandeira: string; observacao: string }
type Emitente = { razao_social: string; nome_fantasia: string; cnpj: string; ie: string; endereco: string; cidade: string; uf: string; cep: string }
type Transportadora = { id: string; codigo: string | null; razao_social: string | null; cnpj: string | null; uf: string | null }
type ConfigFiscal = { ambiente: string; provedor: string; regime: string; habilitada: boolean; serie: string }
type Situacao = { status: string; ambiente: string; chave: string; protocolo: string; mensagem: string; xml_path: string; pdf_path: string; emissao: string; autorizacao: string }
type Problema = { campo: string; aba: Aba; mensagem: string }
type DocumentoLinha = { id: string; serie: number | null; numero: number | null; status: string; ambiente: string | null; data_emissao: string | null; destinatario_nome: string | null; destinatario_documento: string | null; destinatario_uf: string | null; chave_acesso: string | null; valor_total: number | null; autorizada_em: string; xml_path: string; pdf_path: string }
type NotaAnexada = { documento_id: string; authorized_at: string | null; danfe_pdf_path: string | null; xml_autorizado_path: string | null }

function campoInicial() {
  const hojeIso = new Date().toISOString().slice(0, 10)
  return {
    tipo: 'NF-e', serie: '1', numero: '', natureza_operacao: 'Venda de mercadoria', cfop: '5102',
    ambiente: 'homologacao', data_emissao: hojeIso, data_saida: hojeIso,
    destinatario_nome: '', destinatario_documento: '', destinatario_ie: '', destinatario_email: '',
    destinatario_endereco: '', destinatario_bairro: '', destinatario_cep: '', destinatario_cidade: '', destinatario_uf: '',
    modalidade_frete: '9', transportadora: '', placa: '', uf_transportadora: '',
    volumes: '0', peso_liquido: '0', peso_bruto: '0',
    valor_frete: '0', valor_outras_despesas: '0', valor_desconto: '0',
    base_calculo_icms: '0', valor_icms: '0', base_icms_st: '0', valor_icms_st: '0',
    valor_ipi: '0', valor_pis: '0', valor_cofins: '0',
  }
}
type Cabecalho = ReturnType<typeof campoInicial>

const num = (v: string | number | null | undefined): number => Number(v ?? 0) || 0
const money = (v: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const digits = (v: string): string => v.replace(/\D/g, '')
const dataCurta = (v: string | null | undefined): string => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-')
const redondo = (v: number): number => Math.round(v * 100) / 100

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
function digitoVerificador(d: string, pesos: number[]): number {
  let soma = 0
  for (let i = 0; i < pesos.length; i++) soma += Number(d[i]) * pesos[i]
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}
function cpfValido(v: string): boolean {
  const d = digits(v)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += Number(d[i]) * (10 - i)
  const resto1 = (soma * 10) % 11
  if ((resto1 === 10 ? 0 : resto1) !== Number(d[9])) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (11 - i)
  const resto2 = (soma * 10) % 11
  return (resto2 === 10 ? 0 : resto2) === Number(d[10])
}
function cnpjValido(v: string): boolean {
  const d = digits(v)
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  return digitoVerificador(d, PESOS_CNPJ_1) === Number(d[12]) && digitoVerificador(d, PESOS_CNPJ_2) === Number(d[13])
}
function documentoValido(v: string): boolean {
  const d = digits(v)
  return d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false
}

const novoItem = (): Item => ({
  produto_id: '', codigo_produto: '', descricao_produto: '', ncm: '', cfop: '', origem: '0', cst_csosn: '',
  unidade: 'UN', quantidade: '1', valor_unitario: '0', valor_desconto: '0', icms_aliquota: '0', ipi_aliquota: '0',
  pis_aliquota: '0', cofins_aliquota: '0', pis_cst: '', cofins_cst: '', lote: '',
})
const novoPagamento = (): Pagamento => ({ forma: '01', forma_descricao: 'Dinheiro', condicao: 'a_vista', valor: '0', troco: '', bandeira: '', observacao: '' })

const inputBase = 'w-full'
const celula = 'w-full'

function Campo({ rotulo, dica, valor, onChange, largura = 'erp-field-text', tipo = 'text', somenteLeitura = false, opcoes, placeholder }: {
  rotulo: string
  dica?: string
  valor: string
  onChange?: (v: string) => void
  largura?: string
  tipo?: string
  somenteLeitura?: boolean
  opcoes?: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <label className={`${largura} flex flex-col`}>
      <span>{rotulo}</span>
      {opcoes ? (
        <select className={inputBase} value={valor} disabled={somenteLeitura} onChange={e => onChange?.(e.target.value)}>
          {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input className={inputBase} type={tipo} value={valor} readOnly={somenteLeitura} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} />
      )}
      {dica && <span className="mt-0.5 text-[9px] leading-tight text-slate-500">{dica}</span>}
    </label>
  )
}

function Bloco({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="mb-2 border border-slate-200 bg-white p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[#17445A]">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

function Kpi({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <article className="flex min-h-[58px] flex-col justify-center border border-slate-200 bg-white px-2.5 py-1.5">
      <span className="text-[9px] uppercase tracking-wide text-slate-500">{rotulo}</span>
      <strong className="text-[14px] font-semibold text-[#123B50]">{valor}</strong>
      {detalhe && <span className="text-[9px] text-slate-500">{detalhe}</span>}
    </article>
  )
}

export default function NFeEmissao() {
  const [visao, setVisao] = useState<Visao>('emissao')
  const [aba, setAba] = useState<Aba>('identificacao')
  const [form, setForm] = useState<Cabecalho>(campoInicial)
  const [itens, setItens] = useState<Item[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([novoPagamento()])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [emitente, setEmitente] = useState<Emitente | null>(null)
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [configFiscal, setConfigFiscal] = useState<ConfigFiscal | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [transportadoraSel, setTransportadoraSel] = useState('')
  const [documentoId, setDocumentoId] = useState('')
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoLinha[]>([])
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [filtros, setFiltros] = useState({ inicial: '', final: '', situacao: '', destinatario: '', chave: '' })
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [pendenciaBanco, setPendenciaBanco] = useState('')

  const set = useCallback((chave: keyof Cabecalho, valor: string) => {
    setForm(atual => ({ ...atual, [chave]: valor }))
  }, [])

  useEffect(() => {
    const carregarCadastros = async () => {
      const [c, p] = await Promise.all([
        supabase.from('erp_clientes').select('id,nome,documento,email,endereco,cidade,estado').eq('ativo', true).order('nome').limit(1000),
        supabase.from('erp_produtos').select('id,codigo,nome,unidade,ncm,estoque_atual,preco_venda,cfop_saida,cst_icms,aliquota_icms,aliquota_ipi,aliquota_pis,aliquota_cofins').eq('ativo', true).order('codigo').limit(2000),
      ])
      if (c.error) setErro(`Não foi possível ler o cadastro de clientes: ${c.error.message}`)
      if (p.error) setErro(`Não foi possível ler o cadastro de produtos: ${p.error.message}`)
      setClientes((c.data ?? []) as unknown as Cliente[])
      setProdutos((p.data ?? []) as unknown as Produto[])
    }
    void carregarCadastros()
  }, [])

  useEffect(() => {
    const carregarEmitente = async () => {
      const empresa = await supabase.rpc('erp_current_empresa_id')
      if (empresa.error || !empresa.data) {
        setErro('Empresa da sessão não identificada: faça login novamente antes de emitir.')
        return
      }
      const idEmpresa = String(empresa.data)
      setEmpresaId(idEmpresa)
      const [dados, transportes, configuracao] = await Promise.all([
        supabase.from('erp_empresas')
          .select('razao_social,nome_fantasia,cnpj,endereco,cidade,uf,cep,inscricao_estadual')
          .eq('id', idEmpresa).maybeSingle(),
        supabase.from('erp_transportadoras')
          .select('id,codigo,razao_social,cnpj,uf')
          .eq('empresa_id', idEmpresa).eq('ativo', true).order('razao_social').limit(500),
        supabase.from('erp_config_fiscal')
          .select('ambiente,provedor,regime_tributario,habilitado_nfe,serie_nfe')
          .eq('empresa_id', idEmpresa).maybeSingle(),
      ])
      if (transportes.error) setErro(`O cadastro de transportadoras não pôde ser lido: ${transportes.error.message}`)
      if (configuracao.error) setErro(`A configuração fiscal não pôde ser lida: ${configuracao.error.message}`)
      setTransportadoras(((transportes.data ?? []) as unknown) as Transportadora[])
      const cfg = (configuracao.data ?? null) as Record<string, unknown> | null
      if (cfg) {
        const ambienteCfg = String(cfg.ambiente ?? '').toLowerCase()
        setConfigFiscal({
          ambiente: ambienteCfg,
          provedor: String(cfg.provedor ?? ''),
          regime: String(cfg.regime_tributario ?? ''),
          habilitada: cfg.habilitado_nfe === true,
          serie: String(cfg.serie_nfe ?? ''),
        })
        const serieCfg = digits(String(cfg.serie_nfe ?? ''))
        if (serieCfg) set('serie', serieCfg.slice(0, 3))
        if (ambienteCfg === 'homologacao' || ambienteCfg === 'producao') set('ambiente', ambienteCfg)
      }
      const linha = (dados.data ?? {}) as Record<string, unknown>
      setEmitente({
        razao_social: String(linha.razao_social ?? ''),
        nome_fantasia: String(linha.nome_fantasia ?? ''),
        cnpj: digits(String(linha.cnpj ?? '')),
        ie: String(linha.inscricao_estadual ?? ''),
        endereco: String(linha.endereco ?? ''),
        cidade: String(linha.cidade ?? ''),
        uf: String(linha.uf ?? ''),
        cep: digits(String(linha.cep ?? '')),
      })
    }
    void carregarEmitente()
  }, [])

  const totalItem = useCallback((i: Item): number => redondo(num(i.quantidade) * num(i.valor_unitario) - num(i.valor_desconto)), [])

  const totais = useMemo(() => {
    const produtos = redondo(itens.reduce((s, i) => s + totalItem(i), 0))
    const frete = num(form.valor_frete)
    const outras = num(form.valor_outras_despesas)
    const desconto = num(form.valor_desconto)
    const base = redondo(itens.reduce((s, i) => s + Math.max(0, num(i.quantidade) * num(i.valor_unitario) - num(i.valor_desconto)), 0))
    const icms = redondo(itens.reduce((s, i) => s + totalItem(i) * num(i.icms_aliquota) / 100, 0))
    const ipi = redondo(itens.reduce((s, i) => s + totalItem(i) * num(i.ipi_aliquota) / 100, 0))
    const pis = redondo(itens.reduce((s, i) => s + totalItem(i) * num(i.pis_aliquota) / 100, 0))
    const cofins = redondo(itens.reduce((s, i) => s + totalItem(i) * num(i.cofins_aliquota) / 100, 0))
    const icmsSt = num(form.valor_icms_st)
    const total = redondo(produtos + frete + outras + ipi + icmsSt - desconto)
    return { produtos, frete, outras, desconto, base, icms, ipi, pis, cofins, icmsSt, total }
  }, [itens, form.valor_frete, form.valor_outras_despesas, form.valor_desconto, form.valor_icms_st, totalItem])

  const pagamentosTotais = useMemo(() => pagamentos.reduce((s, p) => s + num(p.valor), 0), [pagamentos])

  const bloqueado = Boolean(situacao && situacao.status !== 'Rascunho')

  const problemas = useMemo(() => {
    const lista: Problema[] = []
    const push = (campo: string, destino: Aba, mensagem: string) => lista.push({ campo, aba: destino, mensagem })
    if (!form.serie.trim()) push('serie', 'identificacao', 'Informe a série da NF-e.')
    if (digits(form.cfop).length !== 4) push('cfop', 'identificacao', 'O CFOP da operação deve ter 4 dígitos.')
    if (!form.natureza_operacao.trim()) push('natureza_operacao', 'identificacao', 'Informe a natureza da operação.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.data_emissao)) push('data_emissao', 'identificacao', 'Informe a data de emissão.')
    if (form.data_saida && form.data_saida < form.data_emissao) push('data_saida', 'identificacao', 'A data de saída não pode ser anterior à emissão.')
    if (!form.destinatario_nome.trim()) push('destinatario_nome', 'destinatario', 'Selecione ou informe o destinatário.')
    if (!form.destinatario_documento) push('destinatario_documento', 'destinatario', 'Informe o CPF (11) ou CNPJ (14) do destinatário.')
    else if (!documentoValido(form.destinatario_documento)) push('destinatario_documento', 'destinatario', 'CPF/CNPJ inválido: os dígitos verificadores não conferem.')
    if (!form.destinatario_endereco.trim()) push('destinatario_endereco', 'destinatario', 'O logradouro do destinatário é obrigatório para a transmissão.')
    if (!form.destinatario_bairro.trim()) push('destinatario_bairro', 'destinatario', 'O bairro do destinatário é obrigatório para a transmissão.')
    if (!form.destinatario_cidade.trim()) push('destinatario_cidade', 'destinatario', 'O município do destinatário é obrigatório para a transmissão.')
    if (!/^[A-Z]{2}$/.test(form.destinatario_uf)) push('destinatario_uf', 'destinatario', 'A UF do destinatário deve ter 2 letras.')
    if (digits(form.destinatario_cep).length !== 8) push('destinatario_cep', 'destinatario', 'O CEP do destinatário deve ter 8 dígitos.')
    if (form.destinatario_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.destinatario_email)) push('destinatario_email', 'destinatario', 'E-mail em formato inválido.')
    if (!itens.length) push('itens', 'produtos', 'Inclua pelo menos um produto do cadastro.')
    itens.forEach((i, indice) => {
      if (!i.codigo_produto.trim()) push(`codigo_${indice}`, 'produtos', `O código do item ${indice + 1} é obrigatório (coluna NOT NULL do banco).`)
      if (!i.descricao_produto.trim()) push(`descricao_${indice}`, 'produtos', `A descrição do item ${indice + 1} é obrigatória.`)
      if (digits(i.ncm).length !== 8) push(`ncm_${indice}`, 'tributos', `NCM do item ${indice + 1} deve ter 8 dígitos.`)
      if (digits(i.cfop).length !== 4) push(`cfop_${indice}`, 'tributos', `CFOP do item ${indice + 1} deve ter 4 dígitos.`)
      if (!/^[0-8]$/.test(i.origem)) push(`origem_${indice}`, 'tributos', `Origem do item ${indice + 1} deve ser um dígito de 0 a 8.`)
      if (!/^(\d{3}|CSOSN\d{4})$/i.test(i.cst_csosn.trim())) push(`cst_${indice}`, 'tributos', `CST/CSOSN do item ${indice + 1} deve ter 3 dígitos ou CSOSN com 4 dígitos.`)
      if (num(i.quantidade) <= 0) push(`qtd_${indice}`, 'produtos', `A quantidade do item ${indice + 1} deve ser maior que zero.`)
      if (num(i.valor_unitario) < 0) push(`vu_${indice}`, 'produtos', `O valor unitário do item ${indice + 1} é inválido.`)
      if (num(i.valor_desconto) > redondo(num(i.quantidade) * num(i.valor_unitario))) push(`desc_${indice}`, 'produtos', `O desconto do item ${indice + 1} é maior que o valor bruto da linha.`)
      ;([['icms_aliquota', 'ICMS'], ['ipi_aliquota', 'IPI'], ['pis_aliquota', 'PIS'], ['cofins_aliquota', 'COFINS']] as const).forEach(([chave, rotulo]) => {
        const aliquota = num(i[chave])
        if (aliquota < 0 || aliquota > 100) push(`${chave}_${indice}`, 'tributos', `Alíquota de ${rotulo} do item ${indice + 1} deve estar entre 0 e 100.`)
      })
    })
    if (totais.desconto > totais.produtos) push('valor_desconto', 'transporte', 'O desconto do documento é maior que o valor dos produtos.')
    if (num(form.peso_bruto) < num(form.peso_liquido)) push('peso_bruto', 'volumens', 'O peso bruto não pode ser menor que o peso líquido.')
    if (totais.icmsSt > 0 && num(form.base_icms_st) <= 0) push('base_icms_st', 'tributos', 'Há ICMS-ST sem base de cálculo informada.')
    if (!documentoId) push('documento', 'cobranca', 'Salve o rascunho antes de gravar a cobrança: o pagamento é vinculado ao documento já registrado.')
    else {
      if (!pagamentos.length) push('pagamentos', 'cobranca', 'Informe ao menos uma forma de pagamento.')
      pagamentos.forEach((p, indice) => {
        const codigo = digits(p.forma)
        if (codigo.length < 1 || codigo.length > 2 || num(codigo) < 1 || num(codigo) > 99) push(`forma_${indice}`, 'cobranca', `Forma de pagamento (tPag) da linha ${indice + 1} deve ser um código de 01 a 99.`)
        if (!p.forma_descricao.trim()) push(`forma_descricao_${indice}`, 'cobranca', `Descreva a forma de pagamento da linha ${indice + 1}.`)
        if (num(p.valor) < 0) push(`valor_${indice}`, 'cobranca', `O valor pago da linha ${indice + 1} é inválido.`)
        if (p.troco && num(p.troco) > num(p.valor)) push(`troco_${indice}`, 'cobranca', `O troco da linha ${indice + 1} não pode ser maior que o valor pago.`)
        if (digits(p.bandeira).length > 2) push(`bandeira_${indice}`, 'cobranca', `A bandeira da linha ${indice + 1} deve ter no máximo 2 dígitos.`)
        if (codigo === '90' && pagamentos.length > 1) push(`forma_${indice}`, 'cobranca', 'A forma 90 (inexistência de pagamento) deve ser a única linha de cobrança.')
      })
      if (redondo(pagamentosTotais) !== redondo(totais.total)) push('soma_pagamentos', 'cobranca', `A soma dos pagamentos (${money(pagamentosTotais)}) precisa ser igual ao total da nota (${money(totais.total)}).`)
    }
    if (!configFiscal) push('config_fiscal', 'status', 'A empresa ainda não tem configuração fiscal gravada: sem ela o integrador recusa a transmissão com "Configuração fiscal não encontrada".')
    else {
      if (!configFiscal.habilitada) push('habilitado_nfe', 'status', 'NF-e não está habilitada na configuração fiscal da empresa.')
      if (!configFiscal.regime) push('regime_tributario', 'status', 'CONFIGURAÇÃO FISCAL PENDENTE: informe o regime tributário do emitente antes de transmitir.')
      if (configFiscal.provedor.toLowerCase() !== 'notaas') push('provedor', 'status', `O provedor fiscal configurado é "${configFiscal.provedor || 'vazio'}"; o adaptador disponível é Notaas.`)
      if (configFiscal.ambiente && configFiscal.ambiente !== form.ambiente) push('ambiente', 'status', `O rascunho está em "${form.ambiente}" mas o ambiente fiscal da empresa é "${configFiscal.ambiente}": a transmissão é recusa até igualar.`)
    }
    return lista
  }, [form, itens, pagamentos, pagamentosTotais, totais, documentoId, configFiscal, totalItem])

  const erroDe = useCallback((campo: string): string => problemas.find(p => p.campo === campo)?.mensagem ?? '', [problemas])
  const pendenciasPorAba = useMemo(() => {
    const mapa = new Map<Aba, number>()
    problemas.forEach(p => mapa.set(p.aba, (mapa.get(p.aba) ?? 0) + 1))
    return mapa
  }, [problemas])

  // Pendência de "status" é do ambiente fiscal (configuração da empresa). Ela não impede gravar o
  // rascunho — o rascunho é justamente onde se arruma a nota — mas impede a transmissão, que o
  // integrador recusaria.
  const bloqueiosRascunho = useMemo(() => problemas.filter(p => p.aba !== 'cobranca' && p.aba !== 'status'), [problemas])
  const bloqueiosTransmissao = useMemo(() => problemas.filter(p => p.aba !== 'cobranca'), [problemas])

  const clienteFiltrado = useMemo(() => {
    const q = buscaCliente.trim().toLowerCase()
    return clientes.filter(c => !q || [c.nome, c.documento, c.cidade].join(' ').toLowerCase().includes(q)).slice(0, 8)
  }, [clientes, buscaCliente])
  const produtoFiltrado = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase()
    return produtos.filter(p => !q || [p.codigo, p.nome, p.ncm].join(' ').toLowerCase().includes(q)).slice(0, 40)
  }, [produtos, buscaProduto])

  const escolherCliente = (c: Cliente) => {
    set('destinatario_nome', c.nome ?? '')
    set('destinatario_documento', digits(c.documento ?? ''))
    set('destinatario_email', c.email ?? '')
    set('destinatario_endereco', c.endereco ?? '')
    set('destinatario_cidade', c.cidade ?? '')
    set('destinatario_uf', (c.estado ?? '').slice(0, 2).toUpperCase())
    setBuscaCliente(c.nome ?? '')
  }

  const escolherTransportadora = (id: string) => {
    setTransportadoraSel(id)
    const t = transportadoras.find(x => x.id === id)
    if (!t) return
    set('transportadora', t.razao_social ?? '')
    set('uf_transportadora', (t.uf ?? '').slice(0, 2).toUpperCase())
  }

  const adicionarItem = (p: Produto) => {
    setItens(linha => [...linha, {
      ...novoItem(),
      produto_id: p.id, codigo_produto: p.codigo, descricao_produto: p.nome,
      ncm: digits(p.ncm ?? '').slice(0, 8), cfop: digits(p.cfop_saida ?? '').slice(0, 4),
      cst_csosn: p.cst_icms ?? '', unidade: p.unidade ?? 'UN', valor_unitario: String(num(p.preco_venda)),
      icms_aliquota: String(num(p.aliquota_icms)), ipi_aliquota: String(num(p.aliquota_ipi)),
      pis_aliquota: String(num(p.aliquota_pis)), cofins_aliquota: String(num(p.aliquota_cofins)),
    }])
    setBuscaProduto('')
    setAviso(`Item ${p.codigo} adicionado. Confira NCM, CFOP e CST/CSOSN na aba Tributos antes de transmitir.`)
  }

  const atualizarItem = (indice: number, chave: keyof Item, valor: string) => {
    setItens(linha => linha.map((r, n) => (n === indice ? { ...r, [chave]: valor } : r)))
  }

  const recarregarSituacao = useCallback(async (id: string): Promise<Situacao | null> => {
    const [doc, nota] = await Promise.all([
      supabase.from('erp_documentos_fiscais')
        .select('status,ambiente,valor_total,chave_acesso,mensagem_retorno,xml_storage_path,pdf_storage_path,data_emissao')
        .eq('id', id).maybeSingle(),
      supabase.from('erp_notas_fiscais')
        .select('status,chave_acesso,protocolo_autorizacao,mensagem_sefaz,xml_autorizado_path,danfe_pdf_path,authorized_at,numero')
        .eq('documento_id', id).order('numero', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (doc.error && nota.error) {
      setErro(`Situação do documento não pôde ser consultada: ${doc.error?.message ?? nota.error?.message}`)
      return null
    }
    const d = (doc.data ?? {}) as Record<string, unknown>
    const n = (nota.data ?? {}) as Record<string, unknown> | null
    const carregado: Situacao = {
      status: String(n?.status ?? d.status ?? 'Rascunho'),
      ambiente: String(d.ambiente ?? ''),
      chave: String(n?.chave_acesso ?? d.chave_acesso ?? ''),
      protocolo: String(n?.protocolo_autorizacao ?? ''),
      mensagem: String(n?.mensagem_sefaz ?? d.mensagem_retorno ?? ''),
      xml_path: String(n?.xml_autorizado_path ?? d.xml_storage_path ?? ''),
      pdf_path: String(n?.danfe_pdf_path ?? d.pdf_storage_path ?? ''),
      emissao: String(d.data_emissao ?? ''),
      autorizacao: String(n?.authorized_at ?? ''),
    }
    setSituacao(carregado)
    return carregado
  }, [])

  const carregarDocumentos = useCallback(async () => {
    if (!empresaId) { setDocumentos([]); return }
    let consulta = supabase.from('erp_documentos_fiscais')
      .select('id,serie,numero,status,ambiente,data_emissao,destinatario_nome,destinatario_documento,destinatario_uf,chave_acesso,valor_total')
      .eq('empresa_id', empresaId).eq('tipo', 'NF-e').order('updated_at', { ascending: false }).limit(200)
    if (filtros.inicial) consulta = consulta.gte('data_emissao', `${filtros.inicial}T00:00:00`)
    if (filtros.final) consulta = consulta.lte('data_emissao', `${filtros.final}T23:59:59`)
    if (filtros.situacao) consulta = consulta.eq('status', filtros.situacao)
    if (filtros.destinatario) consulta = consulta.ilike('destinatario_nome', `%${filtros.destinatario}%`)
    if (filtros.chave) consulta = consulta.eq('chave_acesso', digits(filtros.chave))
    const lista = await consulta
    if (lista.error) {
      setErro(`Não foi possível listar as notas: ${lista.error.message}`)
      setDocumentos([])
      return
    }
    const linhas = ((lista.data ?? []) as unknown) as Omit<DocumentoLinha, 'autorizada_em' | 'xml_path' | 'pdf_path'>[]
    const ids = linhas.map(l => l.id)
    let anexos: NotaAnexada[] = []
    if (ids.length) {
      const notas = await supabase.from('erp_notas_fiscais')
        .select('documento_id,authorized_at,danfe_pdf_path,xml_autorizado_path').in('documento_id', ids).limit(500)
      if (notas.error) setErro(`Os anexos das notas não puderam ser lidos: ${notas.error.message}`)
      anexos = ((notas.data ?? []) as unknown) as NotaAnexada[]
    }
    const mapa = new Map<string, NotaAnexada>()
    for (const nota of anexos) mapa.set(String(nota.documento_id), nota)
    setDocumentos(linhas.map(l => {
      const n = mapa.get(l.id)
      return {
        ...l,
        autorizada_em: n?.authorized_at ? String(n.authorized_at) : '',
        pdf_path: n?.danfe_pdf_path ? String(n.danfe_pdf_path) : '',
        xml_path: n?.xml_autorizado_path ? String(n.xml_autorizado_path) : '',
      }
    }))
  }, [empresaId, filtros])

  useEffect(() => {
    if (visao === 'gerenciar' || (empresaId && !documentos.length)) void carregarDocumentos()
  }, [visao, empresaId, documentos.length, carregarDocumentos])

  const montarCabecalho = useCallback((numero: string): Record<string, unknown> => ({
    empresa_id: empresaId,
    tipo: form.tipo, serie: num(form.serie), numero: num(numero),
    natureza_operacao: form.natureza_operacao.trim(), cfop: digits(form.cfop), ambiente: form.ambiente,
    data_emissao: new Date(`${form.data_emissao}T12:00:00`).toISOString(),
    data_saida: form.data_saida ? new Date(`${form.data_saida}T12:00:00`).toISOString() : null,
    destinatario_nome: form.destinatario_nome.trim(), destinatario_documento: digits(form.destinatario_documento),
    destinatario_ie: form.destinatario_ie.trim() || null, destinatario_email: form.destinatario_email.trim() || null,
    destinatario_endereco: form.destinatario_endereco.trim() || null, destinatario_bairro: form.destinatario_bairro.trim() || null,
    destinatario_cep: digits(form.destinatario_cep) || null, destinatario_cidade: form.destinatario_cidade.trim() || null,
    destinatario_uf: form.destinatario_uf.toUpperCase(),
    modalidade_frete: form.modalidade_frete, transportadora: form.transportadora.trim() || null,
    placa: form.placa.trim().toUpperCase() || null, uf_transportadora: form.uf_transportadora.toUpperCase() || null,
    peso_liquido: num(form.peso_liquido), peso_bruto: num(form.peso_bruto), volumes: num(form.volumes),
    valor_produtos: totais.produtos, valor_frete: totais.frete, valor_outras_despesas: totais.outras,
    valor_desconto: totais.desconto, base_calculo_icms: totais.base, valor_icms: totais.icms,
    base_icms_st: num(form.base_icms_st), valor_icms_st: totais.icmsSt, valor_ipi: totais.ipi,
    valor_pis: totais.pis, valor_cofins: totais.cofins, valor_total: totais.total, valor_liquido: totais.total,
  }), [empresaId, form, totais])

  const montarItens = useCallback((): Record<string, unknown>[] => itens.map((i, indice) => ({
    item_numero: indice + 1, produto_id: i.produto_id || null, codigo_produto: i.codigo_produto,
    descricao_produto: i.descricao_produto, ncm: digits(i.ncm), cfop: digits(i.cfop), origem: i.origem || '0',
    cst_csosn: i.cst_csosn.trim() || null, unidade: i.unidade.trim() || 'UN', quantidade: num(i.quantidade),
    valor_unitario: num(i.valor_unitario), valor_total: totalItem(i), valor_desconto: num(i.valor_desconto),
    icms_aliquota: num(i.icms_aliquota), ipi_aliquota: num(i.ipi_aliquota), pis_aliquota: num(i.pis_aliquota),
    cofins_aliquota: num(i.cofins_aliquota), pis_cst: i.pis_cst.trim() || null, cofins_cst: i.cofins_cst.trim() || null,
    lote: i.lote.trim() || null,
  })), [itens, totalItem])

  const salvarRascunho = useCallback(async (): Promise<string | null> => {
    setBusy(true); setErro(''); setAviso(''); setPendenciaBanco('')
    try {
      if (!empresaId) { setErro('A empresa da sessão ainda não foi resolvida pelo banco: recarregue a tela ou faça login novamente. Nada foi gravado.'); return null }
      if (bloqueiosRascunho.length) {
        setErro(`Nada foi gravado. ${bloqueiosRascunho.length} pendência(ões) antes de salvar: ${bloqueiosRascunho[0].mensagem}`)
        setAba(bloqueiosRascunho[0].aba)
        return null
      }
      let numero = form.numero
      if (!numero) {
        const reserva = await supabase.rpc('erp_reservar_numero_nfe', { p_serie: num(form.serie) })
        if (reserva.error || reserva.data == null) throw reserva.error ?? new Error('O banco não devolveu a numeração fiscal reservada.')
        numero = String(reserva.data)
        set('numero', numero)
      }
      const { data, error } = await supabase.rpc('erp_salvar_rascunho_nfe', {
        p_documento_id: documentoId || null,
        p_documento: montarCabecalho(numero),
        p_itens: montarItens(),
      })
      if (error) throw error
      if (!data) throw new Error('A rotina de gravação não retornou o identificador do documento.')
      const id = String(data)
      setDocumentoId(id)
      await recarregarSituacao(id)
      setAviso(`Rascunho gravado pelo banco (documento ${id}). Nenhum pedido à SEFAZ foi enviado.`)
      return id
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao gravar o rascunho fiscal. Nada foi enviado à SEFAZ.')
      return null
    } finally {
      setBusy(false)
    }
  }, [empresaId, bloqueiosRascunho, form.numero, form.serie, documentoId, montarCabecalho, montarItens, recarregarSituacao, set])

  const gravarPagamentos = useCallback(async () => {
    if (!documentoId) { setErro('Salve o rascunho antes de gravar a cobrança.'); return }
    const bloqueios = problemas.filter(p => p.aba === 'cobranca')
    if (bloqueios.length) { setErro(`A cobrança não foi gravada: ${bloqueios[0].mensagem}`); return }
    setBusy(true); setErro(''); setAviso(''); setPendenciaBanco('')
    try {
      const corpo = pagamentos.map((p, indice) => ({
        item_numero: indice + 1, forma: digits(p.forma), forma_descricao: p.forma_descricao.trim(),
        condicao: p.condicao, valor: num(p.valor), troco: p.troco === '' ? null : num(p.troco),
        bandeira: digits(p.bandeira) || null, observacao: p.observacao.trim() || null,
      }))
      const { error } = await supabase.rpc('erp_nfe_pagamento_salvar', { p_documento_id: documentoId, p_pagamentos: corpo })
      if (error) {
        const pendencia = erroBancoNaoInstalado(error, 'erp_nfe_pagamento_salvar', MIGRACAO_NFE_PAGAMENTO)
        if (pendencia) { setPendenciaBanco(pendencia); setAviso('A cobrança não foi gravada porque a rotina ainda não está instalada neste banco.') }
        else throw error
      } else {
        setAviso('Cobrança gravada: o total pago confere com o total do documento.')
        await consultarPagamentos()
      }
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao gravar a cobrança do documento.')
    } finally {
      setBusy(false)
    }
  }, [documentoId, problemas, pagamentos])

  const consultarPagamentos = useCallback(async () => {
    if (!documentoId) return
    const { data, error } = await supabase.rpc('erp_nfe_pagamento_consultar', { p_documento_id: documentoId })
    if (error) {
      const pendencia = erroBancoNaoInstalado(error, 'erp_nfe_pagamento_consultar', MIGRACAO_NFE_PAGAMENTO)
      if (pendencia) setPendenciaBanco(pendencia)
      else setErro(`Cobrança não consultada: ${error.message}`)
      return
    }
    const corpo = data as unknown as Record<string, unknown> | null
    const linhas = (corpo?.pagamentos ?? []) as unknown as Record<string, unknown>[]
    if (!linhas.length) { setAviso('O documento ainda não tem cobrança registrada no banco.'); return }
    setPagamentos(linhas.map(p => ({
      forma: String(p.forma ?? '01'), forma_descricao: String(p.forma_descricao ?? ''),
      condicao: (String(p.condicao ?? 'a_vista') === 'a_prazo' ? 'a_prazo' : 'a_vista'),
      valor: String(p.valor ?? '0'), troco: p.troco == null ? '' : String(p.troco),
      bandeira: String(p.bandeira ?? ''), observacao: String(p.observacao ?? ''),
    })))
    setAviso(`Cobrança recuperada do banco: ${linhas.length} forma(s) de pagamento.`)
  }, [documentoId])

  const transmitir = useCallback(async (id: string) => {
    setBusy(true); setErro(''); setAviso('')
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('emitir-nfe', { body: { documento_id: id } })
      if (invokeError) throw invokeError
      if (!data) throw new Error('O integrador fiscal não retornou confirmação: nada foi declarado como autorizado.')
      await recarregarSituacao(id)
      if (data.status !== 'Autorizada') {
        setAviso(`SEM autorização confirmada. Situação informada pelo integrador: ${String(data.status ?? 'indeterminada')}. ${String(data.error ?? 'A nota permanece em processamento; consulte a situação antes de emitir o DANFE.')}`)
        return
      }
      const corpo = data as unknown as Record<string, unknown>
      if (corpo.ok !== true || !String(corpo.protocolo_autorizacao ?? '').trim() || !/^\d{44}$/.test(String(corpo.chave_acesso ?? ''))) {
        throw new Error('Retorno sem chave de 44 dígitos e protocolo de autorização; nada foi declarado como autorizado.')
      }
      setAviso(`NF-e AUTORIZADA. Chave ${String(corpo.chave_acesso)} · Protocolo ${String(corpo.protocolo_autorizacao)}.`)
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha na transmissão fiscal.')
    } finally {
      setBusy(false)
    }
  }, [recarregarSituacao])

  const solicitarTransmissao = useCallback(async () => {
    const bloqueios = [...bloqueiosTransmissao]
    if (!documentoId) pagamentos.forEach((p, indice) => {
      const codigo = digits(p.forma)
      if (codigo.length < 1 || codigo.length > 2 || num(codigo) < 1 || num(codigo) > 99) bloqueios.push({ campo: `forma_${indice}`, aba: 'cobranca', mensagem: `A linha ${indice + 1} de cobrança tem forma de pagamento inválida e ainda não foi gravada no documento.` })
    })
    if (bloqueios.length) { setErro(`Transmissão bloqueada pela tela: ${bloqueios[0].mensagem}`); setAba(bloqueios[0].aba); return }
    const id = documentoId || await salvarRascunho()
    if (!id) { setErro('Não foi possível gravar o rascunho; a transmissão não foi solicitada.'); return }
    if (!pagamentos.length) { setErro('O documento foi gravado como rascunho, mas sem cobrança não há transmissão: preencha a aba Cobrança e grave a cobrança.'); setAba('cobranca'); return }
    await transmitir(id)
  }, [bloqueiosTransmissao, documentoId, pagamentos, salvarRascunho, transmitir])

  const novoDocumento = () => {
    setVisao('emissao')
    setAba('identificacao')
    setForm(campoInicial())
    setItens([])
    setPagamentos([novoPagamento()])
    setBuscaCliente('')
    setBuscaProduto('')
    setTransportadoraSel('')
    setDocumentoId('')
    setSituacao(null)
    setErro(''); setAviso(''); setPendenciaBanco('')
  }

  const abrirDocumento = useCallback(async (linha: DocumentoLinha) => {
    setBusy(true); setErro(''); setAviso('')
    try {
      const [cab, itensLidos] = await Promise.all([
        supabase.from('erp_documentos_fiscais')
          .select('tipo,serie,numero,natureza_operacao,cfop,ambiente,data_emissao,data_saida,destinatario_nome,destinatario_documento,destinatario_ie,destinatario_email,destinatario_endereco,destinatario_bairro,destinatario_cep,destinatario_cidade,destinatario_uf,modalidade_frete,transportadora,placa,uf_transportadora,peso_liquido,peso_bruto,volumes,valor_frete,valor_outras_despesas,valor_desconto,base_calculo_icms,valor_icms,base_icms_st,valor_icms_st,valor_ipi,valor_pis,valor_cofins')
          .eq('id', linha.id).maybeSingle(),
        supabase.from('erp_documentos_fiscais_itens')
          .select('item_numero,produto_id,codigo_produto,descricao_produto,ncm,cfop,origem,cst_csosn,unidade,quantidade,valor_unitario,valor_desconto,icms_aliquota,ipi_aliquota,pis_aliquota,cofins_aliquota,pis_cst,cofins_cst,lote')
          .eq('documento_id', linha.id).order('item_numero').limit(300),
      ])
      if (cab.error) throw cab.error
      const c = (cab.data ?? {}) as Record<string, unknown>
      setForm({
        tipo: String(c.tipo ?? 'NF-e'), serie: String(c.serie ?? '1'), numero: String(c.numero ?? ''),
        natureza_operacao: String(c.natureza_operacao ?? ''), cfop: String(c.cfop ?? ''), ambiente: String(c.ambiente ?? 'homologacao'),
        data_emissao: c.data_emissao ? String(c.data_emissao).slice(0, 10) : '', data_saida: c.data_saida ? String(c.data_saida).slice(0, 10) : '',
        destinatario_nome: String(c.destinatario_nome ?? ''), destinatario_documento: String(c.destinatario_documento ?? ''),
        destinatario_ie: String(c.destinatario_ie ?? ''), destinatario_email: String(c.destinatario_email ?? ''),
        destinatario_endereco: String(c.destinatario_endereco ?? ''), destinatario_bairro: String(c.destinatario_bairro ?? ''),
        destinatario_cep: String(c.destinatario_cep ?? ''), destinatario_cidade: String(c.destinatario_cidade ?? ''),
        destinatario_uf: String(c.destinatario_uf ?? ''), modalidade_frete: String(c.modalidade_frete ?? '9'),
        transportadora: String(c.transportadora ?? ''), placa: String(c.placa ?? ''), uf_transportadora: String(c.uf_transportadora ?? ''),
        volumes: String(c.volumes ?? 0), peso_liquido: String(c.peso_liquido ?? 0), peso_bruto: String(c.peso_bruto ?? 0),
        valor_frete: String(c.valor_frete ?? 0), valor_outras_despesas: String(c.valor_outras_despesas ?? 0), valor_desconto: String(c.valor_desconto ?? 0),
        base_calculo_icms: String(c.base_calculo_icms ?? 0), valor_icms: String(c.valor_icms ?? 0),
        base_icms_st: String(c.base_icms_st ?? 0), valor_icms_st: String(c.valor_icms_st ?? 0), valor_ipi: String(c.valor_ipi ?? 0),
        valor_pis: String(c.valor_pis ?? 0), valor_cofins: String(c.valor_cofins ?? 0),
      })
      if (itensLidos.error) setErro(`Os itens do documento não puderam ser lidos: ${itensLidos.error.message}`)
      setTransportadoraSel('')
      setItens(((itensLidos.data ?? []) as unknown as Record<string, unknown>[]).map(r => ({
        produto_id: String(r.produto_id ?? ''), codigo_produto: String(r.codigo_produto ?? ''),
        descricao_produto: String(r.descricao_produto ?? ''), ncm: String(r.ncm ?? ''), cfop: String(r.cfop ?? ''),
        origem: String(r.origem ?? '0'), cst_csosn: String(r.cst_csosn ?? ''), unidade: String(r.unidade ?? 'UN'),
        quantidade: String(r.quantidade ?? 0), valor_unitario: String(r.valor_unitario ?? 0), valor_desconto: String(r.valor_desconto ?? 0),
        icms_aliquota: String(r.icms_aliquota ?? 0), ipi_aliquota: String(r.ipi_aliquota ?? 0),
        pis_aliquota: String(r.pis_aliquota ?? 0), cofins_aliquota: String(r.cofins_aliquota ?? 0),
        pis_cst: String(r.pis_cst ?? ''), cofins_cst: String(r.cofins_cst ?? ''), lote: String(r.lote ?? ''),
      })))
      setDocumentoId(linha.id)
      setBuscaCliente(String(c.destinatario_nome ?? ''))
      await recarregarSituacao(linha.id)
      setVisao('emissao')
      setAba('identificacao')
      setAviso(`Documento ${linha.serie ?? ''}/${linha.numero ?? ''} carregado para conferência.`)
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Falha ao abrir o documento.')
    } finally {
      setBusy(false)
    }
  }, [recarregarSituacao])

  const baixarArquivo = useCallback(async (path: string, nome: string) => {
    const { data, error } = await supabase.storage.from('documentos-erp').createSignedUrl(path, 300)
    if (error || !data) { setErro(`Arquivo ${nome} indisponível: ${error?.message ?? 'URL não assinada'}`); return }
    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = nome
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }, [])

  const arquivosSelecionados = useCallback(async (tipo: 'xml' | 'danfe') => {
    const escolhidos = documentos.filter(d => selecionados.includes(d.id))
    const caminhos = escolhidos
      .map(d => ({ id: d.id, numero: d.numero, chave: d.chave_acesso, path: tipo === 'xml' ? d.xml_path : d.pdf_path }))
      .filter(l => l.path)
    if (!caminhos.length) { setErro('Nenhuma nota autorizada com arquivo armazenado foi selecionada. O emissor só exporta documento já processado.'); return }
    for (const linha of caminhos) await baixarArquivo(linha.path, `${tipo}-${linha.chave || linha.numero || linha.id.slice(0, 8)}.${tipo === 'xml' ? 'xml' : 'pdf'}`)
    setAviso(`${caminhos.length} arquivo(s) recuperado(s) do armazenamento. ${caminhos.length < escolhidos.length ? `${escolhidos.length - caminhos.length} seleção(ões) ainda sem arquivo.` : ''}`)
  }, [documentos, selecionados, baixarArquivo])

  const transmitirSelecionadas = useCallback(async () => {
    const alvos = documentos.filter(d => selecionados.includes(d.id) && d.status === 'Rascunho')
    if (!alvos.length) { setErro('Selecione apenas rascunhos para transmitir. Documentos já autorizados não podem ser retransmitidos por esta tela.'); return }
    for (const linha of alvos) await transmitir(linha.id)
    await carregarDocumentos()
  }, [documentos, selecionados, transmitir, carregarDocumentos])

  const alternarSelecao = (id: string) => {
    setSelecionados(atual => atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id])
  }

  const contagens = useMemo(() => ({
    rascunho: documentos.filter(d => d.status === 'Rascunho').length,
    homologacao: documentos.filter(d => d.status === 'Autorizada' && d.ambiente === 'homologacao').length,
    producao: documentos.filter(d => d.status === 'Autorizada' && d.ambiente === 'producao').length,
    processamento: documentos.filter(d => d.status === 'Processando').length,
    rejeitadas: documentos.filter(d => ['Rejeitada', 'Denegada'].includes(d.status)).length,
  }), [documentos])

  const acaoBotao = 'inline-flex items-center gap-1 border border-slate-300 bg-white px-2.5 font-semibold text-[#17445A] disabled:opacity-50'
  const acaoPrimaria = 'inline-flex items-center gap-1 border border-[#236F93] bg-[#2D8DB8] px-2.5 font-semibold text-white disabled:opacity-50'

  return (
    <div className="erp-global-surface fiscal-workspace nfe-page p-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-2.5 py-1.5">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Emitente · modelo 55 · ambiente {form.ambiente === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}</p>
          <p className="text-[11px] font-semibold text-[#123B50]">
            Razão Social: {emitente?.razao_social || 'carregando cadastro da empresa…'}
            {' · '}CNPJ: {emitente?.cnpj || '-'}
            {' · '}IE: {emitente?.ie || 'não cadastrada'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={acaoBotao} onClick={novoDocumento}><Plus size={12} /> Novo</button>
          <button type="button" className={acaoBotao} onClick={() => setVisao(v => (v === 'gerenciar' ? 'emissao' : 'gerenciar'))}><FolderSearch size={12} /> {visao === 'gerenciar' ? 'Voltar à emissão' : 'Gerenciar notas'}</button>
          <button type="button" className={acaoBotao} disabled={busy || bloqueado} onClick={() => void salvarRascunho()}><Save size={12} /> Salvar rascunho</button>
          <button type="button" className={acaoPrimaria} disabled={busy || bloqueado || !itens.length} onClick={() => void solicitarTransmissao()}><Send size={12} /> Transmitir</button>
          <button type="button" className={acaoBotao} disabled={busy || !documentoId} onClick={() => void recarregarSituacao(documentoId)}><RefreshCw size={12} /> Verificar processamento</button>
          <button type="button" className={acaoBotao} disabled={!situacao?.pdf_path} onClick={() => situacao?.pdf_path && void baixarArquivo(situacao.pdf_path, `danfe-${situacao.chave || documentoId}.pdf`)}><Printer size={12} /> DANFE</button>
          <button type="button" className={acaoBotao} disabled={!situacao?.xml_path} onClick={() => situacao?.xml_path && void baixarArquivo(situacao.xml_path, `xml-${situacao.chave || documentoId}.xml`)}><Download size={12} /> XML</button>
        </div>
      </div>

      {erro && (
        <div className="mb-2 flex items-start gap-1.5 border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#9d3037]" role="alert">
          <FileWarning size={13} className="mt-0.5" /><span>{erro}</span>
        </div>
      )}
      {aviso && (
        <div className="mb-2 border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] text-[#17445A]" role="status">{aviso}</div>
      )}
      {bloqueado && (
        <div className="mb-2 flex items-center gap-1.5 border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#8a5a12]">
          <ShieldAlert size={13} /> O documento {String(situacao?.status)} não é mais rascunho: o banco trava cabeçalho e itens depois da submissão. Use Novo para uma nova nota; cancelamento e carta de correção ainda não têm rotina instalada neste banco.
        </div>
      )}
      {pendenciaBanco && (
        <div className="mb-2 border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] text-[#8a5a12]">{pendenciaBanco}</div>
      )}

      {visao === 'gerenciar' ? (
        <Bloco titulo="Gerenciamento de notas">
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <Campo rotulo="Período de" tipo="date" valor={filtros.inicial} largura="erp-field-date" onChange={v => setFiltros(f => ({ ...f, inicial: v }))} />
            <Campo rotulo="a" tipo="date" valor={filtros.final} largura="erp-field-date" onChange={v => setFiltros(f => ({ ...f, final: v }))} />
            <Campo rotulo="Situação da NF-e" valor={filtros.situacao} largura="erp-field-md" onChange={v => setFiltros(f => ({ ...f, situacao: v }))} opcoes={[
              { value: '', label: 'Todas' }, { value: 'Rascunho', label: 'Em digitação' }, { value: 'Processando', label: 'Processando' },
              { value: 'Autorizada', label: 'Autorizada' }, { value: 'Rejeitada', label: 'Rejeitada' }, { value: 'Denegada', label: 'Denegada' }, { value: 'Cancelada', label: 'Cancelada' },
            ]} />
            <Campo rotulo="Destinatário" valor={filtros.destinatario} largura="erp-field-description" placeholder="nome do destinatário" onChange={v => setFiltros(f => ({ ...f, destinatario: v }))} />
            <Campo rotulo="Chave de acesso" valor={filtros.chave} largura="erp-field-md" placeholder="44 dígitos" onChange={v => setFiltros(f => ({ ...f, chave: digits(v).slice(0, 44) }))} />
            <button type="button" className={acaoPrimaria} onClick={() => void carregarDocumentos()}><Search size={12} /> Pesquisar</button>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button type="button" className={acaoBotao} disabled={busy} onClick={() => void transmitirSelecionadas()}><Send size={12} /> Transmitir selecionadas</button>
            <button type="button" className={acaoBotao} onClick={() => void arquivosSelecionados('danfe')}><Printer size={12} /> Imprimir DANFE</button>
            <button type="button" className={acaoBotao} onClick={() => void arquivosSelecionados('xml')}><Download size={12} /> Exportar XML</button>
            <button type="button" className={acaoBotao} disabled={busy} onClick={() => void carregarDocumentos()}><RefreshCw size={12} /> Atualizar lista</button>
          </div>
          <div className="erp-grid">
            <table className="w-full">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Selecionar todas" checked={selecionados.length > 0 && selecionados.length === documentos.length} onChange={e => setSelecionados(e.target.checked ? documentos.map(d => d.id) : [])} /></th>
                  <th>Série</th><th>Número</th><th>Emissão</th><th>Autorização</th><th>Destinatário</th><th>Documento</th><th>UF</th><th>Situação</th><th>Valor</th><th>DANFE</th><th>XML</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map(d => (
                  <tr key={d.id}>
                    <td><input type="checkbox" aria-label={`Selecionar ${d.numero}`} checked={selecionados.includes(d.id)} onChange={() => alternarSelecao(d.id)} /></td>
                    <td>{d.serie ?? '-'}</td>
                    <td>{d.numero ?? '-'}</td>
                    <td>{dataCurta(d.data_emissao)}</td>
                    <td>{d.autorizada_em ? dataCurta(d.autorizada_em) : '-'}</td>
                    <td>{d.destinatario_nome ?? '-'}</td>
                    <td>{d.destinatario_documento ?? '-'}</td>
                    <td>{d.destinatario_uf ?? '-'}</td>
                    <td className={d.status === 'Autorizada' ? 'text-[#2d8b6c]' : d.status === 'Rascunho' ? 'text-slate-500' : 'text-[#c94f57]'}>{d.status}</td>
                    <td>{money(num(d.valor_total))}</td>
                    <td>{d.pdf_path ? 'Sim' : 'Não'}</td>
                    <td>{d.xml_path ? 'Sim' : 'Não'}</td>
                    <td><button type="button" className={acaoBotao} onClick={() => void abrirDocumento(d)}>Detalhar</button></td>
                  </tr>
                ))}
                {!documentos.length && <tr><td colSpan={13} className="py-6 text-center text-slate-500">Nenhum documento encontrado para o filtro. Use Pesquisar após definir o período.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Rascunhos {contagens.rascunho} · Em processamento {contagens.processamento} · Autorizadas em homologação {contagens.homologacao} · Autorizadas em produção {contagens.producao} · Rejeitadas/Denegadas {contagens.rejeitadas}
          </p>
        </Bloco>
      ) : (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <nav role="tablist" aria-label="Abas do documento fiscal" className="mb-2 flex flex-wrap gap-0.5 border border-slate-200 bg-white p-1">
              {ABAS.map(item => {
                const pendentes = pendenciasPorAba.get(item.id) ?? 0
                return (
                  <button key={item.id} type="button" role="tab" aria-selected={aba === item.id} onClick={() => setAba(item.id)} className="inline-flex items-center gap-1 px-2.5">
                    {item.titulo}
                    {pendentes > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[9px] font-bold text-white">{pendentes}</span>}
                  </button>
                )
              })}
            </nav>

            {aba === 'identificacao' && (
              <>
                <Bloco titulo="Identificação da NF-e">
                  <div className="flex flex-wrap items-start gap-2">
                    <Campo rotulo="Tipo" valor={form.tipo} largura="erp-field-series" somenteLeitura dica="Fixo NF-e modelo 55." />
                    <Campo rotulo="Série" valor={form.serie} largura="erp-field-series" onChange={v => set('serie', digits(v).slice(0, 3))} dica="1 a 3 dígitos." />
                    <Campo rotulo="Número" valor={form.numero} largura="erp-field-number" somenteLeitura dica="Reservado pela rotina erp_reservar_numero_nfe no primeiro salvamento; não é digitado." />
                    <Campo rotulo="Data de emissão" tipo="date" valor={form.data_emissao} largura="erp-field-date" onChange={v => set('data_emissao', v)} />
                    <Campo rotulo="Data de saída" tipo="date" valor={form.data_saida} largura="erp-field-date" onChange={v => set('data_saida', v)} dica="Opcional; não pode ser anterior à emissão." />
                    <Campo rotulo="Ambiente" valor={form.ambiente} largura="erp-field-md" onChange={v => set('ambiente', v)} dica="Homologação não tem valor fiscal; produção exige certificado e credenciais." opcoes={[{ value: 'homologacao', label: '2 - Homologação' }, { value: 'producao', label: '1 - Produção' }]} />
                    <Campo rotulo="Natureza da operação" valor={form.natureza_operacao} largura="erp-field-xl" onChange={v => set('natureza_operacao', v)} dica="Descreve a operação; é ela que dá sentido ao CFOP." />
                    <Campo rotulo="CFOP" valor={form.cfop} largura="erp-field-cfop" onChange={v => set('cfop', digits(v).slice(0, 4))} dica="4 dígitos, sem ponto." />
                  </div>
                  {problemas.filter(p => p.aba === 'identificacao').map(p => <p key={p.campo} className="text-[10px] text-[#c94f57]">{p.mensagem}</p>)}
                </Bloco>
                <Bloco titulo="Situação do documento">
                  <div className="flex flex-wrap items-start gap-2">
                    <Campo rotulo="Status no banco" valor={situacao?.status ?? (documentoId ? 'carregando…' : 'Não gravado')} largura="erp-field-md" somenteLeitura dica="Depois de sair de Rascunho o banco trava o conteúdo." />
                    <Campo rotulo="Chave de acesso" valor={situacao?.chave ?? ''} largura="erp-field-xl" somenteLeitura dica="44 dígitos retornados pela SEFAZ; vazia enquanto não houver autorização." />
                    <Campo rotulo="Protocolo" valor={situacao?.protocolo ?? ''} largura="erp-field-number" somenteLeitura />
                  </div>
                  <p className="text-[10px] text-slate-500">Documento {documentoId || 'ainda não gravado'} · {itens.length} item(ns) · total {money(totais.total)}</p>
                </Bloco>
              </>
            )}

            {aba === 'emitente' && (
              <Bloco titulo="Emitente (lido do cadastro da empresa autenticada)">
                <div className="flex flex-wrap items-start gap-2">
                  <Campo rotulo="Razão social" valor={emitente?.razao_social ?? ''} largura="erp-field-xl" somenteLeitura />
                  <Campo rotulo="Nome fantasia" valor={emitente?.nome_fantasia ?? ''} largura="erp-field-name" somenteLeitura />
                  <Campo rotulo="CNPJ" valor={emitente?.cnpj ?? ''} largura="erp-field-cnpj" somenteLeitura />
                  <Campo rotulo="Inscrição estadual" valor={emitente?.ie ?? ''} largura="erp-field-ie" somenteLeitura dica="Se estiver vazia, cadastre a IE da empresa antes de emitir." />
                  <Campo rotulo="Endereço" valor={emitente?.endereco ?? ''} largura="erp-field-address" somenteLeitura />
                  <Campo rotulo="Cidade" valor={emitente?.cidade ?? ''} largura="erp-field-md" somenteLeitura />
                  <Campo rotulo="UF" valor={emitente?.uf ?? ''} largura="erp-field-uf" somenteLeitura />
                  <Campo rotulo="CEP" valor={emitente?.cep ?? ''} largura="erp-field-cep" somenteLeitura />
                </div>
                <p className="text-[10px] text-slate-500">Os dados do emitente vêm de erp_empresas e não são editáveis nesta tela: altere no cadastro da empresa.</p>
              </Bloco>
            )}

            {aba === 'destinatario' && (
              <Bloco titulo="Destinatário">
                <div className="mb-2 flex flex-wrap items-start gap-2">
                  <label className="erp-field-xl relative flex flex-col">
                    <span>Pesquisar cliente cadastrado</span>
                    <span className="relative">
                      <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className={`${inputBase} pl-6`} value={buscaCliente} placeholder="nome, documento ou cidade" onChange={e => setBuscaCliente(e.target.value)} />
                    </span>
                    {buscaCliente && clienteFiltrado.length > 0 && (
                      <span className="absolute z-20 mt-0.5 block w-full max-w-[520px] border border-slate-300 bg-white shadow-sm">
                        {clienteFiltrado.map(c => (
                          <button type="button" key={c.id} className="block w-full border-0 bg-white px-2 py-1 text-left text-[11px] hover:bg-sky-50" onClick={() => escolherCliente(c)}>
                            {c.nome ?? '-'} · {c.documento ?? 'sem documento'} · {c.cidade ?? '-'}
                          </button>
                        ))}
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Campo rotulo="Nome / razão social" valor={form.destinatario_nome} largura="erp-field-xl" onChange={v => set('destinatario_nome', v)} />
                  <Campo rotulo="CPF / CNPJ" valor={form.destinatario_documento} largura="erp-field-cnpj" onChange={v => set('destinatario_documento', digits(v).slice(0, 14))} />
                  <Campo rotulo="Inscrição estadual" valor={form.destinatario_ie} largura="erp-field-ie" onChange={v => set('destinatario_ie', v)} dica="Vazio ou ISENTO quando o destinatário não tem IE." />
                  <Campo rotulo="E-mail" valor={form.destinatario_email} largura="erp-field-email" onChange={v => set('destinatario_email', v)} />
                  <Campo rotulo="Endereço" valor={form.destinatario_endereco} largura="erp-field-address" onChange={v => set('destinatario_endereco', v)} />
                  <Campo rotulo="Bairro" valor={form.destinatario_bairro} largura="erp-field-text" onChange={v => set('destinatario_bairro', v)} />
                  <Campo rotulo="CEP" valor={form.destinatario_cep} largura="erp-field-cep" onChange={v => set('destinatario_cep', digits(v).slice(0, 8))} />
                  <Campo rotulo="Cidade" valor={form.destinatario_cidade} largura="erp-field-md" onChange={v => set('destinatario_cidade', v)} />
                  <Campo rotulo="UF" valor={form.destinatario_uf} largura="erp-field-uf" onChange={v => set('destinatario_uf', v.toUpperCase().slice(0, 2))} />
                </div>
                {(['destinatario_nome', 'destinatario_documento', 'destinatario_endereco', 'destinatario_bairro', 'destinatario_cidade', 'destinatario_uf', 'destinatario_cep', 'destinatario_email'] as const).map(campo => (
                  erroDe(campo) ? <p key={campo} className="mt-1 text-[10px] text-[#c94f57]">{erroDe(campo)}</p> : null
                ))}
              </Bloco>
            )}

            {aba === 'produtos' && (
              <>
                <Bloco titulo="Produtos e serviços">
                  <label className="erp-field-xl relative flex flex-col">
                    <span>Adicionar do cadastro de produtos</span>
                    <span className="relative">
                      <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className={`${inputBase} pl-6`} value={buscaProduto} placeholder="código, descrição ou NCM" onChange={e => setBuscaProduto(e.target.value)} />
                    </span>
                    {buscaProduto && produtoFiltrado.length > 0 && (
                      <span className="absolute z-20 mt-0.5 block w-full max-w-[520px] border border-slate-300 bg-white shadow-sm">
                        {produtoFiltrado.map(p => (
                          <button type="button" key={p.id} className="block w-full border-0 bg-white px-2 py-1 text-left text-[11px] hover:bg-sky-50" onClick={() => adicionarItem(p)}>
                            {p.codigo} · {p.nome} · estoque {num(p.estoque_atual)} {p.unidade ?? 'UN'}
                          </button>
                        ))}
                      </span>
                    )}
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button type="button" className={acaoBotao} onClick={() => setItens(l => [...l, novoItem()])}><Plus size={12} /> Linha avulsa</button>
                    <span className="text-[10px] text-slate-500">A linha avulsa não tem produto vinculado: preencha código e descrição, senão o banco rejeita a gravação.</span>
                    {erroDe('itens') && <span className="text-[10px] text-[#c94f57]">{erroDe('itens')}</span>}
                  </div>
                </Bloco>
                <Bloco titulo="Itens do documento">
                  <div className="erp-grid">
                    <table className="w-full">
                      <thead>
                        <tr><th>#</th><th>Código</th><th>Descrição</th><th>Unid</th><th>Qtde</th><th>Vl unitário</th><th>Desconto</th><th>Total</th><th>Lote</th><th /></tr>
                      </thead>
                      <tbody>
                        {itens.map((i, indice) => (
                          <tr key={`${i.codigo_produto}-${indice}`}>
                            <td>{indice + 1}</td>
                            <td><input className={celula} value={i.codigo_produto} onChange={e => atualizarItem(indice, 'codigo_produto', e.target.value)} /></td>
                            <td><input className={celula} value={i.descricao_produto} onChange={e => atualizarItem(indice, 'descricao_produto', e.target.value)} /></td>
                            <td><input className={celula} value={i.unidade} onChange={e => atualizarItem(indice, 'unidade', e.target.value.slice(0, 6))} /></td>
                            <td><input className={celula} type="number" step="0.0001" value={i.quantidade} onChange={e => atualizarItem(indice, 'quantidade', e.target.value)} /></td>
                            <td><input className={celula} type="number" step="0.01" value={i.valor_unitario} onChange={e => atualizarItem(indice, 'valor_unitario', e.target.value)} /></td>
                            <td><input className={celula} type="number" step="0.01" value={i.valor_desconto} onChange={e => atualizarItem(indice, 'valor_desconto', e.target.value)} /></td>
                            <td>{money(totalItem(i))}</td>
                            <td><input className={celula} value={i.lote} onChange={e => atualizarItem(indice, 'lote', e.target.value)} /></td>
                            <td>
                              <button type="button" className="inline-flex items-center border border-rose-200 bg-white px-1 text-[#c94f57]" aria-label={`Excluir item ${indice + 1}`} onClick={() => setItens(l => l.filter((_, n) => n !== indice))}><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                        {!itens.length && <tr><td colSpan={10} className="py-6 text-center text-slate-500">Nenhum item. Adicione pelo menos um produto do cadastro.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  {problemas.filter(p => p.aba === 'produtos').map(p => <p key={p.campo} className="mt-1 text-[10px] text-[#c94f57]">{p.mensagem}</p>)}
                </Bloco>
              </>
            )}

            {aba === 'tributos' && (
              <>
                <Bloco titulo="Tributação por item">
                  <div className="erp-grid">
                    <table className="w-full">
                      <thead>
                        <tr><th>#</th><th>Código</th><th>NCM</th><th>CFOP</th><th>Orig</th><th>CST/CSOSN</th><th>ICMS %</th><th>IPI %</th><th>PIS %</th><th>COFINS %</th><th>PIS CST</th><th>COFINS CST</th></tr>
                      </thead>
                      <tbody>
                        {itens.map((i, indice) => (
                          <tr key={`${i.codigo_produto}-t-${indice}`}>
                            <td>{indice + 1}</td>
                            <td>{i.codigo_produto}</td>
                            <td><input className={celula} value={i.ncm} onChange={e => atualizarItem(indice, 'ncm', digits(e.target.value).slice(0, 8))} /></td>
                            <td><input className={celula} value={i.cfop} onChange={e => atualizarItem(indice, 'cfop', digits(e.target.value).slice(0, 4))} /></td>
                            <td><input className={celula} value={i.origem} onChange={e => atualizarItem(indice, 'origem', digits(e.target.value).slice(0, 1))} /></td>
                            <td><input className={celula} value={i.cst_csosn} onChange={e => atualizarItem(indice, 'cst_csosn', e.target.value.slice(0, 9))} /></td>
                            <td><input className={celula} type="number" step="0.01" value={i.icms_aliquota} onChange={e => atualizarItem(indice, 'icms_aliquota', e.target.value)} /></td>
                            <td><input className={celula} type="number" step="0.01" value={i.ipi_aliquota} onChange={e => atualizarItem(indice, 'ipi_aliquota', e.target.value)} /></td>
                            <td><input className={celula} type="number" step="0.01" value={i.pis_aliquota} onChange={e => atualizarItem(indice, 'pis_aliquota', e.target.value)} /></td>
                            <td><input className={celula} type="number" step="0.01" value={i.cofins_aliquota} onChange={e => atualizarItem(indice, 'cofins_aliquota', e.target.value)} /></td>
                            <td><input className={celula} value={i.pis_cst} onChange={e => atualizarItem(indice, 'pis_cst', e.target.value.slice(0, 8))} /></td>
                            <td><input className={celula} value={i.cofins_cst} onChange={e => atualizarItem(indice, 'cofins_cst', e.target.value.slice(0, 8))} /></td>
                          </tr>
                        ))}
                        {!itens.length && <tr><td colSpan={12} className="py-6 text-center text-slate-500">Sem itens cadastrados nesta nota.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">A tela confere formato e consistência aritmética. A apuração final (regime, redução de base, ST, diferimento) é do motor fiscal e da SEFAZ: confira o retorno na aba Status SEFAZ.</p>
                </Bloco>
                <Bloco titulo="ICMS-ST">
                  <div className="flex flex-wrap items-start gap-2">
                    <Campo rotulo="Base ICMS-ST" tipo="number" valor={form.base_icms_st} largura="erp-field-money" onChange={v => set('base_icms_st', v)} dica="Obrigatória quando houver valor de ICMS-ST." />
                    <Campo rotulo="Valor ICMS-ST" tipo="number" valor={form.valor_icms_st} largura="erp-field-money" onChange={v => set('valor_icms_st', v)} dica="Soma ao total da nota." />
                  </div>
                  {erroDe('base_icms_st') && <p className="text-[10px] text-[#c94f57]">{erroDe('base_icms_st')}</p>}
                </Bloco>
              </>
            )}

            {aba === 'transporte' && (
              <Bloco titulo="Transporte">
                <div className="flex flex-wrap items-start gap-2">
                  <Campo rotulo="Modalidade do frete" valor={form.modalidade_frete} largura="erp-field-xl" onChange={v => set('modalidade_frete', v)} dica="Escolha real: 9 é somente quando não há transporte." opcoes={MODALIDADES_FRETE.map(m => ({ value: m.codigo, label: m.descricao }))} />
                  <Campo rotulo="Do cadastro de transportadoras" valor={transportadoraSel} largura="erp-field-name" onChange={escolherTransportadora} dica={transportadoras.length ? `${transportadoras.length} transportadora(s) ativa(s) no cadastro desta empresa.` : 'Nenhuma transportadora ativa cadastrada: digite os dados manualmente.'} opcoes={[{ value: '', label: transportadoras.length ? '— digitar manualmente —' : '— sem cadastro —' }, ...transportadoras.map(t => ({ value: t.id, label: [t.codigo, t.razao_social, t.uf].filter(Boolean).join(' · ') }))]} />
                  <Campo rotulo="Transportadora" valor={form.transportadora} largura="erp-field-name" onChange={v => set('transportadora', v)} dica="Nome, placa e UF ficam gravados no rascunho; o integrador atual transmite somente o valor do frete." />
                  <Campo rotulo="Placa" valor={form.placa} largura="erp-field-series" onChange={v => set('placa', v.toUpperCase().slice(0, 8))} />
                  <Campo rotulo="UF" valor={form.uf_transportadora} largura="erp-field-uf" onChange={v => set('uf_transportadora', v.toUpperCase().slice(0, 2))} placeholder="UF" />
                  <Campo rotulo="Valor do frete" tipo="number" valor={form.valor_frete} largura="erp-field-money" onChange={v => set('valor_frete', v)} dica="Soma ao total da nota." />
                  <Campo rotulo="Outras despesas" tipo="number" valor={form.valor_outras_despesas} largura="erp-field-money" onChange={v => set('valor_outras_despesas', v)} dica="Despesas acessórias: também somam ao total." />
                  <Campo rotulo="Desconto global" tipo="number" valor={form.valor_desconto} largura="erp-field-money" onChange={v => set('valor_desconto', v)} dica="O desconto por linha já foi aplicado no item; este é do documento." />
                </div>
                {erroDe('valor_desconto') && <p className="text-[10px] text-[#c94f57]">{erroDe('valor_desconto')}</p>}
              </Bloco>
            )}

            {aba === 'volumens' && (
              <>
                <Bloco titulo="Volumens e pesos">
                  <div className="flex flex-wrap items-start gap-2">
                    <Campo rotulo="Quantidade de volumes" tipo="number" valor={form.volumes} largura="erp-field-number" onChange={v => set('volumes', v)} dica="Volumes transportados (inteiro)." />
                    <Campo rotulo="Peso líquido (kg)" tipo="number" valor={form.peso_liquido} largura="erp-field-number" onChange={v => set('peso_liquido', v)} />
                    <Campo rotulo="Peso bruto (kg)" tipo="number" valor={form.peso_bruto} largura="erp-field-number" onChange={v => set('peso_bruto', v)} dica="Não pode ser menor que o peso líquido." />
                  </div>
                  {erroDe('peso_bruto') && <p className="text-[10px] text-[#c94f57]">{erroDe('peso_bruto')}</p>}
                </Bloco>
                <Bloco titulo="Totais do documento">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Kpi rotulo="Produtos" valor={money(totais.produtos)} detalhe={`${itens.length} item(ns)`} />
                    <Kpi rotulo="Frete + outras" valor={money(totais.frete + totais.outras)} detalhe={`Frete ${money(totais.frete)}`} />
                    <Kpi rotulo="ICMS / IPI" valor={`${money(totais.icms)} / ${money(totais.ipi)}`} detalhe={`PIS ${money(totais.pis)} · COFINS ${money(totais.cofins)}`} />
                    <Kpi rotulo="Total da NF-e" valor={money(totais.total)} detalhe="produtos + frete + outras + IPI + ICMS-ST − desconto" />
                  </div>
                </Bloco>
              </>
            )}

            {aba === 'cobranca' && (
              <Bloco titulo="Cobrança (formas de pagamento tPag)" acao={
                <span className="flex items-center gap-1.5">
                  <button type="button" className={acaoBotao} onClick={() => setPagamentos(l => [...l, novoPagamento()])}><Plus size={12} /> Forma</button>
                  <button type="button" className={acaoBotao} disabled={busy || !documentoId} onClick={() => void consultarPagamentos()}><RefreshCw size={12} /> Recuperar do banco</button>
                  <button type="button" className={acaoPrimaria} disabled={busy || bloqueado} onClick={() => void gravarPagamentos()}><Save size={12} /> Gravar cobrança</button>
                </span>
              }>
                <div className="erp-grid">
                  <table className="w-full">
                    <thead>
                      <tr><th>#</th><th>Forma (tPag)</th><th>Descrição</th><th>Condição</th><th>Valor</th><th>Troco</th><th>Bandeira</th><th>Observação</th><th /></tr>
                    </thead>
                    <tbody>
                      {pagamentos.map((p, indice) => (
                        <tr key={`pg-${indice}`}>
                          <td>{indice + 1}</td>
                          <td>
                            <select className={celula} value={p.forma} onChange={e => {
                              const escolha = FORMAS_PAGAMENTO.find(f => f.codigo === e.target.value)
                              setPagamentos(l => l.map((r, n) => (n === indice ? { ...r, forma: e.target.value, forma_descricao: escolha?.descricao ?? r.forma_descricao } : r)))
                            }}>
                              {FORMAS_PAGAMENTO.map(f => <option key={f.codigo} value={f.codigo}>{f.codigo} · {f.descricao}</option>)}
                            </select>
                          </td>
                          <td><input className={celula} value={p.forma_descricao} onChange={e => setPagamentos(l => l.map((r, n) => (n === indice ? { ...r, forma_descricao: e.target.value.slice(0, 60) } : r)))} /></td>
                          <td>
                            <select className={celula} value={p.condicao} onChange={e => setPagamentos(l => l.map((r, n) => (n === indice ? { ...r, condicao: e.target.value === 'a_prazo' ? 'a_prazo' : 'a_vista' } : r)))}>
                              <option value="a_vista">A vista</option><option value="a_prazo">A prazo</option>
                            </select>
                          </td>
                          <td><input className={celula} type="number" step="0.01" value={p.valor} onChange={e => setPagamentos(l => l.map((r, n) => (n === indice ? { ...r, valor: e.target.value } : r)))} /></td>
                          <td><input className={celula} type="number" step="0.01" value={p.troco} onChange={e => setPagamentos(l => l.map((r, n) => (n === indice ? { ...r, troco: e.target.value } : r)))} /></td>
                          <td><input className={celula} value={p.bandeira} onChange={e => setPagamentos(l => l.map((r, n) => (n === indice ? { ...r, bandeira: digits(e.target.value).slice(0, 2) } : r)))} /></td>
                          <td><input className={celula} value={p.observacao} onChange={e => setPagamentos(l => l.map((r, n) => (n === indice ? { ...r, observacao: e.target.value.slice(0, 500) } : r)))} /></td>
                          <td><button type="button" className="inline-flex items-center border border-rose-200 bg-white px-1 text-[#c94f57]" aria-label={`Excluir pagamento ${indice + 1}`} onClick={() => setPagamentos(l => l.filter((_, n) => n !== indice))}><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                  <Kpi rotulo="Soma dos pagamentos" valor={money(pagamentosTotais)} />
                  <Kpi rotulo="Total da NF-e" valor={money(totais.total)} />
                  <Kpi rotulo="Diferença" valor={money(redondo(pagamentosTotais - totais.total))} detalhe={redondo(pagamentosTotais) === redondo(totais.total) ? 'confere com o documento' : 'o banco recusa se não fechar'} />
                </div>
                {erroDe('soma_pagamentos') && <p className="mt-1 text-[10px] text-[#c94f57]">{erroDe('soma_pagamentos')}</p>}
                {!documentoId && <p className="mt-1 text-[10px] text-slate-500">A cobrança é gravada pela rotina erp_nfe_pagamento_salvar, que exige o documento já registrado: salve o rascunho primeiro.</p>}
              </Bloco>
            )}

            {aba === 'status' && (
              <>
                <Bloco titulo="Status SEFAZ">
                  <div className="flex flex-wrap items-start gap-2">
                    <Campo rotulo="Situação" valor={situacao?.status ?? (documentoId ? 'carregando…' : 'Não gravado')} largura="erp-field-md" somenteLeitura />
                    <Campo rotulo="Ambiente" valor={situacao?.ambiente === 'producao' ? '1 - Produção' : situacao?.ambiente === 'homologacao' ? '2 - Homologação' : ''} largura="erp-field-md" somenteLeitura />
                    <Campo rotulo="Chave de acesso" valor={situacao?.chave ?? ''} largura="erp-field-xl" somenteLeitura />
                    <Campo rotulo="Protocolo de autorização" valor={situacao?.protocolo ?? ''} largura="erp-field-number" somenteLeitura />
                    <Campo rotulo="Emissão do documento" valor={dataCurta(situacao?.emissao)} largura="erp-field-datetime" somenteLeitura />
                    <Campo rotulo="Autorização" valor={situacao?.autorizacao ? dataCurta(situacao.autorizacao) : '-'} largura="erp-field-datetime" somenteLeitura />
                  </div>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <Campo rotulo="Retorno da SEFAZ" valor={situacao?.mensagem ?? ''} largura="erp-field-xl" somenteLeitura dica="Mensagem/texto de rejeição devolvida pelo integrador." />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" className={acaoBotao} disabled={busy || !documentoId} onClick={() => void recarregarSituacao(documentoId)}><RefreshCw size={12} /> Verificar processamento pendente</button>
                    <button type="button" className={acaoBotao} disabled={!situacao?.pdf_path} onClick={() => situacao?.pdf_path && void baixarArquivo(situacao.pdf_path, `danfe-${situacao.chave || documentoId}.pdf`)}><Printer size={12} /> DANFE (PDF)</button>
                    <button type="button" className={acaoBotao} disabled={!situacao?.xml_path} onClick={() => situacao?.xml_path && void baixarArquivo(situacao.xml_path, `xml-${situacao.chave || documentoId}.xml`)}><Download size={12} /> XML autorizado</button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Só há autorização quando o integrador devolve chave de 44 dígitos e protocolo; enquanto isso a nota permanece em processamento e o DANFE não é impresso.</p>
                </Bloco>
                <Bloco titulo="Impedimentos do ambiente fiscal">
                  {(() => {
                    const doStatus = problemas.filter(p => p.aba === 'status')
                    if (!doStatus.length) return <p className="text-[11px] text-[#2f7a4f]">Configuração fiscal da empresa lida e compatível com a transmissão. O rascunho pode ser salvo e transmitido neste ambiente.</p>
                    return (
                      <ul className="space-y-1">
                        {doStatus.map(p => (
                          <li key={p.campo} className="flex items-start gap-1.5 border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] leading-snug text-[#8a5a12]">
                            <ShieldAlert size={12} className="mt-0.5 shrink-0" /><span>{p.mensagem}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  })()}
                  <p className="mt-1.5 text-[10px] text-slate-500">Estes itens não impedem salvar o rascunho — impedem a transmissão. Ajustam-se no cadastro da empresa, não nesta tela.</p>
                </Bloco>
                <Bloco titulo="Resumo para transmissão">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Kpi rotulo="Destinatário" valor={form.destinatario_nome || '-'} detalhe={form.destinatario_documento || 'sem documento'} />
                    <Kpi rotulo="Itens" valor={String(itens.length)} detalhe={`NCM/CFOP conferidos: ${itens.length - (pendenciasPorAba.get('tributos') ?? 0)}`} />
                    <Kpi rotulo="Total" valor={money(totais.total)} detalhe={`Frete ${money(totais.frete)} · Desc ${money(totais.desconto)}`} />
                    <Kpi rotulo="Cobrança" valor={money(pagamentosTotais)} detalhe={redondo(pagamentosTotais) === redondo(totais.total) ? 'fecha com o total' : 'pendência na aba Cobrança'} />
                  </div>
                </Bloco>
              </>
            )}
          </div>

          <aside className="w-full shrink-0 lg:w-[320px]">
            <div className="mb-2 border border-slate-200 bg-white p-2.5">
              <h2 className="mb-1.5 flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-[#17445A]">
                {problemas.length ? <AlertTriangle size={13} className="text-[#c94f57]" /> : <CheckCircle2 size={13} className="text-[#2d8b6c]" />}
                Advertências
              </h2>
              {problemas.length ? (
                <ul className="flex max-h-[420px] flex-col gap-1 overflow-auto">
                  {problemas.slice(0, 40).map(p => (
                    <li key={`${p.aba}-${p.campo}`}>
                      <button type="button" className="w-full border-0 bg-white px-1 py-0.5 text-left text-[10px] leading-snug text-[#9d3037] hover:bg-rose-50" onClick={() => setAba(p.aba)}>
                        {ABAS.find(a => a.id === p.aba)?.titulo}: {p.mensagem}
                      </button>
                    </li>
                  ))}
                  {problemas.length > 40 && <li className="text-[10px] text-slate-500">+{problemas.length - 40} pendência(s) não listadas.</li>}
                </ul>
              ) : (
                <p className="text-[10px] text-[#24684f]">Nenhuma pendência de validação. O documento pode ser transmitido ao integrador.</p>
              )}
            </div>
            <div className="border border-slate-200 bg-white p-2.5">
              <h2 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#17445A]">Situação das NF-e</h2>
              <p className="text-[10px] leading-relaxed text-slate-600">
                Em digitação {contagens.rascunho} · Processando {contagens.processamento} · Autorizadas em homologação {contagens.homologacao} · Autorizadas em produção {contagens.producao} · Rejeitadas/Denegadas {contagens.rejeitadas}
              </p>
              <button type="button" className={`${acaoBotao} mt-1.5`} onClick={() => { setVisao('gerenciar'); void carregarDocumentos() }}><FolderSearch size={12} /> Abrir gerenciamento</button>
              <p className="mt-1 text-[9px] leading-snug text-slate-500">Contagem dos últimos 200 documentos NF-e da empresa autenticada.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
