/**
 * 📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
 * - Arquivo: src/pages/ConfiguracaoLote.tsx
 * - Status Atual: Revisão 1
 * - Total de Linhas Lido/Gerado: 246
 * - Assinatura de Entrada (Primeiros 3 Imports): import { useEffect, useMemo, useState } from 'react'
 *   import { Check, Eye, Save, ShieldCheck } from 'lucide-react'
 *   import { supabase } from '../lib/supabaseClient'
 * - Integração Concretizada: tabela real public.erp_configuracoes_lote, tenant via public.erp_current_empresa_id e auditoria em public.erp_logs_sistema
 * -
 * - Arquivo: src/pages/ConfiguracaoLote.tsx
 * - Status Atual: Revisão 1
 * - Total de Linhas Lido/Gerado: 246
 * - Assinatura de Entrada (Primeiros 3 Imports): import { useEffect, useMemo, useState } from 'react'
 *   import { Check, Eye, Save, ShieldCheck } from 'lucide-react'
 *   import { supabase } from '../lib/supabaseClient'
 * - Integração Concretizada: tabela real public.erp_configuracoes_lote, tenant via public.erp_current_empresa_id e auditoria em public.erp_logs_sistema
 * 
 * Este carimbo é comentário TypeScript para manter o arquivo executável.
 */

import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

type LotToken = 'pedido' | 'produto' | 'data' | 'maquina' | 'turno' | 'sequencial' | 'empresa'

type LotConfig = {
  id: string
  nome: string
  ativo: boolean
  tokens: LotToken[]
  separador: string
}

const TOKEN_LABELS: Array<{ id: LotToken; label: string; example: string }> = [
  { id: 'pedido', label: 'Número do pedido cliente', example: '458721' },
  { id: 'produto', label: 'Código interno do produto', example: 'PL00045' },
  { id: 'data', label: 'Data de produção', example: '20261005' },
  { id: 'maquina', label: 'Máquina', example: 'INJ01' },
  { id: 'turno', label: 'Turno', example: 'T1' },
  { id: 'sequencial', label: 'Sequencial', example: '0001' },
  { id: 'empresa', label: 'Empresa', example: 'EMP01' },
]

const DEFAULT_TOKENS: LotToken[] = ['pedido', 'produto', 'data']

function isLotToken(value: unknown): value is LotToken {
  return typeof value === 'string' && TOKEN_LABELS.some(token => token.id === value)
}

function normalizeTokens(value: unknown): LotToken[] {
  if (!Array.isArray(value)) return []
  return value.filter(isLotToken)
}

function buildPreview(tokens: LotToken[], separator: string): string {
  const values = new Map(TOKEN_LABELS.map(token => [token.id, token.example]))
  return tokens.map(token => values.get(token) ?? '').filter(Boolean).join(separator)
}

