/**
 * Histórico de moradas usadas — lógica pura, testável sem AsyncStorage.
 *
 * Um cliente volta quase sempre às mesmas duas ou três moradas (casa, trabalho,
 * casa de alguém). Escrevê-las de novo a cada pedido é atrito puro, e o convidado
 * — que não tem conta onde guardá-las — é quem mais sofre com isso.
 */

export type StoredAddress = {
  street_name?: string | null;
  street_number?: string | null;
  additional_info?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** epoch ms da última utilização — ordena a lista. */
  used_at?: number;
};

/** Quantas moradas se guardam. Acima disto deixa de ser histórico e vira arquivo. */
export const MAX_HISTORY = 8;

/**
 * Chave de identidade de uma morada.
 *
 * Rua + número + código postal, normalizados. Sem isto, "Rua da Mata 1" e
 * "rua da mata  1" entravam como duas moradas distintas e o histórico enchia-se
 * de duplicados que o cliente não distingue.
 *
 * As coordenadas NÃO entram: o mesmo sítio geocodificado duas vezes dá pontos
 * ligeiramente diferentes, e isso duplicaria a entrada.
 */
export const addressKey = (a: StoredAddress | null | undefined): string => {
  if (!a) return '';
  const norm = (v?: string | null) =>
    (v ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  return [norm(a.street_name), norm(a.street_number), norm(a.postal_code)].join('|');
};

/** Uma morada só entra no histórico se der para a identificar e voltar a usar. */
export const isUsable = (a: StoredAddress | null | undefined): boolean => {
  if (!a) return false;
  const hasStreet = !!(a.street_name && a.street_name.trim());
  const hasCoords =
    typeof a.latitude === 'number' && typeof a.longitude === 'number' &&
    Number.isFinite(a.latitude) && Number.isFinite(a.longitude);
  return hasStreet && hasCoords;
};

/**
 * Junta uma morada ao histórico: a mais recente fica em primeiro, sem duplicar.
 *
 * Reusar uma morada antiga promove-a ao topo em vez de criar uma entrada nova —
 * é o comportamento que faz a lista ser útil ao fim de umas semanas.
 */
export const addToHistory = (
  history: StoredAddress[],
  address: StoredAddress,
  now: number = Date.now(),
): StoredAddress[] => {
  if (!isUsable(address)) return history;

  const key = addressKey(address);
  const semDuplicado = history.filter((a) => addressKey(a) !== key);

  return [{ ...address, used_at: now }, ...semDuplicado].slice(0, MAX_HISTORY);
};

/** Remove uma morada do histórico (o cliente apagou-a da lista). */
export const removeFromHistory = (
  history: StoredAddress[],
  address: StoredAddress,
): StoredAddress[] => {
  const key = addressKey(address);
  return history.filter((a) => addressKey(a) !== key);
};

/** "Rua da Mata 1" — a linha principal da lista. */
export const formatAddressLine = (a: StoredAddress): string =>
  [a.street_name, a.street_number].filter(Boolean).join(' ').trim();

/** "2565-775 Mugideira, Portugal" — a linha secundária. */
export const formatAddressDetail = (a: StoredAddress): string => {
  const local = [a.postal_code, a.city].filter(Boolean).join(' ').trim();
  return [local, a.country].filter(Boolean).join(', ').trim();
};
