import ArrowIcon from "@/assets/icons/arrow";
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { ThemedText } from '@/components/ThemedText';
import TouchOpacity from '@/components/TouchOpacity';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather, Ionicons, Octicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from "react-i18next";
import { View, StatusBar, Image, Linking, Platform, Switch } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import packageInfo from '@/package.json';
import { setAppLanguage } from '@/translation';
import {Link, useRouter} from "expo-router";
import InfoSquareIcon from "@/assets/icons/info";
import PrivacyPolicy from "@/assets/icons/privacy";
import ClipNotebookIcon from "@/assets/icons/terms";
import TrashCanIcon from "@/assets/icons/delete";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { useSession } from "@/contexts/SessionContext";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
// Set up for app version display

/**
 * Os quatro idiomas, com o nome escrito na própria língua.
 *
 * "Français" e não "Francês": quem tem a app num idioma que não percebe não
 * reconhece o nome do seu próprio idioma traduzido para outro.
 */
const IDIOMAS = [
  { code: "pt_PT", label: "PT", name: "Português" },
  { code: "en_US", label: "EN", name: "English" },
  { code: "fr_FR", label: "FR", name: "Français" },
  { code: "es_ES", label: "ES", name: "Español" },
] as const;

const Settings = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { hasConsent, giveConsent, revokeConsent } = useMixpanel();
  const { userData, setUserData } = useSession();
  const { api } = useApi();

  /**
   * Notificações: o interruptor espelha a permissão do sistema, que é quem
   * manda. A app não pode ligá-la sozinha — ao tocar, abre as Definições do
   * iOS/Android. Ao voltar, relê o estado, para o interruptor não ficar a
   * dizer o contrário do que está lá.
   */
  const [pushEnabled, setPushEnabled] = useState(false);
  const readPushPermission = useCallback(async () => {
    const { granted } = await Notifications.getPermissionsAsync();
    setPushEnabled(granted);
  }, []);
  useEffect(() => {
    readPushPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') readPushPermission();
    });
    return () => sub.remove();
  }, [readPushPermission]);

  /**
   * Comunicações de marketing: opt-in explícito, guardado no servidor
   * (`marketing_consent_at`). O interruptor mostra o que lá está; se o pedido
   * falhar volta atrás, para não dizer "aceitou" sem o servidor saber.
   */
  // Ligado de origem: contas novas nascem com a data (backend #52). Contas
  // antigas, criadas antes da coluna existir, chegam sem `marketing_consent_at`
  // definido — aí assume-se ligado, que é a decisão do negócio, e o servidor
  // recebe a data ao primeiro toque.
  const [marketingConsent, setMarketingConsent] = useState(userData?.marketing_consent_at !== null);
  useEffect(() => {
    setMarketingConsent(userData?.marketing_consent_at !== null);
  }, [userData?.marketing_consent_at]);

  const toggleMarketing = async (value: boolean) => {
    setMarketingConsent(value);
    try {
      const { data } = await api.put(API_ROUTES.MARKETING_CONSENT, { accepted: value });
      setUserData({ ...userData, marketing_consent_at: data?.data?.marketing_consent_at ?? null });
    } catch {
      setMarketingConsent(!value);
    }
  };

  const togglePush = async (value: boolean) => {
    if (value) {
      // Primeira vez: o sistema ainda pergunta. Depois disso, só nas Definições.
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status !== 'granted' && canAskAgain) {
        const { granted } = await Notifications.requestPermissionsAsync();
        setPushEnabled(granted);
        if (granted) return;
      }
    }
    Linking.openSettings();
  };
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
      {/* Preferências: o que o cliente DEFINE.
          O idioma vivia num cartão só dele, os três interruptores noutro. São
          a mesma coisa — coisas que se mudam — e estavam separados por 16px de
          nada. Juntos passam a ler-se como um bloco, e o ecrã perde uma
          fronteira que não significava nada. */}
      <CustomText color="gray_medium" size="extraSmall" boldness="semiBold" classes="ml-1 mb-1.5">
        {t('profile.settings.section_preferences')}
      </CustomText>

      <View
        className="bg-support_secondary rounded-2xl px-4 mb-3"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        {/* Idioma. Com quatro idiomas os botões não cabem na linha do título:
            ficam por baixo, à largura toda. O nome do idioma actual aparece
            junto ao título — quem tem a app no idioma errado vê-o de relance,
            sem ter de decifrar o que é que "PT" quer dizer. */}
        <View className="py-3" style={{ borderBottomWidth: 1, borderBottomColor: Colors.support_primary }}>
          <View className="flex-row items-center">
            <View
              className="h-9 w-9 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
            >
              <Ionicons name="language-outline" size={17} color={Colors.secondary} />
            </View>
            <CustomText color="secondary" size="small" boldness="semiBold" classes="flex-1">
              {t('profile.settings.language_title')}
            </CustomText>
            {/* O nome do idioma passa para a direita do título, em vez de uma
                segunda linha por baixo: diz o mesmo e poupa uma altura de
                linha num cartão que ja tem o seletor por baixo. */}
            <CustomText color="gray_medium" size="extraSmall" numberOfLines={1}>
              {IDIOMAS.find((o) => o.code === i18n.language)?.name ?? ""}
            </CustomText>
          </View>

          <View className="flex-row rounded-full mt-2.5" style={{ backgroundColor: Colors.support_primary, padding: 3 }}>
            {IDIOMAS.map((o) => {
              const active = i18n.language === o.code;
              return (
                <TouchOpacity
                  key={o.code}
                  onPress={() => setAppLanguage(o.code)}
                  otherClasses="rounded-full py-1.5 flex-1 items-center"
                  style={{ backgroundColor: active ? Colors.primary : "transparent" }}
                >
                  <CustomText color="secondary" size="small" boldness={active ? "bold" : "regular"}>
                    {o.label}
                  </CustomText>
                </TouchOpacity>
              );
            })}
          </View>
        </View>

        {/* Os três interruptores. Em lista, com a mesma anatomia da linha do
            idioma: ícone, texto, controlo à direita. */}
        {[
          {
            key: 'push',
            icon: 'notifications-outline' as const,
            label: t('profile.settings.push_notifications'),
            hint: t('profile.settings.push_notifications_description'),
            value: pushEnabled,
            onChange: togglePush,
          },
          {
            key: 'analytics',
            icon: 'bar-chart-outline' as const,
            label: t('profile.settings.analytics_consent'),
            hint: t('profile.settings.analytics_consent_description'),
            value: hasConsent,
            onChange: (v: boolean) => (v ? giveConsent() : revokeConsent()),
          },
          {
            key: 'marketing',
            icon: 'mail-outline' as const,
            label: t('profile.settings.marketing_consent'),
            hint: t('profile.settings.marketing_consent_description'),
            value: marketingConsent,
            onChange: toggleMarketing,
          },
        ].map((item, i, arr) => (
          <View
            key={item.key}
            className="flex-row items-center py-2.5"
            style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: Colors.support_primary }}
          >
            <View
              className="h-9 w-9 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
            >
              <Ionicons name={item.icon} size={17} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <CustomText color="secondary" size="small" boldness="semiBold">
                {item.label}
              </CustomText>
              <CustomText color="gray_medium" size="extraSmall" boldness="regular">
                {item.hint}
              </CustomText>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onChange}
              trackColor={{ false: Colors.gray_medium, true: Colors.secondary }}
              thumbColor={Colors.primary}
            />
          </View>
        ))}
      </View>

      {/* Informação e legal: o que o cliente LÊ. Sem descrições — os três
          títulos dizem-se a si próprios, e uma segunda linha em cada um só
          alongava o cartão sem acrescentar nada. */}
      <CustomText color="gray_medium" size="extraSmall" boldness="semiBold" classes="ml-1 mb-1.5">
        {t('profile.settings.section_about')}
      </CustomText>

      <View
        className="bg-support_secondary rounded-2xl px-4 mb-3"
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
            otherClasses="flex-row items-center py-2.5"
            style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: Colors.support_primary }}
          >
            <View
              className="h-9 w-9 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
            >
              <Ionicons name={item.icon} size={17} color={Colors.secondary} />
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

      {/* Eliminar conta. Fica sozinha e sem rótulo de secção de proposito: e a
          unica accao irreversivel do ecra, e agrupa-la com outra coisa era
          convidar ao toque distraido. */}
      <TouchOpacity
        onPress={() => router.push('/(app)/(modals)/delete-account')}
        otherClasses="bg-support_secondary rounded-2xl px-4 py-3 flex-row items-center"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        <View
          className="h-9 w-9 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: "rgba(239,68,68,0.12)" }}
        >
          <Ionicons name="trash-outline" size={17} color={Colors.error} />
        </View>
        <View className="flex-1">
          <CustomText color="error" size="small" numberOfLines={1} boldness="semiBold">
            {t('profile.settings.delete_account')}
          </CustomText>
        </View>
        <Feather name="chevron-right" size={18} color={Colors.error} />
      </TouchOpacity>

      {/* A versão encostada ao FUNDO, com `marginTop: auto`.
          Estava a 32px do ultimo cartao, e o que sobrava do ecra ficava vazio
          por baixo dela — um bloco de branco a meio do nada. Empurrada para
          baixo, o vazio deixa de estar entre coisas e passa a estar depois de
          tudo, que e onde ninguem repara nele. */}
      <View className="items-center pt-6" style={{ marginTop: "auto" }}>
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
