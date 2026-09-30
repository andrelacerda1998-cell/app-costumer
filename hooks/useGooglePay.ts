import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  AndroidAllowedAuthMethodsEnum,
  EnvironmentEnum,
  PaymentComplete,
  PaymentMethodNameEnum,
  PaymentRequest,
  SupportedNetworkEnum,
  type AndroidPaymentMethodDataInterface,
} from "@rnw-community/react-native-payments";
import {
  GOOGLE_PAY_COUNTRY,
  GOOGLE_PAY_CURRENCY,
  GOOGLE_PAY_ENVIRONMENT,
  GOOGLE_PAY_GATEWAY,
  GOOGLE_PAY_MERCHANT_ID,
} from "@/constants/GooglePay";

/**
 * O token do Google, tal e qual sai do aparelho. É cifrado para o gateway —
 * não se lê, não se reformata, não se guarda. Vai inteiro no `wallet_payload` e
 * só o Payshop o abre. O tipo é opaco de propósito: nomear campos era um
 * convite a mexer-lhes.
 */
export type GooglePayToken = Record<string, unknown>;

/** As mesmas redes do Apple Pay: é a conta Payshop que manda, não a carteira. */
const REDES = [
  SupportedNetworkEnum.Visa,
  SupportedNetworkEnum.Mastercard,
  SupportedNetworkEnum.Amex,
];

/**
 * CRYPTOGRAM_3DS e PAN_ONLY, os dois.
 *
 * PAN_ONLY são os cartões que o cliente guardou na conta Google mas que não
 * estão tokenizados no aparelho. Deixá-lo de fora é a forma mais fácil de o
 * ecrã abrir vazio para metade das pessoas -- têm cartão, mas não do tipo que
 * pedimos. O 3DS cobre o resto.
 */
const AUTENTICACAO = [
  AndroidAllowedAuthMethodsEnum.CRYPTOGRAM_3DS,
  AndroidAllowedAuthMethodsEnum.PAN_ONLY,
];

const dadosDoMetodo = (): AndroidPaymentMethodDataInterface[] => [
  {
    supportedMethods: PaymentMethodNameEnum.AndroidPay,
    data: {
      environment:
        GOOGLE_PAY_ENVIRONMENT === "PRODUCTION"
          ? EnvironmentEnum.PRODUCTION
          : EnvironmentEnum.TEST,
      countryCode: GOOGLE_PAY_COUNTRY,
      currencyCode: GOOGLE_PAY_CURRENCY,
      supportedNetworks: REDES,
      allowedAuthMethods: AUTENTICACAO,
      // Tokenização PELO GATEWAY e não `directConfig`: o token sai cifrado para
      // o Payshop, que o abre. A alternativa (DIRECT) exigia a Piquet ter e
      // rodar a sua própria chave de desencriptação -- guardar dados de cartão
      // que nunca precisamos de ver.
      // A biblioteca infere PAYMENT_GATEWAY a partir da presenca do
      // `gatewayConfig` -- a interface publica nao aceita um `type` explicito,
      // e os dois caminhos (gateway e direct) excluem-se mutuamente no tipo.
      gatewayConfig: {
        gateway: GOOGLE_PAY_GATEWAY,
        gatewayMerchantId: GOOGLE_PAY_MERCHANT_ID,
      },
    },
  },
];

/**
 * Cêntimos → a string decimal que o Google espera ("12.34").
 *
 * Exportado para ser testável: enganar-se aqui num factor de 100 é cobrar
 * 5 333 € em vez de 53,33 €, e o ecrã do Google mostraria o número errado ao
 * cliente sem nada na app dar por isso.
 */
export const emEuros = (centimos: number) => (Math.round(centimos) / 100).toFixed(2);

export interface PedidoGooglePay {
  /** O token cru, para seguir no `wallet_payload`. */
  token: GooglePayToken;
  /**
   * Fecha o ecrã. Fica a girar entre a autenticação e esta chamada — é de
   * propósito: só se diz "pago" ao cliente depois de o servidor o confirmar.
   */
  concluir: (sucesso: boolean) => Promise<void>;
}

