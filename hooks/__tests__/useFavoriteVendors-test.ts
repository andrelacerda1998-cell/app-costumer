import { rankFavoritesFirst } from '../useFavoriteVendors';

const vendors = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bruno' },
  { id: 3, name: 'Carla' },
  { id: 4, name: 'Diogo' },
  { id: 5, name: 'Eva' },
];

const favoritesOf = (...ids: number[]) => (id?: number | string | null) =>
  ids.includes(Number(id));

describe('rankFavoritesFirst', () => {
  it('não mexe na ordem quando não há favoritos', () => {
    const ranked = rankFavoritesFirst(vendors, favoritesOf());
    expect(ranked.map((v) => v.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('traz um favorito de fora do top 3 para dentro do corte', () => {
    // A função faz isto corretamente — mas hoje nunca é exercitada em produção:
    // o backend faz take(3) antes de responder, logo nunca existe um 5.º.
    // Fica coberta para o dia em que o servidor devolver mais.
    const ranked = rankFavoritesFirst(vendors, favoritesOf(5)).slice(0, 3);
    expect(ranked.map((v) => v.id)).toEqual([5, 1, 2]);
  });

  it('preserva a ordem do backend dentro de cada grupo', () => {
    const ranked = rankFavoritesFirst(vendors, favoritesOf(4, 2));
    expect(ranked.map((v) => v.id)).toEqual([2, 4, 1, 3, 5]);
  });

  it('não altera a lista original', () => {
    const original = [...vendors];
    rankFavoritesFirst(vendors, favoritesOf(5));
    expect(vendors).toEqual(original);
  });

  it('aguenta ids em falta sem rebentar', () => {
    const messy = [{ id: undefined }, { id: 2 }, { id: null }];
    expect(() => rankFavoritesFirst(messy, favoritesOf(2))).not.toThrow();
    expect(rankFavoritesFirst(messy, favoritesOf(2))[0].id).toBe(2);
  });
});
