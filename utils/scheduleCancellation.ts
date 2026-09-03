/**
 * Quanto falta para um serviço agendado, e se o cancelamento é "em cima da hora".
 *
 * Serve o aviso que o cliente lê antes de cancelar. Hoje o servidor não cobra
 * nada por cancelar um agendamento (CancelScheduleController → customerCancel,
 * sem captura; CancellationPolicy só cobra com o técnico a caminho ou no
 * local), por isso o ecrã avisa que está perto — não anuncia uma penalização
 * que não existe.
 *
 * Se a regra dos 50% a menos de 24h passar a existir no backend, é esta função
 * que diz quando se aplica, e o texto muda num sítio só.
 */

/** Horas até ao início do serviço; null quando a data não presta. */
export const hoursUntilSchedule = (
  day?: string | null,
  timeStart?: string | null,
  nowMs: number = Date.now(),
): number | null => {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(day)) return null;

  const time = typeof timeStart === "string" && /^\d{2}:\d{2}/.test(timeStart)
    ? timeStart.slice(0, 8).length === 5
      ? `${timeStart.slice(0, 5)}:00`
      : timeStart.slice(0, 8)
    : "00:00:00";

  const startMs = new Date(`${day.slice(0, 10)}T${time}`).getTime();
  if (Number.isNaN(startMs)) return null;

  return (startMs - nowMs) / 3_600_000;
};

/** A janela em que cancelar deixa o técnico sem tempo de reagir. */
export const LATE_CANCEL_HOURS = 24;

export const isLateCancellation = (hoursLeft: number | null): boolean =>
  typeof hoursLeft === "number" && hoursLeft <= LATE_CANCEL_HOURS && hoursLeft > 0;
