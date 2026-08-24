import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useSession } from '@/contexts/SessionContext';
import useEcho from '@/hooks/echo';
import { API_ROUTES } from '@/constants/ApiRoutes';

export interface MatchingCandidate {
  id: number;
  rank: number;
  vendor: { id: number; name: string | null; avatar?: any };
  /** null = ainda sem avaliações. O backend deixou de assumir 5. */
  rating: number | null;
  rating_count: number;
  amount: number;
  distance: number;
  is_new_vendor: boolean;
}

export interface MatchingState {
  service: { id: number; status: string; payment_status: string; amount: number | null; vendor_id: number | null } | null;
  candidates: MatchingCandidate[];
  expected: number;
}

/**
 * Candidatos de um pedido, a chegar ao vivo.
 *
 * O evento do backend é o que torna a espera PROGRESSIVA: em vez de um ecrã
 * bloqueado até a janela de resposta fechar, cada profissional aparece no
 * momento em que aceita. Aos poucos segundos já há uma opção, e o cliente
 * decide se escolhe já ou se espera por mais.
 */
export function useMatchingCandidates(serviceId?: number | string | null) {
  const { api } = useApi();
  const { userData } = useSession();
  const echo = useEcho();

  const [state, setState] = useState<MatchingState>({ service: null, candidates: [], expected: 3 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetch = useCallback(async () => {
    if (!serviceId) return;

    try {
      const { data } = await api.get(API_ROUTES.MATCHING_SHOW(serviceId));
      if (!mountedRef.current) return;

      setState({
        service: data?.data?.service ?? null,
        candidates: Array.isArray(data?.data?.candidates) ? data.data.candidates : [],
        expected: data?.data?.expected_candidates ?? 3,
      });
      setFailed(false);
    } catch {
      if (mountedRef.current) setFailed(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [api, serviceId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Chegada ao vivo. Refazemos o pedido em vez de inserir o payload do evento:
  // a ordem dos candidatos é decidida pelo servidor, e inseri-los pela ordem de
  // chegada mostraria uma lista diferente da que o ranking determinou.
  useEffect(() => {
    if (!echo || !userData?.id || !serviceId) return;

    const channel = echo.private(`service.customer.${userData.id}`);
    if (!channel) return;

    const onAccepted = (data: any) => {
      if (Number(data?.service_id) !== Number(serviceId)) return;
      fetch();
    };

    channel.listen('.MatchingCandidateAcceptedEvent', onAccepted);

    return () => {
      channel.stopListening('.MatchingCandidateAcceptedEvent', onAccepted);
    };
  }, [echo, userData?.id, serviceId, fetch]);

  return { ...state, loading, failed, refresh: fetch };
}

export default useMatchingCandidates;
