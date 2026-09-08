/**
 * Duração de um serviço, escrita por extenso.
 *
 * "1 hora e 30 min" onde há espaço para ler; o "1h30" compacto continua a
 * servir as listas, onde a largura é que manda. Existe aqui, e não em cada
 * ecrã, porque o detalhe do agendamento e a ficha do tipo de serviço mostram
 * a mesma duração — e mostravam-na de duas maneiras diferentes.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

export const formatDurationLong = (
  minutes: number | null | undefined,
  t: Translate,
): string | null => {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return null;

  const total = Math.round(minutes);
  if (total < 60) return t("duration.minutes", { minutes: total });

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const hoursLabel = hours === 1 ? t("duration.hour_one") : t("duration.hours", { hours });

  return rest > 0 ? `${hoursLabel} ${t("duration.and_minutes", { minutes: rest })}` : hoursLabel;
};
