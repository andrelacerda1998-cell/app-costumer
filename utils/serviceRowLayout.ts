/**
 * O preço desce para debaixo do nome nesta linha da lista?
 *
 * Nomes como "Instalação de Torneira de Casa de Banho" partem em duas linhas e
 * espremem o "Desde 20,00 €" contra a margem. Nesses casos o preço fica melhor
 * por baixo, com a linha inteira para ele.
 *
 * A decisão é pelo COMPRIMENTO e não por medir o texto já desenhado
 * (`onTextLayout`): medir cria um ciclo — ao descer o preço, o nome ganha a
 * largura toda, passa a caber numa linha, o preço volta a subir, e o nome parte
 * outra vez. Uma estimativa estável vale mais que uma medição que oscila.
 */

/** Largura da miniatura + folgas da linha, em pontos. */
const ROW_CHROME = 56 + 12 + 16;
/** Espaço que o "Desde 00,00 €" ocupa à direita. */
const PRICE_WIDTH = 130;
/** Largura média de um caractere a 14pt na Poppins semibold. */
const CHAR_WIDTH = 7.6;

export const priceBelowName = (label: string, windowWidth: number): boolean => {
  if (typeof label !== "string" || label.length === 0) return false;
  if (!Number.isFinite(windowWidth) || windowWidth <= 0) return false;

  const available = windowWidth - ROW_CHROME - PRICE_WIDTH;
  if (available <= 0) return true;

  return label.length > Math.floor(available / CHAR_WIDTH);
};
