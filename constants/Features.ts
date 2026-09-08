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
// LIGADO a pedido do André para o cesto voltar à barra. ATENÇÃO: o fluxo por
// trás continua a ser o antigo — N pedidos, N escolhas de técnico, N pagamentos
// (a razão original de ter sido desligado, acima). O "um só pagamento" depende
// da Fase 2–4 do backend (service_orders + captura única), ainda por fazer.
// Enquanto isso, o cesto é visível e usável mas cobra serviço a serviço.
export const CART_ENABLED = true;

/**
 * Seleção de profissional (matching) — ver docs/matching.md no backend.
 *
 * Inverte a ordem do pedido: em vez de escolher um técnico às cegas e pagar
 * logo, o pedido vai a vários, eles dizem se têm disponibilidade, e o cliente
 * escolhe entre quem respondeu. Só então se paga.
 *
 * LIGADO a 08/09/2026, a pedido do André.
 *
 * O QUE ISTO MUDA, E SÓ ISTO: o botão "Pedir agora". O agendamento não passa
 * por aqui — `scheduleService()` vai direto ao ecrã de data/hora e daí ao
 * fluxo antigo de escolher técnico, com flag ou sem ela.
 *
 * ESTADO DAS DUAS CONDIÇÕES que justificavam ter estado desligado:
 *
 *  1. "Backend em produção" — CUMPRIDO. A fundação do matching entrou na main
 *     a 24/08/2026 e houve 27 deploys com sucesso desde então.
 *
 *  2. "Fluxo percorrido de ponta a ponta com contas de teste" — NÃO CUMPRIDO.
 *     Não foi possível no ambiente local: nenhum técnico de teste passa o
 *     `canAcceptService` (faltam documentos validados e workspace de
 *     faturação), por isso não há candidatos para convidar. O que existe é
 *     cobertura de testes de integração no backend, não uma passagem real.
 *
 * ATENÇÃO À ORDEM DE SAÍDA: as alterações de 08/09 ao matching (cliente vê os
 * 3 MELHORES por ranking, faixa A até às 5 avaliações, três arranques abaixo
 * de 3 estrelas acabam com a proteção) estão na main mas AINDA NÃO
 * DEPLOYADAS. Se esta app sair antes desse deploy, o comportamento em
 * produção é o anterior — fecha ao terceiro sim, e quem chega ao cliente são
 * os 3 mais rápidos, não os 3 melhores. Não parte nada; é só outra regra.
 *
 * Para voltar a desligar, basta pôr `false` e reconstruir. Os ecrãs ficam
 * inalcançáveis pelo fluxo normal e o comportamento volta a ser o antigo.
 */
export const MATCHING_ENABLED = true;
