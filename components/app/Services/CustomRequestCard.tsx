import React from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

/**
 * A entrada "Pedido personalizado" na grelha de categorias.
 *
 * Mesmas medidas do CategoryCard para se sentar na grelha sem a partir.
 *
 * A fotografia vem do pacote da app e nao do backoffice: isto nao e uma
 * categoria — nao ha linha nenhuma em `operation_areas` a que uma imagem se
 * pudesse agarrar. A contrapartida e que trocar a fotografia exige uma build
 * nova, ao contrario das outras sete.
 *
 * Preparada a 1424x752, a mesma medida das categorias do backoffice, para o
 * cartao ficar igual aos vizinhos na grelha.
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
        className="rounded-xl overflow-hidden mb-2"
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT, backgroundColor: "rgba(250,187,91,0.22)" }}
      >
        <Image
          source={require("@/assets/images/custom-request.webp")}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={160}
        />
      </View>
      {/* Exatamente os mesmos tamanhos e margens do CategoryCard: este cartao
          senta-se na mesma grelha, e um titulo dois pontos mais pequeno fazia-o
          parecer uma entrada de segunda ao lado das categorias a serio. */}
      <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={2}>
        {t("services.custom_request.card_title")}
      </CustomText>
      <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-1" numberOfLines={2}>
        {t("services.custom_request.card_subtitle")}
      </CustomText>
    </TouchableOpacity>
  );
};

export default CustomRequestCard;
