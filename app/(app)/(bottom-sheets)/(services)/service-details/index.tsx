import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import {FlatList, ScrollView, Text, View} from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import { useTranslation } from "react-i18next"
import {CustomText} from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { useSession } from "@/contexts/SessionContext";
import { Feather } from "@expo/vector-icons";
import { useService } from "@/contexts/ServiceContext";
import IDomParser from "advanced-html-parser";
import { StatusBar } from "expo-status-bar";
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet";

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

const ServiceDetails = () => {
  const { t } = useTranslation();
  const { serviceToRequest } = useService();

  const renderDescription = (text: string) => {
    if (text[0] !== "<") return text;
    try {
      const parsed = IDomParser.parse('<div>'+text+'</div>', {onlyBody: true});
      return parsed.documentElement?.textContent;
    } catch (error) {
      return text;
    }
  };

  const onClose = () => {
      if (router.canGoBack()) {
          return router.back();
      }
      return router.push("/(app)/(tabs)/home");
  }

  return (
    <DynamicSizingSheet
      type="scrollView"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
      }}
      handleStyle={{
        backgroundColor: Colors.secondary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{
        backgroundColor: Colors.support_primary,
      }}
      backgroundStyle={{
        backgroundColor: Colors.secondary,
      }}
      backdropComponent={() => <View style={{ flex: 1, backgroundColor: 'black', opacity: 0.6 }} />}
      enablePanDownToClose
      onClose={onClose}
    >
      {/* <StatusBar animated barStyle="light-content" backgroundColor="rgba(134, 134, 134, 0.1)" translucent /> */}
      <View className="bg-secondary space-y-8 px-5 py-10">
        <View className="justify-end items-center">
          <CustomText color="support_primary" boldness="semiBold" size="large" numberOfLines={2} classes="text-center">
            {t('services.service_details.operation_area')}
          </CustomText>
          <CustomText color="gray_medium" boldness="regular" size="medium" numberOfLines={2} classes="text-center">
            {serviceToRequest?.service_type?.operation_area?.name || ""}
          </CustomText>
            {/* <JobDetail label="Time for job" value={`${openService?.service_type?.time || ""} minutes`} /> */}
          {/* <JobDetail
              label={t('services.service.status.distance')}
              value={`${serviceToRequest?.distance || ""} Km`}
          /> */}
            {/*
            <JobDetail
                label={t('services.service.status.estimated_value')}
                value={renderAmount(openService?.amount || null) || t('wallet.service.no_price_provided')}
            /> */}
        </View>

        <View>
          <View className="items-center">
            <Feather name="tool" size={90} color={Colors.support_secondary} />
          </View>
          <View className="mt-4 space-y-4">
            {serviceToRequest?.service_type?.name && (
              <CustomText color="primary" boldness="semiBold" size="large" numberOfLines={2} classes="text-center">
                {serviceToRequest?.service_type?.name}
              </CustomText>
            )}
            <CustomText color="support_secondary" boldness="regular" size="small">
              {renderDescription(serviceToRequest?.service_type?.description || "")}
            </CustomText>
          </View>
        </View>
      </View>
    </DynamicSizingSheet>
  )
}

export default ServiceDetails;
