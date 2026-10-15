import Constants from "expo-constants";

/**
 * Ambiente do Google Pay.
 *
 * `TEST` devolve um token FALSO, que o Payshop recusa — e é isso que se quer
 * em desenvolvimento: o ecrã abre, o cliente escolhe cartão, e nada é cobrado.
 * Ao contrário da Apple, o Google tem um ambiente de teste a sério: não é
 * preciso um dispositivo com cartão real para ver a folha.
 *
 * `PRODUCTION` exige que a conta esteja aprovada no Google Pay Business Console.
 * Enquanto não estiver, um `PRODUCTION` aqui faz o ecrã abrir vazio, sem erro.
 */
export const GOOGLE_PAY_ENVIRONMENT: "TEST" | "PRODUCTION" =
  Constants?.expoConfig?.extra?.GOOGLE_PAY_ENVIRONMENT === "PRODUCTION" ? "PRODUCTION" : "TEST";

/**
 * O gateway que processa o token, tal como o Google o conhece.
 *
 * O Payshop é a marca comercial do PaynoPain/Paylands, e é o identificador do
 * PROCESSADOR que entra aqui, não o da Piquet. Vem do app.config para não ficar
 * cravado: se a Piquet trocar de processador, troca-se a configuração.
 *
 * @see https://developers.google.com/pay/api#participating-processors
 */
export const GOOGLE_PAY_GATEWAY: string =
  Constants?.expoConfig?.extra?.GOOGLE_PAY_GATEWAY ?? "paynopain";

/**
 * O id da Piquet DENTRO do gateway.
 *
 * ESTE VALOR AINDA NÃO FOI DADO PELO PAYSHOP. Sem ele o token sai emitido para
 * um comerciante que o Payshop não reconhece, e a falha só aparece no servidor
 * -- depois de o cliente já ter autenticado. É a mesma armadilha do certificado
 * de processamento no Apple Pay.
 *
 * O valor por omissão é deliberadamente inválido: vale mais falhar depressa em
 * desenvolvimento do que deixar passar uma string plausível.
 */
export const GOOGLE_PAY_MERCHANT_ID: string =
  Constants?.expoConfig?.extra?.GOOGLE_PAY_MERCHANT_ID ?? "POR-DEFINIR";

/**
 * O id de comerciante da GOOGLE (Google Pay Business Console), formato
 * `BCR2DN...`. É DIFERENTE do `GOOGLE_PAY_MERCHANT_ID` acima (que é o nosso id
 * no Paylands/gateway). A Google exige-o em `merchantInfo.merchantId` no
 * ambiente PRODUCTION — sem ele, o `isReadyToPay` falha e o botão nunca aparece.
 *
 * A lib `@rnw-community/react-native-payments` não expõe este campo (só o nome),
 * por isso vai pela `data` e um patch da lib injeta-o no `merchantInfo` (ver
 * patches/). Vazio em TEST/dev, onde não é preciso.
 */
export const GOOGLE_PAY_GOOGLE_MERCHANT_ID: string =
  Constants?.expoConfig?.extra?.GOOGLE_PAY_GOOGLE_MERCHANT_ID ?? "";

/**
 * O Google Pay está pronto para cobrar a sério nesta build?
 *
 * Numa build de produção, só com o ambiente PRODUCTION e o id da Piquet no
 * gateway preenchido. Sem isso o botão aparecia a quem tem um cartão na
 * carteira Google, e o pagamento falhava sempre: o token de TEST é recusado
 * pelo Payshop, e um id por definir é um comerciante que ele não conhece.
 *
 * Fora de produção (desenvolvimento e preview) o TEST continua a valer: é assim
 * que se vê o ecrã num emulador sem cobrar nada.
 */
export function googlePayConfigurado(
  appEnv: string | undefined,
  ambiente: "TEST" | "PRODUCTION",
  merchantId: string,
): boolean {
  if (appEnv !== "production") return true;
  const idValido = merchantId.trim() !== "" && merchantId !== "POR-DEFINIR";
  return ambiente === "PRODUCTION" && idValido;
}

export const GOOGLE_PAY_CONFIGURADO: boolean = googlePayConfigurado(
  Constants?.expoConfig?.extra?.APP_ENV,
  GOOGLE_PAY_ENVIRONMENT,
  GOOGLE_PAY_MERCHANT_ID,
);

/** País e moeda da operação. A Piquet só opera em Portugal. */
export const GOOGLE_PAY_COUNTRY = "PT";
export const GOOGLE_PAY_CURRENCY = "EUR";
