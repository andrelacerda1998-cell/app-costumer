/**
 * O que dizer ao cliente enquanto os técnicos ainda não responderam.
 *
 * O texto "podes fechar a app: avisamos-te assim que um aceitar" foi escrito
 * quando um agendado dava meia hora aos técnicos. Desde 29/09 dava 120 s — e o
 * cliente que acreditava e fechava a app via o pedido morrer em dois minutos.
 *
 * Desde 06/10 o servidor diz qual é o caso (`async`):
 *
 *  - ASSÍNCRONO (agendado com 24 h ou mais de antecedência): os técnicos têm
 *    horas. O texto do "podes fechar a app" passa a ser verdade, e mostra-se até
 *    quando eles podem responder e um caminho para os pedidos;
 *  - NÃO ASSÍNCRONO (imediato, ou agendado para daqui a pouco): os técnicos
 *    têm 120 s. O cliente deve ficar — é o texto do imediato, diga o pedido
 *    "agendado" ou não;
 *  - SERVIDOR ANTIGO (o campo não vem): fica tudo como estava. A app pode
 *    chegar às lojas antes de o servidor ser atualizado, e não pode piorar
 *    nada até lá.
 */

export type ChaveDaDica = 'searching_hint' | 'searching_hint_scheduled';

export interface EsperaDoMatching {
  /** Chave em `matching.selection.*`. */
  dica: ChaveDaDica;
  /** Mostrar o botão que leva aos pedidos. */
  podeSair: boolean;
  /** Até quando os técnicos podem responder, já como "16:30". null = não mostrar. */
  respondeAte: string | null;
}

interface ServicoEmEspera {
  scheduled?: boolean;
  async?: boolean;
  respond_by?: string | null;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * "16:30", na hora do telemóvel. Sem `Intl`: o `respond_by` está sempre a
 * menos de quatro horas, por isso a hora chega, e não se depende do suporte de
 * `toLocaleTimeString` em cada motor de JavaScript.
 */
export function horaDe(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

export function esperaDoMatching(service: ServicoEmEspera | null | undefined): EsperaDoMatching {
  if (service?.async === true) {
    return { dica: 'searching_hint_scheduled', podeSair: true, respondeAte: horaDe(service.respond_by) };
  }

  if (service?.async === false) {
    return { dica: 'searching_hint', podeSair: false, respondeAte: null };
  }

  return {
    dica: service?.scheduled ? 'searching_hint_scheduled' : 'searching_hint',
    podeSair: false,
    respondeAte: null,
  };
}
