/**
 * Janela de chegada.
 *
 * O backend obriga a `scheduled_time_end` (validado como `after:scheduled_time_start`),
 * por isso todo o agendamento tem sempre um intervalo real. A app recolhia esse
 * intervalo no pedido mas depois só mostrava a hora de início — o cliente ficava a
 * pensar que o técnico chegava "às 14:00" em ponto e a percepção era de atraso a
 * partir das 14:01. Mostrar a janela é a promessa que o negócio realmente faz.
 */

/** Aceita "14:00", "14:00:00" ou um datetime; devolve "14:00" ou null. */
const toHourMinute = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = String(value).trim();

  const direct = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (direct) {
    const hours = Number(direct[1]);
    const minutes = Number(direct[2]);
    if (hours > 23 || minutes > 59) return null;
    return `${String(hours).padStart(2, '0')}:${direct[2]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
};

/**
 * "14:00 – 16:00" quando há janela, "14:00" quando só há início.
 * Devolve null se não houver hora nenhuma — quem chama decide o texto de recurso.
 */
export const formatArrivalWindow = (
  start?: string | null,
  end?: string | null,
): string | null => {
  const from = toHourMinute(start);
  const to = toHourMinute(end);

  if (!from) return to;
  // Início igual ao fim não é uma janela: não vale a pena repetir a mesma hora.
  if (!to || to === from) return from;

  return `${from} – ${to}`;
};

export { toHourMinute };
