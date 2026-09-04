import { priceBelowName } from "../serviceRowLayout";

// iPhone 15/17 Pro Max em pontos.
const WIDTH = 440;

describe("priceBelowName", () => {
  it("nome curto fica com o preço ao lado", () => {
    expect(priceBelowName("Remover Sanita", WIDTH)).toBe(false);
    expect(priceBelowName("Reparação de Bidé", WIDTH)).toBe(false);
    expect(priceBelowName("Instalação de Chuveiro", WIDTH)).toBe(false);
  });

  it("nome que parte em duas linhas manda o preço para baixo", () => {
    expect(priceBelowName("Instalação de Torneira de Casa de Banho", WIDTH)).toBe(true);
    expect(priceBelowName("Limpeza de Frigorifico (Interior e Exterior)", WIDTH)).toBe(true);
  });

  it("num ecrã estreito o limite baixa", () => {
    // iPhone SE: o mesmo nome que cabia no Pro Max já não cabe.
    expect(priceBelowName("Instalação de Cabine de Duche", 320)).toBe(true);
    expect(priceBelowName("Instalação de Cabine de Duche", WIDTH)).toBe(false);
  });

  it("aguenta entradas inúteis sem decidir por elas", () => {
    expect(priceBelowName("", WIDTH)).toBe(false);
    expect(priceBelowName("Qualquer nome", 0)).toBe(false);
    expect(priceBelowName("Qualquer nome", NaN)).toBe(false);
  });
});
