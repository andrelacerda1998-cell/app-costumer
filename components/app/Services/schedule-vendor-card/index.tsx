import { CustomText } from "@/components/CustomText";
import TouchOpacity from "@/components/TouchOpacity";
import { Colors } from "@/constants/Colors";
import { renderMoney } from "@/utils/money";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

interface ScheduleVendorCardProps {
  avatar: string | null;
  name: string;
  rating: number;
  ratingCount?: number | null;
  rate: number;
  original_price: number;
  onPress: () => void;
  hidePrice?: boolean;
  recommended?: boolean;
  distance?: number;
  isOnline?: boolean;
  hasAutoAccept?: boolean;
}

/**
 * Cartão de técnico do fluxo agendado. Tal como no fluxo imediato,
 * aparecem no máximo 3 — o cartão estica (flex-1) para preencher o ecrã.
 */
const ScheduleVendorCard = ({
  avatar,
  name,
  rating,
  ratingCount,
  rate,
  original_price,
  onPress,
  hidePrice = false,
  recommended = false,
  isOnline = false,
  hasAutoAccept = false,
}: ScheduleVendorCardProps) => {
  const { t } = useTranslation();
  const hasDiscount = original_price > 0 && original_price > rate;
  const hasRating = typeof rating === "number" && rating > 0;

  return (
    <TouchOpacity
      className="w-full flex-1 p-5 rounded-3xl bg-support_secondary justify-center"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="h-14 w-14 rounded-2xl overflow-hidden flex-shrink-0">
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: "rgba(250,187,91,0.25)" }}
            >
              <Feather name="user" size={26} color={Colors.secondary} />
            </View>
          )}
        </View>

        <View className="flex-1 ml-3 mr-2">
          <CustomText color="secondary" boldness="bold" numberOfLines={1} size="medium">
            {name}
          </CustomText>
          <View className="flex-row items-center mt-1">
            {hasRating && (
              <View className="flex-row items-center mr-2">
                <AntDesign name="star" size={14} color={Colors.primary} />
                <CustomText color="secondary" size="small" boldness="bold" classes="ml-1">
                  {rating.toFixed(1)}
                </CustomText>
              </View>
            )}
            {recommended && (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: Colors.primary }}
              >
                <CustomText color="secondary" size="extraSmall" boldness="bold" numberOfLines={1}>
                  {t("services.select_vendor.recommended")}
                </CustomText>
              </View>
            )}
          </View>
        </View>

        {!hidePrice && (
          <View className="items-end">
            {hasDiscount && (
              <CustomText color="gray_medium" boldness="regular" size="extraSmall" numberOfLines={1} classes="line-through mb-0.5">
                {renderMoney(original_price)}
              </CustomText>
            )}
            <View
              className="rounded-xl px-3.5 py-2"
              style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
            >
              <CustomText color="secondary" boldness="bolder" size="large" numberOfLines={1}>
                {renderMoney(rate)}
              </CustomText>
            </View>
          </View>
        )}
      </View>
    </TouchOpacity>
  );
};

export default ScheduleVendorCard;
