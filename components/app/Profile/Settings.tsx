import ArrowIcon from "@/assets/icons/arrow";
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { ThemedText } from '@/components/ThemedText';
import TouchOpacity from '@/components/TouchOpacity';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather, Octicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useRef } from 'react'
import { useTranslation } from "react-i18next";
import { View, StatusBar, Image, Linking, Platform, Switch } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import packageInfo from '@/package.json';
import {Link, useRouter} from "expo-router";
import InfoSquareIcon from "@/assets/icons/info";
import PrivacyPolicy from "@/assets/icons/privacy";
import ClipNotebookIcon from "@/assets/icons/terms";
import TrashCanIcon from "@/assets/icons/delete";
import { useMixpanel } from "@/contexts/MixpanelContext";
// Set up for app version display

const Settings = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasConsent, giveConsent, revokeConsent } = useMixpanel();
  const items = [
/*    {id: 1, label: t('profile.settings.user_management_locations'), onPress: () => console.log('Item 1 pressed')},
    {id: 2, label: t('profile.settings.payment_settings'), onPress: () => console.log('Item 2 pressed')},*/
    {id: 3, label: t('profile.settings.delete_account'), onPress: () => router.push('/(app)/(modals)/delete-account')},
  ]

  const footerOptions = [
    {id: 2, label: t('profile.settings.about'), onPress: () => Linking.openURL('https://piquetapp.com/#FAQ'),  icon: (
        <View style={{ paddingLeft: 1 }}>
          <InfoSquareIcon />
        </View>
      )},
    {id: 3, label: t('profile.settings.privacy'), onPress: () => Linking.openURL('https://piquetapp.com/politica-de-privacidade-para-utilizadores/'), icon: (
        <View style={{ marginTop: 2 }}>
          <PrivacyPolicy width={22} height={22} color="#000" />
        </View>
      )},
    {id: 4, label: t('profile.settings.use_terms'), onPress: () => Linking.openURL('https://piquetapp.com/termos-condicoes-de-utilizacao-da-aplicacao/'), icon: (
        <View
          style={{
            paddingLeft: 1,
            marginBottom: 2,
          }}
        >
          <ClipNotebookIcon width={20} height={20} />
        </View>
      )}
  ]

  // ref
  // const bottomSheetRef = useRef<BottomSheet>(null);

  // callbacks
  // const handleSheetChanges = useCallback((index: number) => {
  //   console.log('handleSheetChanges', index);
  // }, []);

  // renders

  return (
    <ScrollView
      className="space-y-32"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "space-between",
        paddingHorizontal: Platform.OS === "ios" ? 20 : 0,
      }}
      showsVerticalScrollIndicator={false}
    >   
     <View>
        {footerOptions.map((item, index) => (
          <CustomTouchableOpacity
            key={item.id}
            onPress={item.onPress}
            type="transparent"
            size="large"
            textColor="gray_strong"
            textBoldness="regular"
            className="w-full py-2"
          >
            <View className="flex flex-row justify-between items-center h-6">
              <View className="w-[1%] flex justify-center">{item.icon}</View>
              <View className="w-[75%] flex justify-center">
                <CustomText
                  color="secondary"
                  size="small"
                  numberOfLines={1}
                  boldness="regular"
                >
                  {item.label}
                </CustomText>
              </View>
              <View className="w-[10%] flex items-center">
                <Entypo name="chevron-right" size={24} />
              </View>
            </View>
          </CustomTouchableOpacity>
        ))}

        <View className="w-full py-2 flex flex-row justify-between items-center">
          <View className="flex flex-row items-center" style={{ flex: 1, marginRight: 12 }}>
            <Feather name="bar-chart-2" size={20} color="#000" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <CustomText color="secondary" size="small" boldness="regular">
                {t('profile.settings.analytics_consent')}
              </CustomText>
              <CustomText color="gray_medium" size="extraSmall" boldness="regular">
                {t('profile.settings.analytics_consent_description')}
              </CustomText>
            </View>
          </View>
          <Switch
            value={hasConsent}
            onValueChange={(value) => value ? giveConsent() : revokeConsent()}
            trackColor={{ false: Colors.gray_medium, true: Colors.secondary }}
            thumbColor={Colors.primary}
          />
        </View>

        <View className="flex flex-col space-y-10 mt-4">
          {items.map((item, index) => (
            <CustomTouchableOpacity
              size="small"
              type="transparent"
              key={item.id}
              onPress={item.onPress}
              className="w-full py-2"
            >
              <View className="flex flex-row justify-between items-center">
                <View className="w-[85%]">
                  <CustomText
                    color="secondary"
                    size="small"
                    numberOfLines={1}
                    boldness="regular"
                  >
                    {item.label}
                  </CustomText>
                </View>
                <View className="w-[10%] flex items-center">
                  <TrashCanIcon size={14} />
                </View>
              </View>
            </CustomTouchableOpacity>
          ))}
        </View>
      </View>

      <View className="absolute bottom-0 w-full pb-4" style={{ paddingHorizontal: Platform.OS === "ios" ? 20 : 0 }}>
        <CustomText
          color="gray_medium"
          size="extraSmall"
          numberOfLines={1}
          boldness="regular"
        >{`${t("profile.settings.version")} ${
          packageInfo.version
        }`}</CustomText>        
      </View>
    </ScrollView>
  );
}

export default Settings
