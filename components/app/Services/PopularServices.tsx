import React from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Radius, Spacing } from "@/constants/Layout";
import { serviceIcon } from "./operationAreaIcon";
import type { ServiceTypeInterface } from "@/types/services";

/**
 * Atalhos para serviços concretos, sem passar por uma categoria.
 *
 * NOTA sobre "populares": o backend não expõe nenhum sinal de procura nos tipos
 * de serviço (não há contador de pedidos nem flag). Esta lista é, por isso, os
 * primeiros tipos que o servidor devolve nas áreas principais — serviços reais,
 * mas a ordem não é de popularidade. Para o título ser verdade é preciso um
 * campo no backend (ex.: `requests_count` ou `is_popular`); enquanto não existe,
 * o componente aceita a lista que lhe derem e não inventa ordenação.
 */

type Props = {
  services: ServiceTypeInterface[];
  onSelect: (service: ServiceTypeInterface) => void;
  loading?: boolean;
};

const SKELETON_KEYS = ["a", "b", "c", "d"];

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
                  width: 150,
                  height: 46,
                  borderRadius: Radius.pill,
                  backgroundColor: "#EFEAE2",
                }}
              />
            );
          }

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() => onSelect(item)}
              className="flex-row items-center"
              style={{
                minHeight: 46,
                paddingVertical: Spacing.md,
                paddingHorizontal: Spacing.lg,
                borderRadius: Radius.pill,
                backgroundColor: Colors.support_secondary,
                borderWidth: 1,
                borderColor: Colors.support_primary,
              }}
            >
              <Feather
                name={serviceIcon(item?.name, item?.operation_area?.name)}
                size={15}
                color="#A85F12"
              />
              <CustomText
                color="secondary"
                size="extraSmall"
                boldness="semiBold"
                numberOfLines={1}
                classes="ml-2"
                style={{ maxWidth: 190 }}
              >
                {item?.name}
              </CustomText>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default PopularServices;
