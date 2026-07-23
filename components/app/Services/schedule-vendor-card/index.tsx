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
  // Passadas por alguns ecrãs; ainda não usadas no cartão.
  distance?: number;
  isOnline?: boolean;
  hasAutoAccept?: boolean;
}

const ScheduleVendorCard = ({
  avatar,
  name,
  rating,
  ratingCount,
  rate,
  original_price,
  onPress,
  hidePrice = false,
}: ScheduleVendorCardProps) => {
  const { t } = useTranslation();
  const hasDiscount = original_price > 0 && original_price > rate;
  const hasRating = typeof rating === "number" && rating > 0;

  return (
    <TouchOpacity
      className="w-full p-4 rounded-3xl bg-support_secondary"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      onPress={onPress}
    >
      <View className="flex-row">
        <View className="h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0">
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
              <Feather name="user" size={28} color={Colors.secondary} />
            </View>
          )}
        </View>

        <View className="flex-1 ml-3">
          <CustomText color="secondary" boldness="bold" numberOfLines={1} size="medium">
            {name}
          </CustomText>
          {hasRating && (
            <View className="flex-row items-center mt-0.5">
              <AntDesign name="star" size={14} color={Colors.primary} />
              <CustomText color="secondary" size="small" boldness="bold" classes="ml-1">
                {rating.toFixed(1)}
              </CustomText>
              {typeof ratingCount === "number" && ratingCount > 0 && (
                <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1" numberOfLines={1}>
                  {ratingCount === 1
                    ? t("services.select_vendor.reviews_count_one")
                    : t("services.select_vendor.reviews_count", { count: ratingCount })}
                </CustomText>
              )}
            </View>
          )}
          <View className="flex-row items-center mt-0.5">
            <Ionicons name="shield-checkmark" size={13} color={Colors.success} />
            <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1" numberOfLines={1}>
              {t("services.select_vendor.verified_badge")}
            </CustomText>
          </View>
        </View>

        {!hidePrice && (
          <View className="items-end ml-2">
            {hasDiscount && (
              <CustomText
                color="gray_medium"
                boldness="regular"
                size="small"
                numberOfLines={1}
                classes="line-through"
              >
                {renderMoney(original_price)}
              </CustomText>
            )}
            <View
              className="rounded-xl px-3 py-1.5 mt-1"
              style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
            >
              <CustomText color="secondary" boldness="bolder" size="large" numberOfLines={1}>
                {renderMoney(rate)}
              </CustomText>
            </View>
            {hasDiscount && (
              <CustomText color="primary" boldness="bold" size="extraSmall" classes="mt-1">
                {t("services.select_service_type.spare25")}
              </CustomText>
            )}
          </View>
        )}
      </View>
    </TouchOpacity>
  );
};

export default ScheduleVendorCard;
