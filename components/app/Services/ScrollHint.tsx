import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

/**
 * Sinal de "há mais para baixo", no fundo de uma lista.
 *
 * Só a seta: o esbatido que aqui estava apagava a última linha da lista para
 * dizer que havia mais — escondia conteúdo para anunciar conteúdo.
 *
 * Desaparece ao chegar ao fim: um convite a descer quando já não há para onde
 * descer é ruído. É tocável e leva ao fim da lista de uma vez, para quem
 * prefere o toque ao arrasto.
 */

type Props = {
  visible: boolean;
  /** Toque na seta — normalmente um scrollToEnd na lista. */
  onPress?: () => void;
};

const ScrollHint = ({ visible, onPress }: Props) => {
  if (!visible) return null;

  return (
    // box-none: a área à volta da seta deixa passar os toques para a lista por
    // baixo; só a seta os recebe.
    <View pointerEvents="box-none" className="absolute left-0 right-0 bottom-0 items-center">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="w-8 h-8 rounded-full items-center justify-center mb-2"
        style={{
          backgroundColor: Colors.primary,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <Feather name="chevron-down" size={18} color={Colors.secondary} />
      </TouchableOpacity>
    </View>
  );
};

export default ScrollHint;
