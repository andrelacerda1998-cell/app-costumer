import React, { useState } from "react";
import { LayoutAnimation, Platform, TouchableOpacity, UIManager, View } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

/**
 * O que o serviço inclui / não inclui, fechado por omissão.
 *
 * Aberto, as duas listas enchiam o ecrã de acompanhamento e empurravam para
 * baixo o que é ao vivo (mapa, tempo, contactar o técnico). Fechado, fica só a
 * linha com a contagem — quem quer confirmar o que contratou toca e vê.
 */

// A animação de layout no Android precisa desta autorização explícita.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

type Props = {
  title: string;
  items: string[];
  /** "included" pinta a verde; "excluded" a vermelho. */
  tone: "included" | "excluded";
  /** Aberto de início — usado quando há só uma lista e não vale a pena esconder. */
  defaultOpen?: boolean;
};

const ServiceScopeCard = ({ title, items, tone, defaultOpen = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  if (!items.length) return null;

  const included = tone === "included";
  const accent = included ? Colors.success : Colors.error;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((value) => !value);
  };

  return (
    <View
      className="rounded-2xl mb-3 overflow-hidden"
      style={
        included
          ? { backgroundColor: Colors.support_secondary, ...CARD_SHADOW }
          : { backgroundColor: "rgba(237,73,73,0.06)", borderWidth: 1, borderColor: "rgba(237,73,73,0.25)" }
      }
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center p-4"
      >
        <Ionicons name={included ? "checkmark-circle" : "close-circle"} size={18} color={accent} />
        <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2 flex-1" numberOfLines={1}>
          {title}
        </CustomText>
        <CustomText color="gray_medium" size="small" boldness="regular" classes="mr-2">
          {items.length}
        </CustomText>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={Colors.gray_medium} />
      </TouchableOpacity>

      {open && (
        <View className="px-4 pb-4">
          {items.map((item, index) => (
            <View key={`${tone}-${index}`} className="flex-row items-start mb-2">
              <View className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: accent }} />
              <CustomText color="gray_strong" size="small" boldness="regular" classes="ml-3 flex-1">
                {item}
              </CustomText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default ServiceScopeCard;
