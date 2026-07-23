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
      className={`w-full p-4 rounded-3xl bg-support_secondary ${selected ? "border-2 border-primary" : ""}`}
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      onPress={onPress}
    >
      <View className="flex-row">
        <View className="h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0">
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
          {distance !== null && distance !== undefined && (
            <View className="flex-row items-center mt-0.5">
              <Feather name="map-pin" size={12} color={Colors.gray_medium} />
              <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="ml-1" numberOfLines={1}>
                {`${distance} km`}
              </CustomText>
            </View>
          )}
        </View>

        <View className="items-end ml-2">
          <View
            className="rounded-xl px-3 py-1.5"
            style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
          >
            <CustomText color="secondary" boldness="bolder" size="large" numberOfLines={1}>
              {price !== null ? renderMoney(price) : t("wallet.service.no_price_provided")}
            </CustomText>
          </View>
        </View>
      </View>
    </TouchOpacity>
  )
}

export default VendorCard;
