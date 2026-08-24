import { resolveVendorBadges } from '../vendorBadges';

const V = (id: number, rate: number, rating: number | null = null) => ({ id, rate, rating });

describe('resolveVendorBadges — destaque', () => {
  it('destaca quem tem melhor avaliação, mesmo sendo o mais caro', () => {
    const { heroId, badges } = resolveVendorBadges([
      V(1, 5904, 4.6),
      V(2, 10824, 4.9),
      V(3, 3756, 4.2),
    ]);
    expect(heroId).toBe(2);
    expect(badges[2]).toBe('best_rated');
  });

  it('com notas todas iguais, destaca o mais barato', () => {
    // É o caso de hoje em produção: o backend devolve 5 por omissão, logo
    // ninguém se distingue pela nota e quem decide é o preço.
    const { heroId, badges } = resolveVendorBadges([
      V(1, 5904, 5),
      V(2, 10824, 5),
      V(3, 3756, 5),
    ]);
    expect(heroId).toBe(3);
    expect(badges[3]).toBe('cheapest');
  });

  it('com empate no topo, escolhe o mais barato de entre os empatados', () => {
    // Dois a 5,0 e um a 4,0: escolher um dos líderes ao acaso seria arbitrário,
    // e o de 4,0 não pode ganhar só por ser barato.
    const { heroId } = resolveVendorBadges([
      V(1, 9000, 5),
      V(2, 7000, 5),
      V(3, 1000, 4),
    ]);
    expect(heroId).toBe(2);
  });

  it('sem avaliações nenhumas, decide o preço', () => {
    const { heroId, badges } = resolveVendorBadges([V(1, 5904, null), V(2, 3756, null)]);
    expect(heroId).toBe(2);
    expect(badges[2]).toBe('cheapest');
  });

  it('quem não tem avaliação nunca ganha por nota', () => {
    const { heroId } = resolveVendorBadges([V(1, 100, null), V(2, 9999, 3.1)]);
    expect(heroId).toBe(2);
  });

  it('não destaca nada com um só técnico — não há comparação', () => {
    const { heroId, badges } = resolveVendorBadges([V(1, 1000, 5)]);
    expect(heroId).toBeUndefined();
    expect(badges).toEqual({});
  });

  it('não destaca nada quando nota e preço estão todos empatados', () => {
    const { heroId } = resolveVendorBadges([V(1, 5000, 5), V(2, 5000, 5)]);
    expect(heroId).toBeUndefined();
  });
});

describe('resolveVendorBadges — selos', () => {
  it('dá ao mais barato o seu selo quando o destaque foi por nota', () => {
    const { badges } = resolveVendorBadges([V(1, 5904, 4.6), V(2, 10824, 4.9), V(3, 3756, 4.2)]);
    expect(badges).toEqual({ 2: 'best_rated', 3: 'cheapest', 1: 'closest' });
  });

  it('nunca põe dois selos no mesmo cartão', () => {
    // O primeiro do backend é também o mais barato: fica só com um selo.
    const { badges } = resolveVendorBadges([V(1, 1000, 5), V(2, 5000, 5)]);
    expect(badges).toEqual({ 1: 'cheapest' });
  });

  it('marca como mais perto o primeiro que o backend devolve', () => {
    const { badges } = resolveVendorBadges([V(7, 5000, 5), V(8, 1000, 5)]);
    expect(badges[7]).toBe('closest');
  });
});
