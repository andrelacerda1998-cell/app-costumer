import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { AntDesign, Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, FlatList, Image, ImageSourcePropType, Pressable, ScrollView, TouchableOpacity, View } from 'react-native'
import TouchOpacity from '@/components/TouchOpacity'
import BackHeader from '@/components/app/BackHeader'
import UrgentServiceSelector from '@/components/app/Services/service-card-selector'
import { Picker, PickerIOS } from '@react-native-picker/picker'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'
import { useSession } from '@/contexts/SessionContext'
import useEcho from '@/hooks/echo'
import VendorCard from '@/components/app/Services/vendor-card-selector'
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { CustomText } from "@/components/CustomText"
import { useService } from "@/contexts/ServiceContext"
import ChatIcon from "@/assets/icons/chat"
import { useDialog } from "@/contexts/DialogContext"
import { useTranslation } from "react-i18next"
import XIcon from "@/assets/icons/x"

interface VendorsInterface {
  distance: number,
  id: number,
  name: string,
  // nif: string,
  rate: number,
  rating: number
}

const CloseService = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { userData } = useSession();
  const echo = useEcho();
  const { openService, setOpenService, getHistoryServices } = useService();
  const { openDialog } = useDialog();
  // // const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCloseService = () => {
    openDialog({
      title: t('services.close.confirmation.title'),
      subtitle: t('services.close.confirmation.subtitle'),
      successButtonText: t('services.close.confirmation.confirm'),
      cancelButtonText: t('services.close.confirmation.cancel'),
      onSuccess() {
        setIsLoading(true);
        api.post(API_ROUTES.POST_CLOSE_SERVICE(openService?.id as string))
          .then(({ data }) => {
            const service = data.data.service;
            if (echo) echo.leaveChannel(`common.services.${service.id}`);
            router.dismissTo('/(app)/(tabs)/home');
            router.navigate({
              pathname: `/(app)/(bottom-sheets)/(services)/rate/[serviceId]`,
              params: {
                serviceId: service.id,
                service: JSON.stringify(service),
              },
            })
            getHistoryServices(0);
            setOpenService(null);
          })
          .catch(error => {
            openDialog({
              icon: <XIcon color={Colors.secondary} />,
              title: t('services.close.error.title'),
              subtitle: t('services.close.error.subtitle'),
              closeAfterMSeconds: 2000,
              closeOnClickOutside: true,
            })
          })
          .finally(() => {
            setIsLoading(false);
          });
      },
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <StatusBar style="dark" animated />

      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <View
              // size="small"
              // type="transparent"
              className="flex flex-row items-center"
              // onPress={() => router.navigate('/(app)/(modals)/(address)/update')}
            >
              <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                {userData?.address ? ([userData.address.street_name, userData.address.street_number].filter(Boolean).join(' ') || userData.address.name || userData.address.city || '') : t('general.no_address')}
              </CustomText>
              {/* <Entypo name="chevron-down" size={20} color={Colors.secondary} /> */}
            </View>
          )}
          // rigthItem={() => (
          //   <View className="flex items-end">
          //     <Feather name="help-circle" size={30} color={Colors.secondary} />
          //   </View>
          // )}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        <View className="flex-1 justify-center items-center px-5">
          <ScrollView className="w-full flex-grow-0" contentContainerStyle={{ alignItems: "center" }} showsVerticalScrollIndicator={false}>
            <View
              className="bg-support_secondary rounded-2xl px-6 py-8 items-center w-full"
              style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
            >
              <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: "rgba(5,150,105,0.12)" }}>
                <Ionicons name="checkmark-done" size={38} color={Colors.success} />
              </View>

              <CustomText color="secondary" boldness="bold" size="large" numberOfLines={3} classes="text-center">
                {t('services.close.title')}
              </CustomText>
            </View>
          </ScrollView>
        </View>

        <View className="px-5 pb-5 pt-2">
          <CustomTouchableOpacity
            size="large"
            type="primary"
            textColor="secondary"
            textBoldness="semiBold"
            text={t('services.close.confirm')}
            onPress={handleCloseService}
            disabled={isLoading}
          />

          {/* <CustomTouchableOpacity
            size="large"
            type="primary_outline"
            textColor="support_secondary"
            textBoldness="semiBold"
            text={t('services.close.help')}
            disabled={isLoading}
            // onPress={openService}
            Icon={() => (
              <View className="w-6 h-6">
                <ChatIcon color={Colors.primary} />
              </View>
            )}
          /> */}
        </View>
      </View>

    </SafeAreaView>
  )
}

export default CloseService;
