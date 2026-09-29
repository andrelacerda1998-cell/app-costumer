import { ETIQUETA_DO_SERVIDOR, etiquetaDoServidor, SUPPORTED_LANGUAGES } from "../index";

/**
 * O idioma que a app pede ao servidor.
 *
 * Isto existe por causa de um bug que ninguém viu durante toda a fase das
 * traduções. O `Accept-Language` de cada pedido era:
 *
 *     i18n.language === 'pt_PT' ? 'pt-PT' : 'en-US'
 *
 * Um ternário que só conhecia dois idiomas, numa app que passou a oferecer
 * quatro. Francês e espanhol caíam ambos em `en-US`: a interface saía
 * traduzida e TUDO o que vinha do servidor — o catálogo, as notificações, os
 * erros — saía em inglês. "De quoi as-tu besoin ?" por cima de "PLUMBING".
 *
 * Não dava erro nenhum. Só se viu a correr, no simulador.
 *
 * Estes testes falham se alguém voltar a acrescentar um idioma à app e se
 * esquecer do mapa — que é exactamente o que aconteceu da primeira vez.
 */
describe("etiquetaDoServidor", () => {
  it("tem uma etiqueta para TODOS os idiomas que a app oferece", () => {
    // O que importa não é o tamanho do mapa; é não haver nenhum idioma
    // oferecido ao cliente sem forma de o pedir ao servidor.
    const semEtiqueta = SUPPORTED_LANGUAGES.filter(
      (l) => !ETIQUETA_DO_SERVIDOR[l],
    );

    expect(semEtiqueta).toEqual([]);
  });

  it("manda cada idioma para a sua etiqueta, e nunca dois para a mesma", () => {
    expect(etiquetaDoServidor("pt_PT")).toBe("pt-pt");
    expect(etiquetaDoServidor("en_US")).toBe("en");
    expect(etiquetaDoServidor("fr_FR")).toBe("fr");
    expect(etiquetaDoServidor("es_ES")).toBe("es");
    expect(etiquetaDoServidor("de_DE")).toBe("de");

    // O bug original: fr e es davam a mesma coisa que en.
    const etiquetas = SUPPORTED_LANGUAGES.map(etiquetaDoServidor);
    expect(new Set(etiquetas).size).toBe(SUPPORTED_LANGUAGES.length);
  });

  it("recua para portugues quando o idioma e desconhecido ou nao vem", () => {
    expect(etiquetaDoServidor(undefined)).toBe("pt-pt");
    expect(etiquetaDoServidor("")).toBe("pt-pt");
    // it_IT e o desconhecido agora: o de_DE passou a ser suportado.
    expect(etiquetaDoServidor("it_IT")).toBe("pt-pt");
  });

  it("usa as etiquetas curtas que o servidor aceita", () => {
    // O Locale::normalize() do servidor so devolve tags que estejam em
    // config('app.locales'): en, pt-pt, fr, es. Uma etiqueta fora desta
    // lista cai em pt-pt sem avisar.
    const aceites = ["en", "pt-pt", "fr", "es", "de"];

    SUPPORTED_LANGUAGES.forEach((l) => {
      expect(aceites).toContain(etiquetaDoServidor(l));
    });
  });
});
