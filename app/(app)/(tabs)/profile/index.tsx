import UserAvatarIcon from "@/assets/icons/user-avatar";
import BackHeader from '@/components/app/BackHeader';
import MyProfile from "@/components/app/Profile/MyProfile";
import Payments from "@/components/app/Profile/Payments";
import Settings from "@/components/app/Profile/Settings";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import DatePicker from '@/components/DatePicker';
import { ThemedText } from '@/components/ThemedText';
import TouchOpacity from '@/components/TouchOpacity';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { Colors } from '@/constants/Colors';
import { useApi } from '@/contexts/ApiContext';
import { useDialog } from "@/contexts/DialogContext";
import { useSession } from '@/contexts/SessionContext';
import GuestGate from '@/components/app/GuestGate';
import { useWallet } from '@/contexts/WalletContext';
import { Feather, MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState, Fragment } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from "react-i18next";
import { View, KeyboardAvoidingView, Linking, Platform, TouchableOpacity, Share } from 'react-native';
import { Image } from 'expo-image';
import { proxiedImage } from '@/utils/imageProxy';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import MenuArrow from "@/assets/icons/arrow-menu";
import GearIcon from "@/assets/icons/gear-icon";
import ProfileIcon from "@/assets/icons/person";
import CreditCardIcon from "@/assets/icons/credit-card";
import LogoutIcon from "@/assets/icons/logout";
import packageInfo from '@/package.json';
import { useSupportUnread } from '@/hooks/useSupportUnread';

interface Section {
  [key: string]: any;
}

