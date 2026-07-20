import { Colors } from "@/constants/Colors";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View } from "react-native";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import { useTranslation } from "react-i18next";
import XIcon from "@/assets/icons/x";
import { useService } from "@/contexts/ServiceContext";

const CardDenied = () => {
  const { t } = useTranslation();
  const { serviceToRequest } = useService();

  // Voltar ao checkout (não a select-vendor) com o rascunho preservado no ServiceContext,
  // para o cliente tentar de novo sem reescolher o vendor nem repreencher o formulário.
  const goToTryAgainScreen = () => {
    const serviceTypeId = serviceToRequest?.service_type?.id;
    if (!serviceTypeId) {
      router.dismissAll();
      router.replace("/(app)/(tabs)/home");
      return;
    }
    const pathname = `/(app)/(modals)/(services)/(request)/checkout/${serviceTypeId}`;
    try {
      router.dismissTo(pathname as any);
    } catch {
      try {
        router.replace(pathname as any);
      } catch {
        router.replace("/(app)/(tabs)/home");
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <StatusBar animated style="dark" />

      <ScrollView
        contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 20 }}
      >
        <View className="w-16 h-16">
          <XIcon color={Colors.secondary} />
        </View>

        <View className="space-y-4 mt-8">
          <CustomText size="title" color="secondary" boldness="bold">
            {t("services.checkout.card_denied.title")}
          </CustomText>
          <View>
            <CustomText color="secondary" boldness="regular">
              {t("services.checkout.card_denied.first_description")}
            </CustomText>
            <CustomText color="secondary" boldness="regular">
              {t("services.checkout.card_denied.second_description")}
            </CustomText>
          </View>
        </View>
      </ScrollView>

      <View className="p-5">
        <CustomTouchableOpacity
          size="large"
          type="secondary"
          textColor="primary"
          textBoldness="semiBold"
          text={t("services.checkout.card_denied.try_again")}
          onPress={goToTryAgainScreen}
        />
      </View>
    </SafeAreaView>
  );
};

export default CardDenied;
