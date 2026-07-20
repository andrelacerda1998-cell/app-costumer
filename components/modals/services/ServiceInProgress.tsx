import React, {useEffect, useRef, useState} from 'react'
import { Image, Platform, Text, View } from "react-native"
import { CustomText } from "@/components/CustomText"
import { Colors } from "@/constants/Colors"
import { Entypo, Feather } from "@expo/vector-icons"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import ChatIcon from "@/assets/icons/chat"
import { router } from "expo-router"
import { useService } from "@/contexts/ServiceContext"
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet"
import { useTranslation } from "react-i18next"
import UserAvatarIcon from "@/assets/icons/user-avatar"
import haversineDistance from "@/utils/map/distanceCoords";
import { ServiceStatus } from "@/types/services"

const ServiceInProgress = ({ isHome, onContentHeightChange }: { isHome?: boolean, onContentHeightChange?: (height: number) => void }) => {
  const { t } = useTranslation();
  const { openService, selectedProfessional, unreadServiceMessages } = useService();
  const [distance, setDistance] = useState(0);
  const technicianName = openService?.vendor?.user?.name || selectedProfessional?.name;

  const goToChat = () => {
    // if (!openService) return;
    router.push(`/(app)/(pages)/(services)/(open)/(chat)/service/${openService?.id}`);
  }

  const goToServiceStatus = () => {
    // if (!openService) return;
    router.push(`/(app)/(pages)/(services)/(open)/status/${openService?.id}`);
  }

  const goToCancel = () => {
    // if (!openService) return;
    router.push(`/(app)/(pages)/(services)/(open)/cancel/${openService?.id}`);
  }

  useEffect(() => {
    // @ts-ignore
    const houseLat = parseFloat(openService?.address?.latitude);
    // @ts-ignore
    const houseLng = parseFloat(openService?.address?.longitude);

    // @ts-ignore
    const vendorLat = parseFloat(openService?.vendor?.location?.latitude);
    // @ts-ignore
    const vendorLng = parseFloat(openService?.vendor?.location?.longitude);


    setDistance(haversineDistance(houseLat, houseLng, vendorLat, vendorLng));

  },[openService])

  return (
    <DynamicSizingSheet
      type="scrollView"
      style={{
        backgroundColor: Colors.secondary,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      backgroundStyle={{
        backgroundColor: Colors.secondary,
      }}
      handleIndicatorStyle={{
        backgroundColor: Colors.gray_strong,
        width: 60,
      }}
    >
      <View
        onLayout={(event) => {
          const { height } = event.nativeEvent.layout;
          if (onContentHeightChange) onContentHeightChange(height);
        }}
      >
        <View className="flex-row justify-between items-center p-4">
          <View className="flex-row items-center flex-1 pr-3">
            <View className="h-12 w-12 z-[1] rounded-full">
              {openService?.vendor?.user?.avatar?.small ? (
                <Image
                  src={openService?.vendor?.user?.avatar?.small}
                  source={{ uri: openService?.vendor?.user?.avatar?.small }}
                  className="w-full h-full object-cover object-center rounded-full"
                />
              ) : (
                <UserAvatarIcon />
              )}
            </View>
            <View className="h-12 w-12 rounded-full flex items-center justify-center bg-primary relative -left-5">
              <Feather name="tool" size={22} color={Colors.secondary} />
            </View>
            {technicianName && (
              <View className="flex-1 -ml-3">
                <CustomText color="support_secondary" size="large" boldness="semiBold" numberOfLines={1}>
                  {technicianName}
                </CustomText>
              </View>
            )}
          </View>
          <View className="bg-[#7259FF] px-5 h-6 justify-center rounded-full">
            <CustomText size="extraSmall" color="support_secondary" boldness="semiBold" numberOfLines={1}>
              {`${distance.toFixed(2)} Km` || t('services.service.open.no_distance')}
            </CustomText>
          </View>
        </View>
        {/* <View>
          <View className="flex-row justify-between p-4">
            <CustomText color="support_secondary" size="small" boldness="semiBold">
              {t('services.service.open.in_progress')}
            </CustomText>
            <CustomText color="support_primary" size="small" boldness="regular">
              00:18
            </CustomText>
          </View>
          <View className="px-4">
            <View className="h-2 bg-gray_strong rounded-full w-full"></View>
            <View className="h-2 bg-primary left-4 rounded-full w-[30%] absolute"></View>
          </View>
        </View> */}
        <View className="p-4">
            <CustomTouchableOpacity
                onPress={() => goToChat()}
                type="primary_outline"
                size="large"
                text={t('chat.title')}
                textColor="support_secondary"
                Icon={() => (
                    <View className="w-6 h-6 relative">
                        <ChatIcon color={Colors.support_primary} />
                        {unreadServiceMessages > 0 && (
                            <View className="bg-red-500 rounded-full h-3 w-3 absolute -top-1 -right-1" />
                        )}
                    </View>
                )}
            />
          <View className="flex-row justify-between mt-4">
            {(
              openService?.status === ServiceStatus.ACCEPTED ||
              openService?.status === ServiceStatus.ARRIVED
            ) && (
              <View className="w-[48%]">
                <CustomTouchableOpacity
                  onPress={goToCancel}
                  type="support_secondary"
                  size="large"
                  text={t('services.service.open.cancel')}
                  textColor="secondary"
                  textBoldness="semiBold"
                />
              </View>
            )}
            <View className={`${(
              openService?.status === ServiceStatus.ACCEPTED ||
              openService?.status === ServiceStatus.ARRIVED
            ) ? 'w-[48%]' : 'w-full'}`}>
              <CustomTouchableOpacity
                onPress={goToServiceStatus}
                type="support_secondary"
                size="large"
                text={t('services.service.open.status')}
                textColor="secondary"
                textBoldness="semiBold"
              />
            </View>
          </View>
        </View>
      </View>
    </DynamicSizingSheet>
  )
}

export default ServiceInProgress
