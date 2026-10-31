/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { AlertTriangle } from 'lucide-react'
export default function IncorrectlyClearedEntries(){return <div className="erp-global-density rounded-md border bg-white p-3"><div className="mb-2 flex items-center gap-1 text-sm font-semibold"><AlertTriangle size={12}/>Compensados Incorretamente</div><div className="rounded-md border bg-amber-50 p-2 text-[11px]">Nenhum lançamento incorretamente compensado identificado.</div></div>}
