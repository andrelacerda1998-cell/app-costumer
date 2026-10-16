import { isVersionOutdated } from '../index';

describe('isVersionOutdated', () => {
  it('a 2026.10.0 não se obriga a atualizar com o mínimo de produção (1.0.0)', () => {
    // O caso que bloqueava a app no arranque com a regra de 12/10.
    expect(isVersionOutdated('2026.10.0', '1.0.0')).toBe(false);
  });

  it('compara as versões de calendário pelo número', () => {
    expect(isVersionOutdated('2026.10.0', '2026.10.0')).toBe(false);
    expect(isVersionOutdated('2026.10.0', '2026.7.4')).toBe(false);
    expect(isVersionOutdated('2026.7.4', '2026.10.0')).toBe(true);
    expect(isVersionOutdated('2026.9.9', '2026.10.0')).toBe(true);
  });

  it('um mínimo de calendário obriga a 1.0.20 do iOS a atualizar', () => {
    // As builds antigas também comparam pelo número: subir o mínimo para
    // 2026.10.0 apanha as duas lojas da mesma forma.
    expect(isVersionOutdated('1.0.20', '2026.10.0')).toBe(true);
  });

  it('compara as 1.0.x pelo número', () => {
    expect(isVersionOutdated('1.0.20', '1.0.0')).toBe(false);
    expect(isVersionOutdated('1.0.9', '1.0.10')).toBe(true);
  });
});
