import { formatArrivalWindow } from '../schedule';

describe('formatArrivalWindow', () => {
  it('mostra a janela quando há início e fim', () => {
    expect(formatArrivalWindow('14:00', '16:00')).toBe('14:00 – 16:00');
  });

  it('aceita o formato H:i:s que o backend devolve nalgumas rotas', () => {
    expect(formatArrivalWindow('09:30:00', '11:00:00')).toBe('09:30 – 11:00');
  });

  it('normaliza horas sem zero à esquerda', () => {
    expect(formatArrivalWindow('9:05', '10:15')).toBe('09:05 – 10:15');
  });

  it('não repete a mesma hora quando início e fim coincidem', () => {
    expect(formatArrivalWindow('14:00', '14:00')).toBe('14:00');
  });

  it('devolve só o início quando não há fim', () => {
    expect(formatArrivalWindow('14:00', null)).toBe('14:00');
    expect(formatArrivalWindow('14:00', undefined)).toBe('14:00');
  });

  it('devolve null quando não há hora nenhuma — quem chama decide o texto de recurso', () => {
    expect(formatArrivalWindow(null, null)).toBeNull();
    expect(formatArrivalWindow('', '')).toBeNull();
  });

  it('ignora valores impossíveis em vez de os mostrar', () => {
    expect(formatArrivalWindow('99:99', null)).toBeNull();
  });
});
