import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

/**
 * Pedido de avaliação na loja, com porteiro.
 *
 * Só se pede a quem acabou de ter uma boa experiência — serviço concluído e
 * avaliado com 4 ou 5 estrelas. Quem deu 3 ou menos não vê nada: a queixa dele
 * pertence ao suporte, não à App Store.
 *
 * Duas coisas que a app NÃO controla, e é bom saber:
 *  - O diálogo é do sistema. Chamar `requestReview()` é um pedido, não uma
 *    garantia: a Apple decide se o mostra, e limita a 3 por ano por pessoa.
 *  - Não há forma de saber se foi mostrado nem o que o cliente respondeu.
 *
 * Por isso o travão é nosso: um pedido por ano e nunca dois no mesmo serviço,
 * para não gastar as três oportunidades do ano em duas semanas.
 */
const LAST_ASK_KEY = "@store_review.last_ask";
const MIN_RATING = 4;
const MIN_DAYS_BETWEEN_ASKS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param rating estrelas que o cliente acabou de dar ao serviço
 * @returns true se o pedido chegou a ser feito ao sistema
 */
export const maybeAskForStoreReview = async (rating: number): Promise<boolean> => {
  if (rating < MIN_RATING) return false;

  try {
    // Dois testes, e ambos são precisos: `isAvailableAsync` diz se a API
    // existe nesta plataforma, `hasAction` diz se há mesmo uma loja para onde
    // enviar (falso no simulador e em Android sem Play Store). Sem eles a
    // chamada seria um no-op silencioso e o travão gastava-se à mesma.
    if (!(await StoreReview.isAvailableAsync())) return false;
    if (!(await StoreReview.hasAction())) return false;

    const last = await AsyncStorage.getItem(LAST_ASK_KEY);
    if (last) {
      const daysSince = (Date.now() - Number(last)) / DAY_MS;
      if (Number.isFinite(daysSince) && daysSince < MIN_DAYS_BETWEEN_ASKS) return false;
    }

    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_ASK_KEY, String(Date.now()));
    return true;
  } catch {
    // Um pedido de avaliação nunca pode estragar o fim de um serviço.
    return false;
  }
};
