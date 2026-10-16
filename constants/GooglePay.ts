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
 * O id da Piquet DENTRO do gateway: o `gatewayMerchantId` do Google Pay.
 *
 * NÃO é o id de comerciante da Google (`BCR2DN…`, o da Google Pay & Wallet
 * Console). Numa app Android esse não entra no pedido: o `MerchantInfo` do
 * Android só tem `merchantName`, e a aprovação da Google é feita à app.
 * A variável chamava-se `EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID` e o nome levava a
 * meter lá o id da Google; desde 16/10/2026 é
 * `EXPO_PUBLIC_GOOGLE_PAY_GATEWAY_MERCHANT_ID`.
 *
 * ESTE VALOR AINDA NÃO FOI CONFIRMADO PELO PAYSHOP. Sem ele o token sai emitido para
 * um comerciante que o Payshop não reconhece, e a falha só aparece no servidor
 * -- depois de o cliente já ter autenticado. É a mesma armadilha do certificado
 * de processamento no Apple Pay.
 *
 * O valor por omissão é deliberadamente inválido: vale mais falhar depressa em
 * desenvolvimento do que deixar passar uma string plausível.
 */
export const GOOGLE_PAY_GATEWAY_MERCHANT_ID: string =
  Constants?.expoConfig?.extra?.GOOGLE_PAY_GATEWAY_MERCHANT_ID ?? "POR-DEFINIR";

/**
 * Um id de comerciante da Google (`BCR2DN` + 10 caracteres).
 *
 * Se um destes chegar ao `gatewayMerchantId`, o token sai para um comerciante
 * que o Payshop não conhece, e a falha só se vê depois de o cliente pagar.
 */
const ID_DA_GOOGLE = /^BCR2DN[A-Z0-9]{10}$/;

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
  gatewayMerchantId: string,
): boolean {
  if (appEnv !== "production") return true;
  const id = gatewayMerchantId.trim();
  const idValido = id !== "" && id !== "POR-DEFINIR" && !ID_DA_GOOGLE.test(id);
  return ambiente === "PRODUCTION" && idValido;
}

export const GOOGLE_PAY_CONFIGURADO: boolean = googlePayConfigurado(
  Constants?.expoConfig?.extra?.APP_ENV,
  GOOGLE_PAY_ENVIRONMENT,
  GOOGLE_PAY_GATEWAY_MERCHANT_ID,
);

/** País e moeda da operação. A Piquet só opera em Portugal. */
export const GOOGLE_PAY_COUNTRY = "PT";
export const GOOGLE_PAY_CURRENCY = "EUR";
