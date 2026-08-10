import { formatScheduledTime } from '../schedule';

/**
 * Só se mostra a hora de INÍCIO. O scheduled_time_end é o tamanho da marcação
 * (início + 30 min), não uma janela de chegada acordada — ver utils/schedule.ts.
 */
describe('formatScheduledTime', () => {
  it('normaliza a hora escolhida', () => {
    expect(formatScheduledTime('14:00')).toBe('14:00');
  });

  it('aceita o formato H:i:s que o backend devolve nalgumas rotas', () => {
    expect(formatScheduledTime('09:30:00')).toBe('09:30');
  });

  it('normaliza horas sem zero à esquerda', () => {
    expect(formatScheduledTime('9:05')).toBe('09:05');
  });

  it('devolve null quando não há hora — quem chama decide o texto de recurso', () => {
    expect(formatScheduledTime(null)).toBeNull();
    expect(formatScheduledTime('')).toBeNull();
  });

  it('ignora valores impossíveis em vez de os mostrar', () => {
    expect(formatScheduledTime('99:99')).toBeNull();
  });
});
