import Constants from "expo-constants";

/**
 * Identificador de comerciante da Apple. Vem do app.config para se poder trocar
 * de ambiente sem tocar em código: o certificado de processamento que o Payshop
 * tem carregado foi emitido PARA ESTE id. Com outro id a folha ainda abre, mas o
 * token sai cifrado com uma chave que o Payshop não tem — e a falha só aparece
 * no servidor, depois do cliente já ter autenticado com Face ID.
 */
export const APPLE_PAY_MERCHANT_ID: string =
  Constants?.expoConfig?.extra?.APPLE_PAY_MERCHANT_ID ?? "merchant.com.piquetapp.customer";

/** País e moeda da operação. A Piquet só opera em Portugal. */
export const APPLE_PAY_COUNTRY = "PT";
export const APPLE_PAY_CURRENCY = "EUR";
