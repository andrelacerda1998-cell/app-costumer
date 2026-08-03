import React from "react";
import { View } from "react-native";
import { router, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { Colors } from "@/constants/Colors";

/**
 * Ecrã de rota não encontrada.
 *
 * Sem este ficheiro, o Expo Router mostrava o seu ecrã de developer — fundo
 * preto, texto em inglês ("Unmatched Route") e um link "Sitemap" que expõe a
 * estrutura interna de rotas da app (auditoria 2026-08-03). Qualquer link mal
 * formado numa campanha, email ou versão antiga da app levava o cliente lá.
 */
const NotFoundScreen = () => {
  const { t } = useTranslation();

  const goHome = () => {
    router.dismissAll?.();
    router.replace("/(app)/(tabs)/home");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }}>
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-5"
            style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
          >
            <Feather name="compass" size={34} color={Colors.secondary} />
          </View>

          <CustomText color="secondary" size="title" boldness="bold" classes="text-center">
            {t("errors.not_found.title")}
          </CustomText>
          <CustomText
            color="gray_medium"
            size="medium"
            boldness="regular"
            classes="text-center mt-2"
          >
            {t("errors.not_found.subtitle")}
          </CustomText>
        </View>

        <View className="px-5 pb-6">
          <CustomTouchableOpacity
            size="large"
            type="primary"
            textColor="secondary"
            textBoldness="bold"
            text={t("errors.not_found.go_home")}
            onPress={goHome}
          />
        </View>
      </SafeAreaView>
    </>
  );
};

export default NotFoundScreen;
