import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useNetwork } from "@/contexts/NetworkContext";

/**
 * Faixa persistente de "sem ligação". Não bloqueia a app (o cliente pode
 * continuar a ver o que está em cache) mas deixa de o enganar: antes a Home
 * apresentava-se exatamente igual ao normal sem rede nenhuma.
 */
const OfflineBanner = () => {
  const { t } = useTranslation();
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        paddingTop: insets.top + 6,
        paddingBottom: 8,
        paddingHorizontal: 16,
        backgroundColor: Colors.secondary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name="wifi-off" size={14} color={Colors.primary} />
      <CustomText
        color="support_secondary"
        size="extraSmall"
        boldness="semiBold"
        numberOfLines={2}
        classes="ml-2 flex-1"
      >
        {t("errors.offline_banner")}
      </CustomText>
    </View>
  );
};

export default OfflineBanner;
