import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { Entypo, FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native'
import TouchOpacity from '@/components/TouchOpacity'
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import { useSession } from '@/contexts/SessionContext'
import { useTranslation } from "react-i18next"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import XIcon from "@/assets/icons/x"

enum Status {
  PENDING = "pending",
  VERIFIED = "verified",
  SENT = "sent",
  ERROR = "error",
}

const ConfirmEmail = () => {
  const { api } = useApi();
  const { t } = useTranslation();
  const { userData, setUserData } = useSession();
  const [status, setStatus] = useState<Status>(Status.PENDING);
  const [loading, setLoading] = useState(false);

  const onClose = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/home");
  };

  const sendEmailVerification = () => {
    setLoading(true);
    api.post(API_ROUTES.EMAIL_VERIFY)
      .then((res) => {
        setStatus(Status.SENT);
      })
      .catch((err) => {
        if (err.response.data.message === "Email already verified") {
          setUserData({
            ...userData,
            email_verified_at: new Date(),
          })
          return setStatus(Status.VERIFIED);
        } else {
          setStatus(Status.ERROR);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <SafeAreaView className="flex-1 bg-support_secondary p-5">
      {/* <StatusBar backgroundColor={Colors.support_secondary} animated /> */}

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <ThemedText type="defaultBold" color={Colors.secondary} numberOfLines={1}>
            {t('session.confirm_email.header')}
          </ThemedText>
        )}
        onBack={onClose}
      />

      <ScrollView contentContainerStyle={{
        flexGrow: 1,
        width: "100%",
        justifyContent: "center",
        backgroundColor: Colors.support_secondary,
        borderTopStartRadius: 30,
        borderTopEndRadius: 30,
      }}>
        {status === Status.PENDING && (
          <View className="flex-1 justify-between">
            <View className="flex-1 justify-center">
              <View className="bg-secondary h-20 w-20 flex items-center justify-center rounded-full self-center mb-4">
                <FontAwesome6 name="check" size={28} color={Colors.primary} />
              </View>
              <View>
                <ThemedText type="title" color={Colors.secondary} className="text-center">
                  {t('session.confirm_email.pending.title')}
                </ThemedText>
                <ThemedText type="default" color={Colors.gray_medium} className="mt-2 text-center">
                  {t('session.confirm_email.pending.subtitle')}
                </ThemedText>
              </View>
            </View>
            <View>
              <View className="flex items-center mb-4">
                  <MaterialCommunityIcons name="email-outline" size={32} color={Colors.secondary} />
                  <ThemedText type="default" color={Colors.gray_medium} className="text-center mt-2">
                    {t('session.confirm_email.pending.received')}
                  </ThemedText>
              </View>
              <CustomTouchableOpacity
                type="secondary_outline"
                size="large"
                text={t('session.confirm_email.pending.check_later')}
                textSize="medium"
                textColor="secondary"
                textBoldness="semiBold"
                onPress={onClose}
                disabled={loading}
              />
              <View className="mt-4">
                <CustomTouchableOpacity
                  type="primary"
                  size="large"
                  text={t('session.confirm_email.pending.resend_email')}
                  textSize="medium"
                  textColor="secondary"
                  textBoldness="semiBold"
                  onPress={sendEmailVerification}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        )}
        {status === Status.SENT && (
          <View className="flex-1 justify-between">
            <View className="flex-1 justify-center">
              <View className="bg-secondary h-20 w-20 flex items-center justify-center rounded-full self-center mb-4">
                <FontAwesome6 name="check" size={28} color={Colors.primary} />
              </View>
              <View>
                <ThemedText type="title" color={Colors.secondary} className="text-center">
                  {t('session.confirm_email.sent.title')}
                </ThemedText>
              </View>
            </View>
            <CustomTouchableOpacity
              type="primary"
              size="large"
              text={t('session.confirm_email.sent.close')}
              textSize="medium"
              textColor="secondary"
              textBoldness="semiBold"
              onPress={onClose}
              disabled={loading}
            />
          </View>
        )}
        {status === Status.VERIFIED && (
          <View className="flex-1 justify-between">
            <View className="flex-1 justify-center">
              <View className="bg-secondary h-20 w-20 flex items-center justify-center rounded-full self-center mb-4">
                <FontAwesome6 name="check" size={28} color={Colors.primary} />
              </View>
              <View>
                <ThemedText type="title" color={Colors.secondary} className="text-center">
                  {t('session.confirm_email.verified.title')}
                </ThemedText>
              </View>
            </View>
            <CustomTouchableOpacity
              type="primary"
              size="large"
              text={t('session.confirm_email.verified.close')}
              textSize="medium"
              textColor="secondary"
              textBoldness="semiBold"
              onPress={onClose}
              disabled={loading}
            />
          </View>
        )}
        {status === Status.ERROR && (
          <View className="flex-1 justify-between">
            <View className="flex-1 justify-center">
              <View className="bg-secondary h-20 w-20 p-6 flex items-center justify-center rounded-full self-center mb-4">
                <XIcon color={Colors.primary} />
              </View>
              <View>
                <ThemedText type="title" color={Colors.secondary} className="text-center">
                  {t('session.confirm_email.error.title')}
                </ThemedText>
              </View>
            </View>
            <CustomTouchableOpacity
              type="primary"
              size="large"
              text={t('session.confirm_email.error.close')}
              textSize="medium"
              textColor="secondary"
              textBoldness="semiBold"
              onPress={onClose}
              disabled={loading}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default ConfirmEmail;