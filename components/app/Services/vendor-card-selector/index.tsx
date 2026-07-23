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
      <View className="flex-row items-center">
        <View className="h-14 w-14 rounded-2xl overflow-hidden flex-shrink-0">
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

        <View className="items-end">
          <View
            className="rounded-xl px-3.5 py-2"
            style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
          >
            <CustomText color="secondary" boldness="bolder" size="large" numberOfLines={1}>
              {price !== null ? renderMoney(price) : t("wallet.service.no_price_provided")}
            </CustomText>
          </View>
        </View>
      </View>

      <View className="flex-row items-center mt-3">
        <Ionicons name="shield-checkmark" size={13} color={Colors.success} />
        <CustomText color="gray_medium" size="extraSmall" boldness="semiBold" classes="ml-1 mr-3" numberOfLines={1}>
          {t("services.select_vendor.verified_badge")}
        </CustomText>
        {distance !== null && distance !== undefined && (
          <>
            <Feather name="map-pin" size={11} color={Colors.gray_medium} />
            <CustomText color="gray_medium" size="extraSmall" boldness="semiBold" classes="ml-1" numberOfLines={1}>
              {`${distance} km`}
            </CustomText>
          </>
        )}
      </View>
    </TouchOpacity>
  )
}

export default VendorCard;
