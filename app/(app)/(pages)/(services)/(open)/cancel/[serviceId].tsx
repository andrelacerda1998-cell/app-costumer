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
import { isCancellationChargeable, cancellationChargeAmount } from "@/utils/cancellationCharge";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

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

  // Quem decide a cobrança é o backend (CancellationPolicy); isto espelha a
  // regra só para o cliente saber ao que vai antes de confirmar.
  const willBeCharged = isCancellationChargeable(openService);
  const chargeAmount = cancellationChargeAmount(openService);

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {openService?.service_type?.name || ''}
            </CustomText>
          )}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center">
            {/* Ícone de aviso */}
            <View className="items-center mb-6">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(237,73,73,0.12)" }}
              >
                <Feather name="alert-triangle" size={36} color={Colors.error} />
              </View>
            </View>

            <CustomText color="secondary" boldness="bold" size="title" numberOfLines={3} classes="text-center">
              {willBeCharged
                ? t('services.cancel.you_are_about_to_charged')
                : t('services.cancel.you_are_about_to')}
            </CustomText>

            {/* Com o técnico a caminho ou no local, cancelar cobra 100%. O
                cliente tem de ver o valor ANTES de confirmar — dizer só que
                "podem existir custos" é esconder uma cobrança certa. */}
            {willBeCharged && (
              <View
                className="rounded-2xl p-4 mt-6"
                style={{ backgroundColor: "rgba(237,73,73,0.08)", borderWidth: 1, borderColor: Colors.error }}
              >
                <View className="flex-row items-center">
                  <Feather name="alert-circle" size={20} color={Colors.error} />
                  <CustomText color="error" size="medium" boldness="bold" classes="ml-2 flex-1">
                    {chargeAmount !== null
                      ? t('services.cancel.charge_title_amount', { amount: renderMoney(chargeAmount) })
                      : t('services.cancel.charge_title')}
                  </CustomText>
                </View>
                <CustomText color="gray_strong" size="small" boldness="regular" classes="mt-2">
                  {t('services.cancel.charge_explanation')}
                </CustomText>
              </View>
            )}

            {/* Avisos: horário reservado + custos possíveis */}
            <View className="bg-support_secondary rounded-2xl p-4 mt-4" style={CARD_SHADOW}>
              <View className="flex-row items-start">
                <Feather name="clock" size={18} color={Colors.gray_medium} style={{ marginTop: 1 }} />
                <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-3 flex-1">
                  {t('services.cancel.notice_reserved')}
                </CustomText>
              </View>
              {!willBeCharged && (
                <View className="flex-row items-start mt-3">
                  <Feather name="credit-card" size={18} color={Colors.gray_medium} style={{ marginTop: 1 }} />
                  <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-3 flex-1">
                    {t('services.cancel.notice_fees')}
                  </CustomText>
                </View>
              )}
            </View>
          </View>

          <View className="mt-6">
            <CustomTouchableOpacity
              size="large"
              type="primary"
              textColor="secondary"
              textBoldness="semiBold"
              text={willBeCharged && chargeAmount !== null
                ? t('services.cancel.confirm_with_charge', { amount: renderMoney(chargeAmount) })
                : t('services.cancel.confirm_cancellation')}
              onPress={handleCancelService}
              disabled={isLoading}
            />
          </View>
        </ScrollView>
      </View>

    </SafeAreaView>
  )
}

export default CancelService;
