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
import { useWallet } from '@/contexts/WalletContext';
import { Feather, MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState, Fragment } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from "react-i18next";
import { View, Image, KeyboardAvoidingView, Linking, Platform, TouchableOpacity } from 'react-native';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import MenuArrow from "@/assets/icons/arrow-menu";
import GearIcon from "@/assets/icons/gear-icon";
import ProfileIcon from "@/assets/icons/person";
import CreditCardIcon from "@/assets/icons/credit-card";
import LogoutIcon from "@/assets/icons/logout";

interface Section {
  [key: string]: any;
}

const Profile = () => {
  const { t } = useTranslation();
  const { signOut, userData, setUserData, isLoadingUserData, session } = useSession();
  const { openDialog } = useDialog();
  const { paymentMethods } = useWallet();


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

  if (!session) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View
            style={{
              backgroundColor: Colors.primary,
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: Colors.support_secondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Feather name="user" size={34} color={Colors.secondary} />
            </View>
            <CustomText size="large" color="secondary" boldness="bold" classes="text-center mb-1">
              {t('auth.home.profile_title')}
            </CustomText>
            <CustomText size="small" color="secondary" boldness="regular" classes="text-center">
              {t('auth.home.profile_subtitle')}
            </CustomText>
          </View>

          {/* Vantagens num cartão */}
          <View
            className="bg-support_secondary rounded-2xl px-4"
            style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
          >
            {[
              { icon: 'time-outline', label: t('auth.home.benefits.service_history') },
              { icon: 'location-outline', label: t('auth.home.benefits.saved_address') },
              { icon: 'card-outline', label: t('auth.home.benefits.payment_methods') },
              { icon: 'shield-checkmark-outline', label: t('auth.home.benefits.secure_account') },
            ].map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: i < 3 ? 1 : 0,
                  borderBottomColor: Colors.support_primary,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.primary + '33',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons name={item.icon as any} size={18} color={Colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomText size="medium" color="secondary" boldness="regular">
                    {item.label}
                  </CustomText>
                </View>
                <Feather name="check" size={16} color={Colors.success} />
              </View>
            ))}
          </View>

          {/* Ações */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.navigate('/(auth)/signup')}
              style={{
                backgroundColor: Colors.primary,
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: Colors.primary,
                shadowOpacity: 0.45,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <CustomText size="medium" color="secondary" boldness="bold" numberOfLines={1}>
                {t('auth.home.create_account')}
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.navigate('/(auth)/signin')}
              style={{
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: Colors.secondary,
              }}
            >
              <CustomText size="medium" color="secondary" boldness="semiBold" numberOfLines={1}>
                {t('auth.home.access_account')}
              </CustomText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const paymentMethodsCount = paymentMethods?.length ?? 0;
  const menuRows: {
    key: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
    onPress: () => void;
  }[] = [
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
      key: 'help',
      icon: 'chatbubble-ellipses-outline',
      title: t('profile.my_profile.menu.help_title'),
      subtitle: t('profile.my_profile.menu.help_sub'),
      onPress: () => router.navigate('/(app)/(modals)/support-ticket'),
    },
    {
      key: 'settings',
      icon: 'settings-outline',
      title: t('profile.my_profile.labels.settings'),
      subtitle: t('profile.my_profile.menu.settings_sub'),
      onPress: () => router.navigate({ pathname: '/(app)/(pages)/(settings)/settings' }),
    },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#FAF7F2' }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <CustomText color="secondary" boldness="bold" size="extraLarge" classes="mb-4">
          {t('profile.my_profile.title')}
        </CustomText>

        {/* Cartão de identidade */}
        <View
          className="bg-support_secondary rounded-2xl p-4 flex-row items-center mb-4"
          style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
        >
          <View className="h-16 w-16 rounded-full overflow-hidden mr-3 flex-shrink-0">
            {userData?.avatar?.small ? (
              <Image source={{ uri: userData.avatar.small }} className="w-full h-full" />
            ) : (
              <View
                className="w-full h-full items-center justify-center"
                style={{ backgroundColor: Colors.primary }}
              >
                <Ionicons name="person" size={28} color={Colors.secondary} />
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
        </View>

        {/* Menu em cartões */}
        {menuRows.map((row) => (
          <TouchableOpacity
            key={row.key}
            activeOpacity={0.8}
            onPress={row.onPress}
            className="bg-support_secondary rounded-2xl p-4 flex-row items-center mb-3"
            style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
          >
            <View
              className="h-12 w-12 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: 'rgba(250,187,91,0.2)' }}
            >
              <Ionicons name={row.icon} size={22} color={Colors.secondary} />
            </View>
            <View className="flex-1">
              <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1}>
                {row.title}
              </CustomText>
              <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                {row.subtitle}
              </CustomText>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
          </TouchableOpacity>
        ))}

        {/* Terminar sessão */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openLogOutDialog}
          className="bg-support_secondary rounded-2xl p-4 flex-row items-center mt-2"
          style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
        >
          <View
            className="h-12 w-12 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}
          >
            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          </View>
          <View className="flex-1">
            <CustomText color="error" boldness="bold" size="medium" numberOfLines={1}>
              {t('profile.my_profile.labels.logout')}
            </CustomText>
            <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
              {t('profile.my_profile.menu.logout_sub')}
            </CustomText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default Profile;
