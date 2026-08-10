import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

/**
 * Rodapé de confiança da seleção de técnico (fluxo imediato e agendado):
 * três garantias da plataforma com ícone em círculo, título e descrição.
 */
const TechnicianTrustFooter = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useTranslation();

  const items = [
    { icon: "shield-checkmark" as const, title: "verified_technicians", desc: "verified_desc" },
    { icon: "lock-closed" as const, title: "fixed_price", desc: "fixed_price_desc" },
    { icon: "star" as const, title: "real_reviews", desc: "real_reviews_desc" },
  ];

  /**
   * Versão em colunas para o ecrã de escolha.
   *
   * Os três blocos empilhados na vertical eram uma parede de texto que competia
   * com os cartões; encolher para uma linha só resolveu isso mas deixou o fundo
   * do ecrã vazio. Em três colunas as mesmas garantias ocupam a largura toda com
   * pouca altura — enchem o espaço sem voltar a disputar a atenção, porque cada
   * uma passa a ser duas palavras em vez de um título com descrição.
   */
  if (compact) {
    return (
      <View
        className="flex-row rounded-3xl px-3 py-4"
        style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
      >
        {items.map((item) => (
          <View key={item.title} className="flex-1 items-center px-1.5">
            <View
              className="items-center justify-center rounded-full mb-2"
              style={{ width: 38, height: 38, backgroundColor: "rgba(250,187,91,0.45)" }}
            >
              <Ionicons name={item.icon} size={17} color={Colors.secondary} />
            </View>
            <CustomText
              size="specExtraSmall"
              color="secondary"
              boldness="bold"
              numberOfLines={2}
              classes="text-center"
              style={{ lineHeight: 14 }}
            >
              {t(`services.select_vendor.trust_banner.${item.title}_short`)}
            </CustomText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl p-4"
      style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
    >
      {items.map((item, i) => (
        <View
          key={item.title}
          className="flex-row items-center"
          style={{ marginBottom: i < items.length - 1 ? 14 : 0 }}
        >
          <View
            className="items-center justify-center rounded-full mr-3"
            style={{ width: 40, height: 40, backgroundColor: "rgba(250,187,91,0.35)" }}
          >
            <Ionicons name={item.icon} size={18} color={Colors.secondary} />
          </View>
          <View className="flex-1">
            <CustomText size="small" color="secondary" boldness="bold" numberOfLines={1}>
              {t(`services.select_vendor.trust_banner.${item.title}`)}
            </CustomText>
            <CustomText size="extraSmall" color="gray_medium" boldness="regular" numberOfLines={2}>
              {t(`services.select_vendor.trust_banner.${item.desc}`)}
            </CustomText>
          </View>
        </View>
      ))}
    </View>
  );
};

export default TechnicianTrustFooter;
