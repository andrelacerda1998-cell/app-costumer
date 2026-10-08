import { PixelRatio, useWindowDimensions } from "react-native";

/**
 * Escala da interface ao tamanho do ecrã.
 *
 * Os ecrãs foram afinados num iPhone 17 Pro Max (440 pt de largura). Os
 * tamanhos eram fixos, e num iPhone SE (375 pt) ou num Android de 360 dp a
 * mesma letra ocupava uma parte muito maior do ecrã: a Home só mostrava as
 * categorias e os nomes partiam a meio (08/10/2026).
 *
 * - LARGURA_BASE: a partir daqui não se escala (ecrãs grandes ficam como
 *   estão). Abaixo, encolhe na proporção da largura, até FATOR_MINIMO — mais
 *   do que isso e a letra pequena deixa de se ler.
 * - TEXTO_MAXIMO: o teto da ampliação de texto do sistema. Era 1,8×; com isso
 *   quem tinha a letra aumentada via os ecrãs desfeitos. 1,35× é o "maior
 *   tamanho normal" do iPhone (sem os tamanhos de acessibilidade) e cobre o
 *   máximo habitual em Android.
 */
export const LARGURA_BASE = 414;
export const FATOR_MINIMO = 0.88;
export const TEXTO_MAXIMO = 1.35;

export const fatorDaLargura = (largura: number) =>
  Math.max(FATOR_MINIMO, Math.min(1, largura / LARGURA_BASE));

/** Arredonda a meio píxel do ecrã, para a letra não ficar desfocada. */
const arredondar = (n: number) => PixelRatio.roundToNearestPixel(n);

export const useEscala = () => {
  const { width, fontScale } = useWindowDimensions();
  const fator = fatorDaLargura(width);

  return {
    /** Multiplicador da largura (1 nos ecrãs grandes, até 0,88 nos pequenos). */
    fator,
    /** A ampliação de texto do sistema, tal como está. */
    fontScale,
    /** A ampliação de texto do sistema, já com o teto. */
    textoSistema: Math.min(fontScale, TEXTO_MAXIMO),
    /** Um tamanho (letra, ícone, espaço) ajustado à largura do ecrã. */
    s: (n: number) => arredondar(n * fator),
  };
};

/**
 * Letra que deixa a palavra mais comprida caber numa linha.
 *
 * O iOS e o Android partem uma palavra a meio quando ela não cabe na largura
 * ("Desentupiment-o"), e o `adjustsFontSizeToFit` não o evita: partir conta
 * como "caber". Num cartão estreito, reduz-se a letra o suficiente para a
 * palavra mais comprida caber — e só isso; o resto do texto continua a poder
 * ocupar várias linhas.
 *
 * LARGURA_DO_CARACTER: largura média de um carácter em Poppins semibold, em
 * fração do tamanho da letra (medido: ~0,6; arredondado para cima por
 * segurança). Devolve o tamanho ANTES da escala da largura do CustomText.
 */
const LARGURA_DO_CARACTER = 0.63;
/** Em maiúsculas cada letra é mais larga (medido no SE: "CANALIZAÇÃO" ~0,65). */
const LARGURA_DA_MAIUSCULA = 0.67;

export const tamanhoQueCabe = (
  texto: string | undefined,
  larguraDisponivel: number,
  tamanho: number,
  minimo: number,
  fator: number,
  /** A ampliação do sistema já com teto (useEscala().textoSistema). */
  textoSistema = 1,
) => {
  const palavras = String(texto ?? "").split(/\s+/);
  const maior = Math.max(0, ...palavras.map((p) => p.length));
  if (!maior) return tamanho;
  const maiusculas = palavras.join("") === palavras.join("").toUpperCase();
  const larguraLetra = maiusculas ? LARGURA_DA_MAIUSCULA : LARGURA_DO_CARACTER;
  // O CustomText ainda multiplica pelo fator da largura, e o sistema pela sua
  // ampliação: divide-se aqui para o resultado final ser o que cabe.
  const cabe = larguraDisponivel / (maior * larguraLetra) / fator / textoSistema;
  return Math.max(minimo, Math.min(tamanho, Math.floor(cabe * 2) / 2));
};
