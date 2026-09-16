import { useEffect, useState } from "react";

/**
 * Segundos que faltam até um prazo do servidor.
 *
 * Ancorado no `server_time` da MESMA resposta e não no `Date.now()` do
 * telemóvel: um relógio adiantado cinco minutos mostrava cinco minutos a menos
 * do que o cliente tem, e um atrasado deixava a contagem a andar depois de o
 * pedido já ter morrido. O desvio mede-se uma vez, na chegada dos dados, e a
 * contagem corre a partir daí.
 *
 * `null` quando não há prazo — não há relógio antes de haver decisão.
 */
export function useDeadlineCountdown(
  expiresAt?: string | null,
  serverTime?: string | null,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null);
      return;
    }

    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) {
      setRemaining(null);
      return;
    }

    const server = serverTime ? new Date(serverTime).getTime() : NaN;
    const skew = Number.isNaN(server) ? 0 : Date.now() - server;

    const tick = () => setRemaining(Math.max(0, Math.round((end - (Date.now() - skew)) / 1000)));

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, serverTime]);

  return remaining;
}

export default useDeadlineCountdown;
