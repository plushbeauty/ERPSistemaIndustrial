/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { List } from 'lucide-react'
export default function BankTransactionList(){return <div className="erp-global-density rounded-md border bg-white p-3"><div className="mb-2 flex items-center gap-1 text-sm font-semibold"><List size={12}/>Transações Bancárias</div><table className="w-full text-left"><thead><tr><th>Data</th><th>Descrição</th><th>Documento</th><th>Valor</th><th>Status</th></tr></thead><tbody><tr><td colSpan={5} className="h-7 text-center text-[11px]">Nenhuma transação carregada.</td></tr></tbody></table></div>}
