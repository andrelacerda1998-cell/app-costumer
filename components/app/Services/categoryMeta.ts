import type { Feather } from "@expo/vector-icons";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export type CategoryMeta = {
  /** Chave estável da categoria, usada para ir buscar a descrição às traduções. */
  key: string;
  icon: FeatherName;
  /** Fundo do círculo do ícone. Tons suaves, para o cartão não competir com a marca. */
  tint: string;
  /** Cor do ícone. */
  color: string;
};

/**
 * Aspeto de cada categoria no ecrã de Serviços.
 *
 * A correspondência é por nome e não por id, porque os ids mudam entre
 * ambientes — é o mesmo critério do `serviceIcon`. Uma categoria que o
 * backoffice acrescente amanhã cai no genérico e continua a aparecer: nunca
 * fica um cartão vazio nem uma categoria escondida.
 */
const RULES: { match: RegExp; meta: CategoryMeta }[] = [
  { match: /elétric|eletric|electric/i, meta: { key: "eletricidade", icon: "zap", tint: "rgba(250,187,91,0.18)", color: "#B26A12" } },
  { match: /eletrodom|electrodom|eletro-?dom/i, meta: { key: "eletrodomesticos", icon: "cpu", tint: "rgba(45,161,138,0.14)", color: "#1F7A68" } },
  { match: /canaliza|plumb/i, meta: { key: "canalizacao", icon: "droplet", tint: "rgba(59,130,246,0.14)", color: "#2563EB" } },
  { match: /decora|pintur|paint/i, meta: { key: "decoracao", icon: "edit-3", tint: "rgba(139,92,246,0.14)", color: "#7C3AED" } },
  { match: /fechadur|porta|chave|lock/i, meta: { key: "fechaduras", icon: "lock", tint: "rgba(249,115,22,0.14)", color: "#C2410C" } },
  { match: /limpez|clean/i, meta: { key: "limpezas", icon: "wind", tint: "rgba(16,185,129,0.14)", color: "#059669" } },
  { match: /móve|move|montagem|mobili/i, meta: { key: "moveis", icon: "package", tint: "rgba(180,83,9,0.14)", color: "#92400E" } },
  { match: /personaliz|outro|custom/i, meta: { key: "personalizados", icon: "message-circle", tint: "rgba(236,72,153,0.12)", color: "#BE185D" } },
  { match: /jardin|garden|relva/i, meta: { key: "jardinagem", icon: "feather", tint: "rgba(132,204,22,0.16)", color: "#4D7C0F" } },
  { match: /climatiz|ar condicionado|aquec/i, meta: { key: "climatizacao", icon: "thermometer", tint: "rgba(14,165,233,0.14)", color: "#0369A1" } },
];

const FALLBACK: CategoryMeta = {
  key: "generic",
  icon: "tool",
  tint: "rgba(0,0,0,0.05)",
  color: "#3F3F46",
};

export const categoryMeta = (areaName?: string | null): CategoryMeta => {
  if (!areaName) return FALLBACK;
  return RULES.find((rule) => rule.match.test(areaName))?.meta ?? FALLBACK;
};

/**
 * Nome da categoria como se lê num cartão.
 *
 * O backoffice guarda-as em maiúsculas ("ELETRODOMÉSTICOS"), o que num título
 * grande grita. Só se converte quando vem tudo em maiúsculas — um nome já
 * escrito à mão fica como está.
 */
export const categoryTitle = (name?: string | null): string => {
  const clean = (name ?? "").trim();
  if (!clean || clean !== clean.toLocaleUpperCase("pt-PT")) return clean;
  return clean
    .toLocaleLowerCase("pt-PT")
    .split(" ")
    .map((word) => (word.length > 2 ? word.charAt(0).toLocaleUpperCase("pt-PT") + word.slice(1) : word))
    .join(" ");
};
