import type { Feather } from "@expo/vector-icons";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

/**
 * Ícone do cartão de serviço.
 *
 * Lê PRIMEIRO o nome do tipo de serviço e só depois a área. A área sozinha
 * engana: na base de dados "Instalar uma nova luminária" está classificada em
 * Canalização, e o cartão aparecia com uma gota. O tipo de serviço é o que o
 * cliente lê no cartão, por isso é ele que manda no ícone.
 *
 * A correspondência é por palavra, não por id — os ids variam entre ambientes.
 * Sem correspondência fica a chave inglesa.
 */
const RULES: { match: RegExp; icon: FeatherName }[] = [
  // Tipos de serviço concretos primeiro: são mais específicos que a área.
  { match: /luminár|lâmpada|lampada|candeeiro|tomada|quadro elétr|iluminaç/i, icon: "zap" },
  { match: /torneira|cano|sanita|autoclismo|ralo|esgoto|fuga de água/i, icon: "droplet" },
  { match: /relva|grama|sebe|jardim|planta|árvore|arvore|poda/i, icon: "feather" },
  { match: /pintar|pintura|tinta/i, icon: "edit-3" },
  { match: /telhado|deck|revestimento|alvenaria|parede/i, icon: "home" },
  { match: /limpar|limpeza|aspirar/i, icon: "wind" },
  { match: /móvel|movel|montar|montagem|estante|armário|armario/i, icon: "package" },
  { match: /ar condicionado|aquecedor|caldeira|climatiz/i, icon: "thermometer" },
  { match: /mudan|transport/i, icon: "truck" },
  // Áreas, como recurso quando o tipo não diz nada.
  { match: /canaliza|plumb/i, icon: "droplet" },
  { match: /elétric|eletric|electric/i, icon: "zap" },
  { match: /jardin|garden/i, icon: "feather" },
  { match: /limpez|clean/i, icon: "wind" },
  { match: /pintur|paint/i, icon: "edit-3" },
  { match: /reform|obra|constru|remodel/i, icon: "home" },
];

export const serviceIcon = (serviceTypeName?: string | null, areaName?: string | null): FeatherName => {
  for (const source of [serviceTypeName, areaName]) {
    if (!source) continue;
    const found = RULES.find((rule) => rule.match.test(source));
    if (found) return found.icon;
  }
  return "tool";
};

/** @deprecated usar serviceIcon, que também olha para o tipo de serviço. */
export const operationAreaIcon = (areaName?: string | null): FeatherName => serviceIcon(null, areaName);
