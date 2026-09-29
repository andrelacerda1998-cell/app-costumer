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
  /** Dia e hora pedidos. null = para agora, sem hora marcada. */
  schedule: { scheduled_day: string | null; scheduled_time_start: string | null } | null;
  /** Quando o pedido foi feito. É o "quando" de um pedido imediato. */
  requested_at: string | null;
  /**
   * Até quando pode escolher e pagar. null enquanto não há ninguém para
   * escolher — não há relógio antes de haver decisão.
   */
  expires_at: string | null;
  /** A hora do servidor na resposta, para a contagem não depender do relógio do telemóvel. */
  server_time: string | null;
  /**
   * Presente só quando já escolheu e falta pagar: o preço CONGELADO no momento
   * da escolha, para o checkout se poder retomar exatamente onde ficou.
   */
  selected: {
    amount: number;
    travel_amount: number;
    distance: number;
    vendor: { id: number; name: string | null; rating: number | null };
  } | null;
}

/**
 * O pedido que está à espera do cliente, para o separador "Pedidos" o mostrar.
 *
 * Sem isto, um pedido em seleção só era alcançável pela notificação — e quem a
 * descartasse ficava com propostas à espera, um relógio a correr e nenhum
 * caminho de volta.
 */
export function useCurrentMatchingRequest() {
  const { api } = useApi();
  const { session } = useSession();
  const [request, setRequest] = useState<CurrentMatchingRequest | null>(null);
  // TODOS os abertos, e não só o mais recente. Pode haver mais do que um: um
  // personalizado em análise não impede um pedido de catálogo, e enquanto o
  // ecrã só mostrava o último o personalizado sumia — invisível para o
  // cliente, e a bloquear na mesma um segundo personalizado.
  const [requests, setRequests] = useState<CurrentMatchingRequest[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!session) {
      setRequest(null);
      setRequests([]);
      return;
    }
    try {
      const { data } = await api.get(API_ROUTES.MATCHING_CURRENT);
      if (!mounted.current) return;
      const principal = data?.data?.request ?? null;
      setRequest(principal);
      // Servidores anteriores a isto não mandam `requests`. Nesse caso a lista
      // é o que sempre foi: o pedido principal, se existir.
      const lista = data?.data?.requests;
      setRequests(Array.isArray(lista) ? lista : principal ? [principal] : []);
    } catch {
      // Um cartão a menos não é motivo para partir o ecrã dos Serviços.
      if (mounted.current) {
        setRequest(null);
        setRequests([]);
      }
    }
  }, [api, session]);

  useEffect(() => { refresh(); }, [refresh]);

  return { request, requests, refresh };
}

export default useCurrentMatchingRequest;
