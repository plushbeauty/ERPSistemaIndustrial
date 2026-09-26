export interface IFerramentalParametrosJSONB {
  localizacao_prateleira: string;
  material_composicao: string;
  peso_total_kg: number;
  cavidades_ativas: number;
  peso_liquido_peca_gramas: number;
  peso_canal_sucata_gramas: number;
  observacoes_tecnicas?: string;
  preventiva?: { ultima_execucao_em?: string; status?: "LIBERADO"|"RETIDO"; checklist?: Record<string, boolean>; observacoes?: string };
}
export function validarParametrosFerramental(json: unknown): json is IFerramentalParametrosJSONB {
  if (!json || typeof json !== "object") return false;
  const v=json as Record<string,unknown>;
  return typeof v.localizacao_prateleira==="string" && typeof v.material_composicao==="string" &&
    typeof v.peso_total_kg==="number" && typeof v.cavidades_ativas==="number" &&
    typeof v.peso_liquido_peca_gramas==="number" && typeof v.peso_canal_sucata_gramas==="number";
}
