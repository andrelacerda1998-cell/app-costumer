import { CustomText } from "@/components/CustomText"
import TouchOpacity from "@/components/TouchOpacity"
import { Colors } from "@/constants/Colors"
import { renderMoney } from "@/utils/money"
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons"
import { t } from "i18next"
import { Image, View } from "react-native"

const VendorCard = ({
  imgSrc,
  name,
  rating,
  ratingCount,
  recommended = false,
  distance,
  price,
  onPress,
  selected,
  serviceTypeID,
  hoursOfService,
}: {
  imgSrc: string | null,
  name: string,
  rating: number,
  ratingCount?: number | null,
  recommended?: boolean,
  distance: number | null,
  price: number,
  onPress: () => void,
  selected: boolean,
  serviceTypeID: number | undefined;
  hoursOfService: number;
}) => {
  const hasRating = typeof rating === "number" && rating > 0;

  return (
    <TouchOpacity
      className={`w-full flex-1 p-5 rounded-3xl bg-support_secondary justify-center ${selected ? "border-2 border-primary" : ""}`}
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      onPress={onPress}
    >
      <View className="flex-row items-start">
        <View className="h-20 w-20 rounded-2xl overflow-hidden flex-shrink-0">
          {imgSrc ? (
            <Image
              source={{ uri: imgSrc }}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: "rgba(250,187,91,0.25)" }}
            >
              <Feather name="user" size={34} color={Colors.secondary} />
            </View>
          )}
        </View>

        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <CustomText color="secondary" boldness="bold" numberOfLines={1} size="large" classes="flex-shrink">
              {name}
            </CustomText>
            {recommended && (
              <View
                className="flex-row items-center rounded-full px-2 py-0.5 ml-2"
                style={{ backgroundColor: Colors.primary }}
              >
                <Ionicons name="sparkles" size={10} color={Colors.secondary} />
                <CustomText color="secondary" size="extraSmall" boldness="bold" classes="ml-1" numberOfLines={1}>
                  {t("services.select_vendor.recommended")}
                </CustomText>
              </View>
            )}
          </View>
          {hasRating && (
            <View className="flex-row items-center mt-1">
              <AntDesign name="star" size={16} color={Colors.primary} />
              <CustomText color="secondary" size="medium" boldness="bold" classes="ml-1">
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
        </View>

        <View
          className="rounded-xl px-3.5 py-2 ml-2"
          style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
        >
          <CustomText color="secondary" boldness="bolder" size="large" numberOfLines={1}>
            {price !== null ? renderMoney(price) : t("wallet.service.no_price_provided")}
          </CustomText>
        </View>
      </View>

      <View className="h-[1px] w-full bg-support_primary mt-4 mb-3" />

      <View className="flex-row items-center">
        <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
        <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1" numberOfLines={1}>
          {t("services.select_vendor.verified_badge")}
        </CustomText>
        {distance !== null && distance !== undefined && (
          <>
            <CustomText color="gray_medium" size="small" boldness="regular" classes="mx-2">
              ·
            </CustomText>
            <Feather name="map-pin" size={13} color={Colors.gray_medium} />
            <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1" numberOfLines={1}>
              {`${distance} km`}
            </CustomText>
          </>
        )}
      </View>
    </TouchOpacity>
  )
}

export default VendorCard;
