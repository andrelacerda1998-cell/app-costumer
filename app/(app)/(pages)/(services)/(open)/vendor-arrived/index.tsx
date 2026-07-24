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
import { useTranslation } from "react-i18next"

interface VendorsInterface {
  distance: number,
  id: number,
  name: string,
  // nif: string,
  rate: number,
  rating: number
}

const VendorArrived = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { userData } = useSession();

  const { openService } = useService();

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <View className="flex flex-row items-center">
              <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                {userData?.address ? ([userData.address.street_name, userData.address.street_number].filter(Boolean).join(' ') || userData.address.name || userData.address.city || '') : t('general.no_address')}
              </CustomText>
            </View>
          )}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center">
            {/* Ícone: profissional chegou */}
            <View className="items-center mb-6">
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(5,150,105,0.12)" }}
              >
                <Ionicons name="location-sharp" size={44} color={Colors.success} />
              </View>
            </View>

            <CustomText color="secondary" boldness="bold" size="title" numberOfLines={3} classes="text-center">
              {t('services.service.vendor_arrived.title')}
            </CustomText>
            <CustomText color="gray_medium" boldness="regular" size="medium" numberOfLines={3} classes="text-center mt-3">
              {t('services.service.vendor_arrived.subtitle')}
            </CustomText>
          </View>

          <View className="mt-6">
            <CustomTouchableOpacity
              size="large"
              type="primary"
              textColor="secondary"
              textBoldness="semiBold"
              text={t('services.service.vendor_arrived.continue')}
              onPress={() => {
                router.dismissTo(`/(app)/(pages)/(services)/(open)/progress/${openService?.id}`);
              }}
            />
          </View>
        </ScrollView>
      </View>

    </SafeAreaView>
  )
}

export default VendorArrived;
