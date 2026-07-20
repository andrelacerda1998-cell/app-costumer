import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { AntDesign, Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons'
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
import { renderMoney } from "@/utils/money"

interface VendorsInterface {
  distance: number,
  id: number,
  name: string,
  // nif: string,
  rate: number,
  rating: number
}

const CancelService = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { userData } = useSession();
  const echo = useEcho();
  const { openService, setOpenService, setServicePendingAcceptance, setServiceToRequest } = useService();
  const { openDialog } = useDialog();
  // // const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { serviceId } = useLocalSearchParams();

  const handleCancelService = () => {
    openDialog({
      title: t('services.cancel.title'),
      subtitle: t('services.cancel.subtitle'),
      successButtonText: t('services.cancel.confirm'),
      cancelButtonText: t('services.cancel.cancel'),
      onSuccess() {
        setIsLoading(true);
        api.post(API_ROUTES.POST_CANCEL_SERVICE(serviceId as string))
          .then(() => {
            openDialog({
              title: t('services.wait_accept.canceled.title'),
              subtitle: t('services.wait_accept.canceled.subtitle'),
              closeAfterMSeconds: 3000,
              closeOnClickOutside: false,
              onClose: () => {
                setOpenService(null);
                setServicePendingAcceptance(null);
                setServiceToRequest(null);
                router.dismissAll();
                return router.replace('/(app)/(tabs)/home');
              }
            })
          })
          .catch((error) => {
            // console.log(error, 'error happening on cancel screen')
            openDialog({
              icon: <XIcon color={Colors.secondary} />,
              title: t('errors.title'),
              subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
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

  const getCancellationFee = (amount: number | null) => {
    // if (amount === null) {
    //   return;
    // }

    // const moneyToRender = Math.floor(amount * 10 / 100);

    const cancelationFee = 500;

    return renderMoney(cancelationFee);
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      {/* <StatusBar backgroundColor={Colors.primary} animated /> */}

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {openService?.service_type?.name || ''}
          </CustomText>
        )}
        otherClasses="p-5"
      />

      <View className="bg-secondary p-5 flex-1 rounded-t-3xl space-y-4">
        <View className="flex-1 justify-center items-center">
          <ScrollView className="w-full flex-grow-0">
            <View className="items-center">
              <MaterialIcons name="cancel" size={90} color={Colors.primary} />
            </View>

            <CustomText color="support_secondary" boldness="medium" size="large" numberOfLines={3} classes="text-center mt-4">
              {t('services.cancel.you_are_about_to')}
            </CustomText>

            {/*<CustomText color="support_secondary" boldness="medium" size="title" numberOfLines={3} classes="text-center mt-4">
              {`${getCancellationFee(openService?.amount ?? null)}`}
            </CustomText>*/}
          </ScrollView>
        </View>

        <View>
          <CustomTouchableOpacity
            size="large"
            type="primary"
            textColor="secondary"
            textBoldness="semiBold"
            text={t('services.cancel.confirm_cancellation')}
            onPress={handleCancelService}
            disabled={isLoading}
          />
          {/* <CustomTouchableOpacity
            size="large"
            type="primary_outline"
            textColor="support_secondary"
            textBoldness="semiBold"
            text="Help"
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

export default CancelService;
