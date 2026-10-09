/**
 * PFMEA usa a mesma matriz persistida e o mesmo cálculo de risco de FMEAIndustrial.
 * Manter uma única implementação evita formulários divergentes e gravações parciais.
 */
export { default } from './FMEAIndustrial'
