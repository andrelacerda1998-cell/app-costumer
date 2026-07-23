import React, { useState, useEffect } from "react";
import { View, SafeAreaView, Platform } from "react-native";
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
      } p-5 flex-1`}
      style={{ backgroundColor: "#FAF7F2" }}
    >       
      <View className="mt-4 p-5">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t('profile.my_profile.labels.settings')}
            </CustomText>
          )}
          otherClasses="pb-5"
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
