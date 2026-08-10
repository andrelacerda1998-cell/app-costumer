import type { AvailabilitySlot } from '@/contexts/ScheduleContext';

/**
 * Filtra técnicos por disponibilidade numa hora concreta.
 *
 * O fluxo passou a ser "quando → quem", mas o backend só sabe responder "quando
 * é que o técnico X está livre" — não existe endpoint de "quem está livre nesta
 * hora". A agenda dos (no máximo 3) técnicos é recolhida no ecrã da data e
 * reutilizada aqui, para não repetir os pedidos.
 */

/** Normaliza "14:00", "14:00:00" ou "2026-08-11T14:00" para "14:00". */
const hhmm = (value?: string | null): string | null => {
  if (!value) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

export const isVendorFreeAt = (
  slots: AvailabilitySlot[] | undefined,
  day?: string | null,
  timeStart?: string | null,
): boolean => {
  if (!Array.isArray(slots) || !day || !timeStart) return false;
  const wanted = hhmm(timeStart);
  const wantedDay = String(day).slice(0, 10);
  return slots.some(
    (slot) =>
      slot?.enabled !== false &&
      String(slot?.date).slice(0, 10) === wantedDay &&
      hhmm(slot?.time_start) === wanted,
  );
};

/**
 * Devolve só os técnicos livres na hora escolhida.
 *
 * IMPORTANTE: sem mapa de disponibilidade devolve a lista inteira, e não uma
 * lista vazia. Um mapa em falta significa "não sei", não "não há ninguém" —
 * esconder toda a gente por falta de dados seria pior do que mostrar a mais.
 */
export const filterVendorsByAvailability = <T extends { id?: number | string | null }>(
  vendors: T[],
  availability: Record<number, AvailabilitySlot[]>,
  day?: string | null,
  timeStart?: string | null,
): T[] => {
  if (!day || !timeStart) return vendors;
  if (!availability || Object.keys(availability).length === 0) return vendors;

  return vendors.filter((vendor) => isVendorFreeAt(availability[Number(vendor?.id)], day, timeStart));
};
