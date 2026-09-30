import { emEuros, envelopeDoGooglePay, foiCancelamento, TokenDoGooglePayVazio } from "../useGooglePay";
import {
  GOOGLE_PAY_COUNTRY,
  GOOGLE_PAY_CURRENCY,
  GOOGLE_PAY_ENVIRONMENT,
  GOOGLE_PAY_MERCHANT_ID,
} from "@/constants/GooglePay";

describe("emEuros", () => {
  it("converte cêntimos no decimal que o Google espera", () => {
    expect(emEuros(5333)).toBe("53.33");
    expect(emEuros(100)).toBe("1.00");
    expect(emEuros(5)).toBe("0.05");
  });

  it("mantém sempre duas casas — o Google recusa '1.5'", () => {
    expect(emEuros(150)).toBe("1.50");
    expect(emEuros(2000)).toBe("20.00");
  });

  it("arredonda cêntimos fracionados em vez de os truncar", () => {
    // Um desconto pode deixar meio cêntimo no valor. Truncar fazia o ecrã
    // mostrar um valor e a ordem do Payshop levar outro.
    expect(emEuros(5333.4)).toBe("53.33");
    expect(emEuros(5333.6)).toBe("53.34");
  });

  it("zero é zero e não vazio", () => {
    expect(emEuros(0)).toBe("0.00");
  });
});

describe("foiCancelamento", () => {
  it("reconhece o cliente a fechar o ecrã", () => {
    expect(foiCancelamento(Object.assign(new Error("cancel"), { code: "E_CANCELLED_BY_USER" }))).toBe(true);
    expect(foiCancelamento(Object.assign(new Error("cancel"), { code: "payment_error" }))).toBe(true);
  });

  it("não confunde uma falha real com um cancelamento", () => {
    // Se isto se enganar, uma falha de rede passa por "o cliente desistiu" e o
    // checkout fica calado em vez de deixar tentar outra vez.
    expect(foiCancelamento(Object.assign(new Error("boom"), { code: "E_NETWORK" }))).toBe(false);
    expect(foiCancelamento(new Error("sem código"))).toBe(false);
    expect(foiCancelamento(null)).toBe(false);
    expect(foiCancelamento(undefined)).toBe(false);
  });
});

describe("configuração", () => {
  it("opera em Portugal e em euros", () => {
    expect(GOOGLE_PAY_COUNTRY).toBe("PT");
    expect(GOOGLE_PAY_CURRENCY).toBe("EUR");
  });

  it("arranca em TEST e não em PRODUCTION", () => {
    // O omisso tem de ser TEST. Um PRODUCTION por omissão, numa conta que
    // ainda não está aprovada no Google Pay Business Console, faz o ecrã abrir
    // vazio sem erro nenhum -- e ninguém percebe porquê.
    expect(GOOGLE_PAY_ENVIRONMENT).toBe("TEST");
  });

  it("o merchant id por omissão é INVÁLIDO de propósito", () => {
    // O Payshop ainda não o deu. Uma string plausível aqui passava despercebida
    // e só falhava no servidor, depois de o cliente ter autenticado. Vale mais
    // falhar depressa e alto.
    expect(GOOGLE_PAY_MERCHANT_ID).toBe("POR-DEFINIR");
  });
});

describe("envelopeDoGooglePay", () => {
  // Um `details` como a biblioteca o devolve: o token JÁ desfeito, com o
  // `signedMessage` em objeto, e o `rawToken` com a string original intacta.
  const RAW = '{"signature":"abc","protocolVersion":"ECv2","signedMessage":"{\\"a\\":1}"}';
  const details = {
    androidPayToken: {
      rawToken: RAW,
      signature: "abc",
      protocolVersion: "ECv2",
      signedMessage: { a: 1 },
      cardInfo: { cardNetwork: "VISA", cardDetails: "4000" },
    },
    billingAddress: { countryCode: "PT", postalCode: "4000-001" },
    payerName: "Ana",
  };

  it("embrulha o token no PaymentData que o Payshop espera", () => {
    const e = envelopeDoGooglePay(details) as any;
    expect(e.apiVersion).toBe(2);
    expect(e.apiVersionMinor).toBe(0);
    expect(e.paymentMethodData.type).toBe("CARD");
    expect(e.paymentMethodData.tokenizationData.type).toBe("PAYMENT_GATEWAY");
  });

  /**
   * O teste que interessa. A assinatura do Google é calculada sobre a string
   * exacta do token; mandar o objeto que a biblioteca reconstruiu dá bytes
   * diferentes e a verificação falha do lado deles.
   */
  it("manda a string ORIGINAL do token, não a versão reconstruída", () => {
    const e = envelopeDoGooglePay(details) as any;
    expect(e.paymentMethodData.tokenizationData.token).toBe(RAW);
    expect(typeof e.paymentMethodData.tokenizationData.token).toBe("string");
  });

  it("não deixa o token como objeto em lado nenhum do envelope", () => {
    const e = envelopeDoGooglePay(details) as any;
    expect(e.paymentMethodData.tokenizationData.token).not.toHaveProperty("signedMessage");
  });

  it("leva o cartão e a morada, que são contexto e não vão assinados", () => {
    const e = envelopeDoGooglePay(details) as any;
    expect(e.paymentMethodData.info.cardNetwork).toBe("VISA");
    expect(e.paymentMethodData.info.cardDetails).toBe("4000");
    expect(e.paymentMethodData.info.billingAddress.countryCode).toBe("PT");
    expect(e.paymentMethodData.description).toBe("VISA •••• 4000");
  });

  it("aguenta um pedido sem morada de faturação", () => {
    const e = envelopeDoGooglePay({ androidPayToken: { rawToken: RAW } }) as any;
    expect(e.paymentMethodData.info.billingAddress).toBeUndefined();
    expect(e.paymentMethodData.tokenizationData.token).toBe(RAW);
  });
});

describe("token vazio do ambiente de teste", () => {
  /**
   * O Google, em TEST, devolve a string `examplePaymentMethodToken` e a
   * biblioteca troca o token inteiro por um vazio. Sem esta guarda mandávamos
   * um envelope com o token em branco e o Payshop responderia "payload
   * incorreto" -- a mesma frase de sempre, pela razão errada.
   */
  it("rebenta com nome próprio em vez de mandar um envelope vazio", () => {
    expect(() =>
      envelopeDoGooglePay({ androidPayToken: { rawToken: "" } })
    ).toThrow(TokenDoGooglePayVazio);
  });

  it("a mensagem diz o que fazer, não só o que correu mal", () => {
    try {
      envelopeDoGooglePay({ androidPayToken: { rawToken: "" } });
      throw new Error("devia ter rebentado");
    } catch (erro) {
      expect((erro as Error).message).toContain("PRODUCTION");
    }
  });
});
