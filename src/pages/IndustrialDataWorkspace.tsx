import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ClipboardList, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useLocation } from 'react-router-dom'

type Field = { key: string; label: string; type?: 'text'|'number'|'date'|'select'|'textarea'; options?: string[]; required?: boolean }
const structuredTextFields = ['parametros','etapas','acoes_recomendadas','evidencia_urls','cinco_porques','ishikawa','plano_5w2h','itens']
function maxLengthForField(field: Field): number {
  if (field.key === 'desenho_url') return 2048
  if (field.type === 'textarea' && structuredTextFields.includes(field.key)) return 4000
  return 50
}
type ModuleConfig = { title: string; subtitle: string; table: string; fields: Field[]; search: string[]; columns: string[] }
const commonStatus = ['ativo','em_revisao','obsoleto']
const configs: Record<string, ModuleConfig> = {
  'engenharia-produtos': { title:'Engenharia · Cadastro técnico de itens', subtitle:'Catálogo de peças, classificação técnica e rastreabilidade', table:'engenharia_produtos', search:['codigo','descricao_tecnica','ncm'], columns:['codigo','descricao_tecnica','tipo_item','unidade_medida','ncm'], fields:[
    {key:'codigo',label:'Código do item',required:true},{key:'descricao_tecnica',label:'Descrição técnica',required:true},{key:'unidade_medida',label:'Unidade de medida',required:true},{key:'tipo_item',label:'Tipo de item',type:'select',options:['materia_prima','componente','subconjunto','produto_acabado','insumo_consumivel'],required:true},{key:'peso_liquido',label:'Peso líquido',type:'number'},{key:'peso_bruto',label:'Peso bruto',type:'number'},{key:'ncm',label:'NCM'},{key:'desenho_url',label:'URL do desenho técnico'}] },
  'engenharia-bom': { title:'Engenharia · Estrutura BOM', subtitle:'Estrutura multinível e cálculo de perdas de fabricação', table:'engenharia_bom', search:['codigo_bom','versao','status'], columns:['codigo_bom','produto_pai_id','versao','status','vigente_desde'], fields:[
    {key:'codigo_bom',label:'Código BOM',required:true},{key:'produto_pai_id',label:'Produto pai (UUID)',required:true},{key:'versao',label:'Versão',required:true},{key:'status',label:'Status',type:'select',options:commonStatus,required:true},{key:'vigente_desde',label:'Vigente desde',type:'date',required:true},{key:'vigente_ate',label:'Vigente até',type:'date'},{key:'observacoes',label:'Observações',type:'textarea'}] },
  'engenharia-roteiros': { title:'Engenharia · Roteiros de fabricação', subtitle:'Sequenciamento e tempos padrão por produto', table:'pcp_roteiros', search:['codigo','versao'], columns:['codigo','produto_id','versao','ativo'], fields:[
    {key:'codigo',label:'Código do roteiro',required:true},{key:'produto_id',label:'Produto (UUID)',required:true},{key:'versao',label:'Versão',required:true},{key:'etapas',label:'Etapas (JSON)',type:'textarea',required:true},{key:'ativo',label:'Ativo',type:'select',options:['true','false'],required:true}] },
  'estoque-movimentacoes': { title:'WMS · Movimentações de estoque', subtitle:'Entradas, saídas, transferências e rastreabilidade por lote', table:'estoque_movimentacoes', search:['tipo','documento_origem','observacoes'], columns:['tipo','produto_id','lote_id','quantidade','endereco_origem_id','endereco_destino_id','ocorrido_em'], fields:[
    {key:'tipo',label:'Tipo de movimentação',type:'select',options:['entrada_nf','requisicao_producao','retorno_producao','transferencia','ajuste_inventario'],required:true},{key:'produto_id',label:'Produto (UUID)',required:true},{key:'lote_id',label:'Lote (UUID)',required:true},{key:'quantidade',label:'Quantidade',type:'number',required:true},{key:'endereco_origem_id',label:'Endereço origem (UUID)'},{key:'endereco_destino_id',label:'Endereço destino (UUID)'},{key:'documento_origem',label:'Documento de origem'},{key:'responsavel_id',label:'Responsável (UUID)'},{key:'ocorrido_em',label:'Data/hora ISO'},{key:'observacoes',label:'Observações',type:'textarea'}] },
  'qualidade-cep': { title:'SGQ · CEP e cartas de controle', subtitle:'Medições reais com limites superior, nominal e inferior', table:'qualidade_cep_medicoes', search:['parametro','amostra_numero'], columns:['produto_id','parametro','amostra_numero','valor_medido','limite_superior','nominal','limite_inferior','medido_em'], fields:[
    {key:'produto_id',label:'Produto (UUID)',required:true},{key:'especificacao_id',label:'Especificação (UUID)'},{key:'inspecao_id',label:'Inspeção (UUID)'},{key:'parametro',label:'Parâmetro dimensional',required:true},{key:'amostra_numero',label:'Número da amostra',type:'number',required:true},{key:'valor_medido',label:'Valor medido',type:'number',required:true},{key:'nominal',label:'Valor nominal',type:'number',required:true},{key:'limite_superior',label:'LST',type:'number',required:true},{key:'limite_inferior',label:'LIT',type:'number',required:true},{key:'medido_em',label:'Data/hora ISO'},{key:'operador_id',label:'Operador (UUID)'}] },
  'estoque-enderecos': { title:'WMS · Endereçamento físico', subtitle:'Mapa de almoxarifado por rua, prateleira e nível', table:'estoque_enderecos', search:['codigo','descricao','rua','prateleira'], columns:['codigo','descricao','tipo','rua','prateleira','nivel'], fields:[
    {key:'codigo',label:'Código do endereço',required:true},{key:'descricao',label:'Descrição'},{key:'tipo',label:'Tipo',type:'select',options:['materia_prima','insumos','quarentena','produto_acabado','refugo'],required:true},{key:'rua',label:'Rua',required:true},{key:'prateleira',label:'Prateleira',required:true},{key:'nivel',label:'Nível',required:true},{key:'capacidade_peso',label:'Capacidade peso',type:'number'},{key:'capacidade_volume',label:'Capacidade volume',type:'number'}] },
  'qualidade-especificacoes': { title:'SGQ · Especificações técnicas', subtitle:'Revisão, parâmetros dimensionais e vigência de especificações', table:'qualidade_especificacoes', search:['revisao','status'], columns:['produto_id','revisao','status','vigente_desde','vigente_ate'], fields:[
    {key:'produto_id',label:'Produto (UUID)',required:true},{key:'revisao',label:'Número da revisão',required:true},{key:'status',label:'Vigência',type:'select',options:['rascunho','ativa','obsoleta'],required:true},{key:'aprovada_em',label:'Data de aprovação',type:'date'},{key:'aprovador_id',label:'Aprovador (UUID)'},{key:'vigente_desde',label:'Vigente desde',type:'date',required:true},{key:'vigente_ate',label:'Vigente até',type:'date'},{key:'parametros',label:'Parâmetros dimensionais (JSON)',type:'textarea',required:true}] },
  'qualidade-fmea': { title:'SGQ · Matriz FMEA / PFMEA', subtitle:'Análise de risco com NPR calculado automaticamente', table:'qualidade_fmea', search:['codigo_item_processo','modo_falha','status_acao'], columns:['codigo_item_processo','modo_falha','severidade','ocorrencia','deteccao','npr','status_acao'], fields:[
    {key:'codigo_item_processo',label:'Código do item/processo',required:true},{key:'funcao',label:'Função',required:true},{key:'modo_falha',label:'Modo potencial de falha',required:true},{key:'efeito',label:'Efeito potencial',required:true},{key:'severidade',label:'Severidade (1–10)',type:'number',required:true},{key:'causa',label:'Causa potencial',required:true},{key:'ocorrencia',label:'Ocorrência (1–10)',type:'number',required:true},{key:'controles',label:'Controles atuais'},{key:'deteccao',label:'Detecção (1–10)',type:'number',required:true},{key:'acoes_recomendadas',label:'Ações recomendadas (JSON)',type:'textarea'},{key:'status_acao',label:'Status da ação',required:true}] },
  'qualidade-rnc': { title:'SGQ · RNC & CAPA', subtitle:'Não conformidade, causa raiz, Ishikawa e plano de ação 5W2H', table:'qualidade_rnc_capa', search:['codigo','origem','descricao','status'], columns:['codigo','lote_id','origem','descricao','disposicao','status'], fields:[
    {key:'codigo',label:'Código da RNC',required:true},{key:'lote_id',label:'Lote (UUID)'},{key:'origem',label:'Origem',type:'select',options:['fornecedor','interna','cliente'],required:true},{key:'descricao',label:'Descrição da não conformidade',type:'textarea',required:true},{key:'evidencia_urls',label:'URLs de evidências (JSON)',type:'textarea'},{key:'disposicao',label:'Disposição',type:'select',options:['refugar','devolver','retrabalhar','concessao']},{key:'cinco_porques',label:'5 Porquês (JSON)',type:'textarea'},{key:'ishikawa',label:'Ishikawa (JSON)',type:'textarea'},{key:'plano_5w2h',label:'Plano 5W2H (JSON)',type:'textarea'},{key:'status',label:'Status CAPA',type:'select',options:['aberto','em_execucao','concluido','eficacia_validada'],required:true}] },
  'pcp-ordens': { title:'PCP · Ordens de produção', subtitle:'Programação, liberação e acompanhamento de OPs', table:'pcp_ordens_producao', search:['numero','status'], columns:['numero','produto_id','quantidade_planejada','aberta_em','entrega_prevista','status'], fields:[
    {key:'numero',label:'Número da OP',required:true},{key:'produto_id',label:'Produto (UUID)',required:true},{key:'quantidade_planejada',label:'Quantidade programada',type:'number',required:true},{key:'roteiro_id',label:'Roteiro (UUID)'},{key:'entrega_prevista',label:'Entrega prevista',type:'date'},{key:'status',label:'Status',type:'select',options:['planejada','liberada','em_andamento','suspensa','encerrada','cancelada'],required:true}] },
  'pcp-apontamentos': { title:'PCP · Apontamentos de produção', subtitle:'Setup, produção boa, refugo e paradas por operador', table:'pcp_apontamentos', search:['operacao_codigo','centro_trabalho','motivo_parada'], columns:['ordem_producao_id','operacao_codigo','centro_trabalho','pecas_boas','pecas_refugadas','motivo_parada'], fields:[
    {key:'ordem_producao_id',label:'Ordem de produção (UUID)',required:true},{key:'operacao_codigo',label:'Código da operação',required:true},{key:'operador_id',label:'Operador (UUID)'},{key:'centro_trabalho',label:'Máquina/centro de trabalho',required:true},{key:'setup_inicio',label:'Início setup',type:'text'},{key:'setup_fim',label:'Fim setup',type:'text'},{key:'producao_inicio',label:'Início produção',type:'text'},{key:'producao_fim',label:'Fim produção',type:'text'},{key:'pecas_boas',label:'Peças boas',type:'number'},{key:'pecas_refugadas',label:'Peças refugadas',type:'number'},{key:'motivo_refugo_id',label:'Motivo de refugo (UUID)'},{key:'motivo_parada',label:'Motivo da parada'},{key:'observacoes',label:'Observações',type:'textarea'}] },
  'fiscal-nfe-entradas': { title:'Fiscal · Escrituração de NF-e de entrada', subtitle:'Escrituração transacional com atualização do estoque e custo médio ponderado', table:'fiscal_nfe_entradas', search:['chave_acesso','numero','serie','razao_social_emitente','status'], columns:['numero','serie','chave_acesso','razao_social_emitente','valor_total','status','escriturada_em'], fields:[{key:'chave_acesso',label:'Chave de acesso (44 dígitos)',required:true},{key:'numero',label:'Número da NF-e',required:true},{key:'serie',label:'Série',required:true},{key:'cnpj_emitente',label:'CNPJ emitente',required:true},{key:'razao_social_emitente',label:'Razão social emitente',required:true},{key:'valor_total',label:'Valor total',type:'number',required:true},{key:'itens',label:'Itens JSON: produto_id, lote_id, endereco_id, quantidade, valor_liquido_unitario',type:'textarea',required:true}] },
  'fiscal-parametros': { title:'Fiscal · Parâmetros tributários', subtitle:'Matriz de CFOP, NCM e alíquotas por operação', table:'fiscal_parametros_tributarios', search:['codigo','cfop','ncm_sufixo','tipo_operacao'], columns:['codigo','cfop','ncm_sufixo','aliquota_icms','aliquota_ipi','aliquota_pis','aliquota_cofins','tipo_operacao'], fields:[
    {key:'codigo',label:'Código da regra',required:true},{key:'cfop',label:'CFOP',required:true},{key:'ncm_sufixo',label:'Sufixo NCM'},{key:'uf_origem',label:'UF origem'},{key:'uf_destino',label:'UF destino'},{key:'aliquota_icms',label:'ICMS (%)',type:'number'},{key:'aliquota_ipi',label:'IPI (%)',type:'number'},{key:'aliquota_pis',label:'PIS (%)',type:'number'},{key:'aliquota_cofins',label:'COFINS (%)',type:'number'},{key:'cst_csosn',label:'CST/CSOSN'},{key:'tipo_operacao',label:'Tipo de operação',type:'select',options:['entrada_compra','entrada_devolucao','saida_venda','saida_remessa'],required:true}] },
  'rh-funcionarios': { title:'RH Industrial · Funcionários', subtitle:'Cadastro de operadores e taxa horária para custo MOD', table:'rh_funcionarios', search:['matricula','nome_completo','cargo','departamento'], columns:['matricula','nome_completo','cargo','departamento','taxa_horaria','status'], fields:[
    {key:'matricula',label:'Matrícula',required:true},{key:'nome_completo',label:'Nome completo',required:true},{key:'cpf',label:'CPF'},{key:'rg',label:'RG'},{key:'data_admissao',label:'Admissão',type:'date',required:true},{key:'cargo',label:'Cargo/função',required:true},{key:'departamento',label:'Departamento',type:'select',options:['engenharia','pcp','producao','qualidade','almoxarifado','administrativo'],required:true},{key:'taxa_horaria',label:'Taxa horária MOD',type:'number'},{key:'status',label:'Status',type:'select',options:['ativo','afastado','desligado'],required:true}] },
  'rh-turnos': { title:'RH Industrial · Turnos e escalas', subtitle:'Jornada de trabalho para planejamento de capacidade', table:'rh_turnos', search:['codigo','nome','tipo_escala'], columns:['codigo','nome','inicio','termino','escala','carga_horaria_mensal'], fields:[
    {key:'codigo',label:'Código do turno',required:true},{key:'nome',label:'Nome do turno',required:true},{key:'inicio',label:'Início (HH:MM)',required:true},{key:'termino',label:'Término (HH:MM)',required:true},{key:'intervalo_inicio',label:'Início do intervalo'},{key:'intervalo_fim',label:'Fim do intervalo'},{key:'escala',label:'Escala',type:'select',options:['5x2','6x2','12x36'],required:true},{key:'carga_horaria_mensal',label:'Carga mensal (h)',type:'number',required:true}] },
  'rh-entregas-epis': { title:'RH Industrial · Entregas de EPI', subtitle:'Rastreabilidade de entrega, confirmação e próxima substituição', table:'rh_entregas_epis', search:['epi_id','funcionario_id','entregue_em'], columns:['epi_id','funcionario_id','quantidade','entregue_em','confirmado_em','proxima_troca_em'], fields:[{key:'epi_id',label:'EPI (UUID)',required:true},{key:'funcionario_id',label:'Funcionário (UUID)',required:true},{key:'quantidade',label:'Quantidade entregue',type:'number',required:true},{key:'entregue_em',label:'Data da entrega',type:'date',required:true},{key:'confirmado_em',label:'Confirmação ISO (opcional)'},{key:'periodicidade_troca_dias',label:'Periodicidade da troca (dias)',type:'number',required:true}] },
  'rh-epis': { title:'RH Industrial · EPIs e CA', subtitle:'Controle de validade do CA e entregas por funcionário', table:'rh_epis', search:['codigo','nome','numero_ca'], columns:['codigo','nome','numero_ca','ca_valido_ate','periodicidade_troca_dias'], fields:[
    {key:'codigo',label:'Código do EPI',required:true},{key:'nome',label:'Equipamento',required:true},{key:'numero_ca',label:'Número CA',required:true},{key:'ca_valido_ate',label:'Validade do CA',type:'date',required:true},{key:'periodicidade_troca_dias',label:'Troca obrigatória (dias)',type:'number',required:true}] },
}
const cls='h-[30px] w-full rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] text-slate-800 outline-none focus:border-sky-600'
const label='mb-[2px] block text-[9px] font-bold uppercase tracking-wider text-slate-600'
const btn='inline-flex h-[30px] items-center justify-center gap-1 rounded-[2px] border border-slate-300 bg-white px-2 text-[10px] font-semibold hover:bg-slate-50 disabled:opacity-50'
function parseValue(field: Field, raw: string): unknown {
  if (field.key === 'ativo' && (raw === 'true' || raw === 'false')) return raw === 'true'
  if (field.type === 'number') return raw === '' ? null : Number(raw)
  if (field.type === 'textarea' && ['parametros','etapas','acoes_recomendadas','evidencia_urls','cinco_porques','ishikawa','plano_5w2h'].includes(field.key)) {
    if (!raw.trim()) return field.key === 'parametros' || field.key === 'etapas' || field.key === 'acoes_recomendadas' || field.key === 'evidencia_urls' || field.key === 'cinco_porques' || field.key === 'plano_5w2h' ? [] : {}
    return JSON.parse(raw) as unknown
  }
  return raw.trim() === '' ? null : raw
}
function statusCellClass(column: string, value: unknown): string {
  const key = column.toLocaleLowerCase('pt-BR')
  if (!/(status|situacao|vigencia|disposicao|^ativo$)/.test(key)) return ''
  const normalized = String(value ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (['ativo','true','aprovado','aprovada','concluido','encerrada','eficacia_validada','escriturada','liberada'].includes(normalized)) return 'bg-emerald-100 text-emerald-900 font-semibold'
  if (['rascunho','aberto','em_revisao','em_execucao','em_andamento','planejada','pendente','suspensa'].includes(normalized)) return 'bg-amber-100 text-amber-900 font-semibold'
  if (['obsoleto','obsoleta','cancelada','reprovado','reprovada','bloqueado','bloqueada','desligado','false','refugar'].includes(normalized)) return 'bg-rose-100 text-rose-900 font-semibold'
  return ''
}
function isNumericColumn(column: string, value: unknown): boolean {
  return typeof value === 'number' || /(^|_)(quantidade|valor|peso|capacidade|aliquota|taxa|limite|nominal|npr|severidade|ocorrencia|deteccao|pecas|nivel|carga_horaria|amostra_numero)(_|$)/i.test(column)
}
export default function IndustrialDataWorkspace() {
  const location = useLocation()
  const routeConfigs: Record<string, string> = {
    '/engenharia/produtos':'engenharia-produtos','/engenharia/bom':'engenharia-bom','/engenharia/roteiros':'engenharia-roteiros',
    '/estoque/enderecos':'estoque-enderecos','/estoque/movimentacoes':'estoque-movimentacoes','/qualidade/cep':'qualidade-cep','/qualidade/especificacoes':'qualidade-especificacoes','/qualidade/fmea':'qualidade-fmea',
    '/qualidade/rnc-capa':'qualidade-rnc','/pcp/ordens-industriais':'pcp-ordens','/pcp/apontamentos':'pcp-apontamentos',
    '/fiscal/parametros':'fiscal-parametros','/fiscal/nfe-entradas':'fiscal-nfe-entradas','/rh/funcionarios':'rh-funcionarios','/rh/turnos':'rh-turnos','/rh/epis':'rh-epis','/rh/epis/entregas':'rh-entregas-epis'
  }
  const config = configs[routeConfigs[location.pathname] ?? '']
  const isRhWorkspace = location.pathname.startsWith('/rh/')
  const [rows,setRows] = useState<Record<string, unknown>[]>([])
  const [form,setForm] = useState<Record<string,string>>({})
  const [search,setSearch] = useState('')
  const [error,setError] = useState<string|null>(null)
  const [busy,setBusy] = useState(false)
  const [loading,setLoading] = useState(true)
  const [editing,setEditing] = useState<string|null>(null)
  const load = useCallback(async () => {
    if (!config) return
    setLoading(true); setError(null)
    const result = await supabase.from(config.table).select('*').limit(500)
    if (result.error) setError(result.error.message)
    else setRows((result.data ?? []) as Record<string,unknown>[])
    setLoading(false)
  },[config])
  useEffect(()=>{ void load() },[load])
  const visible = useMemo(()=> rows.filter(row => !search || (config?.search ?? []).some(key=>String(row[key] ?? '').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))),[rows,search,config])
  const npr = Number(form.severidade||0)*Number(form.ocorrencia||0)*Number(form.deteccao||0)
  function reset() { setForm({}); setEditing(null); setError(null) }
  function edit(row: Record<string,unknown>) {
    if (!config) return
    const next: Record<string,string>={}
    config.fields.forEach(field => { const value=row[field.key]; next[field.key]=value == null ? '' : typeof value === 'object' ? JSON.stringify(value,null,2) : String(value) })
    setForm(next); setEditing(String(row.id)); setError(null)
  }
  async function postInvoice(id: string) {
    setError(null)
    setBusy(true)
    const result = await supabase.rpc('erp_escriturar_nfe_entrada', { p_nfe_id: id })
    setBusy(false)
    if (result.error) { setError(result.error.message); return }
    await load()
  }
  async function save() {
    if (!config) { setError('Módulo não encontrado para esta rota.'); return }
    setError(null)
    try {
      const payload: Record<string,unknown>={}
      for (const field of config.fields) {
        const raw=form[field.key] ?? ''
        if(field.required && !raw.trim()) throw new Error('Campo obrigatório: '+field.label)
        if(raw.trim()!=='') payload[field.key]=parseValue(field,raw)
        else if(field.type==='number') payload[field.key]=0
      }
      setBusy(true)
      const result=editing
        ? await supabase.from(config.table).update(payload).eq('id',editing).select('id').single()
        : await supabase.from(config.table).insert(payload).select('id').single()
      setBusy(false)
      if(result.error) { setError(result.error.message); return }
      reset(); await load()
    } catch (e) { setBusy(false); setError(e instanceof Error ? e.message : 'Não foi possível validar o formulário.') }
  }
  if(!config) return <main className="p-4 text-xs">Módulo não encontrado para esta rota.</main>
  return <>
    {isRhWorkspace && <style>{`
      .rh-data-workspace{width:100%;max-width:1600px;margin:0 auto;padding:20px 24px 28px;background:#f5f7fb;color:#20364b;font-size:13px;box-sizing:border-box}
      .rh-data-workspace>header{min-height:66px;align-items:center;margin-bottom:18px;padding:0 0 16px;border-bottom:1px solid #dbe4ef}
      .rh-data-workspace>header h1{font-size:22px;line-height:1.3;font-weight:650;color:#0b2545;letter-spacing:-.02em}
      .rh-data-workspace>header p{font-size:13px;line-height:1.5;margin-top:4px;color:#64748b}
      .rh-data-workspace>header button,.rh-data-workspace button{min-height:36px;border-radius:3px;padding:0 12px;font-size:12px;font-weight:600;gap:7px}
      .rh-data-workspace>div.grid{gap:12px;margin-bottom:16px}
      .rh-data-workspace>div.grid section{min-height:82px;padding:14px 16px;border:1px solid #dbe4ef;border-radius:9px;box-shadow:0 2px 6px #0b254508}
      .rh-data-workspace>div.grid section p{font-size:11px;letter-spacing:.04em;margin-bottom:6px}
      .rh-data-workspace>div.grid section strong{font-size:23px;line-height:1.3;color:#0b2545}
      .rh-data-workspace>section{border:1px solid #c9dce3;border-radius:3px;overflow:hidden;box-shadow:0 2px 8px #0b254508}
      .rh-data-workspace>section:first-of-type{padding:18px 20px}
      .rh-data-workspace>section h2{font-size:14px;line-height:1.4;color:#0b2545;margin-bottom:14px}
      .rh-data-workspace label{display:flex;flex-direction:column;align-items:stretch;gap:6px;min-width:0}
      .rh-data-workspace label span{display:block;margin:0;font-size:12px;line-height:1.4;font-weight:650;letter-spacing:0;text-transform:none;color:#334155}
      .rh-data-workspace input,.rh-data-workspace select,.rh-data-workspace textarea{box-sizing:border-box;width:100%;min-width:0;min-height:38px;height:38px;padding:0 11px;border:1px solid #cbd5e1;border-radius:3px;background:#fff;font-family:inherit;font-size:13px;line-height:1.4;color:#17333f;outline:none}
      .rh-data-workspace textarea{height:auto;min-height:100px;padding:10px 11px;resize:vertical}
      .rh-data-workspace input:focus,.rh-data-workspace select:focus,.rh-data-workspace textarea:focus{border-color:#1d5fd1;box-shadow:0 0 0 3px #1d5fd11a}
      .rh-data-workspace input::placeholder{color:#94a3b8}
      .rh-data-workspace>section:first-of-type .grid{gap:14px 16px}
      .rh-data-workspace>section:first-of-type>div.mt-3{margin-top:18px;gap:10px}
      .rh-data-workspace>section:first-of-type>div.mt-3 button{min-height:38px;padding:0 16px}
      .rh-data-workspace>section:last-of-type>div:first-child{min-height:58px;padding:12px 16px;flex-wrap:wrap}
      .rh-data-workspace>section:last-of-type>div:first-child h2{margin:0}
      .rh-data-workspace>section:last-of-type>div:first-child label{width:min(320px,100%)}
      .rh-data-workspace>section:last-of-type>div:first-child input{height:36px;min-height:36px;padding-left:30px}
      .rh-data-workspace table{min-width:760px;font-size:12px}
      .rh-data-workspace thead th{height:42px;padding:10px 12px;font-size:11px;letter-spacing:.035em}
      .rh-data-workspace tbody td{height:44px;padding:10px 12px;font-size:12px;line-height:1.45}
      .rh-data-workspace tbody td button{min-height:32px;padding:0 10px}
      .rh-data-workspace>p{padding-top:10px;font-size:11px;line-height:1.5}
      @media(max-width:760px){.rh-data-workspace{padding:14px 12px 20px}.rh-data-workspace>header h1{font-size:20px}.rh-data-workspace>div.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rh-data-workspace>section:first-of-type{padding:14px}.rh-data-workspace>section:first-of-type .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rh-data-workspace>section:last-of-type>div:first-child{align-items:stretch}.rh-data-workspace>section:last-of-type>div:first-child label{width:100%}}
      @media(max-width:640px){.rh-data-workspace>div.grid{grid-template-columns:minmax(0,1fr)}.rh-data-workspace>section:first-of-type .grid{grid-template-columns:minmax(0,1fr)}.rh-data-workspace>header{align-items:flex-start}.rh-data-workspace>header button{width:100%}}
    `}</style>}
    <main className={isRhWorkspace ? "rh-data-workspace" : "min-h-full bg-slate-50 p-3 text-slate-900"}>
    <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
      <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-sky-700"/><div><h1 className="text-sm font-semibold">{config.title}</h1><p className="text-[10px] text-slate-500">{config.subtitle}</p></div></div>
      <button className={btn} onClick={()=>void load()} disabled={loading}><RefreshCw size={13}/> Atualizar</button>
    </header>
    <div className="mb-3 grid grid-cols-3 gap-2">
      {[['REGISTROS',rows.length],['RESULTADOS FILTRADOS',visible.length],['RISCO NPR',config.table==='qualidade_fmea'?rows.reduce((sum,row)=>sum+Number(row.npr??0),0):'—']].map(([title,value])=><section key={String(title)} className="border border-slate-200 bg-white p-2"><p className={label}>{title}</p><strong className="text-sm tabular-nums">{value}</strong></section>)}
    </div>
    <section className="mb-3 border border-slate-200 bg-white p-3">
      <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold"><ClipboardList size={14}/>{editing?'Editar registro':'Novo registro'}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {config.fields.map(field=><label key={field.key} className={field.type==='textarea'?'sm:col-span-2 lg:col-span-4':''}><span className={label}>{field.label}{field.required?' *':''}</span>
          {field.type==='textarea'?<textarea maxLength={maxLengthForField(field)} className="min-h-[62px] w-full rounded-[2px] border border-slate-300 p-2 text-[10px] outline-none focus:border-sky-600" value={form[field.key]??''} onChange={e=>setForm(old=>({...old,[field.key]:e.target.value}))} required={field.required}/>
          :field.type==='select'?<select className={cls} value={form[field.key]??''} onChange={e=>setForm(old=>({...old,[field.key]:e.target.value}))} required={field.required}><option value="">Selecionar…</option>{(field.options??[]).map(option=><option key={option} value={option}>{option}</option>)}</select>
          :<input className={cls} maxLength={field.type==='number'||field.type==='date'?undefined:maxLengthForField(field)} type={field.type==='number'?'number':field.type==='date'?'date':'text'} step={field.type==='number'?'any':undefined} value={form[field.key]??''} onChange={e=>setForm(old=>({...old,[field.key]:e.target.value}))} required={field.required}/>}
        </label>)}
      </div>
      {config.table==='qualidade_fmea'&&<p className="mt-2 border border-amber-200 bg-amber-50 p-2 text-[10px]">NPR em tempo real: <strong>{npr}</strong> = Severidade × Ocorrência × Detecção</p>}
      {error&&<p role="alert" className="mt-2 flex items-center gap-1 border border-red-200 bg-red-50 p-2 text-[10px] text-red-700"><AlertTriangle size={13}/>{error}</p>}
      <div className="mt-3 flex gap-2"><button className={btn+' bg-sky-700 text-white hover:bg-sky-800'} onClick={()=>void save()} disabled={busy}><Save size={13}/>{busy?'Salvando…':'Salvar no Supabase'}</button><button className={btn} onClick={reset}>Limpar</button></div>
    </section>
    <section className="border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-2"><h2 className="text-xs font-semibold">Registros persistidos</h2><label className="relative flex items-center"><Search size={12} className="absolute left-2 text-slate-400"/><input className="h-[30px] w-56 max-w-full border border-slate-300 pl-6 pr-2 text-[10px]" placeholder="Filtrar registros…" maxLength={50} value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
      <div className="overflow-auto"><table className="w-full border-collapse text-left text-[10px]"><thead className="bg-[#123B50] text-white"><tr>{config.columns.map(col=><th key={col} className="h-[32px] whitespace-nowrap border-b border-[#2D8DB8] px-2 font-bold uppercase tracking-wide">{col.replaceAll('_',' ')}</th>)}<th className="h-[32px] whitespace-nowrap border-b border-[#2D8DB8] px-2 font-bold uppercase tracking-wide">AÇÃO</th></tr></thead><tbody>{loading?<tr><td colSpan={config.columns.length+1} className="h-10 bg-sky-50 text-center text-slate-600">Carregando registros…</td></tr>:visible.length===0?<tr><td colSpan={config.columns.length+1} className="h-10 bg-sky-50 text-center text-slate-500">Nenhum registro encontrado.</td></tr>:visible.map((row,rowIndex)=><tr key={String(row.id)} className={`border-l-2 border-l-transparent hover:border-l-[#2D8DB8] hover:bg-[#DDF4F8] ${rowIndex%2===0?'bg-white':'bg-[#F0F8FB]'}`}>{config.columns.map(col=>{const value=row[col];const semanticClass=statusCellClass(col,value);return <td key={col} title={value==null?'—':typeof value==='object'?JSON.stringify(value):String(value)} className={`h-[32px] max-w-64 truncate border-b border-[#D6E7EE] px-2 ${isNumericColumn(col,value)?'text-right tabular-nums':''} ${semanticClass}`}>{value==null?'—':typeof value==='object'?JSON.stringify(value):String(value)}</td>})}<td className="h-[32px] whitespace-nowrap border-b border-[#D6E7EE] px-2"><div className="flex gap-1"><button className={`${btn} erp-row-action bg-white hover:bg-sky-50`} onClick={()=>edit(row)}>Editar</button>{config.table === "fiscal_nfe_entradas" && row.status === "rascunho" && <button className={btn + " border-sky-800 bg-sky-800 text-white hover:bg-sky-900"} disabled={busy} onClick={() => void postInvoice(String(row.id))}>Escriturar</button>}</div></td></tr>)}</tbody></table></div>
    </section>
    <p className="mt-2 text-[9px] text-slate-500">Dados consultados e gravados diretamente no Supabase com as políticas de acesso existentes; não são utilizados registros de demonstração.</p>
  </main>
  </>
}
