import { LayoutAnimation, Platform, UIManager } from "react-native";

/**
 * Autorização que o Android exige para animar mudanças de layout.
 *
 * Sem isto, `LayoutAnimation` é silenciosamente ignorado no Android — o
 * conteúdo aparece e desaparece de golpe, e não há erro nenhum a dizer porquê.
 * Importar este módulo em qualquer sítio basta: corre uma vez por sessão.
 */
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Transição suave para o próximo re-render (abrir/fechar uma secção). */
export const animateNextLayout = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};
