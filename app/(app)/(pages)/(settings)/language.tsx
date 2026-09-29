import React from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import TouchOpacity from "@/components/TouchOpacity";
import { Colors } from "@/constants/Colors";
import { IDIOMAS, setAppLanguage } from "@/translation";

/**
 * Escolher o idioma da app.
 *
 * Nas Definições isto era um controlo segmentado com quatro códigos —
 * `PT EN FR ES` — e quatro abreviaturas lado a lado obrigam a decifrar: quem
 * não sabe que "ES" é espanhol tem de adivinhar. Num ecrã próprio cabem os
 * nomes por extenso, e cada um na sua língua.
 *
 * Aplica no toque e não exige confirmar: a mudança é imediata, visível, e
 * desfaz-se tocando noutro. Um botão "Guardar" aqui seria uma cerimónia a
 * mais para uma escolha reversível.
 */
const LanguagePage = () => {
  const { t, i18n } = useTranslation();

  return (
    <SafeAreaView
      className={`flex-1 ${Platform.OS === "ios" && "h-full"} py-4`}
      style={{ backgroundColor: "#FAF7F2" }}
    >
      <View className="px-5">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("profile.settings.language_title")}
            </CustomText>
          )}
          otherClasses="pb-3"
        />
      </View>

      <View style={{ paddingHorizontal: 10 }}>
        <CustomText color="gray_medium" size="extraSmall" classes="ml-1 mb-1.5">
          {t("profile.settings.language_hint")}
        </CustomText>

        <View
          className="bg-support_secondary rounded-2xl px-4"
          style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
        >
          {IDIOMAS.map((idioma, i, arr) => {
            const activo = i18n.language === idioma.code;
            return (
              <TouchOpacity
                key={idioma.code}
                onPress={() => setAppLanguage(idioma.code)}
                otherClasses="flex-row items-center py-3.5"
                style={{
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.support_primary,
                }}
              >
                {/* O código fica no lugar do ícone: é a etiqueta curta que a
                    pessoa já viu nas Definições, e serve de âncora entre os
                    dois ecrãs. */}
                <View
                  className="h-9 w-9 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: activo ? Colors.primary : "rgba(250,187,91,0.2)" }}
                >
                  <CustomText color="secondary" size="extraSmall" boldness="bold">
                    {idioma.label}
                  </CustomText>
                </View>

                <CustomText
                  color="secondary"
                  size="small"
                  boldness={activo ? "bold" : "semiBold"}
                  classes="flex-1"
                  numberOfLines={1}
                >
                  {idioma.name}
                </CustomText>

                {/* O visto só aparece no activo. Um radio vazio em cada linha
                    dizia a mesma coisa e enchia o ecrã de círculos. */}
                {activo && <Ionicons name="checkmark" size={20} color={Colors.secondary} />}
              </TouchOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LanguagePage;
