/**
 * O tecto de renovações de token, separado da instância do axios.
 *
 * A decisão "posso renovar outra vez?" é pequena mas é o que impede um erro
 * de se transformar numa tempestade, por isso vive aqui onde se lê e se testa
 * sozinha, em vez de escondida dentro de um interceptor.
 *
 * O histórico é uma lista de instantes. Não guardamos mais estado do que isso:
 * o que interessa é quantas tentativas houve na última janela.
 */

/**
 * Renovar mais do que isto por janela não é uso normal — é um ciclo. O valor é
 * folgado de propósito: com o TTL por omissão, uma sessão legítima renova uma
 * vez por hora, não três por minuto.
 */
export const RENOVACOES_MAX = 3;
export const JANELA_DE_RENOVACAO_MS = 60_000;

export interface DecisaoDeRenovacao {
    permitir: boolean;
    /** O histórico já podado — o chamador guarda-o, permita-se ou não. */
    historico: number[];
}

/**
 * Poda o histórico à janela e diz se ainda há espaço para mais uma tentativa.
 *
 * Quando permite, o instante fica já registado: quem chama não tem de se
 * lembrar de o fazer, e não há caminho em que se renove sem contar.
 */
export function avaliarRenovacao(historico: readonly number[], agora: number): DecisaoDeRenovacao {
    const recentes = historico.filter((quando) => agora - quando < JANELA_DE_RENOVACAO_MS);

    if (recentes.length >= RENOVACOES_MAX) {
        return { permitir: false, historico: recentes };
    }

    return { permitir: true, historico: [...recentes, agora] };
}

/**
 * Apaga UMA tentativa do histórico.
 *
 * Serve para as falhas que não são culpa do token — um erro de rede, por
 * exemplo. Quem está num túnel não deve gastar o tecto e acabar deslogado por
 * isso. Remove uma só entrada de propósito: duas tentativas podem cair no
 * mesmo milissegundo, e apagar as duas abriria uma folga que não existe.
 */
export function descartarTentativa(historico: readonly number[], quando: number): number[] {
    const indice = historico.indexOf(quando);

    if (indice === -1) {
        return [...historico];
    }

    return [...historico.slice(0, indice), ...historico.slice(indice + 1)];
}
