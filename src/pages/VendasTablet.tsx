import { ArrowLeft, LogOut, Tablet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { sections, VendasStatusCards, useVendasStatus } from './VendasLayout'

type Operator = { nome: string | null; email: string | null }

export default function VendasTablet() {
  const navigate = useNavigate()
  const [operator, setOperator] = useState<Operator>({ nome: null, email: null })
  const [now, setNow] = useState(new Date())
  const { status, loading, load } = useVendasStatus()

  useEffect(() => {
    let active = true
    void load()
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) {
        setOperator({
          nome: (data.user.user_metadata?.nome as string | undefined) ?? null,
          email: data.user.email ?? null,
        })
      }
    })
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [load])

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const operatorLabel = operator.nome ?? operator.email ?? 'Operador autenticado'
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(now)
  const timeLabel = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(now)

  return (
    <div className="vendas-tablet min-h-screen bg-[#F4F7FE] text-slate-800">
      <header className="sticky top-0 z-30 flex min-h-10 items-center justify-between gap-2 border-b border-slate-300 bg-white px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="vendas-brand-logo">
            <img src="/logo/sgq-erp.png" alt="SGQERP" />
          </div>
          <div className="vendas-brand-title">
            <strong>SGQERP INDUSTRIAL</strong>
            <span>CENTRAL DE CONTROLE</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-600">
          <span className="hidden md:inline">{operatorLabel}</span>
          <span>{dateLabel} {timeLabel}</span>
          <span>DADOS: SUPABASE</span>
          <button type="button" onClick={() => navigate('/vendas')} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Voltar para Vendas">
            <ArrowLeft size={13} />Voltar
          </button>
          <button type="button" className="flex h-7 items-center gap-1 border border-[#2D8DB8] bg-[#2D8DB8] px-2 text-[10px]" title="Tablet Vendas">
            <Tablet size={13} />TABLET VENDAS
          </button>
          <button type="button" onClick={() => void load()} disabled={loading} className="flex h-7 items-center border border-slate-300 bg-white px-2 text-[10px]" title="Atualizar">
            ↻
          </button>
          <button type="button" onClick={() => void logout()} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Sair">
            <LogOut size={13} />SAIR
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] p-2 lg:p-3">
        <VendasStatusCards status={status} loading={loading} />

        <section className="border border-slate-300 bg-white p-2">
          <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="text-[10px] font-medium uppercase tracking-wide text-[#2D8DB8]">
              TABLET VENDAS — CENTRAL DE COMANDO
            </div>
            <button type="button" onClick={() => navigate('/vendas')} className="flex h-7 items-center gap-1 border border-slate-300 bg-white px-2 text-[10px]" title="Abrir Vendas">
              <ArrowLeft size={12} />Tela principal
            </button>
          </div>

          {sections.map((section) => (
            <div key={section.label} className="mb-3 last:mb-0">
              <div className="mb-1 border-b border-slate-200 pb-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                {section.label}
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="flex h-14 items-center gap-2 border border-slate-300 bg-white px-2 text-left text-[10px] text-slate-700 hover:border-[#2D8DB8] hover:bg-[#F4FBFD]"
                      title={item.label}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-slate-200 bg-[#F4FBFD] text-[#2D8DB8]">
                        <Icon size={15} strokeWidth={1.8} />
                      </span>
                      <span className="leading-tight">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </main>

      <style>{`.vendas-tablet .rounded,.vendas-tablet .rounded-sm,.vendas-tablet .rounded-md,.vendas-tablet .rounded-lg,.vendas-tablet .rounded-xl,.vendas-tablet .rounded-2xl{border-radius:2px!important}.vendas-tablet .font-bold,.vendas-tablet .font-extrabold,.vendas-tablet .font-black{font-weight:500!important}.vendas-tablet button{border-radius:2px}.vendas-brand-logo{height:38px;min-width:118px;display:flex;align-items:center}.vendas-brand-logo img{height:100%;width:auto;object-fit:contain}.vendas-brand-title{display:flex;flex-direction:column;justify-content:center;border-left:1px solid #cbd5e1;padding-left:10px;line-height:1.1}.vendas-brand-title strong{font-size:13px;font-weight:600;color:#123B50}.vendas-brand-title span{margin-top:3px;font-size:8px;font-weight:500;letter-spacing:.12em;color:#64748b}`}</style>
    </div>
  )
}
