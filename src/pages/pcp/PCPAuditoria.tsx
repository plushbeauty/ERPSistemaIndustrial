/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon,
  ShieldCheck,
  ExternalLink,
  Search,
  Lock,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import {
  PCP_AUDIT_FINDINGS,
  type AuditFinding,
} from '../../data/pcp-audit-findings'

export default function PCPAuditoria() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Filtros
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null)

  useEffect(() => {
    let active = true
    async function checkAccess() {
      try {
        const { data: permitted, error } = await supabase.rpc('erp_has_permission', {
          p_code: 'producao.ver',
        })
        if (!active) return
        if (error) {
          // Falha na verificação de RBAC deve bloquear o acesso (fail-closed).
          setPermissionError('Não foi possível validar a permissão producao.ver. Acesso bloqueado por segurança.')
          setHasPermission(false)
        } else {
          setHasPermission(permitted === true)
        }
      } catch {
        if (!active) return
        setPermissionError('Falha ao validar credenciais de produção. Acesso bloqueado por segurança.')
        setHasPermission(false)
      }
    }
    void checkAccess()
    return () => {
      active = false
    }
  }, [])

  const findings = PCP_AUDIT_FINDINGS

  const stats = useMemo(() => {
    const total = findings.length
    const pendentes = findings.filter((f) => f.status === 'PENDENTE').length
    const corrigidos = findings.filter((f) => f.status === 'CORRIGIDO').length
    const bloqueados = findings.filter((f) => f.status === 'BLOQUEADO').length
    const p0 = findings.filter((f) => f.prioridade === 'P0').length
    const p1 = findings.filter((f) => f.prioridade === 'P1').length
    const p2 = findings.filter((f) => f.prioridade === 'P2').length
    const p3 = findings.filter((f) => f.prioridade === 'P3').length
    return { total, pendentes, corrigidos, bloqueados, p0, p1, p2, p3 }
  }, [findings])

  const filteredFindings = useMemo(() => {
    return findings.filter((item) => {
      if (priorityFilter !== 'ALL' && item.prioridade !== priorityFilter) return false
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (categoryFilter !== 'ALL' && item.categoria !== categoryFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesText =
          item.id.toLowerCase().includes(q) ||
          item.tela.toLowerCase().includes(q) ||
          item.arquivo.toLowerCase().includes(q) ||
          item.descricao.toLowerCase().includes(q) ||
          item.impacto.toLowerCase().includes(q)
        if (!matchesText) return false
      }
      return true
    })
  }, [findings, priorityFilter, statusFilter, categoryFilter, searchQuery])

  if (hasPermission === false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F4FBFD] p-4">
        <div className="w-full max-w-md rounded-[2px] border border-amber-300 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800">
            <Lock size={18} />
            <span className="text-[12px] font-bold uppercase tracking-wider">Acesso Restrito ao PCP</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            {permissionError || 'Seu perfil de usuário não possui a permissão requerida (producao.ver) para visualizar a auditoria técnica.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4FBFD] p-3 text-slate-800 sm:p-4">
      {/* Cabeçalho Industrial Compacto */}
      <header className="mb-3 rounded-[2px] border border-[#2D8DB8]/30 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-[2px] bg-[#123B50] text-[#48B7C7]">
              <ShieldCheck size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[13px] font-bold uppercase tracking-wider text-[#123B50]">
                  PCP INDUSTRIAL · AUDITORIA E CONTROLE DE QUALIDADE TÉCNICA
                </h1>
                <span className="rounded-[2px] bg-[#123B50]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#123B50]">
                  SYSNQRA SGQ
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Registro operacional e rastreabilidade de defeitos de conformidade industrial no PCP.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-[10px] text-slate-500">
              <span>Última inspeção: </span>
              <strong className="text-slate-700">17/10/2026</strong>
            </div>
            <a
              href="/pcp"
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[2px] border border-[#2D8DB8] bg-[#2D8DB8] px-3 text-[10px] font-bold uppercase text-white hover:bg-[#236f91]"
            >
              <ExternalLink size={12} />
              Voltar ao PCP
            </a>
          </div>
        </div>
      </header>

      {/* Cartões de Indicadores Compactos (30px/h-auto padrão ERP) */}
      <section className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-[2px] border border-slate-200 bg-white p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Detectado</span>
          <div className="text-[18px] font-bold text-[#123B50]">{stats.total}</div>
        </div>
        <div className="rounded-[2px] border border-amber-200 bg-amber-50/50 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Pendentes</span>
          <div className="text-[18px] font-bold text-amber-700">{stats.pendentes}</div>
        </div>
        <div className="rounded-[2px] border border-emerald-200 bg-emerald-50/50 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#3A9D78]">Corrigidos</span>
          <div className="text-[18px] font-bold text-[#3A9D78]">{stats.corrigidos}</div>
        </div>
        <div className="rounded-[2px] border border-rose-200 bg-rose-50/50 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#D65B61]">Bloqueados</span>
          <div className="text-[18px] font-bold text-[#D65B61]">{stats.bloqueados}</div>
        </div>
        <div className="rounded-[2px] border border-red-300 bg-red-50/60 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-red-700">Críticos (P0)</span>
          <div className="text-[18px] font-bold text-red-700">{stats.p0}</div>
        </div>
        <div className="rounded-[2px] border border-orange-300 bg-orange-50/60 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-orange-700">Alto (P1)</span>
          <div className="text-[18px] font-bold text-orange-700">{stats.p1}</div>
        </div>
        <div className="rounded-[2px] border border-sky-300 bg-sky-50/60 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-sky-700">Médio (P2)</span>
          <div className="text-[18px] font-bold text-sky-700">{stats.p2}</div>
        </div>
        <div className="rounded-[2px] border border-slate-200 bg-slate-50 p-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Baixo (P3)</span>
          <div className="text-[18px] font-bold text-slate-600">{stats.p3}</div>
        </div>
      </section>

      {/* Critérios de Prioridade Explícitos */}
      <section className="mb-3 rounded-[2px] border border-slate-200 bg-white p-2.5">
        <h2 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#123B50]">
          <AlertOctagon size={12} className="text-[#2D8DB8]" />
          Critérios Explícitos de Severidade
        </h2>
        <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-4">
          <div className="border-l-2 border-red-600 pl-2">
            <strong className="text-red-700">P0 (Crítico):</strong> Erros de runtime (telas em branco/quebradas), vazamento multi-tenant, corrupção de schema.
          </div>
          <div className="border-l-2 border-orange-500 pl-2">
            <strong className="text-orange-700">P1 (Alto):</strong> Quebras severas de layout (duplicação de shell, telas pretas fora do padrão, falta de ficha operacional).
          </div>
          <div className="border-l-2 border-sky-500 pl-2">
            <strong className="text-sky-700">P2 (Médio):</strong> Campos e botões desproporcionais (40px vs 30px), rotas redundantes, advertências de compilação.
          </div>
          <div className="border-l-2 border-slate-400 pl-2">
            <strong className="text-slate-600">P3 (Baixo):</strong> Melhorias cosméticas finas, alinhamento de textos ou otimizações secundárias.
          </div>
        </div>
      </section>

      {/* Barra de Filtros Compacta */}
      <section className="mb-3 rounded-[2px] border border-slate-200 bg-white p-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-1.5 rounded-[2px] border border-slate-200 bg-[#F4FBFD] px-2">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, tela, descrição ou arquivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[30px] w-full bg-transparent text-[11px] outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-500">Prioridade:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-[30px] rounded-[2px] border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700"
            >
              <option value="ALL">Todas (P0 - P3)</option>
              <option value="P0">P0 - Crítica</option>
              <option value="P1">P1 - Alta</option>
              <option value="P2">P2 - Média</option>
              <option value="P3">P3 - Baixa</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-500">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[30px] rounded-[2px] border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CORRIGIDO">Corrigidos</option>
              <option value="BLOQUEADO">Bloqueados</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[9px] font-bold uppercase text-slate-500">Categoria:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-[30px] rounded-[2px] border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700"
            >
              <option value="ALL">Todas as Categorias</option>
              <option value="INTEGRIDADE">Integridade / Schema</option>
              <option value="MULTI_TENANT">Multi-tenancy</option>
              <option value="LAYOUT_SHELL">Layout / Shell</option>
              <option value="VISUAL_COMPACTO">Visual Compacto</option>
              <option value="FUNCIONAL">Funcionalidades</option>
              <option value="QUALIDADE_CODIGO">Qualidade de Código</option>
              <option value="INFRAESTRUTURA">Infraestrutura</option>
            </select>
          </div>

          {(priorityFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setPriorityFilter('ALL')
                setStatusFilter('ALL')
                setCategoryFilter('ALL')
                setSearchQuery('')
              }}
              className="h-[30px] rounded-[2px] border border-slate-300 bg-slate-100 px-2.5 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-200"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </section>

      {/* Tabela Industrial de Resultados */}
      <section className="rounded-[2px] border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="h-8 border-b border-slate-200 bg-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <th className="px-3 py-1.5">Código</th>
                <th className="px-3 py-1.5">Prioridade</th>
                <th className="px-3 py-1.5">Categoria</th>
                <th className="px-3 py-1.5">Tela Afetada</th>
                <th className="px-3 py-1.5">Arquivo : Linha</th>
                <th className="px-3 py-1.5">Descrição Objetiva</th>
                <th className="px-3 py-1.5">Status</th>
                <th className="px-3 py-1.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFindings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[11px] text-slate-500">
                    Nenhum problema encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredFindings.map((finding) => {
                  const isSelected = selectedFinding?.id === finding.id
                  return (
                    <tr
                      key={finding.id}
                      onClick={() => setSelectedFinding(finding)}
                      className={`h-[34px] cursor-pointer text-[10px] transition-colors hover:bg-sky-50/50 ${
                        isSelected ? 'bg-sky-50 font-medium' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono font-bold text-[#123B50]">{finding.id}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-block rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold ${
                            finding.prioridade === 'P0'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : finding.prioridade === 'P1'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : finding.prioridade === 'P2'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {finding.prioridade}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{finding.categoria}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">
                        {finding.rota ? (
                          <Link
                            to={finding.rota}
                            className="inline-flex items-center gap-1 text-[#2D8DB8] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {finding.tela}
                            <ExternalLink size={10} />
                          </Link>
                        ) : (
                          finding.tela
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[9px] text-slate-500">
                        {finding.arquivo}:{finding.linha}
                      </td>
                      <td className="max-w-[320px] truncate px-3 py-1.5 text-slate-700" title={finding.descricao}>
                        {finding.descricao}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-block rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            finding.status === 'CORRIGIDO'
                              ? 'bg-emerald-100 text-[#3A9D78] border border-emerald-300'
                              : finding.status === 'BLOQUEADO'
                              ? 'bg-rose-100 text-[#D65B61] border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {finding.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFinding(finding)
                          }}
                          className="h-[24px] rounded-[2px] border border-slate-300 bg-white px-2 text-[9px] font-bold uppercase text-slate-700 hover:bg-slate-100"
                        >
                          Detalhar
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Painel de Detalhamento do Item Selecionado */}
      {selectedFinding && (
        <section className="mt-3 rounded-[2px] border border-[#2D8DB8]/40 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-bold text-[#123B50]">{selectedFinding.id}</span>
              <span className="text-[12px] font-semibold text-slate-800">— {selectedFinding.tela}</span>
              <span
                className={`rounded-[2px] px-1.5 py-0.5 text-[9px] font-bold ${
                  selectedFinding.prioridade === 'P0'
                    ? 'bg-red-100 text-red-800'
                    : selectedFinding.prioridade === 'P1'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-sky-100 text-sky-800'
                }`}
              >
                {selectedFinding.prioridade}
              </span>
            </div>
            <button
              onClick={() => setSelectedFinding(null)}
              className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600"
            >
              Fechar Detalhes
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 text-[11px] md:grid-cols-2">
            <div>
              <strong className="block text-[9px] font-bold uppercase text-slate-500">Arquivo e Linha:</strong>
              <p className="mt-0.5 font-mono text-slate-700">
                {selectedFinding.arquivo}:{selectedFinding.linha}
              </p>

              <strong className="mt-2 block text-[9px] font-bold uppercase text-slate-500">Descrição Objetiva:</strong>
              <p className="mt-0.5 text-slate-700">{selectedFinding.descricao}</p>

              <strong className="mt-2 block text-[9px] font-bold uppercase text-slate-500">Impacto na Operação:</strong>
              <p className="mt-0.5 text-rose-700">{selectedFinding.impacto}</p>
            </div>

            <div>
              <strong className="block text-[9px] font-bold uppercase text-slate-500">Correção Prevista:</strong>
              <p className="mt-0.5 text-emerald-800">{selectedFinding.correcaoPrevista}</p>

              <strong className="mt-2 block text-[9px] font-bold uppercase text-slate-500">Evidência de Validação:</strong>
              <p className="mt-0.5 text-slate-600">{selectedFinding.evidenciaValidacao}</p>

              {selectedFinding.rota && (
                <div className="mt-3">
                  <Link
                    to={selectedFinding.rota}
                    className="inline-flex h-[28px] items-center gap-1.5 rounded-[2px] bg-[#2D8DB8] px-3 text-[10px] font-bold uppercase text-white hover:bg-[#236f91]"
                  >
                    Abrir Tela ({selectedFinding.rota})
                    <ExternalLink size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
