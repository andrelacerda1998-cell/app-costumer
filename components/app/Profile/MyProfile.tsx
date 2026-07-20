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
import { Feather, MaterialIcons, Octicons } from '@expo/vector-icons';
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
      <ScrollView className="space-y-4">
        <View className="px-4 space-y-4">
        <View>
          <CustomText classes="mb-1" color="gray_medium" boldness="semiBold" numberOfLines={1} size="extraSmall">
            {t('profile.my_profile.birth_date')}
          </CustomText>
          {isLoadingUserData ? (
            <View className="w-[50%] h-5 overflow-hidden rounded-full mt-2">
              <View className="w-full h-full bg-gray_light"></View>
            </View>
          ) : (
            <CustomText size="small" color="gray_strong" boldness="semiBold">
              {formatDate(userData?.date_birthday || "")}
            </CustomText>
          )}
          <View className="h-[1px] w-full bg-[#858585] rounded-full mb-2"></View>
        </View>

        <View>
          <CustomText classes="mb-1" color="gray_medium" boldness="semiBold" numberOfLines={1} size="extraSmall">
            {t('profile.my_profile.nif')}
          </CustomText>
          {isLoadingUserData ? (
            <View className="w-[45%] h-5 overflow-hidden rounded-full mt-2">
              <View className="w-full h-full bg-gray_light"></View>
            </View>
          ) : (
            <CustomText size="small" color="gray_strong" boldness="semiBold">
              {userData?.nif}
            </CustomText>
          )}
          <View className="h-[1px] w-full bg-[#858585] rounded-full mb-2"></View>
        </View>

        <View>
          <CustomText classes="mb-1" color="gray_medium" boldness="semiBold" numberOfLines={1} size="extraSmall">
            {t('profile.my_profile.phone_number')}
          </CustomText>
          {isLoadingUserData ? (
            <View className="w-[62%] h-5 overflow-hidden rounded-full mt-2">
              <View className="w-full h-full bg-gray_light"></View>
            </View>
          ) : (
            <CustomText size="small" color="gray_strong" boldness="semiBold">
              {userData?.phone_number}
            </CustomText>
          )}
          <View className="h-[1px] w-full bg-[#858585] rounded-full mb-2"></View>
        </View>

        <View>
          <CustomText classes="mb-1" color="gray_medium" boldness="semiBold" numberOfLines={1} size="extraSmall">
            {t('profile.my_profile.address')}
          </CustomText>
          {isLoadingUserData ? (
            <View className="w-[80%] h-5 overflow-hidden rounded-full mt-2">
              <View className="w-full h-full bg-gray_light"></View>
            </View>
          ) : (
            <CustomText size="small" color="gray_strong" boldness="semiBold">
              {formatAddressLabel(userData?.address) || t('profile.my_profile.no_address')}
            </CustomText>
          )}
          <View className="h-[1px] w-full bg-[#858585] rounded-full mb-2"></View>
        </View>

        <View>
          <CustomText classes="mb-1" color="gray_medium" boldness="semiBold" numberOfLines={1} size="extraSmall">
            {t('profile.my_profile.password')}
          </CustomText>
          {isLoadingUserData ? (
            <View className="w-[54%] h-5 overflow-hidden rounded-full mt-2">
              <View className="w-full h-full bg-gray_light"></View>
            </View>
          ) : (
            <View className="flex-row space-x-1 py-2">
              {Array.from({ length: 16 }).map((_, index) => (
                <View key={index} className="h-2 w-2 rounded-full bg-secondary"></View>
              ))}
            </View>
          )}
          <View className="h-[1px] w-full bg-[#858585] rounded-full mb-2"></View>
        </View>
         </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

export default MyProfile