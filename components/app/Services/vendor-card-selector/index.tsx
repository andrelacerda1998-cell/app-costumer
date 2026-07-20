import UserAvatarIcon from "@/assets/icons/user-avatar"
import { CustomText } from "@/components/CustomText"
import { ThemedText } from "@/components/ThemedText"
import TouchOpacity from "@/components/TouchOpacity"
import { Colors } from "@/constants/Colors"
import { renderHourlyMoney, renderMoney } from "@/utils/money"
import { AntDesign, Entypo, Feather } from "@expo/vector-icons"
import { t } from "i18next"
import { Image, ImageSourcePropType, View } from "react-native"
import { useService } from "@/contexts/ServiceContext";

const VendorCard = ({
  imgSrc,
  name,
  rating,
  distance,
  price,
  // hourlyPrice,
  onPress,
  selected,
  serviceTypeID,
  hoursOfService,
}: {
  imgSrc: string | null,
  name: string,
  rating: number,
  distance: number | null,
  price: number,
  // hourlyPrice: number,
  onPress: () => void,
  selected: boolean,
  serviceTypeID: number | undefined;
  hoursOfService: number;
}) => {
  const getRate = (rating: number) => {
    const baseNumber = 5;
    const coloredStars = rating;
    const emptyStars = baseNumber - coloredStars;

    return (
      <View className="flex-row items-center space-x-2">
        {Array.from({ length: coloredStars }).map((_, index) => (
          <AntDesign key={`starRate-${index}`} name="star" size={22} color={Colors.primary} />
        ))}
        {Array.from({ length: emptyStars }).map((_, index) => (
          <AntDesign key={`starRate-${index}`} name="staro" size={22} color={Colors.primary} />
        ))}
      </View>
    )
  }
console.log(hoursOfService)
  return (
    <TouchOpacity
      className={`
        w-full px-3 pt-3 pb-3 rounded-lg border
        ${selected ?
          "border-primary" :
          "border-gray_light"
        }
      `}
      onPress={onPress}
    >
      <View className="flex-row items-center space-x-3">
        <View className="h-14 w-14 rounded-[14px] overflow-hidden flex-shrink-0">
          {imgSrc ? (
            <Image
              src={imgSrc}
              source={{ uri: imgSrc }}
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
          {getRate(rating)}
        </View>
      </View>
      <View className="flex-row justify-between items-center mt-2">
        <View className="bg-[#000000] px-4 h-5 rounded-full">
          <CustomText size="specExtraSmall" color="support_secondary" boldness="semiBold" numberOfLines={1}>
            {`${distance} Km` || ('services.select_vendor.no_distance')}
          </CustomText>
        </View>
        <View>
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {price !== null ? (
              <>{renderMoney(price)}</>
            ) : (
              t("wallet.service.no_price_provided")
            )}
          </CustomText>
        </View>
      </View>
    </TouchOpacity>
  )
}

export default VendorCard;
