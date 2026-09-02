/**
 * Curadoria provisória dos destaques da Home.
 *
 * A lista a sério vive no backoffice (is_popular + popular_order) e chega pelo
 * endpoint /common/services/services-types/popular. Enquanto esse endpoint não
 * estiver em produção, esta é a seleção pedida — e é a única coisa neste
 * projeto que nomeia serviços a partir do código.
 *
 * QUANDO O BACKOFFICE MANDAR, ISTO DEIXA DE SER USADO: o endpoint tem
 * precedência, e este ficheiro pode ser apagado.
 *
 * A correspondência ignora acentos, caixa e parênteses, para não partir com uma
 * diferença de escrita ("Montar roupeiro (2 Portas)" vs "(2 portas)").
 */

export const FEATURED_SERVICE_NAMES = [
  "Desentupimento de Cano",
  "Limpeza doméstica (T2)",
  "Reparação de Estore Elétrico",
  "Reparação de Sanita",
  "Abertura de Porta de Entrada",
  "Instalação de Suporte de TV",
  "Montar Mesa de Apoio",
  "Instalação de Forno",
  "Instalação de Prateleira",
  "Limpeza de Sofá",
  "Limpeza de Tapete",
  "Montar roupeiro (2 Portas)",
] as const;

/** Minúsculas, sem acentos, sem parênteses e com espaços normalizados. */
export const normalizeServiceName = (name?: string | null): string =>
  (name ?? "")
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Named = { name?: string | null };

/**
 * Ordena os serviços pela curadoria e descarta o resto.
 *
 * Um nome que não exista no catálogo é simplesmente ignorado — a secção mostra
 * os que existirem, em vez de deixar um buraco.
 */
export const pickFeatured = <T extends Named>(services: T[]): T[] => {
  const wanted = FEATURED_SERVICE_NAMES.map(normalizeServiceName);

  return services
    .map((service) => ({ service, rank: wanted.indexOf(normalizeServiceName(service.name)) }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .map(({ service }) => service);
};
