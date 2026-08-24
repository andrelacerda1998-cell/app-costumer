/**
 * Paleta da app. Os rácios de contraste indicados são WCAG 2.1 sobre os dois
 * fundos usados na app: branco #FFFFFF e creme #FAF7F2.
 *
 * Regras a respeitar ao acrescentar cores (auditoria 2026-08-03):
 *  - texto normal precisa de ≥ 4,5:1 · texto grande (≥18pt ou ≥14pt bold) ≥ 3:1;
 *  - `gray_light` NÃO serve para texto (1,9:1) — só bordas, ícones inativos e
 *    indicadores de folha. Para texto secundário usar `gray_medium`;
 *  - sobre `primary` (âmbar) usar sempre `secondary` (10,1:1). Branco sobre
 *    âmbar dá 1,7:1 e é ilegível.
 */
export const Colors: {
  primary: "#FABB5B",
  secondary: "#1B1B1B",

  success: '#059669',
  error: '#ED4949',
  link: '#4B68EE',

  support_primary: "#E4E3E3",
  support_secondary: "#FFFFFF",

  gray_light: "#BBBBBB",
  gray_medium: "#6E6E6E",
  gray_strong: "#525252",
  gray_lighter: "#c5c4c4ff";
  no_error_red: "#FA1E26";
  bg_schedule: "#FEFBF4"
} = {
  primary: "#FABB5B",
  secondary: "#1B1B1B",

  success: '#059669',
  error: '#ED4949',
  link: '#4B68EE',

  support_primary: "#E4E3E3",
  support_secondary: "#FFFFFF",

  gray_light: "#BBBBBB",
  gray_medium: "#6E6E6E",
  gray_strong: "#525252",
  gray_lighter: "#c5c4c4ff",
  no_error_red: "#FA1E26",
  bg_schedule: "#FEFBF4"
};
