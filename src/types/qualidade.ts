/**
 * Contrato tipado do payload Ishikawa 6M persistido em ishikawa_data.
 * Mantém os seis grupos utilizados pelo formulário RPNC existente.
 */
export type Ishikawa6MData = {
  Metodo: string[]
  Maquina: string[]
  Medida: string[]
  MeioAmbiente: string[]
  MaoDeObra: string[]
  Material: string[]
}
