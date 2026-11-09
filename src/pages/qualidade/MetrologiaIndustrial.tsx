/**
 * @AUTOR: FernandoSch
 * @DATA_REVISAO_APROVACAO: 2026-11-08
 * @REVISAO: REV-METROLOGIA-ALERTA-VENCIMENTO-20261108-01 — composição da central existente com alerta de calibração vencida e a vencer em 30 dias
 * @STATUS_APROVACAO: INCREMENTO FUNCIONAL AUTORIZADO NA ORDEM ORDEM-EXECUCAO-SYSNQRA-20261108-01; fluxo CRUD existente preservado
 */
import MetrologiaVencimentoAlerta from '../../components/quality/MetrologiaVencimentoAlerta'
import CentraisIndustriais from '../CentraisIndustriais'

export default function MetrologiaIndustrial() {
  return (
    <>
      <MetrologiaVencimentoAlerta />
      <CentraisIndustriais module="metrologia" />
    </>
  )
}
