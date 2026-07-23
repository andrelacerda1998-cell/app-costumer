import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import DatePicker from '@/components/DatePicker';
import { ThemedText } from '@/components/ThemedText';
import TouchOpacity from '@/components/TouchOpacity';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { Colors } from '@/constants/Colors';
import { useApi } from '@/contexts/ApiContext';
import { useSession } from '@/contexts/SessionContext';
import { formatAddressLabel } from '@/hooks/useAddressLabel';
import { UserDataInterface } from "@/types/session";
import { validateNIF } from "@/utils";
import { Feather, Ionicons, MaterialIcons, Octicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { isLoading } from "expo-font";
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react'
import { Control, Controller, useForm } from 'react-hook-form';
import { useTranslation } from "react-i18next";
import { View, StatusBar, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { ScrollView, TextInput } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
interface MyProfileProps {
  userData: UserDataInterface | null
}

const MyProfile: React.FC<MyProfileProps> = ({
  userData
}) => {
  const { t } = useTranslation();
  const { isLoadingUserData } = useSession();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' };
    return date.toLocaleDateString('en-GB', options);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          className="mx-4 bg-support_secondary rounded-2xl px-4"
          style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
        >
          {[
            {
              key: "birth_date",
              icon: "calendar-outline" as const,
              label: t('profile.my_profile.birth_date'),
              value: userData?.date_birthday ? formatDate(userData.date_birthday) : "—",
            },
            {
              key: "nif",
              icon: "receipt-outline" as const,
              label: t('profile.my_profile.nif'),
              value: userData?.nif || "—",
            },
            {
              key: "phone",
              icon: "call-outline" as const,
              label: t('profile.my_profile.phone_number'),
              value: userData?.phone_number || "—",
            },
            {
              key: "address",
              icon: "location-outline" as const,
              label: t('profile.my_profile.address'),
              value: formatAddressLabel(userData?.address) || t('profile.my_profile.no_address'),
            },
          ].map((row, i, arr) => (
            <View
              key={row.key}
              className="flex-row items-center py-3.5"
              style={{ borderBottomWidth: i < arr.length ? 1 : 0, borderBottomColor: Colors.support_primary }}
            >
              <View
                className="h-10 w-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
              >
                <Ionicons name={row.icon} size={18} color={Colors.secondary} />
              </View>
              <View className="flex-1">
                <CustomText color="gray_medium" boldness="regular" numberOfLines={1} size="extraSmall">
                  {row.label}
                </CustomText>
                {isLoadingUserData ? (
                  <View className="w-[60%] h-4 overflow-hidden rounded-full mt-1">
                    <View className="w-full h-full bg-gray_light"></View>
                  </View>
                ) : (
                  <CustomText size="small" color="secondary" boldness="semiBold" numberOfLines={2}>
                    {row.value}
                  </CustomText>
                )}
              </View>
            </View>
          ))}

          {/* Palavra-passe */}
          <View className="flex-row items-center py-3.5">
            <View
              className="h-10 w-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
            >
              <Ionicons name="lock-closed-outline" size={18} color={Colors.secondary} />
            </View>
            <View className="flex-1">
              <CustomText color="gray_medium" boldness="regular" numberOfLines={1} size="extraSmall">
                {t('profile.my_profile.password')}
              </CustomText>
              <View className="flex-row space-x-1 mt-1.5">
                {Array.from({ length: 12 }).map((_, index) => (
                  <View key={index} className="h-1.5 w-1.5 rounded-full bg-secondary"></View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export default MyProfile