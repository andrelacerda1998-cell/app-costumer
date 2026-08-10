import type { VendorBadge } from '@/components/app/Services/vendor-card-selector';

/**
 * Decide o cartão sugerido e que selo (se algum) cada técnico mostra.
 *
 * Regra de destaque, por esta ordem:
 *  1. Melhor avaliação. Se um técnico tem nota mais alta do que todos os
 *     outros, é esse o destacado.
 *  2. Empate — o mais barato. Cobre o caso de todos terem a mesma nota (hoje é
 *     o que acontece sempre, porque o backend devolve 5 por omissão), e também
 *     o empate parcial: se dois lideram com 5,0 e um terceiro tem 4,0, escolher
 *     um dos líderes ao acaso seria arbitrário, por isso ganha o mais barato
 *     de entre os empatados — nunca o terceiro.
 *
 * Técnicos sem avaliação nunca ganham por nota (contam como -1). Se ninguém
 * tiver nota, ficam todos empatados e decide o preço, que é o comportamento
 * correto: sem histórico, o que resta comparar é quanto custa.
 *
 * Selos: no máximo um por cartão. O do destacado diz sempre por que é que ele
 * é o destacado.
 */
export type BadgeMap = Record<number, VendorBadge>;

export type BadgeResult = { badges: BadgeMap; heroId?: number };

const numericId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

const ratingOf = (vendor: { rating?: number | null }): number =>
  typeof vendor.rating === 'number' && vendor.rating > 0 ? vendor.rating : -1;

const priceOf = (vendor: { rate?: number }): number =>
  typeof vendor.rate === 'number' && Number.isFinite(vendor.rate) ? vendor.rate : Infinity;

export const resolveVendorBadges = <
  T extends { id?: number | string | null; rate?: number; rating?: number | null },
>(
  vendorsFromBackend: T[],
): BadgeResult => {
  const badges: BadgeMap = {};
  // Com um só técnico não há comparação — nenhum selo, nenhum destaque.
  if (vendorsFromBackend.length < 2) return { badges };

  // --- Destaque
  const topRating = Math.max(...vendorsFromBackend.map(ratingOf));
  const leaders = vendorsFromBackend.filter((v) => ratingOf(v) === topRating);

  let heroId: number | undefined;
  let heroBadge: VendorBadge;

  if (leaders.length === 1) {
    heroId = numericId(leaders[0]?.id) ?? undefined;
    heroBadge = 'best_rated';
  } else {
    const cheapestLeader = leaders.reduce((a, b) => (priceOf(b) < priceOf(a) ? b : a));
    // Preços todos iguais entre os empatados: não há "mais barato" a anunciar.
    const allSamePrice = leaders.every((v) => priceOf(v) === priceOf(cheapestLeader));
    heroId = allSamePrice ? undefined : numericId(cheapestLeader?.id) ?? undefined;
    heroBadge = 'cheapest';
  }

  if (heroId !== undefined) badges[heroId] = heroBadge;

  // --- Selos dos restantes: cada um com a sua própria razão, nunca repetida.
  if (heroBadge !== 'cheapest') {
    const cheapest = vendorsFromBackend.reduce((a, b) => (priceOf(b) < priceOf(a) ? b : a));
    const allSamePrice = vendorsFromBackend.every((v) => priceOf(v) === priceOf(cheapest));
    const cheapestId = numericId(cheapest?.id);
    if (!allSamePrice && cheapestId !== null && badges[cheapestId] === undefined) {
      badges[cheapestId] = 'cheapest';
    }
  }

  // O mais próximo é o primeiro que o backend devolve (ambos os serviços de
  // pesquisa ordenam por _geoPoint asc), não o primeiro da lista já reordenada
  // pelos favoritos do cliente.
  const closestId = numericId(vendorsFromBackend[0]?.id);
  if (closestId !== null && badges[closestId] === undefined) {
    badges[closestId] = 'closest';
  }

  return { badges, heroId };
};
