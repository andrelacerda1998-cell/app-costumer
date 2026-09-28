import { emEuros, foiCancelamento } from "../useApplePay";

describe("emEuros", () => {
  it("converte cêntimos no decimal que a Apple espera", () => {
    expect(emEuros(5333)).toBe("53.33");
    expect(emEuros(100)).toBe("1.00");
    expect(emEuros(5)).toBe("0.05");
  });

  it("mantém sempre duas casas — a Apple recusa '1.5'", () => {
    expect(emEuros(150)).toBe("1.50");
    expect(emEuros(2000)).toBe("20.00");
  });

  it("arredonda cêntimos fracionados em vez de os truncar", () => {
    // Um desconto pode deixar meio cêntimo no valor. Truncar fazia a folha
    // mostrar um valor e a ordem do Payshop levar outro.
    expect(emEuros(5333.4)).toBe("53.33");
    expect(emEuros(5333.6)).toBe("53.34");
  });

  it("zero é zero e não vazio", () => {
    expect(emEuros(0)).toBe("0.00");
  });
});

describe("foiCancelamento", () => {
  it("reconhece o cliente a fechar a folha", () => {
    expect(foiCancelamento(Object.assign(new Error("cancel"), { code: "E_CANCELLED_BY_USER" }))).toBe(true);
    expect(foiCancelamento(Object.assign(new Error("cancel"), { code: "payment_error" }))).toBe(true);
  });

  it("não engole falhas a sério", () => {
    // Estas TÊM de subir: se passarem por cancelamento, o checkout fica calado
    // e o cliente carrega outra vez sem perceber porquê.
    expect(foiCancelamento(Object.assign(new Error("boom"), { code: "E_UNKNOWN" }))).toBe(false);
    expect(foiCancelamento(new Error("sem código"))).toBe(false);
  });

  it("aguenta um erro que não é um Error", () => {
    expect(foiCancelamento(null)).toBe(false);
    expect(foiCancelamento(undefined)).toBe(false);
    expect(foiCancelamento("E_CANCELLED_BY_USER")).toBe(false);
  });
});
