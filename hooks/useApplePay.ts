import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  IosPKMerchantCapability,
  PaymentComplete,
  PaymentMethodNameEnum,
  PaymentRequest,
  SupportedNetworkEnum,
  type IosPaymentMethodDataInterface,
} from "@rnw-community/react-native-payments";
import { APPLE_PAY_COUNTRY, APPLE_PAY_CURRENCY, APPLE_PAY_MERCHANT_ID } from "@/constants/ApplePay";

/**
 * O token da Apple, tal e qual sai do aparelho. É cifrado com a chave do
 * certificado de processamento do Payshop — não se lê, não se reformata, não se
 * guarda. Vai inteiro no corpo do checkout e só o Payshop o abre. Por isso o
 * tipo aqui é deliberadamente opaco: qualquer campo que nomeássemos era um
 * convite a mexer-lhe.
 */
export type ApplePayToken = Record<string, unknown>;

/** Redes que a conta Payshop aceita. Pedir uma rede a mais não estraga a folha:
 *  a Apple esconde os cartões que não constam desta lista. */
const REDES = [
  SupportedNetworkEnum.Visa,
  SupportedNetworkEnum.Mastercard,
  SupportedNetworkEnum.Amex,
];

const dadosDoMetodo = (): IosPaymentMethodDataInterface[] => [
  {
    supportedMethods: PaymentMethodNameEnum.ApplePay,
    data: {
      countryCode: APPLE_PAY_COUNTRY,
      currencyCode: APPLE_PAY_CURRENCY,
      merchantIdentifier: APPLE_PAY_MERCHANT_ID,
      supportedNetworks: REDES,
      // A Apple exige, no mínimo, a capacidade 3DS. Sem ela a folha não abre.
      merchantCapabilities: [IosPKMerchantCapability.PKMerchantCapability3DS],
    },
  },
];

/**
 * Cêntimos → a string decimal que a Apple espera ("12.34").
 *
 * Exportado para ser testável: enganar-se aqui num factor de 100 é cobrar
 * 5 333 € em vez de 53,33 €, e a folha da Apple mostraria o número errado ao
 * cliente sem nada na app dar por isso.
 */
export const emEuros = (centimos: number) => (Math.round(centimos) / 100).toFixed(2);

export interface PedidoApplePay {
  /** O token cru, para seguir no `wallet_payload`. */
  token: ApplePayToken;
  /**
   * Fecha a folha. A folha fica a girar entre o Face ID e esta chamada — é de
   * propósito: só se diz "pago" ao cliente depois de o servidor o confirmar.
   */
  concluir: (sucesso: boolean) => Promise<void>;
}

/**
 * Apple Pay no checkout.
 *
 * `disponivel` é a única coisa que decide se o botão existe: não basta ser um
 * iPhone, é preciso ter um cartão de rede aceite no Wallet. Num Android, num
 * iPhone sem cartão, ou numa build sem o entitlement, fica false e o botão não
 * chega a ser desenhado.
 */
export const useApplePay = () => {
  const [disponivel, setDisponivel] = useState(false);
  const [aVerificar, setAVerificar] = useState(Platform.OS === "ios");
  // Guarda a razão de não estar disponível. Não se mostra ao cliente — serve
  // para o log e para o ecrã de diagnóstico não ficar a adivinhar.
  const motivoRef = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;

    if (Platform.OS !== "ios") {
      motivoRef.current = "plataforma não é iOS";
      setAVerificar(false);
      return;
    }

    (async () => {
      try {
        // O `canMakePayment` da W3C exige um pedido construído. Constrói-se um
        // de 0,00 € só para a pergunta: nunca se mostra.
        const sonda = new PaymentRequest(dadosDoMetodo(), {
          total: { label: "Piquet", amount: { currency: APPLE_PAY_CURRENCY, value: "0.00" } },
        });
        const pode = await sonda.canMakePayment();
        if (!vivo) return;
        motivoRef.current = pode ? null : "sem cartão elegível no Wallet";
        setDisponivel(pode);
      } catch (erro) {
        // Módulo nativo ausente (Expo Go), entitlement retirado pelo Xcode, ou
        // merchant id fora do perfil de provisionamento. Nenhuma destas é um
        // erro a mostrar ao cliente: é simplesmente não haver Apple Pay.
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
   * Abre a folha. Devolve null se o cliente a fechar — cancelar não é um erro,
   * e não deve pintar o checkout de vermelho. Qualquer outra falha sobe.
   */
  const pedir = useCallback(
    async (valorEmCentimos: number, etiqueta: string): Promise<PedidoApplePay | null> => {
      const pedido = new PaymentRequest(dadosDoMetodo(), {
        total: {
          label: etiqueta,
          amount: { currency: APPLE_PAY_CURRENCY, value: emEuros(valorEmCentimos) },
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
        token: resposta.details.applePayToken as unknown as ApplePayToken,
        concluir: (sucesso: boolean) =>
          resposta.complete(sucesso ? PaymentComplete.SUCCESS : PaymentComplete.FAIL),
      };
    },
    []
  );

  return { disponivel, aVerificar, pedir, motivo: motivoRef.current };
};

/**
 * A biblioteca não exporta o utilitário dela, e os códigos são estes dois.
 *
 * Exportado para ser testável: se um cancelamento deixar de ser reconhecido,
 * fechar a folha passa a pintar o checkout de vermelho — o cliente desistiu do
 * pagamento e a app diz-lhe que correu mal.
 */
export const foiCancelamento = (erro: unknown) => {
  const codigo = (erro as { code?: string } | null)?.code ?? "";
  return codigo === "E_CANCELLED_BY_USER" || codigo === "payment_error";
};
