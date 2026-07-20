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

const JobDetail = ({ label, value }: {label: string, value: string}) => (
  <View className="flex-row justify-between items-center w-full">
    <View className="w-[45%]">
      <CustomText color="gray_medium" boldness="semiBold" numberOfLines={1}>
        {label}
      </CustomText>
    </View>
    <View className="w-[45%]">
      <CustomText color="support_secondary" size="large" boldness="semiBold" classes="self-end" numberOfLines={1}>
        {value}
      </CustomText>
    </View>
  </View>
);

const Action = ({ Icon, label, onPress }: {Icon: React.FC, label: string, onPress: () => void}) => {
  return (
    <CustomTouchableOpacity
      size="large"
      type="transparent"
      className="w-24 flex items-center justify-start h-full max-h-32"
      onPress={onPress}
    >
      <View className="flex flex-col items-center space-y-2">
        <View className="bg-gray_strong rounded-lg h-14 w-14 p-4 flex items-center justify-center">
          <Icon />
        </View>

        <CustomText size="extraSmall" boldness="semiBold" color="support_secondary" classes="text-center" numberOfLines={3}>
          {label}
        </CustomText>
      </View>
    </CustomTouchableOpacity>
  )
}

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

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <StatusBar style="light" animated />
      <BackHeader
        backButtonColor="support_primary"
        middleItem={() => (
          <View className="flex flex-row items-center">
            <CustomText color="support_secondary" boldness="medium" numberOfLines={1}>
              {t('services.service.status.header')}
            </CustomText>
          </View>
        )}
        // rigthItem={() => (
        //   <View className="flex items-end">
        //     <Feather name="help-circle" size={30} color={Colors.support_secondary} />
        //   </View>
        // )}
        otherClasses="px-5 py-4"
      />
      <ScrollView className="flex-1 px-5 space-y-8">
        <View className="items-center space-y-2 my-6">
          <View className="relative flex items-center justify-center h-14 w-14 mx-auto rounded-full overflow-hidden">
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
          <View className="items-center">
            <CustomText color="support_primary" boldness="semiBold" size="large" numberOfLines={1}>
              {openService?.vendor?.user?.name}
            </CustomText>
            <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center">
              {[openService?.address?.street_name, openService?.address?.street_number].filter(Boolean).join(' ')}
            </CustomText>
            {openService?.address?.additional_info && (
              <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center">
                {openService?.address?.additional_info}
              </CustomText>
            )}
          </View>
        </View>

        <View>
          <View className="items-center">
            <Feather name="tool" size={90} color={Colors.support_secondary} />
          </View>
          <View className="mt-4">
            {openService?.service_type?.name && (
              <CustomText color="primary" boldness="semiBold" size="large" numberOfLines={2} classes="text-center">
                {openService?.service_type?.name}
              </CustomText>
            )}
            {/* <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center">
              {desc(openService?.service_type?.description || "")}
            </CustomText> */}
          </View>
        </View>

        {/* ---todo: add here the include / exclude infos - this comes in serviceToRequest, check if this is filled here */}


        <View className="justify-end items-center space-y-2 py-2">
          {/* <JobDetail label="Time for job" value={`${openService?.service_type?.time || ""} minutes`} /> */}
          <JobDetail
            label={t('services.service.status.distance')}
            value={`${openService?.distance || ""} Km`}
          />
          <JobDetail
            label={t('services.service.status.paid_value')}
            value={renderMoney(openService?.amount || null) || t('wallet.service.no_price_provided')}
          />
        </View>

      </ScrollView>

      {openService?.status === ServiceStatus.FINISHED && (
        <View className="p-5">
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
    </SafeAreaView>
  )
}

export default Status;
