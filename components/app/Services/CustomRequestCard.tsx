import React from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

/**
 * A entrada "Pedido personalizado" na grelha de categorias.
 *
 * Mesmas medidas do CategoryCard para se sentar na grelha sem a partir; sem
 * fotografia porque nao ha categoria — e um icone no tom da marca.
 */
const GAP = 12;
const CARD_WIDTH = Math.floor((Dimensions.get("window").width - 20 * 2 - GAP) / 2);
const THUMB_WIDTH = CARD_WIDTH - 12 * 2;
const THUMB_HEIGHT = Math.round(THUMB_WIDTH * (752 / 1424));

const CustomRequestCard = ({ onPress }: { onPress: () => void }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("services.custom_request.card_title")}
      style={{
        width: CARD_WIDTH,
        backgroundColor: Colors.support_secondary,
        borderRadius: 20,
        padding: 12,
        marginBottom: GAP,
        borderWidth: 1,
        borderColor: "rgba(250,187,91,0.55)",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        className="rounded-xl items-center justify-center mb-2"
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT, backgroundColor: "rgba(250,187,91,0.22)" }}
      >
        <Feather name="edit-3" size={24} color={Colors.primary} />
      </View>
      <CustomText color="secondary" boldness="bold" size="small" numberOfLines={2}>
        {t("services.custom_request.card_title")}
      </CustomText>
      <CustomText color="gray_medium" size="extraSmall" numberOfLines={2} classes="mt-0.5">
        {t("services.custom_request.card_subtitle")}
      </CustomText>
    </TouchableOpacity>
  );
};

export default CustomRequestCard;
