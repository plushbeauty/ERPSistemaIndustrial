import { useEffect, useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import VendasLayout from './VendasLayout'

type Config = {
  id?: string
  dias_validade_orcamento: number
  desconto_maximo_percentual: number
  bloquear_pedido_sem_estoque: boolean
  exigir_pedido_cliente: boolean
}

const initial: Config = {
  dias_validade_orcamento: 15,
  desconto_maximo_percentual: 0,
  bloquear_pedido_sem_estoque: false,
  exigir_pedido_cliente: false,
}

export default function VendasConfiguracoes() {
  const [empresa, setEmpresa] = useState('')
  const [config, setConfig] = useState<Config>(initial)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const company = await supabase.rpc('erp_current_empresa_id')
      if (company.error || !company.data) {
        throw company.error ?? new Error('Empresa ERP não identificada.')
      }

      const empresaId = String(company.data)
      setEmpresa(empresaId)

      const result = await supabase
        .from('erp_vendas_configuracoes')
        .select('id,dias_validade_orcamento,desconto_maximo_percentual,bloquear_pedido_sem_estoque,exigir_pedido_cliente')
        .eq('empresa_id', empresaId)
        .maybeSingle()

      if (result.error) throw result.error

      setConfig(result.data ? {
        id: String(result.data.id),
        dias_validade_orcamento: Number(result.data.dias_validade_orcamento),
        desconto_maximo_percentual: Number(result.data.desconto_maximo_percentual),
        bloquear_pedido_sem_estoque: Boolean(result.data.bloquear_pedido_sem_estoque),
        exigir_pedido_cliente: Boolean(result.data.exigir_pedido_cliente),
      } : initial)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar configurações de Vendas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    if (!empresa) return
    if (config.dias_validade_orcamento < 1) {
      setError('A validade do orçamento deve ser de pelo menos 1 dia.')
      return
    }
    if (config.desconto_maximo_percentual < 0 || config.desconto_maximo_percentual > 100) {
      setError('O desconto máximo deve estar entre 0% e 100%.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const result = await supabase
        .from('erp_vendas_configuracoes')
        .upsert({
          empresa_id: empresa,
          dias_validade_orcamento: Math.trunc(config.dias_validade_orcamento),
          desconto_maximo_percentual: config.desconto_maximo_percentual,
          bloquear_pedido_sem_estoque: config.bloquear_pedido_sem_estoque,
          exigir_pedido_cliente: config.exigir_pedido_cliente,
        }, { onConflict: 'empresa_id' })
        .select('id,dias_validade_orcamento,desconto_maximo_percentual,bloquear_pedido_sem_estoque,exigir_pedido_cliente')
        .single()

      if (result.error) throw result.error

      setConfig({
        id: String(result.data.id),
        dias_validade_orcamento: Number(result.data.dias_validade_orcamento),
        desconto_maximo_percentual: Number(result.data.desconto_maximo_percentual),
        bloquear_pedido_sem_estoque: Boolean(result.data.bloquear_pedido_sem_estoque),
        exigir_pedido_cliente: Boolean(result.data.exigir_pedido_cliente),
      })
      setMessage('Configurações de Vendas salvas.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <VendasLayout title="Configurações Comerciais" subtitle="Regras comerciais da empresa" onRefresh={() => void load()}>
      <section className="sales-workspace">
        {error && <div className="sales-alert" role="alert">{error}</div>}
        {message && <div className="sales-alert" role="status">{message}</div>}
        <section className="sales-orders-card">
          <div className="sales-list-toolbar">
            <div>
              <span className="sales-eyebrow">COMERCIAL / CONFIGURAÇÕES</span>
              <div style={{fontSize:11,color:'#667085'}}>Persistido em <code>erp_vendas_configuracoes</code>.</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button type="button" onClick={() => void load()} disabled={loading || saving} className="sales-button sales-button--secondary"><RefreshCw size={13}/> ATUALIZAR</button>
              <button type="button" onClick={() => void save()} disabled={saving || loading} className="sales-button sales-button--primary"><Save size={13}/> SALVAR</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'140px 180px 1fr 1fr',gap:8,padding:'10px 14px'}}>
            <label style={{display:'grid',gap:2,fontSize:9,fontWeight:700,textTransform:'uppercase',color:'#667085'}}>Validade orçamento<input type="number" min={1} value={config.dias_validade_orcamento} onChange={event => setConfig(current => ({...current,dias_validade_orcamento:Number(event.target.value)}))} style={{height:30,border:'1px solid #cfd8dc',padding:'0 7px',fontSize:10}}/></label>
            <label style={{display:'grid',gap:2,fontSize:9,fontWeight:700,textTransform:'uppercase',color:'#667085'}}>Desconto máximo %<input type="number" min={0} max={100} step="0.01" value={config.desconto_maximo_percentual} onChange={event => setConfig(current => ({...current,desconto_maximo_percentual:Number(event.target.value)}))} style={{height:30,border:'1px solid #cfd8dc',padding:'0 7px',fontSize:10}}/></label>
            <label style={{display:'flex',alignItems:'center',gap:6,height:30,border:'1px solid #dfe7ea',padding:'0 7px',fontSize:9,fontWeight:700}}><input type="checkbox" checked={config.bloquear_pedido_sem_estoque} onChange={event => setConfig(current => ({...current,bloquear_pedido_sem_estoque:event.target.checked}))}/> Bloquear pedido sem estoque</label>
            <label style={{display:'flex',alignItems:'center',gap:6,height:30,border:'1px solid #dfe7ea',padding:'0 7px',fontSize:9,fontWeight:700}}><input type="checkbox" checked={config.exigir_pedido_cliente} onChange={event => setConfig(current => ({...current,exigir_pedido_cliente:event.target.checked}))}/> Exigir pedido do cliente</label>
          </div>
        </section>
      </section>
    </VendasLayout>
  )
}
