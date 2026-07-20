import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View } from "react-native";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import { useTranslation } from "react-i18next";

const CardConfirmed = () => {
  const { t } = useTranslation();

  const goToHomepage = () => {
    router.dismissTo({ pathname: "/(app)/(tabs)/home" });
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <StatusBar animated style="dark" />

      <ScrollView
        contentContainerStyle={{ flex: 1, justifyContent: "center", padding: 20 }}
      >
        <View>
          <Feather name="check" size={110} color={Colors.secondary} />
        </View>

        <View className="space-y-4 mt-8">
          <CustomText size="title" color="secondary" boldness="bold">
            {t("services.checkout.card_confirmed.title")}
          </CustomText>
          <View>
            <CustomText color="secondary" boldness="regular">
              {t("services.checkout.card_confirmed.first_description")}
            </CustomText>
            <CustomText color="secondary" boldness="regular">
              {t("services.checkout.card_confirmed.second_description")}
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
          text={t("services.checkout.card_confirmed.go_to_homepage")}
          onPress={goToHomepage}
        />
      </View>
    </SafeAreaView>
  );
};

export default CardConfirmed;
