import React, {useEffect, useState} from 'react'
import { Image, TouchableWithoutFeedback, View } from 'react-native'
import { ThemedText } from '../ThemedText'
import { Colors } from '@/constants/Colors'
import { Entypo, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import TouchOpacity from '../TouchOpacity'
import { useSession } from '@/contexts/SessionContext'
import NotificationIcon from "@/assets/icons/notification"
import { CustomText } from "../CustomText"
import ArrowIcon from "@/assets/icons/arrow"
import { useTranslation } from "react-i18next"
import { useAddressLabel } from '@/hooks/useAddressLabel'

const UserHeader = () => {
  const { t } = useTranslation();
  const { userData, isLoadingUserData, session } = useSession();
  const addressLabel = useAddressLabel();

  const [notifications, setNotifications] = useState<number>(0);

  useEffect(() => {
    if (userData?.notifications !== undefined) {
      setNotifications(userData?.notifications)
    }
  }, [userData?.notifications]);

  const handlePressNotification = () => {
      router.push('/(app)/(modals)/notifications')
  }

  const handlePressAddress = () => {
    if (!session) {
      router.navigate('/(app)/(modals)/(services)/(request)/address/guest');
    } else {
      router.navigate('/(app)/(modals)/(address)/update');
    }
  };

  // Saudação consoante a hora; junta o primeiro nome quando há conta com
  // nome real (convidados não têm nome — fica só a saudação).
  const hour = new Date().getHours();
  const greetingBase =
    hour < 12
      ? t('general.greeting_morning')
      : hour < 20
        ? t('general.greeting_afternoon')
        : t('general.greeting_evening');
  const firstName = userData?.name?.trim?.()?.split(' ')?.[0];
  const greeting =
    session && firstName ? `${greetingBase}, ${firstName} 👋` : `${greetingBase} 👋`;

  return (
    <View>
      <CustomText color="secondary" boldness="bold" numberOfLines={1}>
        {greeting}
      </CustomText>
      <View className="flex-row justify-between mt-1">
      <View className="w-[70%]">
        {!session ? (
          <TouchableWithoutFeedback onPress={() => router.navigate('/(auth)/signin')}>
            <View className="flex-1 flex-row items-center">
              <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                {t('general.login')}
              </CustomText>
              <View className="w-4 h-4 ml-4">
                <ArrowIcon color={Colors.secondary} position="right" />
              </View>
            </View>
          </TouchableWithoutFeedback>
        ) : (
        <TouchableWithoutFeedback
          onPress={handlePressAddress}
          disabled={isLoadingUserData}
        >
          <View className="flex-1 flex-row items-center">
            {isLoadingUserData ? (
              <View className="rounded-full overflow-hidden w-[65%] h-5">
                <View className="w-full h-full bg-[#111215]"></View>
              </View>
            ) : (
                <>
                  {addressLabel && addressLabel !== t('general.no_address') ?
                    <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                      {addressLabel}
                    </CustomText>
                    :
                    <CustomText color="no_error_red" boldness="bold" numberOfLines={1}>
                      {t('general.no_address')}
                    </CustomText>
                  }
            </>
              )}
            <View className="w-4 h-4 ml-4">
              <ArrowIcon color={Colors.secondary} position="down" />
            </View>
          </View>
        </TouchableWithoutFeedback>
        )}
      </View>
      <View className="flex flex-row items-center justify-end w-[30%]">
        <TouchOpacity onPress={handlePressNotification} className="w-6 h-6">
          <NotificationIcon color={Colors.secondary} />
          {
              notifications > 0 && (
              <View
                className={`
                  bg-secondary rounded-full h-5 w-5 flex items-center justify-center
                  absolute -top-3 -right-2
                `}
              >
                <CustomText
                  size="extraSmall"
                  boldness="bold"
                  color="support_secondary"
                >
                    {notifications}
                </CustomText>
              </View>
            )
          }
        </TouchOpacity>
      </View>
      </View>
    </View>
  )
}

export default UserHeader
