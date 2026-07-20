import { useService } from "@/contexts/ServiceContext";
import React from 'react'
import { View } from "react-native"
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { CustomText } from "../CustomText";
import ArrowIcon from "@/assets/icons/arrow";
import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

const ServiceWaitingAcceptance = () => {
  const { t } = useTranslation();
  const { servicePendingAcceptance } = useService();

  return (
    <View className="px-5 my-2">
      <CustomTouchableOpacity
        size="large"
        type="secondary"
        onPress={() => {
          if (servicePendingAcceptance?.id) {
            router.navigate(`/(app)/(modals)/(services)/(request)/wait-accept/${servicePendingAcceptance?.id}`);
          }
          // router.navigate(`/(app)/(services)/(open)/progress/${openService?.id}`);
        }}
      >
        <View className="flex-row items-center gap-4">
          <View className="p-2 items-center justify-center rounded-lg">
            <Feather name="clock" size={24} color={Colors.primary} />
          </View>
          <View className="flex-1">
            <CustomText color="primary" size="small" boldness="bold" numberOfLines={1}>{servicePendingAcceptance?.service_type?.name}</CustomText>
            <CustomText color="gray_medium" size="extraSmall" boldness="regular" numberOfLines={1}>{t('services.service.pending')}</CustomText>
          </View>
          <View className="h-4 w-4">
            <ArrowIcon position="right" color={Colors.gray_medium} />
          </View>
        </View>
      </CustomTouchableOpacity>
    </View>
  )
}

export default ServiceWaitingAcceptance