function todayExample(): string {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

export default function ConfiguracaoLote() {
  const [config, setConfig] = useState<LotConfig | null>(null)
  const [tokens, setTokens] = useState<LotToken[]>(DEFAULT_TOKENS)
  const [separator, setSeparator] = useState('-')
  const [name, setName] = useState('Padrão')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const preview = useMemo(() => buildPreview(tokens, separator || '-'), [tokens, separator])

  async function getCompanyId(): Promise<string> {
    const { data, error: rpcError } = await supabase.rpc('erp_current_empresa_id')
    if (rpcError || !data) throw new Error('Empresa da sessão não identificada.')
    return String(data)
  }

  async function load(): Promise<void> {
    setLoading(true)
    setError('')
    try {
      const empresaId = await getCompanyId()
      const { data, error: queryError } = await supabase
        .from('erp_configuracoes_lote')
        .select('id,nome,ativo,tokens,separador')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .maybeSingle()

      if (queryError) throw queryError

      if (!data) {
        setConfig(null)
        setTokens(DEFAULT_TOKENS)
        setSeparator('-')
        setName('Padrão')
        setNotice('Nenhuma configuração ativa encontrada. Configure os códigos antes.')
        return
      }

      const nextTokens = normalizeTokens(data.tokens)
      setConfig({
        id: String(data.id),
        nome: String(data.nome ?? 'Padrão'),
        ativo: Boolean(data.ativo),
        tokens: nextTokens,
        separador: String(data.separador ?? '-'),
      })
      setTokens(nextTokens)
      setSeparator(String(data.separador ?? '-'))
      setName(String(data.nome ?? 'Padrão'))
      setNotice('Configuração ativa carregada.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a configuração.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function toggleToken(token: LotToken): void {
    setTokens(current => {
      if (current.includes(token)) return current.filter(item => item !== token)
      return [...current, token]
    })
    setNotice('')
    setError('')
  }

  function moveToken(token: LotToken, direction: -1 | 1): void {
    setTokens(current => {
      const index = current.indexOf(token)
      if (index < 0) return current
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  async function save(): Promise<void> {
    if (tokens.length === 0) {
      setError('Selecione pelo menos um componente para o código do lote.')
      return
    }

    if (!separator || separator.length > 3) {
      setError('O separador deve ter entre 1 e 3 caracteres.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const empresaId = await getCompanyId()
      const { data: authData } = await supabase.auth.getUser()
      const authUserId = authData.user?.id ?? null

      const { data: currentUser } = authUserId
        ? await supabase.from('erp_usuarios').select('id').eq('auth_user_id', authUserId).maybeSingle()
        : { data: null }

      const { error: deactivateError } = await supabase
        .from('erp_configuracoes_lote')
        .update({ ativo: false })
        .eq('empresa_id', empresaId)
        .eq('ativo', true)

      if (deactivateError) throw deactivateError

      const { data: saved, error: insertError } = await supabase
        .from('erp_configuracoes_lote')
        .insert({
          empresa_id: empresaId,
          nome: name.trim() || 'Padrão',
          ativo: true,
          tokens,
          separador: separator,
          created_by: currentUser?.id ?? null,
        })
        .select('id,nome,ativo,tokens,separador')
        .single()

      if (insertError) throw insertError

      await supabase.from('erp_logs_sistema').insert({
        empresa_id: empresaId,
        usuario_id: currentUser?.id ?? null,
        modulo: 'CONFIGURAÇÕES',
        acao: config ? 'atualizar_configuracao_lote' : 'criar_configuracao_lote',
        entidade: 'erp_configuracoes_lote',
        entidade_id: saved.id,
        dados: { tokens, separador: separator, nome: name.trim() || 'Padrão', auth_user_id: authUserId },
      })

      setConfig({
        id: String(saved.id),
        nome: String(saved.nome),
        ativo: Boolean(saved.ativo),
        tokens: normalizeTokens(saved.tokens),
        separador: String(saved.separador),
      })
      setNotice('Configuração do lote salva e ativada para esta empresa.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a configuração.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="lot-config-page"><div className="lot-config-card">Carregando configuração de lotes…</div></main>
  }

  return (
    <main className="lot-config-page">
      <style>{`
        .lot-config-page{min-height:100vh;background:#FAFAFA;color:#111827;padding:28px;box-sizing:border-box;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
        .lot-config-wrap{max-width:1180px;margin:0 auto}
        .lot-config-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}
        .lot-kicker{font-size:11px;font-weight:900;letter-spacing:.12em;color:#0f766e}.lot-config-head h1{margin:6px 0;font-size:clamp(28px,4vw,44px);letter-spacing:-.04em}.lot-config-head p{margin:0;color:#475569;max-width:780px}
        .lot-config-card{background:#fff;border:1px solid #d7dee5;border-radius:18px;padding:20px;box-shadow:0 8px 26px rgba(17,24,39,.06);margin-top:16px}
        .lot-config-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:16px}.lot-token-list{display:grid;gap:9px}
        .lot-token{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid #d7dee5;border-radius:12px;padding:12px;background:#fff}
        .lot-token input{width:19px;height:19px}.lot-token strong{display:block}.lot-token small{display:block;color:#64748b;margin-top:2px}.lot-order{display:flex;gap:5px}.lot-order button{border:1px solid #cbd5e1;background:#f8fafc;border-radius:7px;padding:5px 8px;cursor:pointer}
        .lot-preview{background:#111827;color:#fff;border-radius:15px;padding:18px;position:sticky;top:18px}.lot-preview-label{color:#cbd5e1;font-size:10px;font-weight:900;letter-spacing:.12em}.lot-preview-code{font-size:clamp(24px,3vw,38px);font-weight:950;overflow-wrap:anywhere;margin:12px 0}.lot-preview-date{color:#cbd5e1;font-size:11px}
        .lot-field{display:grid;gap:6px;margin-top:12px}.lot-field label{font-size:11px;font-weight:900}.lot-field input{border:1px solid #cbd5e1;border-radius:9px;padding:10px;background:#fff;color:#111827}
        .lot-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.lot-button{display:inline-flex;align-items:center;gap:7px;border:1px solid #0f766e;border-radius:10px;padding:11px 15px;background:#0f766e;color:#fff;font-weight:900;cursor:pointer}.lot-button:disabled{opacity:.55;cursor:not-allowed}.lot-secondary{background:#fff;color:#111827;border-color:#cbd5e1}
        .lot-message{padding:12px;border-radius:10px;margin-top:14px;font-size:12px}.lot-success{background:#dcfce7;color:#166534}.lot-error{background:#fee2e2;color:#991b1b}.lot-warning{background:#fff7ed;color:#9a3412}
        .lot-active{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#dcfce7;color:#166534;font-size:10px;font-weight:900}
        @media(max-width:850px){.lot-config-grid{grid-template-columns:1fr}.lot-preview{position:static}}
      `}</style>

      <div className="lot-config-wrap">
        <header className="lot-config-head">
          <div>
            <span className="lot-kicker">CONFIGURAÇÕES • PRODUÇÃO • RASTREABILIDADE</span>
            <h1>Configuração do código de lote</h1>
            <p>Defina os componentes e a ordem do identificador que será usado na produção. A configuração é isolada por empresa.</p>
          </div>
          {config?.ativo && <span className="lot-active"><ShieldCheck size={14}/> Configuração ativa</span>}
        </header>

        {!config && <div className="lot-message lot-warning">Configure os códigos antes. Novas OPs que dependem de lote ficarão bloqueadas até existir uma configuração ativa.</div>}
        {error && <div className="lot-message lot-error">{error}</div>}
        {notice && <div className="lot-message lot-success">{notice}</div>}

        <section className="lot-config-card">
          <div className="lot-config-grid">
            <div>
              <div className="lot-field">
                <label htmlFor="lot-name">Nome da configuração</label>
                <input id="lot-name" value={name} onChange={event => setName(event.target.value)} maxLength={80}/>
              </div>
              <div className="lot-field">
                <label htmlFor="lot-separator">Separador</label>
                <input id="lot-separator" value={separator} onChange={event => setSeparator(event.target.value)} maxLength={3}/>
              </div>

              <h2 style={{margin:'22px 0 10px'}}>Componentes do lote</h2>
              <div className="lot-token-list">
                {TOKEN_LABELS.map(token => (
                  <label className="lot-token" key={token.id}>
                    <input type="checkbox" checked={tokens.includes(token.id)} onChange={() => toggleToken(token.id)} />
                    <span><strong>{token.label}</strong><small>Exemplo: {token.example}</small></span>
                    <span className="lot-order">
                      <button type="button" onClick={() => moveToken(token.id,-1)} aria-label={`Mover ${token.label} para cima`}>↑</button>
                      <button type="button" onClick={() => moveToken(token.id,1)} aria-label={`Mover ${token.label} para baixo`}>↓</button>
                    </span>
                  </label>
                ))}
              </div>

              <div className="lot-actions">
                <button className="lot-button" type="button" disabled={saving} onClick={() => void save()}><Save size={17}/>{saving ? 'Salvando…' : 'Salvar configuração'}</button>
                <button className="lot-button lot-secondary" type="button" onClick={() => void load()}><Eye size={17}/> Recarregar</button>
              </div>
            </div>

            <aside className="lot-preview">
              <span className="lot-preview-label">PRÉ-VISUALIZAÇÃO</span>
              <div className="lot-preview-code">{preview || 'Configure os códigos'}</div>
              <div className="lot-preview-date">Exemplo de produção: pedido 458721 · produto PL00045 · data {todayExample()}</div>
              <div style={{marginTop:18,fontSize:11,lineHeight:1.6}}>
                <Check size={15} style={{verticalAlign:'-3px',marginRight:5}}/> Os componentes selecionados serão armazenados na ordem definida.
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
