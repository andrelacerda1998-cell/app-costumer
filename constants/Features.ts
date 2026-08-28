/**
 * Interruptores de funcionalidade.
 *
 * Existem para uma decisão poder ser revertida sem outra submissão às lojas —
 * mudar o valor aqui e voltar a construir chega.
 */

/**
 * Cesto de serviços (separador central + "adicionar ao cesto" na ficha).
 *
 * Desligado a 11/08/2026, por decisão do André. Porquê:
 *
 * O cesto promete "uma só visita" (services.cart_technicians.single_subtitle) e
 * entrega N reservas, N datas, N pagamentos e um "Continuar reservas" manual
 * entre elas. A promessa central não é cumprida, e cumpri-la exige backend que
 * não existe: OpenServiceRequest aceita UM service_type por pedido, portanto
 * não há pagamento único para o cesto. Enquanto isso não mudar, o cesto é um
 * segundo fluxo paralelo a fazer o mesmo trabalho do fluxo direto, a divergir
 * dele a cada alteração e a fazer uma promessa que não pode manter.
 *
 * O QUE ESTE INTERRUPTOR NÃO FAZ, DE PROPÓSITO:
 *  - não apaga o cesto guardado no dispositivo (piquet_cart_v1 fica intacto);
 *  - não remove a rota `/(app)/(tabs)/cart` — continua alcançável por link
 *    direto, e volta a aparecer inteira quando isto voltar a `true`.
 * Assim, ninguém perde o que já tinha juntado: fica invisível, não destruído.
 *
 * LIMITAÇÃO CONHECIDA: quem estiver a meio de uma fila de reservas (pagou o
 * primeiro de dois serviços) deixa de ter por onde retomar, porque o botão
 * "Continuar reservas" vive dentro do ecrã do cesto. Não há forma de o resolver
 * sem manter o separador visível para esses casos — decisão adiada, e o número
 * de pessoas nesse estado é pequeno por a fila viver só em memória.
 *
 * Antes de decidir se volta a ligar, ver no Mixpanel: `cart_proceed_pressed` e
 * `cart_booking_flow_started`.
 */
export const CART_ENABLED = false;

/**
 * Seleção de profissional (matching) — ver docs/matching.md no backend.
 *
 * Inverte a ordem do pedido: em vez de escolher um técnico às cegas e pagar
 * logo, o pedido vai a vários, eles dizem se têm disponibilidade, e o cliente
 * escolhe entre quem respondeu. Só então se paga.
 *
 * Desligado até o backend estar em produção e o fluxo ter sido percorrido de
 * ponta a ponta com contas de teste. Com `false`, os ecrãs novos ficam
 * inalcançáveis pelo fluxo normal e o comportamento é literalmente o de hoje:
 * o `checkout` só entra em modo matching se lhe passarem o parâmetro, e nada
 * lho passa enquanto isto for `false`.
 *
 * O QUE ISTO NÃO FAZ, DE PROPÓSITO: não remove a rota `matching/[serviceId]`,
 * que continua alcançável por link direto — é assim que se testa antes de ligar
 * para toda a gente.
 */
export const MATCHING_ENABLED = false;
