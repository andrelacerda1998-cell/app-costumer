import type { ServiceInterface } from "@/types/services";
import { ServiceStatus } from "@/types/services";

/**
 * Quanto falta para o serviço terminar — o número que vai para o ecrã bloqueado.
 *
 * É uma ESTIMATIVA, e é honesto dizê-lo: o fim é `chegada + duração nominal do
 * tipo de serviço`. O trabalho real pode passar disso (é para isso que existem
 * os pedidos de tempo extra), por isso isto conta para zero e fica lá — nunca
 * inventa que já acabou nem passa a negativo.
 *
 * Só há contagem quando o técnico JÁ CHEGOU (arrived_at): antes disso está a
 * caminho, e "faltam X para acabar" não faz sentido enquanto não começou.
 */

const MINUTE_MS = 60_000;

/**
 * Desvio do relógio face ao servidor, medido NO MOMENTO da resposta.
 *
 * `deviceNowMs` tem de ser o `Date.now()` de QUANDO o server_time foi recebido —
 * não um "agora" qualquer. Recalcular isto mais tarde, com o device já avançado,
 * dava um desvio falso (o erro que estes testes apanharam). Fica disponível para
 * quem medir o desvio à chegada da resposta e o quiser aplicar; o cálculo do
 * fim abaixo não precisa dele, por estar ancorado no relógio do servidor.
 */
export const clockSkewMs = (serverTimeIso?: string | null, deviceNowMsAtResponse?: number): number => {
  if (!serverTimeIso) return 0;
  const server = Date.parse(serverTimeIso);
  if (Number.isNaN(server)) return 0;
  const now = typeof deviceNowMsAtResponse === "number" ? deviceNowMsAtResponse : Date.now();
  return server - now;
};

/**
 * Instante estimado de fim, em epoch ms. Ancorado no relógio do SERVIDOR
 * (arrived_at é do servidor), por isso não sofre do desvio do telemóvel.
 * Devolve null se ainda não chegou ou faltam dados.
 */
export const estimatedEndAtMs = (
  arrivedAtIso?: string | null,
  durationMinutes?: number | null,
): number | null => {
  if (!arrivedAtIso) return null;
  const arrived = Date.parse(arrivedAtIso);
  if (Number.isNaN(arrived)) return null;
  if (typeof durationMinutes !== "number" || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }
  return arrived + durationMinutes * MINUTE_MS;
};

/** Segundos até ao fim, nunca negativo. `nowMs` já deve vir corrigido do desvio. */
export const secondsRemaining = (endAtMs: number | null, nowMs: number): number => {
  if (endAtMs == null) return 0;
  return Math.max(0, Math.ceil((endAtMs - nowMs) / 1000));
};

export type CountdownInfo = {
  /** true quando há uma execução a decorrer com fim estimável. */
  active: boolean;
  technicianName: string | null;
  serviceType: string | null;
  endAtMs: number | null;
  secondsRemaining: number;
};

/**
 * Reúne tudo o que o ecrã bloqueado precisa a partir do serviço em curso.
 * Uma função só, para a app e a Live Activity partirem da MESMA verdade.
 */
export const buildCountdownInfo = (
  service: ServiceInterface | null | undefined,
  deviceNowMs: number = Date.now(),
): CountdownInfo => {
  const empty: CountdownInfo = {
    active: false,
    technicianName: null,
    serviceType: null,
    endAtMs: null,
    secondsRemaining: 0,
  };
  if (!service) return empty;

  // Só a execução no local conta. A caminho (ACCEPTED) ainda não começou;
  // terminado/fechado já não há nada a contar.
  const inExecution = service.status === ServiceStatus.ARRIVED;
  if (!inExecution) return empty;

  const endAtMs = estimatedEndAtMs(service.arrived_at, service.service_type?.time ?? null);
  if (endAtMs == null) return empty;

  // Sem correção de relógio aqui: endAtMs é do servidor (arrived_at), e a Live
  // Activity conta a partir desse instante absoluto. Um desvio de segundos no
  // relógio do telemóvel não muda uma ESTIMATIVA que já é em minutos.
  return {
    active: true,
    technicianName: service.vendor?.user?.name ?? null,
    serviceType: service.service_type?.name ?? null,
    endAtMs,
    secondsRemaining: secondsRemaining(endAtMs, deviceNowMs),
  };
};

/**
 * Tempo que falta, escrito como se diz.
 *
 * Acima de uma hora, "faltam ~78 min" obriga o cliente a fazer a divisão de
 * cabeça: passa a "1h e 18min". Abaixo da hora fica em minutos, que é como se
 * fala de um resto curto.
 */
export const formatMinutesLeft = (minutes: number): string => {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  const total = Math.ceil(minutes);
  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h e ${rest}min`;
};
