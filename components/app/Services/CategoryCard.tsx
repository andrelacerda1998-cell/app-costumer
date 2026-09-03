import React from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { categoryMeta, categoryTitle } from "./categoryMeta";
import RemoteThumb from "./RemoteThumb";
import { OperationAreaInterface } from "@/types/services";

/**
 * Cartão de categoria do ecrã de Serviços.
 *
 * Duas colunas, ícone em círculo com o tom da categoria, nome e uma linha a
 * dizer o que lá está dentro. A descrição vem das traduções (a categoria no
 * backoffice ainda não tem esse campo); quando não há, o cartão fecha-se sem
 * deixar buraco, em vez de mostrar texto inventado.
 */

const GAP = 12;
const CARD_WIDTH = Math.floor((Dimensions.get("window").width - 20 * 2 - GAP) / 2);

type Props = {
  area: OperationAreaInterface;
  onPress: () => void;
};

const CategoryCard = ({ area, onPress }: Props) => {
  const { t } = useTranslation();
  const meta = categoryMeta(area?.name);
  const description = t(`services.list.category_descriptions.${meta.key}`, { defaultValue: "" });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      style={{
        width: CARD_WIDTH,
        backgroundColor: Colors.support_secondary,
        borderRadius: 20,
        padding: 16,
        marginBottom: GAP,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {/* A fotografia da categoria vem do backoffice, como na home. Sem imagem
          configurada fica o ícone da categoria, no seu tom — nunca um quadrado
          vazio. */}
      <View className="mb-3">
        {area?.image ? (
          <RemoteThumb uri={area.image} size={56} radius={16} fit="cover" fallbackIcon={meta.icon} />
        ) : (
          <View
            className="w-14 h-14 rounded-2xl items-center justify-center"
            style={{ backgroundColor: meta.tint }}
          >
            <Feather name={meta.icon} size={24} color={meta.color} />
          </View>
        )}
      </View>

      <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={2}>
        {categoryTitle(area?.name)}
      </CustomText>

      {!!description && (
        <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-1" numberOfLines={2}>
          {description}
        </CustomText>
      )}

      <View className="items-end mt-3">
        <View
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: "rgba(250,187,91,0.22)" }}
        >
          <Feather name="chevron-right" size={14} color="#B26A12" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CategoryCard;
