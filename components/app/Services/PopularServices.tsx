import React from "react";
import { Dimensions, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Radius, Spacing } from "@/constants/Layout";
import { serviceIcon } from "./operationAreaIcon";
import RemoteThumb from "./RemoteThumb";
import { renderMoney } from "@/utils/money";
import type { ServiceTypeInterface } from "@/types/services";

/**
 * Serviços em destaque, em grelha de três por linha.
 *
 * Atalhos para um serviço concreto, sem passar pela categoria. A fotografia e o
 * preço "desde" vêm do backoffice; nada aqui é escrito à mão.
 *
 * Os cards têm altura fixa e o preço ancorado no fundo: com nomes de uma e de
 * duas linhas na mesma fila, um preço que seguisse o texto ficava a saltar de
 * card para card.
 */

const COLUMNS = 3;
const GAP = Spacing.sm;

/**
 * Largura em pontos, não em percentagem: com `gap`, três colunas a 31,67% mais
 * dois intervalos não cabem — o terceiro card saía do ecrã.
 */
const CARD_WIDTH = Math.floor(
  (Dimensions.get("window").width - Spacing.xl * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
);
const THUMB_HEIGHT = 68;
/** Imagem + duas linhas de nome + o bloco do preço encostado ao fundo. */
// Três linhas de nome (3x14) + margem + o preço, agora numa linha só. Com o
// preço em duas linhas não cabiam três de nome sem crescer o cartão.
const CARD_HEIGHT = THUMB_HEIGHT + 80;

type Props = {
  services: ServiceTypeInterface[];
  onSelect: (service: ServiceTypeInterface) => void;
  loading?: boolean;
};

const PopularServices = ({ services, onSelect, loading = false }: Props) => {
  const { t } = useTranslation();

  if (!loading && (!services || services.length === 0)) return null;

  const items = loading ? Array.from({ length: 12 }, (_, i) => ({ id: `s-${i}` })) : services;

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

      <View
        className="flex-row flex-wrap"
        style={{ paddingHorizontal: Spacing.xl, gap: GAP }}
      >
        {items.map((item: any) => {
          const price =
            typeof item?.starts_from === "number" && item.starts_from > 0
              ? renderMoney(item.starts_from * 100)
              : null;

          if (loading) {
            return (
              <View
                key={item.id}
                style={{
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  borderRadius: Radius.lg,
                  backgroundColor: "#F4F2EE",
                }}
              />
            );
          }

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={
                price ? `${item?.name}, ${t("cart.from_price", { price })}` : item?.name
              }
              onPress={() => onSelect(item)}
              style={({ pressed }) => ({
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                borderRadius: Radius.lg,
                backgroundColor: Colors.support_secondary,
                borderWidth: 1,
                borderColor: "#E7E4DF",
                padding: Spacing.sm,
                justifyContent: "flex-start",
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <RemoteThumb
                uri={item?.image}
                size={CARD_WIDTH - Spacing.sm * 2}
                height={THUMB_HEIGHT}
                radius={Radius.md}
                fit="cover"
                fallbackIcon={serviceIcon(item?.name, item?.operation_area?.name)}
              />

              <CustomText
                color="secondary"
                size="specExtraSmall"
                boldness="semiBold"
                numberOfLines={3}
                classes="mt-1.5"
                style={{ fontSize: 11.5, lineHeight: 14 }}
              >
                {item?.name}
              </CustomText>

              {/* "Desde" e o valor na mesma linha, ancorados ao fundo à
                  esquerda: alinham em todos os cartões, seja o nome de uma ou
                  de três linhas. */}
              {price && (
                <View
                  className="flex-row items-baseline"
                  style={{ position: "absolute", left: Spacing.sm, bottom: Spacing.sm }}
                >
                  <CustomText
                    color="gray_strong"
                    size="specExtraSmall"
                    boldness="regular"
                    numberOfLines={1}
                    style={{ fontSize: 10 }}
                  >
                    {t("home.popular_from")}
                  </CustomText>
                  <CustomText
                    color="secondary"
                    size="specExtraSmall"
                    boldness="bold"
                    numberOfLines={1}
                    classes="ml-1"
                    style={{ fontSize: 12.5 }}
                  >
                    {price}
                  </CustomText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default PopularServices;
