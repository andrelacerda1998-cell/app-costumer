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
