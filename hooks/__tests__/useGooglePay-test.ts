import { emEuros, foiCancelamento } from "../useGooglePay";
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
