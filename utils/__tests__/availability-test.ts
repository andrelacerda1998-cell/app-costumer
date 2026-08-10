import { filterVendorsByAvailability, isVendorFreeAt } from '../availability';

const slot = (date: string, time_start: string, enabled = true) => ({
  date,
  time_start,
  time_end: '14:30',
  enabled,
});

describe('isVendorFreeAt', () => {
  it('reconhece a hora exata no dia certo', () => {
    expect(isVendorFreeAt([slot('2026-08-11', '14:00')], '2026-08-11', '14:00')).toBe(true);
  });

  it('aceita os formatos que o backend mistura (H:i e H:i:s)', () => {
    expect(isVendorFreeAt([slot('2026-08-11', '14:00:00')], '2026-08-11', '14:00')).toBe(true);
    expect(isVendorFreeAt([slot('2026-08-11T00:00:00', '9:30')], '2026-08-11', '09:30')).toBe(true);
  });

  it('não confunde dias', () => {
    expect(isVendorFreeAt([slot('2026-08-12', '14:00')], '2026-08-11', '14:00')).toBe(false);
  });

  it('um slot desativado não conta como livre', () => {
    expect(isVendorFreeAt([slot('2026-08-11', '14:00', false)], '2026-08-11', '14:00')).toBe(false);
  });

  it('sem agenda não há garantia nenhuma', () => {
    expect(isVendorFreeAt(undefined, '2026-08-11', '14:00')).toBe(false);
    expect(isVendorFreeAt([], '2026-08-11', '14:00')).toBe(false);
  });
});

describe('filterVendorsByAvailability', () => {
  const vendors = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const availability = {
    1: [slot('2026-08-11', '14:00')],
    2: [slot('2026-08-11', '16:00')],
    3: [slot('2026-08-11', '14:00'), slot('2026-08-11', '16:00')],
  };

  it('mostra só quem está livre na hora escolhida', () => {
    const result = filterVendorsByAvailability(vendors, availability, '2026-08-11', '14:00');
    expect(result.map((v) => v.id)).toEqual([1, 3]);
  });

  it('devolve lista vazia quando ninguém está livre — e o ecrã explica-o', () => {
    expect(filterVendorsByAvailability(vendors, availability, '2026-08-11', '20:00')).toEqual([]);
  });

  it('sem mapa de disponibilidade mostra todos, não nenhum', () => {
    // Mapa em falta significa "não sei", não "não há ninguém". Esconder toda a
    // gente por falta de dados seria pior do que mostrar a mais.
    expect(filterVendorsByAvailability(vendors, {}, '2026-08-11', '14:00')).toHaveLength(3);
  });

  it('sem hora escolhida não filtra nada', () => {
    expect(filterVendorsByAvailability(vendors, availability, null, null)).toHaveLength(3);
  });
});
