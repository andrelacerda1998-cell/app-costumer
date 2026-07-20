import { useService } from "@/contexts/ServiceContext";
import React from 'react'
import { View } from "react-native"
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { CustomText } from "../CustomText";
import ArrowIcon from "@/assets/icons/arrow";
import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";

const OpenService = () => {
  const { t } = useTranslation();
  const { openService } = useService();

  return (
    <View className="px-5 my-2">
      <CustomTouchableOpacity
        size="large"
        type="secondary"
        onPress={() => {
          router.navigate(`/(app)/(pages)/(services)/(open)/progress/${openService?.id}`);
        }}
      >
        <View className="flex-row items-center gap-4">
          <View className="p-2 items-center justify-center rounded-lg">
            <Feather name="tool" size={24} color={Colors.primary} />
          </View>
          <View className="flex-1">
            <CustomText color="primary" size="small" boldness="bold" numberOfLines={1}>{openService?.service_type?.name}</CustomText>
            <CustomText color="gray_medium" size="extraSmall" boldness="regular" numberOfLines={1}>
              {openService?.status === ServiceStatus.ACCEPTED && t('services.service.open.in_progress')}
              {openService?.status === ServiceStatus.FINISHED && t('services.service.open.finished')}
              {openService?.status === ServiceStatus.ARRIVED && t('services.service.open.arrived')}
            </CustomText>
          </View>
          <View className="h-4 w-4">
            <ArrowIcon position="right" color={Colors.gray_medium} />
          </View>
        </View>
      </CustomTouchableOpacity>
    </View>
  )
}

export default OpenService