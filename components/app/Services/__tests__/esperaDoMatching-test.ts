import { esperaDoMatching, horaDe } from '../esperaDoMatching';

/**
 * O que a app promete enquanto ninguém respondeu.
 *
 * O erro que isto existe para não repetir: durante uma semana a app disse a
 * quem pedia um agendado "podes fechar a app: avisamos-te assim que um
 * aceitar", e o servidor dava 120 s aos técnicos. Quem acreditava fechava a
 * app e o pedido morria em dois minutos.
 */
describe('esperaDoMatching', () => {
  const daquiADuasHoras = new Date(2026, 9, 7, 16, 30).toISOString();

  it('num pedido assíncrono diz que pode sair, até quando, e dá o caminho', () => {
    expect(esperaDoMatching({ scheduled: true, async: true, respond_by: daquiADuasHoras })).toEqual({
      dica: 'searching_hint_scheduled',
      podeSair: true,
      respondeAte: '16:30',
    });
  });

  /**
   * O caso que estava errado: agendado, mas para daqui a poucas horas. Os
   * técnicos têm 120 s, por isso o cliente deve ficar — mesmo sendo agendado.
   */
  it('num agendado que não é assíncrono pede para ficar, como no imediato', () => {
    expect(esperaDoMatching({ scheduled: true, async: false })).toEqual({
      dica: 'searching_hint',
      podeSair: false,
      respondeAte: null,
    });
  });

  it('no imediato pede para ficar', () => {
    expect(esperaDoMatching({ scheduled: false, async: false }).dica).toBe('searching_hint');
  });

  /** A app pode chegar às lojas antes do servidor: até lá, tudo como estava. */
  it('com um servidor que ainda não diz se é assíncrono, fica como antes', () => {
    expect(esperaDoMatching({ scheduled: true })).toEqual({
      dica: 'searching_hint_scheduled',
      podeSair: false,
      respondeAte: null,
    });
    expect(esperaDoMatching({ scheduled: false }).dica).toBe('searching_hint');
  });

  it('sem pedido carregado ainda, pede para ficar', () => {
    expect(esperaDoMatching(null).dica).toBe('searching_hint');
    expect(esperaDoMatching(undefined).podeSair).toBe(false);
  });

  it('assíncrono sem hora não inventa uma', () => {
    expect(esperaDoMatching({ async: true, respond_by: null }).respondeAte).toBeNull();
  });
});

describe('horaDe', () => {
  it('escreve horas e minutos com dois dígitos', () => {
    expect(horaDe(new Date(2026, 9, 7, 9, 5).toISOString())).toBe('09:05');
  });

  it('não rebenta com lixo', () => {
    expect(horaDe('amanhã')).toBeNull();
    expect(horaDe(null)).toBeNull();
    expect(horaDe(undefined)).toBeNull();
  });
});