const Profile = () => {
  const { t } = useTranslation();
  const { signOut, userData, setUserData, isLoadingUserData, session } = useSession();
  const { openDialog } = useDialog();
  const { paymentMethods } = useWallet();
  const { porLer } = useSupportUnread();


  const sections: Section[] = [
  {
    label: t('profile.my_profile.labels.my_profile'),
    tab: 'My profile',
    margin: 7,
    icon: (
      <View style={{ marginTop: 2, marginLeft: 1 }}>
        <ProfileIcon size={18} />
      </View>
    ),
  },
  {
    label: t('profile.my_profile.labels.payments'),
    tab: 'Payments',
    margin: 5,
    icon: <CreditCardIcon size={22} />,
  },
  {
    label: t('profile.my_profile.labels.settings'),
    tab: 'Settings',
    margin: 9,
    icon: (
      <View style={{ marginTop: 2 }}>
        <GearIcon size={20} />
      </View>
    ),
  },
  {
    label: t('profile.my_profile.labels.logout'),
    tab: 'Log out',
    margin: 3,
    icon: (
      <View style={{ marginTop: 2, marginRight: 2 }}>
        <LogoutIcon size={22} />
      </View>
    ),
  },
];


  // create form with useForm hook
  // const { control, handleSubmit, formState: { errors, isLoading, isValid },getValues, setError, reset } = useForm({
  //   mode: 'onChange',
  //   defaultValues: {
  //     date_birthday: userData?.date_birthday ? new Date(userData.date_birthday) : new Date(),
  //     nif: userData?.nif || "",
  //     phone_number: userData?.phone_number || "",
  //     address: userData?.address?.name || "",
  //   },
  // });

  // const [editData, setEditData] = useState({
  //   date_birthday: false,
  //   nif: false,
  //   phone_number: false,
  // });

  // const changeEditData = (key: keyof typeof editData) => {
  //   const newEditData = {
  //     ...editData,
  //     [key]: !editData[key],
  //   };
  //   setEditData(newEditData);
  // }

  const openLogOutDialog = () => {
    openDialog({
      title: t('session.logout.title'),
      subtitle: t('session.logout.subtitle'),
      successButtonText: t('session.logout.confirm'),
      cancelButtonText: t('session.logout.cancel'),
      onSuccess: () => {
        signOut();
      },
    });
  }

    const handleNavigation = (tab: string) => {
    switch (tab) {
      case "My profile":
        router.navigate({
          pathname: "/(app)/(modals)/(profile)/edit-profile",
        });
        break;

      case "Payments":
        router.navigate({
          pathname: "/(app)/(pages)/(payments)/payments",
        });
        break;

      case "Settings":
        router.navigate({
          pathname: "/(app)/(pages)/(settings)/settings",
        });
        break;

      case "Log out":
        openLogOutDialog();

        break;

      default:
        return;
    }
  };

  // Sem sessão, a Conta não tem nada para gerir: mostra o mesmo convite do
  // Histórico, em vez de uma segunda versão do mesmo ecrã.
  if (!session) {
    return (
      <GuestGate
        title={t('auth.home.profile_title')}
        subtitle={t('auth.home.profile_subtitle')}
      />
    );
  }

  const paymentMethodsCount = paymentMethods?.length ?? 0;

  // Iniciais em vez do boneco genérico: "Ana Marques" -> "AM". A app do
  // técnico já faz o mesmo, e uma cara sem foto continua a ser de alguém.
  const iniciais = (userData?.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((parte: string, i: number, partes: string[]) => (i === 0 || i === partes.length - 1 ? parte[0] : ''))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const recomendar = () => {
    Share.share({ message: t('profile.my_profile.menu.invite_message') }).catch(() => {});
  };

  type Linha = {
    key: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle?: string;
    destaque?: boolean;
    onPress: () => void;
  };

  // Duas secções em lista, como nas Definições. Eram seis cartões soltos, cada
  // um com ícone de 52px e duas linhas: o ecrã não cabia sem scroll e não se
  // parecia com o ecrã a seguir.
  const grupos: { key: string; titulo: string; linhas: Linha[] }[] = [
    {
      key: 'conta',
      titulo: t('profile.my_profile.menu.section_account'),
      linhas: [
        {
          key: 'profile',
          icon: 'person-outline',
          title: t('profile.my_profile.labels.my_profile'),
          subtitle: t('profile.my_profile.menu.profile_sub'),
          onPress: () => router.navigate({ pathname: '/(app)/(modals)/(profile)/edit-profile' }),
        },
        {
          key: 'payments',
          icon: 'card-outline',
          title: t('profile.my_profile.labels.payments'),
          // Os cartões guardados são usados no checkout. Sem nenhum, a linha
          // diz para que serve guardar um — "Nenhum método adicionado" soava
          // a passo em falta, e pagar com MB Way no pedido funciona sem isto.
          subtitle:
            paymentMethodsCount === 0
              ? t('profile.my_profile.menu.payments_sub_none')
              : paymentMethodsCount === 1
                ? t('profile.my_profile.menu.payments_sub_one')
                : t('profile.my_profile.menu.payments_sub_many', { count: paymentMethodsCount }),
          onPress: () => router.navigate({ pathname: '/(app)/(pages)/(payments)/payments' }),
        },
        {
          key: 'billing',
          icon: 'receipt-outline',
          title: t('profile.my_profile.menu.billing_title'),
          subtitle: userData?.nif
            ? t('profile.my_profile.menu.billing_sub_filled', { nif: userData.nif })
            : t('profile.my_profile.menu.billing_sub_empty'),
          onPress: () => router.navigate({ pathname: '/(app)/(modals)/(payments)/invoice-data' }),
        },
        {
          key: 'settings',
          icon: 'settings-outline',
          title: t('profile.my_profile.labels.settings'),
          subtitle: t('profile.my_profile.menu.settings_sub'),
          onPress: () => router.navigate({ pathname: '/(app)/(pages)/(settings)/settings' }),
        },
      ],
    },
    {
      key: 'ajuda',
      titulo: t('profile.my_profile.menu.section_help'),
      linhas: [
        {
          key: 'help',
          icon: 'chatbubble-ellipses-outline',
          title: t('profile.my_profile.menu.help_title'),
          // O mesmo contador do ponto na Home: respostas do suporte que o
          // cliente ainda não abriu.
          subtitle:
            porLer > 0
              ? t(porLer === 1 ? 'profile.my_profile.menu.help_sub_unread_one' : 'profile.my_profile.menu.help_sub_unread_many', { count: porLer })
              : t('profile.my_profile.menu.help_sub'),
          destaque: porLer > 0,
          onPress: () => router.navigate('/(app)/(modals)/support-ticket'),
        },
        {
          key: 'invite',
          icon: 'gift-outline',
          title: t('profile.my_profile.menu.invite_title'),
          subtitle: t('profile.my_profile.menu.invite_sub'),
          onPress: recomendar,
        },
      ],
    },
  ];

  const sombra = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#FAF7F2' }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* O mesmo nome do separador. Era "Perfil" no ecrã e "Conta" na barra. */}
        <CustomText color="secondary" boldness="bold" size="subtitle" classes="mb-4 ml-1">
          {t('tabs.account')}
        </CustomText>

        {/* Cartão de identidade: tocar abre "O meu perfil". */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.navigate({ pathname: '/(app)/(modals)/(profile)/edit-profile' })}
          className="bg-support_secondary rounded-2xl p-4 flex-row items-center mb-5"
          style={sombra}
        >
          <View className="h-14 w-14 rounded-full overflow-hidden mr-3.5 flex-shrink-0">
            {userData?.avatar?.small ? (
              <Image
                source={{
                  uri: /^https?:\/\//.test(userData.avatar.small)
                    ? proxiedImage(userData.avatar.small, 150)
                    : userData.avatar.small,
                }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <View className="w-full h-full items-center justify-center" style={{ backgroundColor: Colors.primary }}>
                {iniciais ? (
                  <CustomText color="secondary" boldness="bold" size="large">
                    {iniciais}
                  </CustomText>
                ) : (
                  <Ionicons name="person" size={26} color={Colors.secondary} />
                )}
              </View>
            )}
          </View>
          <View className="flex-1">
            <CustomText color="secondary" boldness="bold" size="large" numberOfLines={1}>
              {userData?.name || userData?.phone_number || ''}
            </CustomText>
            {!!userData?.email && (
              <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                {userData.email}
              </CustomText>
            )}
          </View>
          <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
        </TouchableOpacity>

        {grupos.map((grupo) => (
          <Fragment key={grupo.key}>
            <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-1 mb-2">
              {grupo.titulo}
            </CustomText>
            <View className="bg-support_secondary rounded-2xl px-4 mb-5" style={sombra}>
              {grupo.linhas.map((linha, i, linhas) => (
                <TouchableOpacity
                  key={linha.key}
                  activeOpacity={0.7}
                  onPress={linha.onPress}
                  className="flex-row items-center py-3"
                  style={{ borderBottomWidth: i < linhas.length - 1 ? 1 : 0, borderBottomColor: Colors.support_primary }}
                >
                  <View
                    className="h-9 w-9 rounded-lg items-center justify-center mr-3"
                    style={{ backgroundColor: 'rgba(250,187,91,0.2)' }}
                  >
                    <Ionicons name={linha.icon} size={18} color={Colors.secondary} />
                  </View>
                  <View className="flex-1 mr-2">
                    <CustomText color="secondary" size="medium" boldness="semiBold" numberOfLines={1}>
                      {linha.title}
                    </CustomText>
                    {!!linha.subtitle && (
                      <CustomText
                        color={linha.destaque ? 'secondary' : 'gray_medium'}
                        size="small"
                        boldness={linha.destaque ? 'semiBold' : 'regular'}
                        numberOfLines={1}
                      >
                        {linha.subtitle}
                      </CustomText>
                    )}
                  </View>
                  {linha.destaque && (
                    <View className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: Colors.error }} />
                  )}
                  <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
                </TouchableOpacity>
              ))}
            </View>
          </Fragment>
        ))}

        {/* Terminar sessão: discreto e no fundo, ao lado da versão. Era um
            cartão vermelho do tamanho dos outros, encostado à barra de baixo —
            fácil de tocar sem querer, para uma coisa que quase ninguém faz. */}
        <View className="items-center pt-4" style={{ marginTop: 'auto' }}>
          <TouchableOpacity onPress={openLogOutDialog} activeOpacity={0.7} className="px-4 py-2">
            <CustomText color="error" size="medium" boldness="semiBold">
              {t('profile.my_profile.labels.logout')}
            </CustomText>
          </TouchableOpacity>
          <CustomText color="gray_medium" size="small" numberOfLines={1} classes="mt-1">
            {`${t('profile.settings.version')} ${packageInfo.version}`}
          </CustomText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default Profile;
