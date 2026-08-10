/**
 * Hora do agendamento.
 *
 * NÃO mostrar `scheduled_time_end` ao cliente. Tentei fazê-lo, como "janela de
 * chegada", partindo do princípio de que o campo representava uma tolerância
 * acordada — não representa. O ecrã de escolha (schedule-service.tsx) só deixa
 * escolher o INÍCIO, e o fim é `início + TIME_INTERVAL_MINUTES` (30 min): é o
 * tamanho da marcação, não uma janela.
 *
 * Mostrar "14:00 – 14:30" a quem escolheu "14:00" enfraquece uma promessa que o
 * negócio já tinha feito, e dá ao técnico meia hora de folga que ninguém lhe
 * concedeu. Uma janela de chegada a sério é uma decisão de negócio (definir a
 * tolerância e comunicá-la aos dois lados), não a leitura de um campo existente.
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
 * Hora de início do agendamento, normalizada para "14:00".
 * Devolve null se não houver hora — quem chama decide o texto de recurso.
 */
export const formatScheduledTime = (start?: string | null): string | null =>
  toHourMinute(start);

export { toHourMinute };

/**
 * "Terça, 11 de agosto" — o dia da reserva por extenso.
 *
 * O checkout mostrava `scheduled_day` tal como vem do backend ("2026-08-11").
 * Formato ISO serve para máquinas: a pessoa que está prestes a pagar precisa de
 * reconhecer o dia num relance, e é o dia da semana que faz isso — não o ano.
 */
export const formatBookingDay = (day?: string | null, language?: string): string | null => {
  if (!day) return null;
  const parsed = new Date(`${String(day).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const locale = language === 'pt_PT' ? 'pt-PT' : 'en-US';
  const text = parsed.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
};
