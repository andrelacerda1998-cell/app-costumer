/**
 * Sistema de espaçamento e forma.
 *
 * Existe porque os ecrãs foram acumulando valores à mão — mt-8 ao lado de mt-6,
 * raios de 10, 12, 14, 18 e 20 no mesmo ecrã. Estas constantes são a referência
 * para código novo; o código antigo migra à medida que se lhe toca.
 *
 * A escala é de 4 em 4: é a que o resto da app já usa sem o dizer.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

/** Mínimo tocável recomendado (WCAG 2.5.5 / HIG da Apple). */
export const TOUCH_TARGET = 44;

/**
 * Sombra única da app. Vários ecrãs declaravam a sua, com opacidades e raios
 * diferentes, e o resultado era um ecrã com três profundidades sem razão.
 */
export const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
