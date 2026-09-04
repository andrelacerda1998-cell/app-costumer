import React from "react";
import { TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

/**
 * Sinal de "há mais para baixo", no fundo de uma lista.
 *
 * Uma lista que acaba a meio do ecrã com uma linha cortada dá a entender que
 * acabou. O esbatido faz a última linha desvanecer — que é o que se lê como
 * "continua" — e a seta diz o gesto a quem não o deduz do esbatido.
 *
 * Desaparece ao chegar ao fim: um convite a descer quando já não há para onde
 * descer é ruído. A seta é tocável e leva ao fim da lista de uma vez, para
 * quem prefere o toque ao arrasto.
 */

type Props = {
  /** Cor do fundo por cima do qual o esbatido é desenhado. */
  backgroundColor?: string;
  visible: boolean;
  /** Toque na seta — normalmente um scrollToEnd na lista. */
  onPress?: () => void;
};

const ScrollHint = ({ visible, backgroundColor = Colors.support_secondary, onPress }: Props) => {
  if (!visible) return null;

  return (
    // box-none: o esbatido deixa passar os toques para a lista por baixo; só a
    // seta os recebe.
    <View pointerEvents="box-none" className="absolute left-0 right-0 bottom-0 items-center">
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", backgroundColor]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64 }}
      />
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
