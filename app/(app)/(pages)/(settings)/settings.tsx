import React, { useState, useEffect } from "react";
import { View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Settings from "@/components/app/Profile/Settings";
import { CustomText } from "@/components/CustomText";
import BackHeader from "@/components/app/BackHeader";
import { useTranslation } from "react-i18next"

const SettingsPage = () => {
  
  const { t } = useTranslation();

  return (
    <SafeAreaView
      className={`flex-1 ${
        Platform.OS === "ios" && "h-full"
      } py-4 flex-1`}
      style={{ backgroundColor: "#FAF7F2" }}
    >
      {/* O padding horizontal saiu daqui: somava-se ao do ScrollView e punha
          os cartoes a 40px de cada borda no iOS (e a 20 no Android, porque o
          ScrollView so o aplicava no iOS -- duas larguras diferentes para o
          mesmo ecra). Agora ha um so, no ScrollView, igual nas duas
          plataformas. O cabecalho traz o seu. */}
      <View className="px-5">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t('profile.my_profile.labels.settings')}
            </CustomText>
          )}
          otherClasses="pb-3"
        />
      </View>
       {/* IMPORTANT:this height needs to be tested on iOS to check if it is right. I do not have a way to test it */}
      {/* <View
        className="justify-center mb-8"
        style={{
          flex: 0.4,
        }}
      >
        <View
          className={`${Platform.OS === "ios" ? "mt-3" : "mt-4"} mx-auto`}
        ></View>
      </View> */}

      <Settings />
    </SafeAreaView>
  );
};
export default SettingsPage;
