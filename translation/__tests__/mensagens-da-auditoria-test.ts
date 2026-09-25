import pt from "@/translation/resources/pt_PT";
import en from "@/translation/resources/en_US";

/**
 * Textos que a auditoria de 25/09 mandou mudar, presos aqui.
 *
 * Nenhum deles dava erro: davam a informação errada, que é pior, porque parece
 * certa. Um teste é o único sítio onde isso fica registado.
 */
describe("mensagens corrigidas na auditoria", () => {
  const caminho = (raiz: any, chave: string) =>
    chave.split(".").reduce((acc, parte) => acc?.[parte], raiz);

  describe("a lista vazia não culpa a zona", () => {
    // Dizia "não há técnicos ... na tua zona", mas a causa podia ser outra: um
    // serviço retirado do catálogo enquanto estava no cesto dá exatamente o
    // mesmo ecrã. Afirmar a zona é afirmar o que não se sabe.
    it.each([
      ["pt_PT", pt],
      ["en_US", en],
    ])("%s não afirma a zona", (_nome, recurso) => {
      const texto = caminho(recurso, "cart.no_vendors_hint") as string;

      expect(texto).toBeTruthy();
      expect(texto).not.toMatch(/na tua zona|in your area/i);
    });

    it.each([
      ["pt_PT", pt],
      ["en_US", en],
    ])("%s continua a dar as duas saídas", (_nome, recurso) => {
      const texto = (caminho(recurso, "cart.no_vendors_hint") as string).toLowerCase();

      expect(texto).toMatch(/de novo|again/);
      expect(texto).toMatch(/agendar|schedule/);
    });
  });

  describe("o número da porta é pedido", () => {
    // A morada era gravada sem número: a geolocalização não o traz e o campo
    // não era obrigatório. Um técnico despachado para uma rua sem porta não
    // encontra o local.
    it.each([
      ["pt_PT", pt],
      ["en_US", en],
    ])("%s tem a mensagem de obrigatório", (_nome, recurso) => {
      expect(caminho(recurso, "general.street_number_required")).toBeTruthy();
    });

    it("a mensagem em pt diz o que fazer quando não há número", () => {
      const texto = caminho(pt, "general.street_number_required") as string;

      // Há moradas sem número — vivendas com nome, lugares. A mensagem tem de
      // dar saída, senão bloqueia quem não tem culpa.
      expect(texto.toLowerCase()).toContain("s/n");
    });
  });

  describe("os motivos de recusa falam ao cliente", () => {
    // O backend passou a mandar a razão concreta em vez de "O cliente não pode
    // solicitar um serviço.". Estas são as frases equivalentes do lado da app,
    // para quem for buscar texto cá.
    it("a app não tem texto que fale do cliente na terceira pessoa neste caso", () => {
      const generica = caminho(pt, "errors.occurred_an_error") as string;

      expect(generica).toBeTruthy();
      expect(generica).not.toMatch(/^O cliente/);
    });
  });
});
