import { categoryMeta, categoryTitle } from "@/components/app/Services/categoryMeta";

describe("categoryMeta", () => {
  it("reconhece as categorias de produção, com ou sem acentos", () => {
    expect(categoryMeta("ELETRICIDADE").key).toBe("eletricidade");
    expect(categoryMeta("Canalização").key).toBe("canalizacao");
    expect(categoryMeta("ELETRODOMÉSTICOS").key).toBe("eletrodomesticos");
    expect(categoryMeta("Fechaduras e Portas").key).toBe("fechaduras");
    expect(categoryMeta("Limpezas").key).toBe("limpezas");
    expect(categoryMeta("Montagem de Móveis").key).toBe("moveis");
    expect(categoryMeta("Pedidos Personalizados").key).toBe("personalizados");
    expect(categoryMeta("Decoração").key).toBe("decoracao");
  });

  it("eletrodomésticos ganha a eletricidade — a regra mais específica vem primeiro", () => {
    expect(categoryMeta("Eletrodomésticos").icon).toBe("cpu");
  });

  it("uma categoria nova do backoffice continua a aparecer, no genérico", () => {
    const meta = categoryMeta("Mudanças");
    expect(meta.key).toBe("generic");
    expect(meta.icon).toBe("tool");
  });

  it("sem nome não rebenta", () => {
    expect(categoryMeta(null).key).toBe("generic");
    expect(categoryMeta(undefined).icon).toBe("tool");
  });
});

describe("categoryTitle", () => {
  it("tira as maiúsculas do backoffice", () => {
    expect(categoryTitle("ELETRODOMÉSTICOS")).toBe("Eletrodomésticos");
    expect(categoryTitle("FECHADURAS E PORTAS")).toBe("Fechaduras e Portas");
  });

  it("deixa em paz um nome já escrito à mão", () => {
    expect(categoryTitle("Montagem de Móveis")).toBe("Montagem de Móveis");
  });

  it("aguenta vazios", () => {
    expect(categoryTitle(null)).toBe("");
    expect(categoryTitle("  ")).toBe("");
  });
});
