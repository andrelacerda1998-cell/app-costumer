import React from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

const LOGO = require("@/assets/images/icon.png");

/**
 * Convite a criar conta, nos separadores que não fazem sentido sem ela.
 *
 * O Histórico e a Conta tinham cada um a sua versão deste ecrã. Passa a haver
 * um só, com o título e o subtítulo a mudar conforme o separador.
 *
 * Uma frase, um símbolo e duas ações. A lista de vantagens que aqui estava
 * ("histórico", "morada guardada", "métodos de pagamento") dizia por outras
 * palavras o que o subtítulo já diz, e enchia o ecrã de coisas para ler a quem
 * só tem uma decisão a tomar.
 */

type Props = {
  title: string;
  subtitle: string;
};

const GuestGate = ({ title, subtitle }: Props) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={["top", "left", "right"]}>
      <View className="flex-1 px-6">
        <View className="items-center" style={{ marginTop: 72 }}>
          <CustomText size="title" color="secondary" boldness="bold" classes="text-center">
            {title}
          </CustomText>
          <CustomText size="medium" color="gray_strong" boldness="regular" classes="text-center mt-3">
            {subtitle}
          </CustomText>
        </View>

        {/* O logótipo ocupa o meio do ecrã: dá centro à composição sem
            acrescentar mais nada para ler. */}
        <View className="flex-1 items-center justify-center">
          <Image
            source={LOGO}
            style={{ width: 132, height: 132, borderRadius: 30 }}
            resizeMode="contain"
          />
        </View>
      </View>

      <View
        className="px-6"
        style={{
          // + a altura da barra de separadores, que flutua por cima do ecrã:
          // sem isto o "Já tenho conta" ficava encostado a ela.
          paddingBottom: Math.max(insets.bottom, 12) + 40,
          paddingTop: 12,
          backgroundColor: "#FAF7F2",
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={() => router.navigate("/(auth)/signup")}
          className="rounded-full items-center justify-center"
          style={{
            paddingVertical: 16,
            backgroundColor: Colors.primary,
            shadowColor: Colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 5,
          }}
        >
          <CustomText size="large" color="secondary" boldness="bold" numberOfLines={1}>
            {t("auth.home.create_account")}
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={() => router.navigate("/(auth)/signin")}
          className="rounded-full items-center justify-center mt-3"
          style={{ paddingVertical: 15, borderWidth: 1.5, borderColor: Colors.secondary }}
        >
          <CustomText size="large" color="secondary" boldness="bold" numberOfLines={1}>
            {t("auth.home.have_account")}
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default GuestGate;
