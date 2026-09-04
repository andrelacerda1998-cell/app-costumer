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
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
};

/** Passo da grelha de marcações, em minutos. Espelha TIME_INTERVAL_MINUTES. */
export const SLOT_STEP_MINUTES = 30;

/**
 * Desvio máximo, em minutos, para duas horas contarem como a mesma marcação.
 *
 * Cada técnico traz a sua grelha e elas não coincidem ao minuto: um devolve
 * 12:00, 12:30, 13:00 e outro 12:01, 12:31, 13:01 (o backend gera o slot
 * seguinte a partir do fim do anterior, e o desalinhamento propaga-se pelo dia
 * fora). A união crua dava ao cliente "12:00" e "12:01" como duas escolhas
 * diferentes — que não são, e ninguém consegue distinguir.
 *
 * Dois minutos, e não mais: o desalinhamento observado é de um minuto, e cada
 * minuto a mais de tolerância é uma hora legítima que passa a ser reescrita —
 * com cinco, um "09:05" a sério virava "09:00", que é mentir sobre a marcação.
 */
const SAME_SLOT_TOLERANCE_MINUTES = 2;

const toMinutes = (value?: string | null): number | null => {
  const normalized = hhmm(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
};

const fromMinutes = (total: number): string => {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

/**
 * A hora "redonda" a que uma marcação pertence: "12:01" e "11:59" → "12:00".
 *
 * Só arredonda dentro da tolerância. Uma hora que esteja mesmo a meio da grelha
 * (ex.: 12:15) é devolvida tal como está — nesse caso não é desalinhamento, é
 * uma hora a sério, e alterá-la seria mentir sobre o que foi marcado.
 */
export const roundSlotTime = (value?: string | null, step = SLOT_STEP_MINUTES): string | null => {
  const minutes = toMinutes(value);
  if (minutes === null) return null;
  const nearest = Math.round(minutes / step) * step;
  if (Math.abs(nearest - minutes) > SAME_SLOT_TOLERANCE_MINUTES) return hhmm(value);
  return fromMinutes(nearest);
};

/**
 * Junta as grelhas dos vários técnicos numa só, sem horas repetidas.
 *
 * Mantém a PRIMEIRA ocorrência de cada hora redonda mas mostra-a arredondada:
 * o cliente escolhe "12:00" e a app continua a saber que, para aquele técnico,
 * o slot real podia ser 12:01 — quem reserva resolve a hora exata do técnico
 * escolhido (ver `findVendorSlotAt`).
 */
export const dedupeSlotsByRoundedTime = <T extends { time: string; time_end?: string }>(
  slots: T[],
): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const slot of slots) {
    const rounded = roundSlotTime(slot?.time);
    if (!rounded || seen.has(rounded)) continue;
    seen.add(rounded);
    out.push({ ...slot, time: rounded });
  }
  return out;
};

/** Duas horas são a mesma marcação se caírem na mesma hora redonda. */
const isSameSlotTime = (a?: string | null, b?: string | null): boolean => {
  const left = roundSlotTime(a);
  const right = roundSlotTime(b);
  return left !== null && left === right;
};

export const isVendorFreeAt = (
  slots: AvailabilitySlot[] | undefined,
  day?: string | null,
  timeStart?: string | null,
): boolean => {
  if (!Array.isArray(slots) || !day || !timeStart) return false;
  const wantedDay = String(day).slice(0, 10);
  return slots.some(
    (slot) =>
      slot?.enabled !== false &&
      String(slot?.date).slice(0, 10) === wantedDay &&
      isSameSlotTime(slot?.time_start, timeStart),
  );
};

/**
 * O slot REAL de um técnico para a hora que o cliente escolheu.
 *
 * O cliente escolhe a hora redonda; o pedido tem de levar a hora que existe na
 * agenda daquele técnico. Sem isto, quem só está livre às 12:01 seria reservado
 * às 12:00 — um minuto antes de abrir.
 */
export const findVendorSlotAt = (
  slots: AvailabilitySlot[] | undefined,
  day?: string | null,
  timeStart?: string | null,
): AvailabilitySlot | null => {
  if (!Array.isArray(slots) || !day || !timeStart) return null;
  const wantedDay = String(day).slice(0, 10);
  return (
    slots.find(
      (slot) =>
        slot?.enabled !== false &&
        String(slot?.date).slice(0, 10) === wantedDay &&
        isSameSlotTime(slot?.time_start, timeStart),
    ) ?? null
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

/**
 * Técnicos livres em PELO MENOS UM dos horários escolhidos.
 *
 * Com o cliente a poder marcar até 3 horas alternativas, filtrar só pela
 * primeira esconderia quem consegue fazer as outras duas — exatamente o
 * contrário do que a escolha múltipla promete.
 *
 * Mesma regra prudente do filtro de uma hora: sem mapa de disponibilidade
 * devolve todos, porque "não sei" não é "não há ninguém".
 */
export const filterVendorsByAnyAvailability = <T extends { id?: number | string | null }>(
  vendors: T[],
  availability: Record<number, AvailabilitySlot[]>,
  day?: string | null,
  times?: (string | null | undefined)[],
): T[] => {
  const wanted = (times ?? []).filter((time): time is string => !!time);
  if (!day || wanted.length === 0) return vendors;
  if (!availability || Object.keys(availability).length === 0) return vendors;

  return vendors.filter((vendor) =>
    wanted.some((time) => isVendorFreeAt(availability[Number(vendor?.id)], day, time)),
  );
};
