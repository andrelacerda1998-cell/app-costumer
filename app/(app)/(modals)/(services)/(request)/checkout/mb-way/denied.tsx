import { Colors } from '@/constants/Colors'
import { AntDesign, Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, FlatList, Image, ImageSourcePropType, Pressable, ScrollView, TouchableOpacity, View } from 'react-native'
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { CustomText } from "@/components/CustomText"
import { useTranslation } from "react-i18next"
import XIcon from "@/assets/icons/x"
import { useService } from "@/contexts/ServiceContext"

const MbWayWaiting = () => {
  const { t } = useTranslation();
  const { serviceToRequest } = useService();

  const goToTryAgainScreen = () => {
    router.dismissTo(`/(app)/(modals)/(services)/(request)/select-vendor/${serviceToRequest?.service_type?.id}`)
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <StatusBar animated style="dark" />

      <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', padding: 20 }}>
        <View className="w-16 h-16">
          <XIcon color={Colors.secondary} />
        </View>

        <View className="space-y-4 mt-8">
          <CustomText size="title" color="secondary" boldness="bold">
            {t("services.checkout.mb_way_denied.title")}
          </CustomText>
          <View>
            <CustomText color="secondary" boldness="regular">
              {t("services.checkout.mb_way_denied.first_description")}
            </CustomText>
            <CustomText color="secondary" boldness="regular">
              {t("services.checkout.mb_way_denied.second_description")}
            </CustomText>
          </View>
        </View>
      </ScrollView>

      <View className="p-5">
        <CustomTouchableOpacity
          size="large"
          type="secondary"
          textColor="primary"
          textBoldness="semiBold"
          text={t("services.checkout.mb_way_denied.try_again")}
          onPress={goToTryAgainScreen}
        />
      </View>

    </SafeAreaView>
  )
}

export default MbWayWaiting;
