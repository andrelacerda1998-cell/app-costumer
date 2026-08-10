import { resolveHeroId, resolveVendorBadges } from '../vendorBadges';

const V = (id: number, rate: number) => ({ id, rate });

describe('resolveVendorBadges', () => {
  it('marca o primeiro do backend como mais perto e o mais barato como tal', () => {
    const badges = resolveVendorBadges([V(1, 5904), V(2, 10824), V(3, 3756)]);
    expect(badges).toEqual({ 1: 'closest', 3: 'cheapest' });
  });

  it('não repete selos quando o mais perto também é o mais barato', () => {
    // Um cartão, um selo — e o preço ganha, porque é o que decide entre dois
    // profissionais igualmente verificados.
    const badges = resolveVendorBadges([V(1, 1000), V(2, 5000)]);
    expect(badges).toEqual({ 1: 'cheapest' });
  });

  it('não marca nada com um só técnico — não há comparação', () => {
    expect(resolveVendorBadges([V(1, 1000)])).toEqual({});
  });

  it('não elege um mais barato quando os preços são iguais', () => {
    const badges = resolveVendorBadges([V(1, 5000), V(2, 5000)]);
    expect(badges).toEqual({ 1: 'closest' });
  });

  it('o cartão sugerido é o mais barato', () => {
    expect(resolveHeroId({ 1: 'closest', 3: 'cheapest' })).toBe(3);
    expect(resolveHeroId({ 1: 'closest' })).toBeUndefined();
  });
});
