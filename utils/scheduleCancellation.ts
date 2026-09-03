/**
 * Penalização por cancelar um serviço agendado.
 *
 * Quanto mais perto da hora marcada, mais caro sai — o técnico reservou o
 * horário e já não o consegue vender a outro cliente:
 *
 *   mais de 24h antes  → sem custos
 *   menos de 24h       → 50%
 *   menos de 6h        → 75%
 *   menos de 1h        → 100%
 *
 * Espelho de CancellationPolicy::scheduledPenaltyRatio no backend, que é quem
 * cobra de facto. Se as duas divergirem manda o servidor e a app estaria a
 * mentir sobre dinheiro — por isso a regra é copiada à letra e testada, em vez
 * de aproximada.
 */

/** Horas até ao início do serviço; null quando a data não presta. */
export const hoursUntilSchedule = (
  day?: string | null,
  timeStart?: string | null,
  nowMs: number = Date.now(),
): number | null => {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(day)) return null;

  const time = typeof timeStart === "string" && /^\d{2}:\d{2}/.test(timeStart)
    ? timeStart.slice(0, 5).length === 5 && timeStart.length <= 5
      ? `${timeStart.slice(0, 5)}:00`
      : timeStart.slice(0, 8)
    : "00:00:00";

  const startMs = new Date(`${day.slice(0, 10)}T${time}`).getTime();
  if (Number.isNaN(startMs)) return null;

  return (startMs - nowMs) / 3_600_000;
};

/** Escalões, do mais caro para o mais barato. */
export const PENALTY_TIERS = [
  { withinHours: 1, ratio: 1 },
  { withinHours: 6, ratio: 0.75 },
  { withinHours: 24, ratio: 0.5 },
] as const;

/**
 * Fração do valor cobrada ao cancelar agora (0 a 1).
 *
 * Sem data utilizável devolve 0: não se cobra por uma conta que não se conseguiu
 * fazer. Um serviço cuja hora já passou continua no escalão máximo — o técnico
 * está à porta ou já lá esteve.
 */
export const cancellationPenaltyRatio = (hoursLeft: number | null): number => {
  if (typeof hoursLeft !== "number" || !Number.isFinite(hoursLeft)) return 0;
  if (hoursLeft <= 0) return 1;

  const tier = PENALTY_TIERS.find((t) => hoursLeft <= t.withinHours);
  return tier ? tier.ratio : 0;
};

/** Valor a cobrar, em cêntimos, ou null quando o cancelamento é livre. */
export const cancellationPenaltyAmount = (
  amountCents: number | null | undefined,
  hoursLeft: number | null,
): number | null => {
  const ratio = cancellationPenaltyRatio(hoursLeft);
  if (ratio <= 0) return null;
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) return null;

  const value = Math.round(Math.abs(amountCents) * ratio);
  return value > 0 ? value : null;
};

/** A janela em que cancelar já tem custo. */
export const LATE_CANCEL_HOURS = 24;

export const isLateCancellation = (hoursLeft: number | null): boolean =>
  cancellationPenaltyRatio(hoursLeft) > 0;
