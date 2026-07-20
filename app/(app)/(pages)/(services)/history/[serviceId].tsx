import { Colors } from '@/constants/Colors';
import { AntDesign, Entypo, Feather, FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler, Image, ScrollView, View } from 'react-native';
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import IDomParser from "advanced-html-parser";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { router } from "expo-router";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import { ServiceInterface, ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import UserAvatarIcon from "@/assets/icons/user-avatar";
import { useLocalSearchParams, useSearchParams } from "expo-router/build/hooks";
import i18n from "@/translation";
import { StatusBar } from "expo-status-bar";
import { useService } from "@/contexts/ServiceContext";
import * as WebBrowser from 'expo-web-browser';
import { renderMoney } from "@/utils/money";

const JobDetail = ({ label, value }: {label: string, value: string}) => (
  <View className="flex-row justify-between mt-4">
    <CustomText color="gray_medium" boldness="semiBold" classes="w-[30%]" numberOfLines={3}>
      {label}
    </CustomText>
    <View className="items-end w-[68%]">
      <CustomText color="support_secondary" size="large" boldness="semiBold" numberOfLines={2}>
        {value}
      </CustomText>
    </View>
  </View>
);

const Status = () => {
  const { t } = useTranslation();
  const { serviceId } = useLocalSearchParams();
  const { historyServices } = useService();
  const [service, setService] = useState<ServiceInterface | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    if (serviceId) {
      const newService = historyServices.find((service: ServiceInterface) => Number(service.id) === Number(serviceId));
      if (newService) {
        setService(newService);
      }
    }
    setIsLoading(false);
  }, [historyServices])

  const desc = (text: string) => {
    if (text[0] !== "<") return text;
    try {
      const parsed = IDomParser.parse(text);
      return parsed.documentElement?.textContent;
    } catch (error) {
      return text;
    }
  };

  const renderDate = (date: string) => {
    const parsedDate = new Date(date);
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    const locale = i18n.language === 'pt_PT' ? 'pt-PT' : 'en-US';
    const formattedDate = parsedDate.toLocaleDateString(locale, dateOptions);

    return formattedDate.replace(',', ' |');
  }

  const goToRateService = (service: ServiceInterface) => {
    router.push({
      pathname: "/(app)/(bottom-sheets)/(services)/rate/[serviceId]",
      params: {
        serviceId: service.id,
        service: JSON.stringify(service),
      },
    });
  }

  const handleDownloadInvoice = async () => {
      if (service?.invoice) {
          await WebBrowser.openBrowserAsync(service?.invoice);
      }
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <StatusBar style="light" />
      <BackHeader
        backButtonColor="support_secondary"
        middleItem={() => (
          <View className="flex flex-row items-center">
            <CustomText color="support_secondary" boldness="medium" numberOfLines={1}>
              {t('services.service.history.header')}
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
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          justifyContent: "space-between",
        }}
        className="px-5"
      >
        <View className="flex-1">
          <View className="items-center space-y-2 py-6">
            {isLoading ? (
              <View className="rounded-full overflow-hidden w-14 h-14">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
            ) : (
              <View className="relative flex items-center justify-center h-14 w-14 mx-auto rounded-full overflow-hidden">
                {service?.vendor?.user?.avatar?.small ? (
                  <Image
                    src={service?.vendor?.user?.avatar?.small}
                    source={{ uri: service?.vendor?.user?.avatar?.small }}
                    className="w-full h-full object-cover object-center rounded-full"
                  />
                ) : (
                  <UserAvatarIcon />
                )}
              </View>
            )}

            {isLoading ? (
              <View className="items-center w-full">
                <View className="rounded-full overflow-hidden w-[50%] h-6">
                  <View className="w-full h-full bg-[#111215]"></View>

                </View>
                <View className="rounded-full overflow-hidden w-[70%] h-4 mt-2">
                  <View className="w-full h-full bg-[#111215]"></View>
                </View>
              </View>
            ) : (
              <View>
                <CustomText color="support_secondary" boldness="semiBold" size="large" numberOfLines={1} classes="text-center">
                  {service?.vendor?.user?.name}
                </CustomText>
                <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center">
                  {[service?.address?.street_name, service?.address?.street_number].filter(Boolean).join(' ')}
                </CustomText>
                {service?.address?.additional_info && (
                  <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center">
                    {service?.address?.additional_info}
                  </CustomText>
                )}
              </View>
            )}
          </View>


          <View className="flex-1 items-center justify-center">
            {isLoading ? (
              <View className="w-full">
                <View className="items-center">
                  <View className="rounded-full overflow-hidden w-24 h-24 mt-2">
                    <View className="w-full h-full bg-[#111215]"></View>
                  </View>
                </View>
                <View className="items-center mt-4">
                  <View className="rounded-full overflow-hidden w-[50%] h-6">
                    <View className="w-full h-full bg-[#111215]"></View>
                  </View>
                  <View className="rounded-full overflow-hidden w-[70%] h-4 mt-2">
                    <View className="w-full h-full bg-[#111215]"></View>
                  </View>
                </View>
              </View>
            ) : (
              <View className="w-full">
                <View className="items-center">
                  <Feather name="tool" size={90} color={Colors.support_secondary} />
                </View>
                <View className="mt-4">
                  {service?.service_type?.name && (
                    <CustomText color="primary" boldness="semiBold" size="large" numberOfLines={2} classes="text-center">
                      {service?.service_type?.name}
                    </CustomText>
                  )}
                  <CustomText color="gray_medium" boldness="regular" size="small" numberOfLines={2} classes="text-center">
                    {desc(service?.service_type?.description || "")}
                  </CustomText>
                </View>
              </View>
            )}
          </View>
        </View>

        {isLoading ? (
          <View>
            <View className="flex-row justify-between items-center mt-4">
              <View className="rounded-full overflow-hidden w-[33%] h-6">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
              <View className="rounded-full overflow-hidden w-[20%] h-6">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-4">
              <View className="rounded-full overflow-hidden w-[30%] h-6">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
              <View className="rounded-full overflow-hidden w-[50%] h-6">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-4">
              <View className="rounded-full overflow-hidden w-[35%] h-6">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
              <View className="rounded-full overflow-hidden w-[40%] h-6">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <JobDetail
              label={t('services.service.history.labels.kilometers')}
              value={`${service?.distance || ""} ${t('services.service.history.labels.km')}`}
            />
            <JobDetail
              label={t('services.service.history.labels.paid_value')}
              value={renderMoney(service?.amount || null) || t('wallet.service.no_price_provided')}
            />
            <JobDetail
              label={t('services.service.history.labels.date')}
              value={renderDate(service?.created_at as string)}
            />
          </View>
        )}

      </ScrollView>
      <View className="p-5 space-y-5">

        {service?.rating_by_customer !== null && service?.rating_by_customer !== undefined && service?.rating_by_customer >= 0 ? (
          <View className="items-center flex-row space-x-2 justify-center">
            <AntDesign name="star" size={40} color={service?.rating_by_customer >= 1 ? Colors.primary : Colors.gray_medium} />
            <AntDesign name="star" size={40} color={service?.rating_by_customer >= 2 ? Colors.primary : Colors.gray_medium} />
            <AntDesign name="star" size={40} color={service?.rating_by_customer >= 3 ? Colors.primary : Colors.gray_medium} />
            <AntDesign name="star" size={40} color={service?.rating_by_customer >= 4 ? Colors.primary : Colors.gray_medium} />
            <AntDesign name="star" size={40} color={service?.rating_by_customer >= 5 ? Colors.primary : Colors.gray_medium} />
          </View>
        ) : service?.status === ServiceStatus.CLOSED ? (
          <View>
            <CustomTouchableOpacity
              size="large"
              type="primary"
              textColor="secondary"
              textBoldness="bold"
              text={t('services.service.history.rate_service')}
              onPress={() => {
                if(service) goToRateService(service);
              }}
            />
          </View>
        ) : null}

        {service?.invoice && (
          <View>
            <CustomTouchableOpacity
              size="large"
              type="primary_outline"
              textColor="support_secondary"
              textBoldness="semiBold"
              text={t('services.service.history.download_invoice')}
              Icon={() => (
                <FontAwesome5 name="file-image" size={24} color={Colors.primary} />
              )}
              onPress={handleDownloadInvoice}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

export default Status;
