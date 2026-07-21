import UserAvatarIcon from "@/assets/icons/user-avatar";
import { CustomText } from "@/components/CustomText";
import TouchOpacity from "@/components/TouchOpacity";
import { Colors } from "@/constants/Colors";
import { renderMoney } from "@/utils/money";
import { AntDesign } from "@expo/vector-icons";
import React from "react";
import { Image, View } from "react-native";
import {useTranslation} from "react-i18next";

interface ScheduleVendorCardProps {
  avatar: string | null;
  name: string;
  rating: number;
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
  rate,
  original_price,
  onPress,
  hidePrice = false,
}: ScheduleVendorCardProps) => {
  const { t } = useTranslation();
  const safeRating = Math.max(0, Math.min(5, Math.round(rating || 0)));
  const emptyStars = 5 - safeRating;
  const hasDiscount = original_price > 0 && original_price > rate;

  return (
    <TouchOpacity
      className="w-full px-3 pt-3 pb-3 rounded-lg border border-gray_light"
      onPress={onPress}
    >
      <View className="flex-row items-center space-x-3">
        <View className="h-14 w-14 rounded-[14px] overflow-hidden flex-shrink-0">
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <UserAvatarIcon />
          )}
        </View>
        <View className="flex-1 space-y-1">
          <CustomText color="secondary" boldness="bold" numberOfLines={1} size="small">
            {name}
          </CustomText>
          <View className="flex-row items-center space-x-1">
            {Array.from({ length: safeRating }).map((_, index) => (
              <AntDesign key={`rate-star-${index}`} name="star" size={18} color={Colors.primary} />
            ))}
            {Array.from({ length: emptyStars }).map((_, index) => (
              <AntDesign key={`rate-star-empty-${index}`} name="staro" size={18} color={Colors.primary} />
            ))}
          </View>
        </View>
      </View>

      <View className="flex-row justify-end items-center mt-2">
        <View className="flex flex-col items-end">
          {hasDiscount && (
            <CustomText
              color="gray_medium"
              boldness="medium"
              size="small"
              numberOfLines={1}
              classes="line-through mb-1"
            >
              {renderMoney(original_price)}
            </CustomText>
          )}
          <View className="flex-row items-center space-x-2">
            <View className="bg-primary/15 rounded-full px-3 py-1">
              <CustomText color="primary" boldness="bold" size="small">
                {t("services.select_service_type.spare25")}
              </CustomText>
            </View>
            <View className="bg-primary/10 rounded-lg px-3 py-1">
              <CustomText color="secondary" boldness="bolder" size="extraLarge" numberOfLines={1}>
                {renderMoney(rate)}
              </CustomText>
            </View>
          </View>
        </View>
      </View>
    </TouchOpacity>
  );
};

export default ScheduleVendorCard;
