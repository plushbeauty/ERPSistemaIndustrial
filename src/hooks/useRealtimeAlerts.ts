import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface IContadoresAlertas {
  opsAbertas: number;
  rncsAtivas: number;
  materiaisVencendo: number;
}

interface AlertaRow {
  tipo_alerta: string;
  status: string;
}

const ZERO: IContadoresAlertas = { opsAbertas: 0, rncsAtivas: 0, materiaisVencendo: 0 };

export function useRealtimeAlerts(empresaId: string | null) {
  const [contadores, setContadores] = useState<IContadoresAlertas>(ZERO);

  const carregar = useCallback(async () => {
    if (!empresaId) {
      setContadores(ZERO);
      return;
    }
    const { data, error } = await supabase
      .from("erp_alertas_sistema")
      .select("tipo_alerta,status")
      .eq("empresa_id", empresaId)
      .eq("status", "ATIVO");

    if (error) {
      setContadores(ZERO);
      return;
    }

    const rows = (data ?? []) as AlertaRow[];
    setContadores({
      opsAbertas: rows.filter((row) => row.tipo_alerta === "OP_ABERTA").length,
      rncsAtivas: rows.filter((row) => row.tipo_alerta === "RNC_ATIVA").length,
      materiaisVencendo: rows.filter((row) => row.tipo_alerta === "MATERIAL_VENCIDO").length,
    });
  }, [empresaId]);

  useEffect(() => {
    void carregar();
    if (!empresaId) return;

    const channel = supabase
      .channel(`alertas-${empresaId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "erp_alertas_sistema",
        filter: `empresa_id=eq.${empresaId}`,
      }, () => void carregar())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [empresaId, carregar]);

  return contadores;
}
