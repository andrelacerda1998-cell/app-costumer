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
          otherClasses="pb-6"
        />
      </View>

      <View style={{ paddingHorizontal: 10 }}>
        {/* O copy com peso.
            Estava em `extraSmall` cinzento-medio, do tamanho de uma legenda --
            e e a unica frase do ecra que explica o que a escolha faz. Sobe a
            `small`, passa a gray_strong e ganha entrelinha: le-se como uma
            introducao, nao como uma nota de rodape.

            E respira: 24px ate a lista, contra os 6 de antes. O titulo, o
            texto e a escolha passam a ser tres tempos e nao um bloco. */}
        <CustomText
          color="gray_strong"
          size="medium"
          boldness="regular"
          classes="ml-1 mb-6 mr-4"
          style={{ lineHeight: 24 }}
        >
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
                otherClasses="flex-row items-center py-4"
                style={{
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.support_primary,
                }}
              >
                {/* A bandeira reconhece-se antes de se ler. O quadrado por
                    baixo marca o activo -- sem ele, a unica diferenca entre a
                    linha escolhida e as outras era o visto la ao fundo. */}
                <View
                  className="h-11 w-11 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: activo ? Colors.primary : "rgba(250,187,91,0.2)" }}
                >
                  <CustomText color="secondary" size="large">{idioma.flag}</CustomText>
                </View>

                {/* 18px e nao 14: e a escolha do ecra, e nao havia razao para
                    ser do tamanho de uma linha de lista qualquer. */}
                <CustomText
                  color="secondary"
                  size="large"
                  boldness={activo ? "bold" : "semiBold"}
                  numberOfLines={1}
                >
                  {idioma.name}
                </CustomText>

                {/* O codigo curto fica, em cinzento: e a etiqueta que a pessoa
                    vai reencontrar noutros sitios, e desambigua a bandeira
                    para quem nao a reconheca. */}
                <CustomText color="gray_medium" size="small" classes="ml-2 flex-1">
                  {idioma.label}
                </CustomText>

                {/* O visto só aparece no activo. Um radio vazio em cada linha
                    dizia a mesma coisa e enchia o ecrã de círculos. */}
                {activo && <Ionicons name="checkmark" size={22} color={Colors.secondary} />}
              </TouchOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LanguagePage;