/**
 * Google Pay no checkout.
 *
 * `disponivel` é a única coisa que decide se o botão existe: não basta ser
 * Android, é preciso ter os serviços Google Play e um cartão elegível. Num iOS,
 * num Android sem Play Services, ou sem cartão, fica false e o botão não chega
 * a ser desenhado.
 *
 * AO CONTRÁRIO DO APPLE PAY, ISTO É TESTÁVEL SEM DISPOSITIVO DEDICADO: com
 * `GOOGLE_PAY_ENVIRONMENT=TEST` o emulador com Play Services abre o ecrã a
 * sério e devolve um token de teste. O Apple Pay obrigava a uma build assinada
 * num iPhone com cartão no Wallet, porque o Xcode remove o entitlement das
 * builds de simulador -- e mesmo assim o `canMakePayment()` mentia a dizer true.
 */
export const useGooglePay = () => {
  const [disponivel, setDisponivel] = useState(false);
  const [aVerificar, setAVerificar] = useState(Platform.OS === "android");
  // Guarda a razão de não estar disponível. Não se mostra ao cliente -- serve
  // para o log e para o ecrã de diagnóstico não ficar a adivinhar.
  const motivoRef = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;

    if (Platform.OS !== "android") {
      motivoRef.current = "plataforma não é Android";
      setAVerificar(false);
      return;
    }

    (async () => {
      try {
        // O `canMakePayment` da W3C exige um pedido construído. Constrói-se um
        // de 0,00 € só para a pergunta: nunca se mostra.
        const sonda = new PaymentRequest(dadosDoMetodo(), {
          total: { label: "Piquet", amount: { currency: GOOGLE_PAY_CURRENCY, value: "0.00" } },
        });
        const pode = await sonda.canMakePayment();
        if (!vivo) return;
        motivoRef.current = pode ? null : "sem cartão elegível na conta Google";
        setDisponivel(pode);
      } catch (erro) {
        // Módulo nativo ausente (Expo Go), Play Services em falta, ou conta por
        // aprovar no Google Pay Business Console. Nenhuma destas é um erro a
        // mostrar ao cliente: é simplesmente não haver Google Pay.
        if (!vivo) return;
        motivoRef.current = erro instanceof Error ? erro.message : "erro ao verificar";
        setDisponivel(false);
      } finally {
        if (vivo) setAVerificar(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  /**
   * Abre o ecrã. Devolve null se o cliente o fechar -- cancelar não é um erro,
   * e não deve pintar o checkout de vermelho. Qualquer outra falha sobe.
   */
  const pedir = useCallback(
    async (valorEmCentimos: number, etiqueta: string): Promise<PedidoGooglePay | null> => {
      const pedido = new PaymentRequest(dadosDoMetodo(), {
        total: {
          label: etiqueta,
          amount: { currency: GOOGLE_PAY_CURRENCY, value: emEuros(valorEmCentimos) },
        },
      });

      let resposta;
      try {
        resposta = await pedido.show();
      } catch (erro) {
        if (foiCancelamento(erro)) return null;
        throw erro;
      }

      return {
        token: resposta.details.androidPayToken as unknown as GooglePayToken,
        concluir: (sucesso: boolean) =>
          resposta.complete(sucesso ? PaymentComplete.SUCCESS : PaymentComplete.FAIL),
      };
    },
    []
  );

  return { disponivel, aVerificar, pedir, motivo: motivoRef.current };
};

/**
 * A biblioteca não exporta o utilitário dela, e os códigos são estes.
 *
 * Exportado para ser testável: se um cancelamento deixar de ser reconhecido,
 * fechar o ecrã passa a pintar o checkout de vermelho -- o cliente desistiu do
 * pagamento e a app diz-lhe que correu mal.
 */
export const foiCancelamento = (erro: unknown) => {
  const codigo = (erro as { code?: string } | null)?.code ?? "";
  return codigo === "E_CANCELLED_BY_USER" || codigo === "payment_error";
};
