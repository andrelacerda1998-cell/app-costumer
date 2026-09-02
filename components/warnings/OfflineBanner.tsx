import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useNetwork } from "@/contexts/NetworkContext";

/**
 * Aviso persistente de "sem ligação". Não bloqueia a app (o cliente pode
 * continuar a ver o que está em cache) mas deixa de o enganar: antes a Home
 * apresentava-se exatamente igual ao normal sem rede nenhuma.
 *
 * Pastilha flutuante e não faixa de largura total: ocupava o topo inteiro com o
 * peso de um cabeçalho para dizer uma coisa passageira.
 */
const OfflineBanner = () => {
  const { t } = useTranslation();
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top + 6,
        alignSelf: "center",
        zIndex: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        maxWidth: "88%",
        backgroundColor: "rgba(27,27,27,0.92)",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Feather name="wifi-off" size={12} color={Colors.primary} />
      <CustomText
        color="support_secondary"
        size="extraSmall"
        boldness="semiBold"
        numberOfLines={1}
        classes="ml-2"
      >
        {t("errors.offline_banner")}
      </CustomText>
    </View>
  );
};

export default OfflineBanner;
