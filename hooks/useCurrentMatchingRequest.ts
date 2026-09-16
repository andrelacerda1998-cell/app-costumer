import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/contexts/ApiContext";
import { useSession } from "@/contexts/SessionContext";
import { API_ROUTES } from "@/constants/ApiRoutes";

export interface CurrentMatchingRequest {
  id: number;
  status: string;
  is_custom: boolean;
  /** O serviço pedido. Num personalizado, a descrição do próprio cliente. */
  title: string | null;
  /** Quantos profissionais já se disponibilizaram. */
  candidates_ready: number;
}

/**
 * O pedido que está à espera do cliente, para a Home o poder mostrar.
 *
 * Sem isto, um pedido em seleção só era alcançável pela notificação — e quem a
 * descartasse ficava com propostas à espera, um relógio a correr e nenhum
 * caminho de volta.
 */
export function useCurrentMatchingRequest() {
  const { api } = useApi();
  const { session } = useSession();
  const [request, setRequest] = useState<CurrentMatchingRequest | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!session) {
      setRequest(null);
      return;
    }
    try {
      const { data } = await api.get(API_ROUTES.MATCHING_CURRENT);
      if (mounted.current) setRequest(data?.data?.request ?? null);
    } catch {
      // Um cartão a menos na Home não é motivo para partir o ecrã.
      if (mounted.current) setRequest(null);
    }
  }, [api, session]);

  useEffect(() => { refresh(); }, [refresh]);

  return { request, refresh };
}

export default useCurrentMatchingRequest;
