/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-10-30
 * @REVISAO: REV-PADRAO-TELAS-20261030-02 — card de abertura padrao (PageIntroCard) e identificacao de autoria
 * @STATUS_APROVACAO: PADRAO DE ABERTURA APLICADO A TODAS AS TELAS EM 2026-10-30, AUTORIZADO PELO PROPRIETARIO
 */
import { useFiscalYear } from '../../hooks/useFiscalYear'
export default function BankReconciliationStatement(){const {fiscalYear}=useFiscalYear();return <div className="erp-global-density rounded-md border bg-white p-3"><h2 className="mb-2 text-sm font-semibold">Extrato de Reconciliação</h2><div className="grid grid-cols-4 gap-2 text-[11px]"><span>Ano fiscal: {fiscalYear?.ano??'—'}</span><span>Início: {fiscalYear?.inicio??'—'}</span><span>Fim: {fiscalYear?.fim??'—'}</span><span>Status: {fiscalYear?.ativo?'Ativo':'—'}</span></div></div>}
