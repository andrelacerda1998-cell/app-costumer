import type { VendorBadge } from '@/components/app/Services/vendor-card-selector';

/**
 * Decide que selo (se algum) cada técnico mostra.
 *
 * Regras:
 *  - No máximo um selo por cartão. Repetir "Verificado" nos três não ajudava a
 *    escolher nada; o objetivo é dar a cada opção a sua própria razão.
 *  - "Mais barato" ganha a "Mais perto" quando calham no mesmo técnico: entre
 *    dois profissionais igualmente verificados, o preço é o que decide.
 *  - Com um só técnico não há comparação, logo não há selo.
 *
 * O "mais perto" é o primeiro que o backend devolve — VendorSearchService e
 * ScheduleVendorSearchService ordenam ambos por _geoPoint asc e só depois por
 * nota — e não o primeiro da lista já reordenada pelos favoritos do cliente.
 */
export type BadgeMap = Record<number, VendorBadge>;

export const resolveVendorBadges = <T extends { id?: number | string | null; rate?: number }>(
  vendorsFromBackend: T[],
): BadgeMap => {
  const badges: BadgeMap = {};
  if (vendorsFromBackend.length < 2) return badges;

  const closestId = Number(vendorsFromBackend[0]?.id);
  if (Number.isFinite(closestId)) badges[closestId] = 'closest';

  const priced = vendorsFromBackend.filter(
    (vendor) => typeof vendor.rate === 'number' && Number.isFinite(vendor.rate),
  );
  if (priced.length >= 2) {
    const cheapest = priced.reduce((a, b) => ((b.rate as number) < (a.rate as number) ? b : a));
    // Preços todos iguais: nenhum é "o mais barato".
    const allSame = priced.every((v) => v.rate === cheapest.rate);
    const cheapestId = Number(cheapest?.id);
    if (!allSame && Number.isFinite(cheapestId)) badges[cheapestId] = 'cheapest';
  }

  return badges;
};

/** O cartão sugerido é o que tem selo de "mais barato"; sem ele, nenhum. */
export const resolveHeroId = (badges: BadgeMap): number | undefined => {
  const entry = Object.entries(badges).find(([, kind]) => kind === 'cheapest');
  return entry ? Number(entry[0]) : undefined;
};
