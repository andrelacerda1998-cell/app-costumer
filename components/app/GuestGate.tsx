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
      {/* Um bloco só, centrado: logótipo, o que se ganha e as duas ações.
          Antes eram três zonas separadas — título encostado ao topo com margem
          fixa, logótipo a flutuar no meio do que sobrava e botões colados ao
          fundo — e o olho tinha de saltar entre elas. Junto, lê-se de uma vez.

          O espaço da barra de separadores entra no cálculo, senão o conjunto
          ficava centrado no ecrã inteiro e visualmente baixo. */}
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 56 }}
      >
        <Image
          source={LOGO}
          style={{ width: 104, height: 104, borderRadius: 24 }}
          resizeMode="contain"
        />

        <CustomText size="title" color="secondary" boldness="bold" classes="text-center mt-6">
          {title}
        </CustomText>
        <CustomText size="medium" color="gray_strong" boldness="regular" classes="text-center mt-2">
          {subtitle}
        </CustomText>

        <View className="w-full mt-8">
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
      </View>
    </SafeAreaView>
  );
};

export default GuestGate;
