import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { Entypo } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View } from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { useSession } from '@/contexts/SessionContext'
import { useTranslation } from "react-i18next"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { CustomText } from "@/components/CustomText"
import { useMixpanel } from "@/contexts/MixpanelContext"

const BlockedByZone = () => {
  const { api } = useApi();
  const { t } = useTranslation();
  const { track } = useMixpanel();
  const { userData, setUserData } = useSession();

  useEffect(() => {
    track("blocked_by_zone_viewed");
  }, []);

  const onClose = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/home");
  };

  return (
    <SafeAreaView className="flex-1 bg-support_secondary p-5">

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText size="medium" color="secondary" boldness="bold" numberOfLines={1}>
            {t('session.blocked_by_zone.header')}
          </CustomText>
        )}
        onBack={onClose}
      />

      <ScrollView contentContainerStyle={{
        flexGrow: 1,
        width: "100%",
        justifyContent: "center",
        backgroundColor: Colors.support_secondary,
        borderTopStartRadius: 30,
        borderTopEndRadius: 30,
      }}>
        <View className="flex-1 justify-between">
          <View className="flex-1 justify-center">
            <View className="bg-secondary h-20 w-20 flex items-center justify-center rounded-full self-center mb-4">
              <Entypo name="block" size={28} color={Colors.primary} />
            </View>
            <View>
              <CustomText size="title" color="secondary" boldness="bold" className="text-center">
                {t('session.blocked_by_zone.title')}
              </CustomText>
              <CustomText size="medium" color="gray_medium" className="text-center mt-2">
                {t('session.blocked_by_zone.subtitle')}
              </CustomText>
            </View>
          </View>
          <View>
          <View className="mt-4">
            <CustomText size="medium" color="gray_medium" className="text-center mb-2">
              {t('session.blocked_by_zone.description')}
            </CustomText>
            <CustomTouchableOpacity
              type="primary"
              size="large"
              text={t('session.blocked_by_zone.ok')}
              textSize="medium"
              textColor="secondary"
              textBoldness="semiBold"
              onPress={onClose}
            />
          </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default BlockedByZone;
