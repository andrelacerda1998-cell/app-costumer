import type { Feather } from "@expo/vector-icons";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

/**
 * Ícone por área de operação.
 *
 * Todos os cartões usavam a mesma chave inglesa: numa lista de seis serviços a
 * coluna dos ícones ficava igual de cima a baixo e não ajudava a distinguir
 * canalização de jardinagem.
 *
 * A correspondência é por palavra no nome da área (que vem traduzida do
 * backend), não por id — os ids das áreas variam entre ambientes. Sem
 * correspondência fica a chave inglesa, como antes.
 */
const RULES: { match: RegExp; icon: FeatherName }[] = [
  { match: /canaliza|plumb|torneira|água|agua/i, icon: "droplet" },
  { match: /elétric|eletric|electric|luz/i, icon: "zap" },
  { match: /jardin|garden|relva|grama/i, icon: "feather" },
  { match: /limpez|clean/i, icon: "wind" },
  { match: /pintur|paint/i, icon: "edit-3" },
  { match: /reform|obra|constru|remodel/i, icon: "home" },
  { match: /mudan|transport|moving/i, icon: "truck" },
  { match: /clima|ar condicionado|aquec|heat/i, icon: "thermometer" },
];

export const operationAreaIcon = (areaName?: string | null): FeatherName => {
  if (!areaName) return "tool";
  const found = RULES.find((rule) => rule.match.test(areaName));
  return found?.icon ?? "tool";
};
