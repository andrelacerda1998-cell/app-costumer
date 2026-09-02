import React from "react";
import { Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

/**
 * Convite a criar conta, nos separadores que não fazem sentido sem ela.
 *
 * O Histórico e a Conta tinham cada um a sua versão deste ecrã — 125 e 130
 * linhas, com heros, listas de vantagens e provas sociais diferentes para
 * dizerem a mesma coisa. Passa a haver um só, com o título e o subtítulo
 * a mudar conforme o separador.
 *
 * O desenho é deliberadamente curto: logótipo, uma frase, três vantagens numa
 * linha, o selo de segurança e as duas ações. Quem chega aqui não quer ler —
 * quer decidir se cria conta.
 */

const LOGO = require("@/assets/images/icon.png");

type Props = {
  title: string;
  subtitle: string;
};

const BENEFITS = [
  { icon: "clock" as const, key: "service_history" },
  { icon: "map-pin" as const, key: "saved_address" },
  { icon: "credit-card" as const, key: "payment_methods" },
];

const GuestGate = ({ title, subtitle }: Props) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: Math.max(insets.bottom, 16) + 96,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              backgroundColor: Colors.support_secondary,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 3,
              overflow: "hidden",
            }}
          >
            <Image source={LOGO} style={{ width: 88, height: 88 }} resizeMode="contain" />
          </View>

          <CustomText size="subtitle" color="secondary" boldness="bold" classes="text-center mt-6">
            {title}
          </CustomText>
          <CustomText size="small" color="gray_strong" boldness="regular" classes="text-center mt-2">
            {subtitle}
          </CustomText>
        </View>

        {/* Três vantagens numa linha: dizem o que se ganha sem virar lista. */}
        <View className="flex-row items-start justify-between mt-10">
          {BENEFITS.map((benefit, index) => (
            <View key={benefit.key} className="flex-1 items-center px-1">
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: Colors.support_secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={benefit.icon} size={22} color={Colors.primary} />
              </View>
              <CustomText
                size="extraSmall"
                color="gray_strong"
                boldness="regular"
                numberOfLines={2}
                classes="text-center mt-2"
              >
                {t(`auth.home.benefits.${benefit.key}`)}
              </CustomText>
              {index < BENEFITS.length - 1 && (
                <View
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 8,
                    width: 1,
                    height: 36,
                    backgroundColor: Colors.support_primary,
                  }}
                />
              )}
            </View>
          ))}
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: Colors.support_primary,
            marginTop: 24,
            marginBottom: 16,
          }}
        />

        <View className="flex-row items-center justify-center">
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
          <CustomText size="small" color="gray_strong" boldness="regular" classes="ml-2">
            {t("auth.home.benefits.secure_account")}
          </CustomText>
        </View>
      </ScrollView>

      <View
        className="px-6"
        style={{
          paddingBottom: Math.max(insets.bottom, 12),
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
            {t("auth.home.access_account")}
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default GuestGate;
