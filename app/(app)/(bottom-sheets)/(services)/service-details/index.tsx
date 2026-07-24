import { Colors } from '@/constants/Colors'
import { router } from 'expo-router'
import React from 'react'
import { View } from 'react-native'
import { useTranslation } from "react-i18next"
import { CustomText } from "@/components/CustomText";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useService } from "@/contexts/ServiceContext";
import IDomParser from "advanced-html-parser";
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

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

  const operationArea = serviceToRequest?.service_type?.operation_area?.name;
  const serviceName = serviceToRequest?.service_type?.name;
  const description = renderDescription(serviceToRequest?.service_type?.description || "");

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
        backgroundColor: "#FAF7F2",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{
        backgroundColor: Colors.gray_light,
      }}
      backgroundStyle={{
        backgroundColor: "#FAF7F2",
      }}
      backdropComponent={() => <View style={{ flex: 1, backgroundColor: 'black', opacity: 0.6 }} />}
      enablePanDownToClose
      onClose={onClose}
    >
      <View className="px-5 pt-4 pb-8" style={{ backgroundColor: "#FAF7F2" }}>
        {/* Ícone do serviço */}
        <View className="items-center mb-4">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center"
            style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
          >
            <Ionicons name="flash" size={30} color={Colors.secondary} />
          </View>
        </View>

        {/* Nome do serviço */}
        {!!serviceName && (
          <CustomText color="secondary" size="title" boldness="bold" numberOfLines={2} classes="text-center">
            {serviceName}
          </CustomText>
        )}

        {/* Área de operação */}
        {!!operationArea && (
          <View className="items-center mt-2">
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(250,187,91,0.18)" }}>
              <CustomText size="small" boldness="semiBold" color="secondary" numberOfLines={1}>
                {t('services.service_details.operation_area')} · {operationArea}
              </CustomText>
            </View>
          </View>
        )}

        {/* Descrição */}
        {!!description && (
          <View className="bg-support_secondary rounded-2xl p-4 mt-5" style={CARD_SHADOW}>
            <View className="flex-row items-center mb-2">
              <Feather name="align-left" size={16} color={Colors.secondary} />
              <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2">
                {t('services.service_details.about')}
              </CustomText>
            </View>
            <CustomText color="gray_medium" size="small" boldness="regular">
              {description}
            </CustomText>
          </View>
        )}
      </View>
    </DynamicSizingSheet>
  )
}

export default ServiceDetails;
