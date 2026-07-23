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
const TechnicianTrustFooter = () => {
  const { t } = useTranslation();

  const items = [
    { icon: "shield-checkmark" as const, title: "verified_technicians", desc: "verified_desc" },
    { icon: "lock-closed" as const, title: "fixed_price", desc: "fixed_price_desc" },
    { icon: "star" as const, title: "real_reviews", desc: "real_reviews_desc" },
  ];

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
