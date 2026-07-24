import { Colors } from '@/constants/Colors';
import { Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler, Image, ScrollView, View } from 'react-native';
import BackHeader from '@/components/app/BackHeader';
import { useSession } from '@/contexts/SessionContext';
import { CustomText } from "@/components/CustomText";
import { useService } from "@/contexts/ServiceContext";
import IDomParser from "advanced-html-parser";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import CircledCheckMark from "@/assets/icons/circled-check-mark";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useDialog } from "@/contexts/DialogContext";
import { ServiceStatus } from "@/types/services";
import { router } from "expo-router";
import useEcho from "@/hooks/echo";
import { useTranslation } from "react-i18next";
import UserAvatarIcon from "@/assets/icons/user-avatar";
import XIcon from "@/assets/icons/x";
import { renderMoney } from "@/utils/money";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const JobDetail = ({ label, value }: {label: string, value: string}) => (
  <View className="flex-row justify-between items-center w-full">
    <View className="flex-1 pr-3">
      <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
        {label}
      </CustomText>
    </View>
    <View className="flex-shrink-0 max-w-[55%]">
      <CustomText color="secondary" size="large" boldness="bold" classes="self-end" numberOfLines={1}>
        {value}
      </CustomText>
    </View>
  </View>
);

const Status = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { userData } = useSession();
  const echo = useEcho();
  const { openService, setOpenService } = useService();
  const { openDialog } = useDialog();
  const [isLoading, setIsLoading] = useState(false);

  console.log('service status:', openService?.status);

  const desc = (text: string) => {
    if (text[0] !== "<") return text;
    try {
      const parsed = IDomParser.parse(text);
      return parsed.documentElement?.textContent;
    } catch (error) {
      return text;
    }
  };

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
            setOpenService(null);
          })
          .catch(error => {
            // console.log(error.response, 'message logged out over here')
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

  // console.log({openService})

  const addressLabel = [openService?.address?.street_name, openService?.address?.street_number].filter(Boolean).join(' ');

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <StatusBar style="dark" animated />
      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <View className="flex flex-row items-center">
              <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                {t('services.service.status.header')}
              </CustomText>
            </View>
          )}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Técnico */}
          <View className="items-center mb-6">
            <View className="h-20 w-20 rounded-full items-center justify-center overflow-hidden" style={{ borderWidth: 3, borderColor: Colors.primary }}>
              {openService?.vendor?.user?.avatar?.small ? (
                <Image
                  src={openService?.vendor?.user?.avatar?.small}
                  source={{ uri: openService?.vendor?.user?.avatar?.small }}
                  className="w-full h-full object-cover object-center rounded-full"
                />
              ) : (
                <View className="w-full h-full items-center justify-center" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
                  <Feather name="user" size={34} color={Colors.primary} />
                </View>
              )}
            </View>
            <CustomText color="secondary" boldness="bold" size="large" classes="mt-4 text-center" numberOfLines={1}>
              {openService?.vendor?.user?.name}
            </CustomText>
            {!!addressLabel && (
              <View className="flex-row items-center mt-1">
                <Feather name="map-pin" size={13} color={Colors.gray_medium} />
                <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center ml-1">
                  {addressLabel}
                </CustomText>
              </View>
            )}
            {openService?.address?.additional_info && (
              <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center mt-0.5">
                {openService?.address?.additional_info}
              </CustomText>
            )}
          </View>

          {/* Serviço concluído */}
          <View className="bg-support_secondary rounded-2xl p-6 mb-4 items-center" style={CARD_SHADOW}>
            <View className="w-16 h-16 rounded-full items-center justify-center mb-3" style={{ backgroundColor: "rgba(5,150,105,0.12)" }}>
              <Ionicons name="checkmark-done" size={30} color={Colors.success} />
            </View>
            {openService?.service_type?.name && (
              <CustomText color="secondary" boldness="bold" size="large" numberOfLines={2} classes="text-center">
                {openService?.service_type?.name}
              </CustomText>
            )}
          </View>

          {/* Detalhes */}
          <View className="bg-support_secondary rounded-2xl p-4" style={CARD_SHADOW}>
            <View className="mb-3">
              <JobDetail
                label={t('services.service.status.distance')}
                value={`${openService?.distance || ""} ${t('services.service.history.labels.km')}`}
              />
            </View>
            <JobDetail
              label={t('services.service.status.paid_value')}
              value={renderMoney(openService?.amount || null) || t('wallet.service.no_price_provided')}
            />
          </View>
        </ScrollView>

        {openService?.status === ServiceStatus.FINISHED && (
          <View className="px-5 pb-5 pt-2">
            <CustomTouchableOpacity
              size="large"
              type="primary"
              textColor="secondary"
              textBoldness="semiBold"
              text={t('services.service.status.confirm_it_was_finished')}
              onPress={handleCloseService}
              disabled={isLoading}
            />
          </View>
        )}

        {/* <ServiceInProgress /> */}
      </View>
    </SafeAreaView>
  )
}

export default Status;
