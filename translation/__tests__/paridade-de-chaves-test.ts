import en_US from "../resources/en_US";
import es_ES from "../resources/es_ES";
import fr_FR from "../resources/fr_FR";
import pt_PT from "../resources/pt_PT";

/**
 * Os quatro idiomas têm de ter EXACTAMENTE as mesmas chaves.
 *
 * Uma chave a menos não rebenta nada: o i18next recua para o português e o
 * cliente francês vê uma frase em português no meio do ecrã. Não há erro, não
 * há log, e ninguém dá por isso até alguém reclamar — que é a pior maneira de
 * descobrir uma coisa destas.
 *
 * É por isso que este teste existe: quem acrescentar uma chave ao pt_PT e se
 * esquecer dos outros três fica a saber no momento, e não seis meses depois.
 */

const achatar = (no: unknown, caminho = ""): string[] => {
  if (no && typeof no === "object" && !Array.isArray(no)) {
    return Object.entries(no as Record<string, unknown>).flatMap(([k, v]) =>
      achatar(v, caminho ? `${caminho}.${k}` : k),
    );
  }
  return typeof no === "string" ? [caminho] : [];
};

const IDIOMAS = { pt_PT, en_US, fr_FR, es_ES } as const;
const referencia = achatar(pt_PT).sort();

describe("paridade de chaves entre idiomas", () => {
  it("o português tem chaves a sério", () => {
    expect(referencia.length).toBeGreaterThan(1000);
  });

  Object.entries(IDIOMAS).forEach(([nome, recurso]) => {
    it(`${nome} tem as mesmas chaves do português`, () => {
      const chaves = achatar(recurso).sort();
      const faltam = referencia.filter((k) => !chaves.includes(k));
      const aMais = chaves.filter((k) => !referencia.includes(k));

      expect({ faltam, aMais }).toEqual({ faltam: [], aMais: [] });
    });
  });

  it("os marcadores {{...}} sobrevivem à tradução", () => {
    // Um marcador traduzido deixa de ser substituído: o cliente vê
    // "{{count}} serviços" à letra, com as chavetas e tudo.
    const marcadores = (s: string) => (s.match(/\{\{[^}]+\}\}/g) ?? []).sort();
    const valor = (o: unknown, c: string): string =>
      c.split(".").reduce<any>((a, k) => a?.[k], o) ?? "";

    const partidos: string[] = [];
    referencia.forEach((chave) => {
      const esperado = marcadores(valor(pt_PT, chave));
      if (esperado.length === 0) return;
      Object.entries(IDIOMAS).forEach(([nome, recurso]) => {
        const obtido = marcadores(valor(recurso, chave));
        if (JSON.stringify(obtido) !== JSON.stringify(esperado)) {
          partidos.push(`${nome} · ${chave}: esperava ${esperado.join(",")} e tem ${obtido.join(",")}`);
        }
      });
    });

    expect(partidos).toEqual([]);
  });
});
