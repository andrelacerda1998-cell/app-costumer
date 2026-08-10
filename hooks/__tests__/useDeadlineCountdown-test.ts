import { formatCountdown, secondsUntil } from '../useDeadlineCountdown';

describe('secondsUntil', () => {
  const T0 = 1_770_000_000_000;

  it('conta o que falta a partir do instante-limite', () => {
    expect(secondsUntil(T0 + 240_000, T0)).toBe(240);
  });

  it('não desce abaixo de zero', () => {
    expect(secondsUntil(T0, T0 + 60_000)).toBe(0);
  });

  it('sobreviver a segundo plano não inventa tempo — é este o bug que corrige', () => {
    // O cliente sai para a app do banco durante 3 minutos. Com o contador antigo
    // (decremento por setInterval, estrangulado em segundo plano) voltaria a
    // mostrar quase 4 minutos. Ancorado no instante, mostra o que resta mesmo.
    const deadline = T0 + 4 * 60_000;
    expect(secondsUntil(deadline, T0 + 3 * 60_000)).toBe(60);
  });

  it('arredonda para cima para o contador não saltar de 1 para 0 cedo demais', () => {
    expect(secondsUntil(T0 + 1_500, T0)).toBe(2);
  });
});

describe('formatCountdown', () => {
  it('formata em mm:ss', () => {
    expect(formatCountdown(240)).toBe('4:00');
    expect(formatCountdown(247)).toBe('4:07');
    expect(formatCountdown(59)).toBe('0:59');
    expect(formatCountdown(0)).toBe('0:00');
  });

  it('nunca mostra tempo negativo', () => {
    expect(formatCountdown(-30)).toBe('0:00');
  });
});
