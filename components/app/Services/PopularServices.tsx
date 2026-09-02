import React from "react";
import { FlatList, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Radius, Spacing } from "@/constants/Layout";
import { serviceIcon } from "./operationAreaIcon";
import RemoteThumb from "./RemoteThumb";
import type { ServiceTypeInterface } from "@/types/services";

/**
 * Atalhos para serviços concretos, sem passar por uma categoria.
 *
 * A lista e a ordem vêm do backoffice (is_popular + popular_order, endpoint
 * /common/services/services-types/popular). O frontend não escolhe nada: sem
 * destaques marcados, a secção não aparece.
 *
 * Cards com imagem, e não chips: aqui o trabalho é descoberta e conversão, ao
 * contrário das categorias, que são navegação. O último card fica cortado de
 * propósito, para se ver que a fila continua.
 */

type Props = {
  services: ServiceTypeInterface[];
  onSelect: (service: ServiceTypeInterface) => void;
  loading?: boolean;
};

const SKELETON_KEYS = ["a", "b", "c", "d"];
/** Largura que deixa o card seguinte meio visível, a dizer que há mais. */
const CARD_WIDTH = 132;

const PopularServices = ({ services, onSelect, loading = false }: Props) => {
  const { t } = useTranslation();

  if (!loading && (!services || services.length === 0)) return null;

  return (
    <View style={{ marginTop: Spacing.xxl }}>
      <CustomText
        color="secondary"
        size="medium"
        boldness="bold"
        classes="mb-3"
        style={{ paddingHorizontal: Spacing.xl }}
      >
        {t("home.popular_title")}
      </CustomText>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.sm }}
        data={loading ? SKELETON_KEYS : services}
        keyExtractor={(item: any, index) => String(item?.id ?? item ?? index)}
        renderItem={({ item }: { item: any }) => {
          if (loading) {
            return (
              <View
                style={{
                  width: CARD_WIDTH,
                  height: Math.round(CARD_WIDTH * 0.72) + 52,
                  borderRadius: Radius.lg,
                  backgroundColor: Colors.surface_secondary,
                }}
              />
            );
          }

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => onSelect(item)}
              style={({ pressed }) => ({
                width: CARD_WIDTH,
                borderRadius: Radius.lg,
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
                padding: Spacing.md,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <RemoteThumb
                uri={item?.image}
                size={CARD_WIDTH - Spacing.md * 2}
                height={Math.round((CARD_WIDTH - Spacing.md * 2) * 0.72)}
                radius={Radius.md}
                fallbackIcon={serviceIcon(item?.name, item?.operation_area?.name)}
              />
              <View className="flex-row items-start justify-between mt-2">
                <CustomText
                  color="secondary"
                  size="extraSmall"
                  boldness="semiBold"
                  numberOfLines={2}
                  classes="flex-1"
                  style={{ lineHeight: 16 }}
                >
                  {item?.name}
                </CustomText>
                <Feather
                  name="arrow-up-right"
                  size={14}
                  color={Colors.primary_strong}
                  style={{ marginLeft: 4, marginTop: 1 }}
                />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
};

export default PopularServices;
