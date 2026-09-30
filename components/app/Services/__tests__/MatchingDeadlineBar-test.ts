import { estadoDoPrazo, SEGUNDOS_CRITICOS } from '../MatchingDeadlineBar';

const AGORA = 1_800_000_000_000;
const s = (n: number) => n * 1000;

/**
 * O relógio dos cinco minutos que o cliente vê enquanto escolhe e paga.
 *
 * O prazo é do SERVIDOR e a conta é feita no telemóvel — é aqui que os dois se
 * encontram. Um erro nesta função não parte nada visível: mostra ao cliente um
 * número que não é o que o `matching:advance` está a usar, e o pedido morre com
 * o contador ainda a andar (ou o contrário, que é pior: chega a zero e nada
 * acontece, e ele aprende a não acreditar no contador).
 */
describe('estadoDoPrazo', () => {
  it('conta os segundos que faltam até ao instante do servidor', () => {
    expect(estadoDoPrazo(AGORA + s(300), AGORA).restam).toBe(300);
    expect(estadoDoPrazo(AGORA + s(300), AGORA).etiqueta).toBe('5:00');
  });

  it('escreve minutos e segundos com dois dígitos', () => {
    expect(estadoDoPrazo(AGORA + s(247), AGORA).etiqueta).toBe('4:07');
    expect(estadoDoPrazo(AGORA + s(60), AGORA).etiqueta).toBe('1:00');
    expect(estadoDoPrazo(AGORA + s(9), AGORA).etiqueta).toBe('0:09');
  });

  it('fica vermelho no último minuto e não antes', () => {
    expect(estadoDoPrazo(AGORA + s(61), AGORA).critico).toBe(false);
    // Aos 60 exactos já é o último minuto: é o que a copy promete.
    expect(estadoDoPrazo(AGORA + s(SEGUNDOS_CRITICOS), AGORA).critico).toBe(true);
    expect(estadoDoPrazo(AGORA + s(5), AGORA).critico).toBe(true);
  });

  /**
   * O prazo passou enquanto a app estava em segundo plano — que é exactamente
   * o que o cliente faz para abrir a app do banco. Ao voltar não pode haver
   * tempo negativo nem uma barra a transbordar.
   */
  it('não conta tempo negativo depois de o prazo passar', () => {
    const passado = estadoDoPrazo(AGORA - s(90), AGORA);

    expect(passado.restam).toBe(0);
    expect(passado.etiqueta).toBe('0:00');
    expect(passado.fracao).toBe(0);
    expect(passado.critico).toBe(true);
  });

  it('a barra esvazia-se em proporção à janela real', () => {
    const inicio = AGORA - s(150);
    const limite = AGORA + s(150);

    expect(estadoDoPrazo(limite, AGORA, inicio).fracao).toBeCloseTo(0.5, 5);
    expect(estadoDoPrazo(limite, inicio, inicio).fracao).toBe(1);
  });

  /**
   * Sem `startedAt` assume-se a janela nominal de cinco minutos. É uma
   * aproximação assumida: o número ao lado continua a ser a verdade, e uma
   * barra estimada é melhor do que uma barra parada.
   */
  it('sem início conhecido usa os cinco minutos nominais', () => {
    expect(estadoDoPrazo(AGORA + s(150), AGORA).fracao).toBeCloseTo(0.5, 5);
    expect(estadoDoPrazo(AGORA + s(300), AGORA).fracao).toBe(1);
  });

  it('nunca passa de cheia, mesmo com um início incoerente', () => {
    // Início depois do limite: dados impossíveis, mas vindos da rede.
    expect(estadoDoPrazo(AGORA + s(60), AGORA, AGORA + s(600)).fracao).toBeLessThanOrEqual(1);
  });
});
