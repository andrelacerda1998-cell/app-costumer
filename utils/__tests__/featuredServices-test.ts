import { pickFeatured, normalizeServiceName, FEATURED_SERVICE_NAMES } from "../featuredServices";

describe("normalizeServiceName", () => {
  it("ignora acentos, caixa e parênteses", () => {
    expect(normalizeServiceName("Montar roupeiro (2 Portas)")).toBe(
      normalizeServiceName("MONTAR ROUPEIRO 2 PORTAS"),
    );
    expect(normalizeServiceName("Limpeza doméstica (T2)")).toBe("limpeza domestica t2");
  });

  it("não rebenta sem nome", () => {
    expect(normalizeServiceName(null)).toBe("");
    expect(normalizeServiceName(undefined)).toBe("");
  });
});

describe("pickFeatured", () => {
  const catalog = [
    { id: 1, name: "Rotura de Cano" },
    { id: 2, name: "Limpeza de Tapete" },
    { id: 3, name: "Desentupimento de Cano" },
    { id: 4, name: "Curto-circuito" },
    { id: 5, name: "MONTAR ROUPEIRO 2 PORTAS" },
  ];

  it("devolve só os escolhidos, pela ordem da curadoria", () => {
    const picked = pickFeatured(catalog).map((s) => s.id);
    // Desentupimento é o 1.º da lista, Tapete o 11.º, Roupeiro o 12.º
    expect(picked).toEqual([3, 2, 5]);
  });

  it("descarta o que não está na curadoria", () => {
    const names = pickFeatured(catalog).map((s) => s.name);
    expect(names).not.toContain("Rotura de Cano");
    expect(names).not.toContain("Curto-circuito");
  });

  it("ignora nomes da curadoria que não existam no catálogo", () => {
    expect(pickFeatured([{ id: 1, name: "Serviço que não existe" }])).toEqual([]);
    expect(pickFeatured([])).toEqual([]);
  });

  it("a curadoria tem doze serviços", () => {
    expect(FEATURED_SERVICE_NAMES).toHaveLength(12);
  });
});
