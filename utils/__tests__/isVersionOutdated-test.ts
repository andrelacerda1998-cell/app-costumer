import { isVersionOutdated } from '../index';

describe('isVersionOutdated', () => {
  it('compara as 1.0.x pelo número', () => {
    expect(isVersionOutdated('1.0.21', '1.0.0')).toBe(false);
    expect(isVersionOutdated('1.0.21', '1.0.21')).toBe(false);
    expect(isVersionOutdated('1.0.21', '1.0.25')).toBe(true);
    expect(isVersionOutdated('1.0.9', '1.0.10')).toBe(true);
  });

  it('uma 1.0.x não é obrigada a atualizar por um mínimo de calendário', () => {
    expect(isVersionOutdated('1.0.21', '2026.7.5')).toBe(false);
  });

  it('uma versão de calendário é mais antiga do que qualquer 1.0.x', () => {
    expect(isVersionOutdated('2026.7.4', '1.0.21')).toBe(true);
  });

  it('entre versões de calendário compara pelo número, como as builds antigas', () => {
    expect(isVersionOutdated('2026.7.4', '2026.7.5')).toBe(true);
    expect(isVersionOutdated('2026.8.0', '2026.7.5')).toBe(false);
  });
});
