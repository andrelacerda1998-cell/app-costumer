import AdaptiveLogo from "@/assets/svgs/adptive-logo";
import Logo from "@/assets/svgs/logo";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import i18n from "@/translation";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Text, View, ImageBackground, Pressable, Button, NativeModules } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const App = () => {
  const { t } = useTranslation();

  const getDeviceLocale = () => {
    if (Platform.OS === 'ios') {
      return NativeModules.SettingsManager.settings.AppleLocale || NativeModules.SettingsManager.settings.AppleLanguages[0];
    } else if (Platform.OS === 'android') {
      return NativeModules.I18nManager.localeIdentifier;
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.primary,
      }}
    >
      <StatusBar backgroundColor="transparent" style="dark" />
      <SafeAreaView
        className="py-6 w-full px-6 flex-1"
      >
        <View className="flex-1 items-center justify-center p-4">
          <View className="absolute bg-transparent border-[1px] border-secondary w-60 h-60 rounded-[62px]"></View>
          <View className="absolute bg-transparent border-2 border-secondary w-44 h-44 rounded-[42px]"></View>
          <View className="bg-secondary border-2 border-secondary w-28 h-28 p-6 rounded-[22px] items-center justify-center">
            <AdaptiveLogo color={Colors.primary} />
          </View>
        </View>

        <CustomText
          size="title"
          color="secondary"
          boldness="bold"
          className="pr-10"
        >
          {t('auth.home.title')}
        </CustomText>
        <CustomText
          size="medium"
          color="secondary"
          boldness="regular"
          numberOfLines={5}
          classes="my-4"
        >
          {t('auth.home.subtitle')}
        </CustomText>
        <View className="mt-8">
          <CustomTouchableOpacity
            type="secondary"
            size="large"
            text={t('auth.home.access_account')}
            textSize="medium"
            textColor="primary"
            textBoldness="semiBold"
            onPress={() => {
              router.navigate('/(auth)/signin')
            }}
          />
          <View className="mt-4">
            <CustomTouchableOpacity
              type="secondary_outline"
              size="large"
              text={t('auth.home.create_account')}
              textSize="medium"
              textColor="secondary"
              textBoldness="semiBold"
              onPress={() => {
                router.navigate('/(auth)/signup')
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default App;
