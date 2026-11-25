/**
 * SYSNQRA — Cadastro mestre de produtos e ficha técnica condicional por grupo.
 * Revisão 2026-11-24: código por grupo, cliente separado do código/desenho, unidades,
 * foto de molde e parâmetros específicos de injeção/prensagem.
 */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Cpu, HelpCircle, ImagePlus, Minus, Plus, Save, Search, Tag, X, Barcode } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { fetchAllPages } from '../../lib/supabasePagination'
import { erroBancoNaoInstalado, MIGRACAO_CODIGO_PRODUTO } from '../../lib/supabaseRpcStatus'

type C = { id: string; prefixo: string; separador: string | null; modo_numeracao: string; sequencia_atual: number; digitos_produto: number }
type ClienteOption = { id: string; codigo: string | null; nome: string; documento: string | null }
type GroupOption = { id: string; nome: string; codigo: string; prefixo_codigo: string | null; ativo: boolean }
type UnitOption = { id: string; codigo: string; descricao: string }
type MachineOption = { id: string; codigo: string; nome: string }
type P = {
  id: string; codigo: string; codigo_barras: string | null; nome: string; categoria: string | null; grupo: string | null; grupo_id: string | null;
  unidade: string; cliente: string | null; cliente_principal_id: string | null; codigo_cliente: string | null; desenho: string | null; numero_desenho: string | null;
  material: string | null; material_especificado: string | null; tipo_processo: string | null; molde_codigo: string | null;
  numero_cavidades: number | null; foto_molde_url: string | null; peso_injecao: number | null; peso_peca: number | null; cor_peca: string | null;
  resina_tipo: string | null; cor_resina: string | null; temp_bico_padrao: number | null; tempo_ciclo_padrao: number | null; maquina_preferencial_id: string | null;
}
const input = 'h-8 w-full min-w-0 rounded-[2px] border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2D8DB8] focus:ring-1 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50'
const label = 'grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-600'
const readOnly = 'flex h-8 min-w-0 items-center rounded-[2px] border border-slate-200 bg-slate-50 px-2 font-mono text-[11px] font-bold text-slate-700'

