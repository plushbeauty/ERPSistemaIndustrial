export interface Ishikawa6MData {
  Metodo: string[];
  Maquina: string[];
  Medida: string[];
  MeioAmbiente: string[];
  MaoDeObra: string[];
  Material: string[];
}

export const ISHIKAWA_6M_VAZIO: Ishikawa6MData = {
  Metodo: [],
  Maquina: [],
  Medida: [],
  MeioAmbiente: [],
  MaoDeObra: [],
  Material: [],
};

export interface RPNCAnaliseCausaRaiz {
  ishikawa_data: Ishikawa6MData;
  cinco_porques: string[];
}

export interface RPNCEficaciaPayload {
  prazo_eficacia_dias: 30 | 60;
  data_verificacao_eficacia: string;
  parecer_eficacia: string;
  eficacia_aprovada: boolean;
}
