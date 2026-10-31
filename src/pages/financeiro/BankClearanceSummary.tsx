/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { CheckCircle } from 'lucide-react'
export default function BankClearanceSummary(){return <div className="erp-global-density rounded-md border bg-white p-3"><div className="mb-2 flex items-center gap-1 text-sm font-semibold"><CheckCircle size={12}/>Resumo de Liquidações</div><div className="grid grid-cols-4 gap-2 text-[11px]"><span>Liquidados: —</span><span>Pendentes: —</span><span>Compensados: —</span><span>Divergentes: —</span></div></div>}