export default function FormFichaTecnica({ productId, onSaved }: { productId?: string; onSaved: () => void }) {
  const [cfg, setCfg] = useState<C[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const [machines, setMachines] = useState<MachineOption[]>([])
  const [configId, setConfigId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [unitCode, setUnitCode] = useState('UN')
  const [p, setP] = useState<P | null>(null)
  const [nome, setNome] = useState('')
  const [desenho, setDesenho] = useState('')
  const [codigoClienteProduto, setCodigoClienteProduto] = useState('')
  const [material, setMaterial] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [cliente, setCliente] = useState('')
  const [clienteModal, setClienteModal] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupPrefix, setNewGroupPrefix] = useState('')
  const [groupPrefix, setGroupPrefix] = useState('')
  const [newUnitCode, setNewUnitCode] = useState('')
  const [newUnitDescription, setNewUnitDescription] = useState('')
  const [moldeCodigo, setMoldeCodigo] = useState('')
  const [cavidades, setCavidades] = useState(1)
  const [pesoInjecao, setPesoInjecao] = useState('')
  const [pesoPeca, setPesoPeca] = useState('')
  const [corPeca, setCorPeca] = useState('')
  const [resinaTipo, setResinaTipo] = useState('')
  const [corResina, setCorResina] = useState('')
  const [tempBico, setTempBico] = useState('220')
  const [tempoCiclo, setTempoCiclo] = useState('28')
  const [maquinaId, setMaquinaId] = useState('')
  const [fotoMoldePath, setFotoMoldePath] = useState('')
  const [fotoMoldeUrl, setFotoMoldeUrl] = useState('')
  const [fotoPendente, setFotoPendente] = useState<File | null>(null)
  const [empresa, setEmpresa] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setError('')
      try {
        const auth = await supabase.auth.getUser()
        if (auth.error) throw auth.error
        if (!auth.data.user) throw new Error('Sessão corporativa não autenticada.')
        const profile = await supabase.from('erp_usuarios').select('empresa_id').eq('auth_user_id', auth.data.user.id).eq('ativo', true).is('deleted_at', null).maybeSingle()
        if (profile.error) throw profile.error
        const empresaId = profile.data?.empresa_id
        if (!empresaId) throw new Error('Empresa não identificada para o usuário autenticado.')
        const [rules, clients, groupResult, unitResult, machineResult] = await Promise.all([
          supabase.from('erp_codigos').select('id,prefixo,separador,modo_numeracao,sequencia_atual,digitos_produto').eq('empresa_id', empresaId).order('prefixo'),
          fetchAllPages<ClienteOption>((from, to) => supabase.from('erp_clientes').select('id,codigo,nome,documento', { count: 'exact' }).eq('empresa_id', empresaId).eq('ativo', true).order('nome').order('id').range(from, to)),
          supabase.from('erp_grupos').select('id,nome,codigo,prefixo_codigo,ativo').eq('empresa_id', empresaId).eq('ativo', true).order('nome').limit(500),
          supabase.from('erp_unidades_medida').select('id,codigo,descricao').eq('empresa_id', empresaId).eq('ativo', true).order('codigo').limit(200),
          supabase.from('erp_maquinas').select('id,codigo,nome').eq('empresa_id', empresaId).eq('ativo', true).order('codigo').limit(1000),
        ])
        if (rules.error) throw rules.error
        if (groupResult.error) throw groupResult.error
        if (unitResult.error) throw unitResult.error
        if (machineResult.error) throw machineResult.error
        const unitRows = (unitResult.data ?? []) as UnitOption[]
        const defaults = [{ codigo: 'UN', descricao: 'Unid' }, { codigo: 'LT', descricao: 'Litro' }, { codigo: 'KG', descricao: 'Quilograma' }, { codigo: 'MG', descricao: 'Miligrama' }, { codigo: 'KIT', descricao: 'Kit' }]
        for (const unit of defaults) if (!unitRows.some(row => row.codigo.toUpperCase() === unit.codigo)) {
          const inserted = await supabase.from('erp_unidades_medida').insert({ ...unit, empresa_id: empresaId, ativo: true }).select('id,codigo,descricao').maybeSingle()
          if (inserted.error) throw inserted.error
          if (inserted.data) unitRows.push(inserted.data as UnitOption)
        }
        let product: P | null = null
        if (productId) {
          const result = await supabase.from('erp_produtos').select('id,codigo,codigo_barras,nome,categoria,grupo,grupo_id,unidade,cliente,cliente_principal_id,codigo_cliente,desenho,numero_desenho,material,material_especificado,tipo_processo,molde_codigo,numero_cavidades,foto_molde_url,peso_injecao,peso_peca,cor_peca,resina_tipo,cor_resina,temp_bico_padrao,tempo_ciclo_padrao,maquina_preferencial_id').eq('id', productId).eq('empresa_id', empresaId).maybeSingle()
          if (result.error) throw result.error
          if (!result.data) throw new Error('Produto não encontrado nesta empresa ou sem permissão de acesso.')
          product = result.data as P
        }
        if (cancelled) return
        const groupRows = (groupResult.data ?? []) as GroupOption[]
        setEmpresa(empresaId); setCfg((rules.data ?? []) as C[]); setClientes(clients); setGroups(groupRows); setUnits(unitRows); setMachines((machineResult.data ?? []) as MachineOption[])
        setConfigId(current => (rules.data ?? []).some(item => item.id === current) ? current : ((rules.data ?? [])[0]?.id ?? ''))
        setP(product); setNome(product?.nome ?? ''); setDesenho(product?.numero_desenho ?? product?.desenho ?? '')
        setCodigoClienteProduto(product?.codigo_cliente ?? ''); setMaterial(product?.material ?? product?.material_especificado ?? '')
        setClienteId(product?.cliente_principal_id ?? clients.find(item => item.nome === product?.cliente)?.id ?? '')
        setCliente(product?.cliente ?? clients.find(item => item.id === product?.cliente_principal_id)?.nome ?? '')
        const group = groupRows.find(item => item.id === product?.grupo_id) ?? groupRows.find(item => item.nome.toLocaleLowerCase('pt-BR') === (product?.grupo ?? product?.categoria ?? '').toLocaleLowerCase('pt-BR'))
        setGroupId(group?.id ?? ''); setGroupPrefix(group?.prefixo_codigo ?? '')
        setUnitCode(product?.unidade ?? 'UN'); setMoldeCodigo(product?.molde_codigo ?? '')
        setCavidades(product?.numero_cavidades ?? 1); setPesoInjecao(product?.peso_injecao == null ? '' : String(product.peso_injecao))
        setPesoPeca(product?.peso_peca == null ? '' : String(product.peso_peca)); setCorPeca(product?.cor_peca ?? '')
        setResinaTipo(product?.resina_tipo ?? ''); setCorResina(product?.cor_resina ?? '')
        setTempBico(product?.temp_bico_padrao == null ? '220' : String(product.temp_bico_padrao))
        setTempoCiclo(product?.tempo_ciclo_padrao == null ? '28' : String(product.tempo_ciclo_padrao))
        setMaquinaId(product?.maquina_preferencial_id ?? '')
        setFotoMoldePath(product?.foto_molde_url ?? '')
        if (product?.foto_molde_url) {
          const signed = await supabase.storage.from('documentos-erp').createSignedUrl(product.foto_molde_url, 300)
          if (!signed.error && signed.data?.signedUrl) setFotoMoldeUrl(signed.data.signedUrl)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Falha ao carregar a ficha técnica.')
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [productId])

  const selectedGroup = groups.find(item => item.id === groupId)
  const groupName = (selectedGroup?.nome ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const isInjection = groupName.includes('injet')
  const isPress = groupName.includes('prens')
  const usesMold = isInjection || isPress
  const currentCfg = cfg.find(item => item.id === configId)
  const digits = Math.max(3, Math.min(6, currentCfg?.digitos_produto || 4))
  const mode = (currentCfg?.modo_numeracao || 'PGR').toUpperCase()
  const separator = (currentCfg?.separador || '').trim()
  const prefix = selectedGroup?.prefixo_codigo ?? ''
  const preview = mode === 'PGR' ? (currentCfg?.prefixo || 'PL') + separator + (prefix || 'Grupo?') + String((currentCfg?.sequencia_atual || 0) + 1).padStart(digits, '0') : mode === 'NUM' ? String((currentCfg?.sequencia_atual || 0) + 1).padStart(digits, '0') : (currentCfg?.prefixo || '') + separator + String((currentCfg?.sequencia_atual || 0) + 1).padStart(digits, '0')

  const filteredClients = useMemo(() => {
    const term = clienteSearch.trim().toLocaleLowerCase('pt-BR')
    const list = !term ? clientes : clientes.filter(item => (item.nome + ' ' + (item.codigo ?? '') + ' ' + (item.documento ?? '')).toLocaleLowerCase('pt-BR').includes(term))
    return list.slice(0, 100)
  }, [clientes, clienteSearch])
  const chooseClient = (item: ClienteOption) => { setClienteId(item.id); setCliente(item.nome); setClienteModal(false); setClienteSearch('') }

  async function addGroup() {
    setError(''); setOk('')
    const name = newGroupName.trim()
    const prefixCode = newGroupPrefix.trim()
    if (!name || !/^[0-9]{1,3}$/.test(prefixCode)) { setError('Informe o nome do grupo e um prefixo numérico de 1 a 3 dígitos.'); return }
    if (groups.some(item => item.nome.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) { setError('Este grupo já está cadastrado.'); return }
    setBusy(true)
    try {
      const result = await supabase.from('erp_grupos').insert({ empresa_id: empresa, nome: name, codigo: 'GRP-' + crypto.randomUUID().slice(0, 8).toUpperCase(), prefixo_codigo: prefixCode, ativo: true }).select('id,nome,codigo,prefixo_codigo,ativo').single()
      if (result.error) throw result.error
      setGroups(current => [...current, result.data as GroupOption].sort((a, b) => a.nome.localeCompare(b.nome)))
      setGroupId(result.data.id); setGroupPrefix(prefixCode); setNewGroupName(''); setNewGroupPrefix(''); setShowGroupForm(false)
      setOk('Grupo cadastrado com prefixo ' + prefixCode + '.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível cadastrar o grupo.') }
    finally { setBusy(false) }
  }
  async function saveGroupPrefix() {
    if (!selectedGroup || !/^[0-9]{1,3}$/.test(groupPrefix.trim())) { setError('O prefixo do grupo deve conter de 1 a 3 números.'); return }
    setBusy(true); setError(''); setOk('')
    try {
      const result = await supabase.from('erp_grupos').update({ prefixo_codigo: groupPrefix.trim() }).eq('id', selectedGroup.id).eq('empresa_id', empresa).select('id').maybeSingle()
      if (result.error) throw result.error
      if (!result.data) throw new Error('Não foi possível salvar o prefixo do grupo.')
      setGroups(current => current.map(item => item.id === selectedGroup.id ? { ...item, prefixo_codigo: groupPrefix.trim() } : item))
      setOk('Prefixo do grupo salvo.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar o prefixo.') }
    finally { setBusy(false) }
  }
  async function removeGroup() {
    if (!selectedGroup) return
    setBusy(true); setError(''); setOk('')
    try {
      const used = await supabase.from('erp_produtos').select('id', { count: 'exact', head: true }).eq('empresa_id', empresa).eq('grupo_id', selectedGroup.id)
      if (used.error) throw used.error
      if ((used.count ?? 0) > 0) {
        const disabled = await supabase.from('erp_grupos').update({ ativo: false }).eq('id', selectedGroup.id).eq('empresa_id', empresa)
        if (disabled.error) throw disabled.error
        setOk('Grupo desativado porque já está vinculado a produtos. O histórico foi preservado.')
      } else {
        const deleted = await supabase.from('erp_grupos').delete().eq('id', selectedGroup.id).eq('empresa_id', empresa)
        if (deleted.error) throw deleted.error
        setOk('Grupo excluído.')
      }
      setGroups(current => current.filter(item => item.id !== selectedGroup.id)); setGroupId(''); setGroupPrefix('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível remover o grupo.') }
    finally { setBusy(false) }
  }
  async function addUnit() {
    setError(''); setOk('')
    const code = newUnitCode.trim().toUpperCase()
    const description = newUnitDescription.trim()
    if (!/^[A-Z0-9]{1,5}$/.test(code) || !description) { setError('Informe o código (até 5 caracteres) e a descrição da unidade.'); return }
    if (units.some(item => item.codigo.toUpperCase() === code)) { setError('Esta unidade já existe.'); return }
    setBusy(true)
    try {
      const result = await supabase.from('erp_unidades_medida').insert({ empresa_id: empresa, codigo: code, descricao: description, ativo: true }).select('id,codigo,descricao').single()
      if (result.error) throw result.error
      setUnits(current => [...current, result.data as UnitOption].sort((a, b) => a.codigo.localeCompare(b.codigo)))
      setUnitCode(code); setNewUnitCode(''); setNewUnitDescription(''); setShowUnitForm(false); setOk('Unidade cadastrada.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível cadastrar a unidade.') }
    finally { setBusy(false) }
  }
  async function removeUnit() {
    const unit = units.find(item => item.codigo === unitCode)
    if (!unit) return
    setBusy(true); setError(''); setOk('')
    try {
      const used = await supabase.from('erp_produtos').select('id', { count: 'exact', head: true }).eq('empresa_id', empresa).eq('unidade', unitCode)
      if (used.error) throw used.error
      if ((used.count ?? 0) > 0) {
        const disabled = await supabase.from('erp_unidades_medida').update({ ativo: false }).eq('id', unit.id).eq('empresa_id', empresa)
        if (disabled.error) throw disabled.error
        setOk('Unidade desativada porque já está vinculada a produtos. Os cadastros foram preservados.')
      } else {
        const deleted = await supabase.from('erp_unidades_medida').delete().eq('id', unit.id).eq('empresa_id', empresa)
        if (deleted.error) throw deleted.error
        setOk('Unidade excluída.')
      }
      setUnits(current => current.filter(item => item.id !== unit.id)); setUnitCode('UN')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível remover a unidade.') }
    finally { setBusy(false) }
  }
  async function uploadMoldPhoto(file: File, productRowId: string) {
    if (!file.type.startsWith('image/')) throw new Error('Selecione uma foto JPG, PNG ou WebP.')
    if (file.size > 15 * 1024 * 1024) throw new Error('A foto do molde excede 15 MB.')
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = empresa + '/cadastro-produtos/moldes/' + productRowId + '/' + crypto.randomUUID() + '-' + safe
    const uploaded = await supabase.storage.from('documentos-erp').upload(path, file, { upsert: false, contentType: file.type })
    if (uploaded.error) throw uploaded.error
    const saved = await supabase.from('erp_produtos').update({ foto_molde_url: path }).eq('id', productRowId).eq('empresa_id', empresa).select('id').maybeSingle()
    if (saved.error || !saved.data) { await supabase.storage.from('documentos-erp').remove([path]); throw saved.error ?? new Error('Foto enviada, mas o vínculo com o produto não foi confirmado.') }
    const signed = await supabase.storage.from('documentos-erp').createSignedUrl(path, 3600)
    setFotoMoldePath(path); setFotoMoldeUrl(signed.data?.signedUrl ?? '')
  }
  async function save() {
    setError(''); setOk('')
    if (busy) return
    if (loading) { setError('Aguarde o carregamento dos dados da empresa.'); return }
    if (!empresa || !nome.trim()) { setError('Empresa, grupo e descrição do produto são obrigatórios.'); return }
    if (!groupId || !selectedGroup) { setError('Selecione um grupo de produto.'); return }
    if (!unitCode.trim()) { setError('Selecione uma unidade de medida.'); return }
    if (!configId && !p) { setError('Cadastre uma regra de numeração antes de gerar o código do produto.'); return }
    if (mode === 'PGR' && !/^[0-9]{1,3}$/.test(selectedGroup.prefixo_codigo ?? '')) { setError('Configure o prefixo numérico do grupo antes de gerar o código do produto.'); return }
    if (usesMold && (!moldeCodigo.trim() || !Number.isInteger(cavidades) || cavidades < 1)) { setError('Para produtos prensados/injetados, informe o número do molde e as cavidades.'); return }
    if (isInjection && ((pesoInjecao && Number(pesoInjecao) < 0) || (pesoPeca && Number(pesoPeca) < 0) || (tempoCiclo && Number(tempoCiclo) <= 0))) { setError('Confira os pesos e o tempo de ciclo da peça injetada.'); return }
    setBusy(true)
    try {
      let codigo = p?.codigo || ''
      if (!codigo) {
        const generated = await supabase.rpc('erp_gerar_codigo', { p_config_id: configId, p_grupo_codigo: selectedGroup.id })
        if (generated.error) throw new Error(erroBancoNaoInstalado(generated.error, 'erp_gerar_codigo', MIGRACAO_CODIGO_PRODUTO) ?? 'Não foi possível gerar o código: ' + generated.error.message)
        if (generated.data === null || generated.data === undefined || String(generated.data).trim() === '') throw new Error('A rotina de numeração não retornou um código válido.')
        codigo = String(generated.data)
      }
      const processType = isInjection ? 'INJETADO' : isPress ? 'PRENSADO' : 'NAO_APLICA'
      const values = {
        nome: nome.trim(), descricao: nome.trim(), categoria: selectedGroup.nome, grupo: selectedGroup.nome, grupo_id: selectedGroup.id,
        unidade: unitCode, unidade_compra: unitCode, unidade_venda: unitCode,
        cliente: cliente.trim() || null, cliente_principal_id: clienteId || null, codigo_cliente: codigoClienteProduto.trim() || null,
        desenho: desenho.trim() || null, numero_desenho: desenho.trim() || null, material: material.trim() || null, material_especificado: material.trim() || null,
        tipo_processo: processType, molde_codigo: usesMold ? moldeCodigo.trim() : null, numero_cavidades: usesMold ? cavidades : 1,
        peso_injecao: isInjection && pesoInjecao !== '' ? Number(pesoInjecao) : null, peso_peca: isInjection && pesoPeca !== '' ? Number(pesoPeca) : null,
        cor_peca: isInjection ? (corPeca.trim() || null) : null, resina_tipo: isInjection ? (resinaTipo.trim() || null) : null,
        cor_resina: isInjection ? (corResina.trim() || null) : null, temp_bico_padrao: isInjection && tempBico !== '' ? Number(tempBico) : null,
        tempo_ciclo_padrao: isInjection && tempoCiclo !== '' ? Number(tempoCiclo) : null, maquina_preferencial_id: isInjection ? (maquinaId || null) : null,
        codigo_barras: p?.codigo_barras || codigo,
      }
      let savedId = p?.id ?? ''
      if (p) {
        const result = await supabase.from('erp_produtos').update(values).eq('id', p.id).eq('empresa_id', empresa).select('id').maybeSingle()
        if (result.error) throw result.error
        if (!result.data?.id) throw new Error('Nenhuma ficha foi atualizada. Verifique a empresa e as permissões RLS.')
        savedId = result.data.id
      } else {
        const made = ['injet', 'prens', 'cabo', 'kit', 'perfil', 'inserto', 'barramento'].some(word => groupName.includes(word))
        const result = await supabase.from('erp_produtos').insert({ empresa_id: empresa, codigo, ...values, ativo: true, fabricado: made, comprado: !made }).select('id').single()
        if (result.error) throw result.error
        savedId = result.data.id
      }
      if (fotoPendente) { await uploadMoldPhoto(fotoPendente, savedId); setFotoPendente(null) }
      setOk('Produto salvo. Código ' + codigo + ' e código de barras ' + (p?.codigo_barras || codigo) + ' disponíveis para as etiquetas.')
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar o produto.') }
    finally { setBusy(false) }
  }
  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Selecione uma foto JPG, PNG ou WebP.'); return }
    if (file.size > 15 * 1024 * 1024) { setError('A foto do molde excede 15 MB.'); return }
    setFotoPendente(file); setFotoMoldeUrl(URL.createObjectURL(file))
  }

  return (
    <section className="space-y-3" aria-busy={loading || busy}>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div><p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#2D8DB8]"><Cpu size={12}/> Engenharia de Produto · Dados Mestres</p><h2 className="text-sm font-bold text-slate-900">{p ? 'Editar Produto' : 'Novo Cadastro de Produto'}</h2></div>
        <div className="flex items-center gap-2"><Link to="/ajuda/ficha-tecnica" className="inline-flex h-8 items-center gap-1 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-50"><HelpCircle size={12}/> Ajuda</Link><button type="button" onClick={() => void save()} disabled={busy || loading} className="inline-flex h-8 items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-4 text-[10px] font-bold uppercase text-white hover:bg-[#246f91] disabled:opacity-50"><Save size={12}/>{busy ? 'Salvando…' : 'Salvar Produto'}</button></div>
      </header>
      {error && <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-800"><AlertTriangle size={13}/><span>{error}</span></div>}
      {ok && <div role="status" className="flex items-center gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800"><CheckCircle2 size={13}/>{ok}</div>}

      <section className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
        <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><Tag size={13} className="text-[#2D8DB8]"/><h3 className="text-[11px] font-bold uppercase tracking-wider text-[#2D8DB8]">1. Identificação do Produto</h3></header>
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="grid min-w-0 gap-1 md:col-span-2"><label className={label}>Código do Produto</label><div className={readOnly}><span className="truncate">{p?.codigo || preview}</span></div></div>
          <div className="grid min-w-0 gap-1 md:col-span-3"><label className={label}>Grupo do Produto *</label><div className="flex gap-1"><select className={input} value={groupId} disabled={loading || !!p} onChange={e => { setGroupId(e.target.value); setGroupPrefix(groups.find(item => item.id === e.target.value)?.prefixo_codigo ?? '') }}><option value="">Selecione o grupo</option>{groups.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select><button type="button" title="Cadastrar grupo" aria-label="Cadastrar grupo" onClick={() => setShowGroupForm(value => !value)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[#2D8DB8] bg-white text-[#2D8DB8]"><Plus size={14}/></button><button type="button" title="Excluir ou desativar grupo" aria-label="Excluir grupo" disabled={!groupId || !!p} onClick={() => void removeGroup()} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-rose-200 bg-white text-rose-600 disabled:opacity-40"><Minus size={14}/></button></div></div>
          <label className={label + ' md:col-span-2'}>Prefixo do Grupo<div className="flex gap-1"><input className={input + ' text-center font-mono'} value={groupPrefix} onChange={e => setGroupPrefix(e.target.value.replace(/\D/g, '').slice(0, 3))} disabled={!selectedGroup || !!p} placeholder="Ex.: 2"/><button type="button" title="Salvar prefixo" onClick={() => void saveGroupPrefix()} disabled={!selectedGroup || !!p || busy} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-slate-100 text-slate-700 disabled:opacity-40"><Save size={13}/></button></div></label>
          <label className={label + ' md:col-span-5'}>Descrição da Peça *<input className={input} value={nome} onChange={e => setNome(e.target.value)} maxLength={120} placeholder="Descrição técnica da peça" required disabled={loading}/></label>
          <label className={label + ' md:col-span-3'}>Desenho / Projeto<input className={input} value={desenho} onChange={e => setDesenho(e.target.value)} maxLength={100} placeholder="Número do desenho"/></label>
          <label className={label + ' md:col-span-3'}>Matéria-prima<input className={input} value={material} onChange={e => setMaterial(e.target.value)} maxLength={100} placeholder="Ex.: PP, ABS, aço..."/></label>
          <div className="grid gap-1 md:col-span-3"><label className={label}>Unidade *</label><div className="flex gap-1"><select className={input} value={unitCode} onChange={e => setUnitCode(e.target.value)}>{units.map(item => <option key={item.id} value={item.codigo}>{item.codigo} · {item.descricao}</option>)}</select><button type="button" title="Cadastrar unidade" aria-label="Cadastrar unidade" onClick={() => setShowUnitForm(value => !value)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-[#2D8DB8] bg-white text-[#2D8DB8]"><Plus size={14}/></button><button type="button" title="Excluir ou desativar unidade" aria-label="Excluir unidade" disabled={!unitCode} onClick={() => void removeUnit()} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-rose-200 bg-white text-rose-600 disabled:opacity-40"><Minus size={14}/></button></div></div>
        </div>
        {showGroupForm && <div className="mt-3 grid grid-cols-1 gap-2 rounded-[2px] border border-sky-200 bg-sky-50 p-2 sm:grid-cols-[1fr_140px_auto_auto]"><input className={input} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Nome do novo grupo"/><input className={input} value={newGroupPrefix} onChange={e => setNewGroupPrefix(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Prefixo numérico"/><button type="button" onClick={() => void addGroup()} disabled={busy} className="inline-flex h-8 items-center justify-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold uppercase text-white"><Plus size={12}/> Adicionar</button><button type="button" onClick={() => setShowGroupForm(false)} className="inline-flex h-8 items-center justify-center rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-600">Cancelar</button></div>}
        {showUnitForm && <div className="mt-2 grid grid-cols-1 gap-2 rounded-[2px] border border-sky-200 bg-sky-50 p-2 sm:grid-cols-[140px_1fr_auto_auto]"><input className={input} value={newUnitCode} onChange={e => setNewUnitCode(e.target.value.toUpperCase())} placeholder="Código: LT, KG..."/><input className={input} value={newUnitDescription} onChange={e => setNewUnitDescription(e.target.value)} placeholder="Descrição da unidade"/><button type="button" onClick={() => void addUnit()} disabled={busy} className="inline-flex h-8 items-center justify-center gap-1 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold uppercase text-white"><Plus size={12}/> Adicionar</button><button type="button" onClick={() => setShowUnitForm(false)} className="inline-flex h-8 items-center justify-center rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-600">Cancelar</button></div>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[2px] bg-slate-50 px-2 py-1.5"><span className="text-[10px] text-slate-500">Código automático · prefixo da empresa + prefixo do grupo + sequência</span><span className="font-mono text-[11px] font-black text-[#123B50]">{p?.codigo || preview}</span></div>
      </section>

      <section className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
        <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><Building2 size={13} className="text-[#2D8DB8]"/><h3 className="text-[11px] font-bold uppercase tracking-wider text-[#2D8DB8]">2. Cliente Vinculado</h3></header>
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="grid gap-1 md:col-span-5"><label className={label}>Cliente</label><div className="flex gap-1"><input className={input} value={cliente} readOnly placeholder="Selecione o cliente"/><button type="button" onClick={() => setClienteModal(true)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-slate-300 bg-white text-slate-600" aria-label="Pesquisar cliente"><Search size={13}/></button><button type="button" onClick={() => { setClienteId(''); setCliente('') }} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] border border-slate-300 bg-white text-slate-500" aria-label="Limpar cliente"><X size={13}/></button></div></div>
          <label className={label + ' md:col-span-3'}>Código da Peça no Cliente<input className={input} value={codigoClienteProduto} onChange={e => setCodigoClienteProduto(e.target.value)} maxLength={80} placeholder="Referência do cliente"/></label>
          <div className="md:col-span-4 rounded-[2px] border border-slate-200 bg-slate-50 px-2 py-2 text-[10px] text-slate-600">Cliente, desenho e código da peça são campos independentes.</div>
        </div>
      </section>

      {usesMold && <section className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
        <header className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><Cpu size={13} className="text-[#2D8DB8]"/><h3 className="text-[11px] font-bold uppercase tracking-wider text-[#2D8DB8]">3. Dados de {isInjection ? 'Injeção' : 'Prensagem'}</h3></header>
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-12">
          <label className={label + ' lg:col-span-3'}>Número do Molde *<input className={input} value={moldeCodigo} onChange={e => setMoldeCodigo(e.target.value)} maxLength={60} placeholder="Código do molde"/></label>
          <label className={label + ' lg:col-span-2'}>Cavidades *<input className={input + ' text-right font-mono'} type="number" min={1} step={1} value={cavidades} onChange={e => setCavidades(Number(e.target.value))}/></label>
          {isInjection && <>
            <label className={label + ' lg:col-span-2'}>Peso da Injeção (g)<input className={input + ' text-right'} type="number" min={0} step="0.001" value={pesoInjecao} onChange={e => setPesoInjecao(e.target.value)}/></label>
            <label className={label + ' lg:col-span-2'}>Peso da Peça (g)<input className={input + ' text-right'} type="number" min={0} step="0.001" value={pesoPeca} onChange={e => setPesoPeca(e.target.value)}/></label>
            <label className={label + ' lg:col-span-3'}>Cor da Peça<input className={input} value={corPeca} onChange={e => setCorPeca(e.target.value)} placeholder="Cor especificada"/></label>
            <label className={label + ' lg:col-span-3'}>Matéria-prima / Resina<input className={input} value={resinaTipo} onChange={e => setResinaTipo(e.target.value)} placeholder="PP, ABS, PA..."/></label>
            <label className={label + ' lg:col-span-2'}>Cor da Resina<input className={input} value={corResina} onChange={e => setCorResina(e.target.value)}/></label>
            <label className={label + ' lg:col-span-2'}>Temp. Bico (°C)<input className={input} type="number" value={tempBico} onChange={e => setTempBico(e.target.value)}/></label>
            <label className={label + ' lg:col-span-2'}>Ciclo (s)<input className={input} type="number" min="0.01" step="0.01" value={tempoCiclo} onChange={e => setTempoCiclo(e.target.value)}/></label>
            <label className={label + ' lg:col-span-3'}>Injetora Preferencial<select className={input} value={maquinaId} onChange={e => setMaquinaId(e.target.value)}><option value="">A definir no PCP</option>{machines.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nome}</option>)}</select></label>
          </>}
          <div className="grid gap-1 lg:col-span-12"><label className={label}>Foto do Molde · usada na ficha de processo</label><div className="flex flex-wrap items-center gap-2"><label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[2px] border border-slate-300 bg-white px-3 text-[10px] font-bold uppercase text-slate-700"><ImagePlus size={13}/> {fotoPendente ? fotoPendente.name : 'Selecionar foto'}<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={selectPhoto}/></label>{fotoMoldePath && <span className="text-[10px] text-emerald-700">Foto vinculada ao produto</span>}</div>{fotoMoldeUrl && <img src={fotoMoldeUrl} alt="Prévia da foto do molde" className="mt-1 h-24 w-36 rounded-[2px] border border-slate-200 bg-slate-50 object-contain"/>}</div>
        </div>
      </section>}
      <section className="rounded-[2px] border border-slate-200 bg-white p-3 shadow-sm">
        <header className="mb-2 flex items-center gap-2 border-b border-slate-200 pb-2"><Barcode size={13} className="text-[#2D8DB8]"/><h3 className="text-[11px] font-bold uppercase tracking-wider text-[#2D8DB8]">4. Identificação para Estoque</h3></header>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr]"><label className={label}>Código de Barras Gerado<div className={readOnly}>{p?.codigo_barras || p?.codigo || preview}</div></label><p className="self-end text-[10px] text-slate-500">O código será gravado automaticamente no produto e usado nas etiquetas Code 128 e na leitura do estoque.</p></div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-slate-200 bg-white px-3 py-2"><p className="text-[10px] text-slate-500">{loading ? 'Carregando dados da empresa…' : p ? 'Edição de cadastro existente' : 'Novo cadastro · código e barras gerados automaticamente'}</p><button type="button" onClick={() => void save()} disabled={busy || loading} className="inline-flex h-8 items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-4 text-[10px] font-bold uppercase text-white hover:bg-[#246f91] disabled:opacity-50"><Save size={12}/>{busy ? 'Salvando…' : 'Salvar Produto'}</button></footer>

      {clienteModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Selecionar cliente"><div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2px] border border-slate-300 bg-white shadow-xl"><header className="flex items-center justify-between bg-[#123B50] px-4 py-2.5 text-white"><h3 className="text-[11px] font-bold uppercase tracking-wider">Pesquisar Cliente Cadastrado</h3><button type="button" onClick={() => setClienteModal(false)} aria-label="Fechar pesquisa" className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-white hover:bg-white/10"><X size={14}/></button></header><div className="border-b border-slate-200 p-3"><div className="flex h-8 items-center gap-2 rounded-[2px] border border-slate-300 px-2"><Search size={13} className="text-slate-400"/><input autoFocus value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} placeholder="Razão social, código ou CPF/CNPJ" className="h-full w-full border-0 text-[11px] outline-none"/></div></div><div className="overflow-auto"><table className="w-full border-collapse text-left text-[11px]"><thead><tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600"><th className="h-8 px-3">Cliente</th><th className="px-3">Documento</th><th className="px-3 text-right">Ação</th></tr></thead><tbody>{filteredClients.map((item, index) => <tr key={item.id} className={'h-8 border-b border-slate-100 hover:bg-sky-50 ' + (index % 2 ? 'bg-slate-50/60' : 'bg-white')}><td className="px-3 font-semibold text-slate-800">{item.nome}</td><td className="px-3 font-mono text-slate-500">{item.documento || '—'}</td><td className="px-3 text-right"><button type="button" onClick={() => chooseClient(item)} className="inline-flex h-7 items-center rounded-[2px] bg-[#2D8DB8] px-2.5 text-[10px] font-bold uppercase text-white hover:bg-[#246f91]">Selecionar</button></td></tr>)}{!filteredClients.length && <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>}</tbody></table></div></div></div>}
    </section>
  )
}
