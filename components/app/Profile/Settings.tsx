import ArrowIcon from "@/assets/icons/arrow";
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { ThemedText } from '@/components/ThemedText';
import TouchOpacity from '@/components/TouchOpacity';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather, Ionicons, Octicons } from '@expo/vector-icons';
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
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: Platform.OS === "ios" ? 20 : 0,
        paddingBottom: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Informação e legal */}
      <View
        className="bg-support_secondary rounded-2xl px-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        {[
          { key: 'about', icon: 'information-circle-outline' as const, label: t('profile.settings.about'), onPress: () => Linking.openURL('https://piquetapp.com/#FAQ') },
          { key: 'privacy', icon: 'shield-outline' as const, label: t('profile.settings.privacy'), onPress: () => Linking.openURL('https://piquetapp.com/politica-de-privacidade-para-utilizadores/') },
          { key: 'terms', icon: 'document-text-outline' as const, label: t('profile.settings.use_terms'), onPress: () => Linking.openURL('https://piquetapp.com/termos-condicoes-de-utilizacao-da-aplicacao/') },
        ].map((item, i, arr) => (
          <TouchOpacity
            key={item.key}
            onPress={item.onPress}
            otherClasses="flex-row items-center py-3.5"
            style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: Colors.support_primary }}
          >
            <View
              className="h-10 w-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
            >
              <Ionicons name={item.icon} size={18} color={Colors.secondary} />
            </View>
            <View className="flex-1">
              <CustomText color="secondary" size="small" numberOfLines={1} boldness="semiBold">
                {item.label}
              </CustomText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.gray_medium} />
          </TouchOpacity>
        ))}
      </View>

      {/* Consentimento de analytics */}
      <View
        className="bg-support_secondary rounded-2xl px-4 py-1 mt-4 flex-row items-center"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        <View
          className="h-10 w-10 rounded-xl items-center justify-center mr-3 my-3"
          style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
        >
          <Ionicons name="bar-chart-outline" size={18} color={Colors.secondary} />
        </View>
        <View style={{ flex: 1, marginRight: 12 }} className="py-3">
          <CustomText color="secondary" size="small" boldness="semiBold">
            {t('profile.settings.analytics_consent')}
          </CustomText>
          <CustomText color="gray_medium" size="extraSmall" boldness="regular">
            {t('profile.settings.analytics_consent_description')}
          </CustomText>
        </View>
        <Switch
          value={hasConsent}
          onValueChange={(value) => value ? giveConsent() : revokeConsent()}
          trackColor={{ false: Colors.gray_medium, true: Colors.secondary }}
          thumbColor={Colors.primary}
        />
      </View>

      {/* Eliminar conta */}
      <TouchOpacity
        onPress={() => router.push('/(app)/(modals)/delete-account')}
        otherClasses="bg-support_secondary rounded-2xl px-4 py-3.5 mt-4 flex-row items-center"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        <View
          className="h-10 w-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: "rgba(239,68,68,0.12)" }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </View>
        <View className="flex-1">
          <CustomText color="error" size="small" numberOfLines={1} boldness="semiBold">
            {t('profile.settings.delete_account')}
          </CustomText>
        </View>
      </TouchOpacity>

      <View className="items-center mt-8">
        <CustomText
          color="gray_medium"
          size="extraSmall"
          numberOfLines={1}
          boldness="regular"
        >{`${t("profile.settings.version")} ${packageInfo.version}`}</CustomText>
      </View>
    </ScrollView>
  );
}

export default Settings
