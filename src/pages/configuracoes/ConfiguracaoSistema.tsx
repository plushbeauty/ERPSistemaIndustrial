/*
 * SYSNQRA ERP INDUSTRIAL — PARÂMETROS E INSTALAÇÃO DO FILE MANAGER
 * Revisão: 23/10/2026
 * A instalação web configura e testa um agente local já instalado; não instala
 * silenciosamente serviços no Windows nem presume permissões administrativas.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Building2, Code2, DatabaseBackup, FileClock, KeyRound, Network, ShieldCheck, Settings2, UsersRound, AlertTriangle, CheckCircle2, HardDrive, FolderTree, Server, Wifi, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const destinations = [
  { to: '/configuracoes-adm/empresa', label: 'Empresa e identidade', detail: 'Dados cadastrais da empresa', icon: Building2 },
  { to: '/configuracoes-adm/codificacao', label: 'Codificação e áreas', detail: 'Padrões e setores existentes', icon: Code2 },
  { to: '/configuracoes-adm/perfis', label: 'Perfis de usuários', detail: 'Perfis e níveis de acesso', icon: UsersRound },
  { to: '/configuracoes-adm/permissoes', label: 'Permissões RBAC', detail: 'Permissões por código e perfil', icon: ShieldCheck },
  { to: '/configuracoes-adm/usuarios', label: 'Usuários', detail: 'Contas e situação de acesso', icon: KeyRound },
  { to: '/configuracoes-adm/seguranca', label: 'Segurança e sessões', detail: 'Senha, MFA e sessão atual', icon: Activity },
  { to: '/configuracoes-adm/logs', label: 'Logs e auditoria', detail: 'Eventos de rastreabilidade', icon: FileClock },
  { to: '/configuracoes-adm/backups', label: 'Backups e recuperação', detail: 'Política e evidência de recuperação', icon: DatabaseBackup },
  { to: '/configuracoes-adm/integracoes', label: 'Integrações', detail: 'Serviços conectados', icon: Network },
]

const DEFAULT_FOLDERS = ['fotos', 'imagens', 'desenhos-tecnicos', 'documentos', 'pcp', 'fichas-processo', 'moldes', 'qualidade', 'engenharia', 'compras', 'produtos', 'clientes', 'fornecedores', 'documentos-gerais']

type InstallTarget = 'pc' | 'rede'

function FileManagerInstaller({ companyId }: { companyId: string | null }) {
  const [target, setTarget] = useState<InstallTarget>('pc')
  const [agentUrl, setAgentUrl] = useState('http://127.0.0.1:8970')
  const [token, setToken] = useState('')
  const [primaryPath, setPrimaryPath] = useState('C:\\SYSNQRA\\Arquivos')
  const [networkPath, setNetworkPath] = useState('\\\\SERVIDOR\\SYSNQRA\\Arquivos')
  const [autoFolders, setAutoFolders] = useState(true)
  const [busy, setBusy] = useState(false)
  const [health, setHealth] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const requestHeaders = (): Record<string, string> => ({
    Authorization: 'Bearer ' + token.trim(),
    'Content-Type': 'application/json',
    'X-SYSNQRA-Company-ID': companyId || '',
  })

  async function testConnection() {
    setBusy(true); setError(''); setMessage(''); setHealth('')
    try {
      if (!companyId) throw new Error('Selecione uma empresa válida na sessão do ERP antes de configurar o agente.')
      if (!token.trim()) throw new Error('Informe o token de acesso configurado no agente local.')
      const response = await fetch(agentUrl.replace(/\/+$/, '') + '/health', { headers: { Authorization: 'Bearer ' + token.trim(), 'X-SYSNQRA-Company-ID': companyId || '' } })
      const data: unknown = await response.json()
      if (!response.ok) throw new Error('O agente respondeu HTTP ' + response.status + '. Confira endereço e token.')
      const status = data as { status?: string; service?: string; version?: string; hostname?: string }
      if (status.status !== 'ONLINE') throw new Error('A resposta não corresponde a um agente SYSNQRA ativo.')
      setHealth('Conectado: ' + (status.hostname || 'computador local') + ' · versão ' + (status.version || 'não informada'))
      setMessage('Conexão validada. Ainda é necessário salvar e validar os diretórios.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível conectar ao agente. Verifique se ele está instalado, iniciado e acessível.')
    } finally { setBusy(false) }
  }

  async function configureStorage() {
    setBusy(true); setError(''); setMessage('')
    try {
      if (!companyId) throw new Error('Selecione uma empresa válida na sessão do ERP antes de configurar o agente.')
      if (!token.trim()) throw new Error('Informe o token do agente.')
      if (!primaryPath.trim()) throw new Error('Informe a pasta principal de armazenamento.')
      const response = await fetch(agentUrl.replace(/\/+$/, '') + '/validate-paths', {
        method: 'POST',
        headers: requestHeaders(),
        body: JSON.stringify({
          companyId,
          primaryPath: primaryPath.trim(),
          networkPath: target === 'rede' ? networkPath.trim() : '',
          folders: DEFAULT_FOLDERS,
          autoCreateFolders: autoFolders,
        }),
      })
      const result: unknown = await response.json()
      if (!response.ok) {
        const detail = result as { error?: string }
        throw new Error(detail.error || 'Falha ao validar os diretórios (HTTP ' + response.status + ').')
      }
      const data = result as { primaryOk?: boolean; networkOk?: boolean; createdFolders?: string[] }
      if (!data.primaryOk) throw new Error('O agente não conseguiu criar ou acessar a pasta principal. Confira o caminho e as permissões da conta do serviço.')
      if (target === 'rede' && !data.networkOk) throw new Error('A pasta de rede não foi acessada. Confira o caminho UNC e as permissões da conta que executa o serviço.')
      // O token não é persistido no navegador; permanece apenas no estado desta tela.
      setMessage('Diretórios validados para esta empresa. Pastas criadas nesta operação: ' + (data.createdFolders ? data.createdFolders.length : 0) + '. O teste e a validação foram concluídos; o token não foi persistido no navegador.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível configurar o armazenamento.')
    } finally { setBusy(false) }
  }

  return <section className="space-y-3 text-[#334155]">
    <header className="flex items-center gap-2 border border-[#CFE1E7] bg-white p-3">
      <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><FolderTree size={16}/></span>
      <div className="min-w-0 flex-1"><h2 className="text-[11px] font-extrabold uppercase tracking-wide text-[#123B50]">Instalar sistema · File Manager Industrial</h2><p className="mt-0.5 text-[9px] text-slate-500">Assistente de configuração do armazenamento local e de rede do cliente.</p></div>
      <span className="border border-[#CFE1E7] bg-[#F4FBFD] px-2 py-1 text-[8px] font-bold text-[#176487]">AGENTE LOCAL</span>
    </header>

    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={() => setTarget('pc')} aria-pressed={target === 'pc'} className={'flex items-start gap-3 border p-3 text-left ' + (target === 'pc' ? 'border-[#176487] bg-[#F0F9FC]' : 'border-[#CFE1E7] bg-white')}>
        <HardDrive size={19} className="mt-0.5 shrink-0 text-[#176487]"/><span><strong className="block text-[10px] text-[#123B50]">Instalar neste PC</strong><small className="mt-1 block text-[9px] leading-4 text-slate-500">Arquivos gravados no disco do computador em que o agente está executando.</small></span>
      </button>
      <button type="button" onClick={() => setTarget('rede')} aria-pressed={target === 'rede'} className={'flex items-start gap-3 border p-3 text-left ' + (target === 'rede' ? 'border-[#176487] bg-[#F0F9FC]' : 'border-[#CFE1E7] bg-white')}>
        <Server size={19} className="mt-0.5 shrink-0 text-[#176487]"/><span><strong className="block text-[10px] text-[#123B50]">Instalar em servidor / rede</strong><small className="mt-1 block text-[9px] leading-4 text-slate-500">O agente roda no servidor e grava em uma pasta compartilhada autorizada.</small></span>
      </button>
    </div>

    <div className="grid gap-3 border border-[#CFE1E7] bg-white p-3">
      <div><label htmlFor="fm-agent-url" className="mb-1 block text-[9px] font-bold text-[#123B50]">Endereço do agente</label><input id="fm-agent-url" value={agentUrl} onChange={e => setAgentUrl(e.target.value)} placeholder="http://127.0.0.1:8970" className="h-8 w-full border border-[#CFE1E7] px-2 text-[10px]" /></div>
      <div><label htmlFor="fm-token" className="mb-1 block text-[9px] font-bold text-[#123B50]">Token de acesso do agente</label><input id="fm-token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder="Token configurado no serviço Windows" className="h-8 w-full border border-[#CFE1E7] px-2 text-[10px]" /><small className="mt-1 block text-[9px] text-slate-500">O token fica apenas no estado desta tela e não é gravado no banco de dados.</small></div>
      <div><label htmlFor="fm-primary" className="mb-1 block text-[9px] font-bold text-[#123B50]">Pasta principal no computador do agente</label><input id="fm-primary" value={primaryPath} onChange={e => setPrimaryPath(e.target.value)} placeholder="C:\\SYSNQRA\\Arquivos" className="h-8 w-full border border-[#CFE1E7] px-2 text-[10px]" /></div>
      {target === 'rede' && <div><label htmlFor="fm-network" className="mb-1 block text-[9px] font-bold text-[#123B50]">Pasta compartilhada da rede (caminho UNC)</label><input id="fm-network" value={networkPath} onChange={e => setNetworkPath(e.target.value)} placeholder="\\\\SERVIDOR\\SYSNQRA\\Arquivos" className="h-8 w-full border border-[#CFE1E7] px-2 text-[10px]" /><small className="mt-1 block text-[9px] text-slate-500">A conta do serviço Windows precisa ter permissão de leitura e gravação nesse compartilhamento.</small></div>}
      <label className="flex items-start gap-2 text-[9px] text-slate-600"><input type="checkbox" checked={autoFolders} onChange={e => setAutoFolders(e.target.checked)} className="mt-0.5"/>Criar automaticamente a estrutura de pastas industriais padrão.</label>
      <div className="flex flex-wrap gap-1">{DEFAULT_FOLDERS.map(folder => <span key={folder} className="border border-[#D8E7EC] bg-[#F8FCFD] px-2 py-1 text-[8px] text-[#526273]">{folder}</span>)}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void testConnection()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 border border-[#CFE1E7] bg-white px-3 text-[9px] font-bold text-[#123B50] disabled:opacity-50"><Wifi size={13}/>{busy ? 'Processando…' : 'Testar conexão'}</button>
        <button type="button" onClick={() => void configureStorage()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 border border-[#123B50] bg-[#123B50] px-3 text-[9px] font-bold text-white disabled:opacity-50"><Save size={13}/>{busy ? 'Processando…' : 'Validar e criar pastas'}</button>
      </div>
    </div>

    {health && <div role="status" className="flex items-start gap-2 border border-emerald-200 bg-emerald-50 p-2 text-[9px] text-emerald-800"><CheckCircle2 size={14} className="mt-0.5 shrink-0"/>{health}</div>}
    {message && <div role="status" className="border border-[#CFE1E7] bg-[#F4FBFD] p-2 text-[9px] text-[#176487]">{message}</div>}
    {error && <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 p-2 text-[9px] text-red-800"><AlertTriangle size={14} className="mt-0.5 shrink-0"/>{error}</div>}

    <div className="flex items-start gap-2 border border-[#E8D6AD] bg-[#FFFDF5] p-2 text-[9px] leading-4 text-[#7A581C]"><AlertTriangle size={13} className="mt-0.5 shrink-0"/><span><strong>Pré-requisito:</strong> esta tela configura um agente já instalado e iniciado. Ela não consegue instalar um serviço Windows sozinha pelo navegador. Para clientes, o pacote do agente e sua instalação como serviço (com permissões limitadas e token próprio) precisam ser distribuídos separadamente. Em acesso ao ERP por HTTPS, um servidor remoto deve oferecer endpoint HTTPS confiável; navegadores podem bloquear chamadas HTTP para IPs da rede.</span></div>
  </section>
}

export default function ConfiguracaoSistema() {
  const [identity, setIdentity] = useState<{ company: string | null; actor: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInstaller, setShowInstaller] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!auth.user) throw new Error('Entre no ERP para consultar os parâmetros administrativos.')
        const [company, actor] = await Promise.all([
          supabase.rpc('erp_current_empresa_id'),
          supabase.from('erp_usuarios').select('nome,ativo,deleted_at').eq('auth_user_id', auth.user.id).maybeSingle(),
        ])
        if (company.error) throw company.error
        if (actor.error) throw actor.error
        if (!actor.data || !actor.data.ativo || actor.data.deleted_at) throw new Error('O usuário não possui um perfil ERP ativo.')
        if (alive) setIdentity({ company: company.data ? String(company.data) : null, actor: actor.data.nome })
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Não foi possível validar a sessão.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  return <section className="space-y-2 text-[#334155]">
    <header className="flex items-center gap-2 border border-[#CFE1E7] bg-white p-3"><span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><Settings2 size={16}/></span><div><h2 className="text-[11px] font-extrabold uppercase tracking-wide text-[#123B50]">Parâmetros administrativos</h2><p className="mt-0.5 text-[9px] text-slate-500">Acesso direto às configurações reais existentes no ERP.</p></div></header>
    {error && <div role="alert" className="flex items-start gap-2 border border-red-200 bg-red-50 p-2 text-[10px] text-red-800"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>{error}</div>}
    {loading ? <div className="border border-[#CFE1E7] bg-white p-3 text-[10px]">Validando sessão…</div> : identity && <div className="grid gap-2 sm:grid-cols-2"><div className="border border-[#CFE1E7] bg-white p-2"><span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Operador autenticado</span><p className="mt-1 text-[10px] font-extrabold text-[#123B50]">{identity.actor}</p></div><div className="border border-[#CFE1E7] bg-white p-2"><span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Empresa da sessão</span><p className="mt-1 break-all text-[10px] font-extrabold text-[#123B50]">{identity.company || 'Sem empresa selecionada'}</p></div></div>}

    <button type="button" onClick={() => setShowInstaller(value => !value)} aria-expanded={showInstaller} className="flex w-full items-center gap-3 border border-[#2D8DB8] bg-white p-3 text-left hover:bg-[#F4FBFD]">
      <span className="grid h-9 w-9 place-items-center bg-[#E2F3F7] text-[#176487]"><FolderTree size={17}/></span>
      <span className="min-w-0 flex-1"><strong className="block text-[10px] font-extrabold text-[#123B50]">Instalar Sistema · File Manager Industrial</strong><small className="mt-1 block text-[9px] text-slate-500">Configurar armazenamento no PC do cliente ou em servidor de rede, testar conexão e criar pastas.</small></span>
      <span className="text-[9px] font-extrabold text-[#176487]">{showInstaller ? 'FECHAR' : 'CONFIGURAR'}</span>
    </button>
    {showInstaller && <FileManagerInstaller companyId={identity?.company ?? null} />}

    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{destinations.map(item => {const Icon = item.icon; return <Link key={item.to} to={item.to} className="flex min-h-[58px] items-center gap-2 border border-[#CFE1E7] bg-white p-2 no-underline hover:border-[#2D8DB8] hover:bg-[#F4FBFD]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-[2px] bg-[#E2F3F7] text-[#176487]"><Icon size={14}/></span><span className="min-w-0 flex-1"><strong className="block text-[10px] font-extrabold text-[#123B50]">{item.label}</strong><small className="mt-0.5 block text-[9px] text-slate-500">{item.detail}</small></span></Link>})}</div>
    <div className="flex items-start gap-2 border border-[#E8D6AD] bg-[#FFFDF5] p-2 text-[9px] text-[#7A581C]"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>Preferências globais editáveis não são simuladas: antes de criar campos de gravação, é necessário confirmar a tabela e as policies RLS oficiais para parâmetros do sistema.</div>
  </section>
}
