import {
  dedupeSlotsByRoundedTime,
  filterVendorsByAvailability,
  filterVendorsByAnyAvailability,
  findVendorSlotAt,
  isVendorFreeAt,
  roundSlotTime,
} from '../availability';

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

describe('roundSlotTime', () => {
  it('encosta à grelha de meia hora o que está desalinhado por minutos', () => {
    expect(roundSlotTime('12:01')).toBe('12:00');
    expect(roundSlotTime('11:59')).toBe('12:00');
    expect(roundSlotTime('08:31')).toBe('08:30');
    expect(roundSlotTime('06:01')).toBe('06:00');
  });

  it('deixa intacta uma hora que está mesmo fora da grelha', () => {
    // 12:15 não é desalinhamento, é uma hora a sério — mexer nela seria mentir.
    expect(roundSlotTime('12:15')).toBe('12:15');
    expect(roundSlotTime('12:10')).toBe('12:10');
    // 5 min ja e uma hora a serio: a tolerancia e de 2.
    expect(roundSlotTime('09:05')).toBe('09:05');
  });

  it('não salta o dia ao arredondar perto da meia-noite', () => {
    expect(roundSlotTime('23:59')).toBe('00:00');
  });

  it('devolve null para lixo', () => {
    expect(roundSlotTime(undefined)).toBeNull();
    expect(roundSlotTime('99:99')).toBeNull();
  });
});

describe('dedupeSlotsByRoundedTime', () => {
  const s = (time: string) => ({ time, time_end: '00:00', available: true });

  it('junta as grelhas desalinhadas dos vários técnicos numa hora só', () => {
    const merged = dedupeSlotsByRoundedTime([s('12:00'), s('12:01'), s('12:30'), s('12:31')]);
    expect(merged.map((x) => x.time)).toEqual(['12:00', '12:30']);
  });

  it('mostra a hora redonda mesmo quando a primeira que chega é a desalinhada', () => {
    expect(dedupeSlotsByRoundedTime([s('06:01')])[0].time).toBe('06:00');
  });

  it('não junta horas que são mesmo diferentes', () => {
    const merged = dedupeSlotsByRoundedTime([s('12:00'), s('12:30'), s('13:00')]);
    expect(merged).toHaveLength(3);
  });

  it('preserva o resto do slot', () => {
    const merged = dedupeSlotsByRoundedTime([{ time: '09:01', time_end: '09:31', available: false }]);
    expect(merged[0]).toEqual({ time: '09:00', time_end: '09:31', available: false });
  });
});

describe('isVendorFreeAt com grelhas desalinhadas', () => {
  it('quem só está livre às 12:01 conta como livre às 12:00', () => {
    expect(isVendorFreeAt([slot('2026-08-11', '12:01')], '2026-08-11', '12:00')).toBe(true);
  });

  it('continua a não confundir marcações vizinhas', () => {
    expect(isVendorFreeAt([slot('2026-08-11', '12:30')], '2026-08-11', '12:00')).toBe(false);
  });
});

describe('findVendorSlotAt', () => {
  it('devolve a hora real do técnico para a hora redonda escolhida', () => {
    const found = findVendorSlotAt([slot('2026-08-11', '12:01')], '2026-08-11', '12:00');
    expect(found?.time_start).toBe('12:01');
  });

  it('devolve null quando o técnico não tem nada àquela hora', () => {
    expect(findVendorSlotAt([slot('2026-08-11', '15:00')], '2026-08-11', '12:00')).toBeNull();
  });

  it('ignora slots desativados', () => {
    expect(findVendorSlotAt([slot('2026-08-11', '12:01', false)], '2026-08-11', '12:00')).toBeNull();
  });
});

describe('filterVendorsByAnyAvailability', () => {
  const availability = {
    1: [{ date: '2026-09-05', time_start: '10:00', time_end: '11:00', enabled: true }],
    2: [{ date: '2026-09-05', time_start: '15:00', time_end: '16:00', enabled: true }],
    3: [{ date: '2026-09-06', time_start: '10:00', time_end: '11:00', enabled: true }],
  } as any;
  const vendors = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it('mantém quem está livre em qualquer um dos horários escolhidos', () => {
    expect(
      filterVendorsByAnyAvailability(vendors, availability, '2026-09-05', ['10:00', '15:00']),
    ).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('ignora horários vazios', () => {
    expect(
      filterVendorsByAnyAvailability(vendors, availability, '2026-09-05', ['10:00', null, undefined]),
    ).toEqual([{ id: 1 }]);
  });

  it('sem horários devolve todos, porque "não sei" não é "não há ninguém"', () => {
    expect(filterVendorsByAnyAvailability(vendors, availability, '2026-09-05', [])).toEqual(vendors);
  });
});
