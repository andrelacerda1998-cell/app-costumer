import {
    avaliarRenovacao,
    descartarTentativa,
    JANELA_DE_RENOVACAO_MS,
    RENOVACOES_MAX,
} from '@/utils/refreshThrottle';

/**
 * O tecto que impede o ciclo de renovação de token.
 *
 * Sem ele, um token que renova bem mas não autentica nada punha a app a
 * renovar uma vez por pedido falhado, para sempre — medimos 989 pedidos num
 * minuto de um telemóvel parado. Estes testes fixam as três propriedades de
 * que isso depende: deixa passar o uso normal, corta o ciclo, e não castiga
 * quem só perdeu rede.
 */
describe('tecto de renovações de token', () => {
    it('deixa passar as primeiras tentativas', () => {
        let historico: number[] = [];

        for (let i = 0; i < RENOVACOES_MAX; i++) {
            const decisao = avaliarRenovacao(historico, 1000 + i);
            expect(decisao.permitir).toBe(true);
            historico = decisao.historico;
        }

        expect(historico).toHaveLength(RENOVACOES_MAX);
    });

    it('corta quando se excede o tecto dentro da janela', () => {
        let historico: number[] = [];

        for (let i = 0; i < RENOVACOES_MAX; i++) {
            historico = avaliarRenovacao(historico, 1000 + i).historico;
        }

        expect(avaliarRenovacao(historico, 1000 + RENOVACOES_MAX).permitir).toBe(false);
    });

    it('nao regista a tentativa que recusou', () => {
        let historico: number[] = [];
        for (let i = 0; i < RENOVACOES_MAX; i++) {
            historico = avaliarRenovacao(historico, 1000 + i).historico;
        }

        // Insistir não pode inflacionar o histórico: senão, passada a janela, o
        // utilizador continuava bloqueado por tentativas que nunca aconteceram.
        const recusada = avaliarRenovacao(historico, 1500);
        expect(recusada.historico).toHaveLength(RENOVACOES_MAX);
    });

    it('volta a permitir quando a janela passa', () => {
        let historico: number[] = [];
        for (let i = 0; i < RENOVACOES_MAX; i++) {
            historico = avaliarRenovacao(historico, 1000 + i).historico;
        }

        // A janela é deslizante, não um balde que se esvazia de uma vez: o
        // instante tem de passar a ÚLTIMA tentativa, não a primeira.
        const ultimaTentativa = 1000 + RENOVACOES_MAX - 1;
        const depois = ultimaTentativa + JANELA_DE_RENOVACAO_MS + 1;
        const decisao = avaliarRenovacao(historico, depois);

        expect(decisao.permitir).toBe(true);
        expect(decisao.historico).toEqual([depois]);
    });

    it('descartar uma tentativa devolve o espaco que ela ocupava', () => {
        let historico: number[] = [];
        for (let i = 0; i < RENOVACOES_MAX; i++) {
            historico = avaliarRenovacao(historico, 1000 + i).historico;
        }
        expect(avaliarRenovacao(historico, 1010).permitir).toBe(false);

        // É isto que protege quem está sem rede: a tentativa não conta.
        historico = descartarTentativa(historico, 1002);

        expect(avaliarRenovacao(historico, 1010).permitir).toBe(true);
    });

    it('descartar remove uma so entrada, mesmo com instantes repetidos', () => {
        const historico = [1000, 1000, 1000];

        expect(descartarTentativa(historico, 1000)).toEqual([1000, 1000]);
    });

    it('descartar um instante desconhecido nao mexe no historico', () => {
        expect(descartarTentativa([1000, 2000], 9999)).toEqual([1000, 2000]);
    });
});
