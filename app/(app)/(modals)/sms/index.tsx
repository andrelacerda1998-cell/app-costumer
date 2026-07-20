import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { Entypo, FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import TouchOpacity from '@/components/TouchOpacity'
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import { useSession } from '@/contexts/SessionContext'
import { useTranslation } from "react-i18next"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { CustomText } from "@/components/CustomText"
import { Controller, useForm } from "react-hook-form"
import CustomTextInput from "@/components/CustomTextInput"
import { OtpInput } from "react-native-otp-entry";
import XIcon from "@/assets/icons/x"
import { useDialog } from "@/contexts/DialogContext"

enum Status {
  PENDING = "pending",
  VERIFIED = "verified",
  SENT = "sent",
  ERROR = "error",
}

const Sms = () => {
  const { api } = useApi();
  const { t } = useTranslation();
  const { userData, setUserData } = useSession();
  const { openDialog } = useDialog();
  const [codeError, setCodeError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(Status.PENDING);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string>('');
  const [timer, setTimer] = useState(300);

  useEffect(() => {
    if (status !== Status.SENT) return;
    if (timer > 0 && !loading) {
      const intervalId = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [timer, loading, status]);

  const { control, handleSubmit, formState: { errors, isLoading, isValid },getValues, setError, reset } = useForm({
    mode: 'onChange',
    defaultValues: {
      phone_number: userData?.phone_number || "",
    },
  });

  const onClose = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/home");
  };

  const sendCode = () => {
    setLoading(true);
    api.get(API_ROUTES.GET_SMS_VALIDATION)
      .then(() => {
        setStatus(Status.SENT);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 403) {
          setStatus(Status.VERIFIED);
        } else if (status === 400) {
          openDialog({
            title: t('session.sms.already_sent.title'),
            subtitle: t('session.sms.already_sent.subtitle'),
            closeAfterMSeconds: 2000,
            closeOnClickOutside: true,
          })
          setStatus(Status.SENT);
        } else {
          setStatus(Status.ERROR);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const resendCode = () => {
    setTimer(300);
    sendCode();
  }

  const verify = () => {
    setLoading(true);
    api.post(API_ROUTES.POST_SMS_VALIDATION, {
      code: code,
    })
      .then((res) => {
        const verified_at = res.data.data.verified_at;
        if (verified_at) {
          setUserData({
            ...userData,
            phone_number_verified_at: verified_at,
          })
        }
        setStatus(Status.VERIFIED);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 403) {
          setCodeError(t('session.sms.error.code_invalid'));
        } else {
          setStatus(Status.ERROR);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const goToEditProfile = () => {
    onClose();
    router.push("/(app)/(tabs)/profile");
    router.push("/(app)/(modals)/(profile)/edit-profile");
  }

  return (
    <SafeAreaView className="flex-1 bg-support_secondary p-5">
      {/* <StatusBar backgroundColor={Colors.support_secondary} animated /> */}

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <ThemedText type="defaultBold" color={Colors.secondary} numberOfLines={1}>
            {t('session.sms.header')}
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
            <View className="flex-1 mt-12">
              <View>
                <CustomText color="secondary" boldness="semiBold" size="large" numberOfLines={3}>
                  {t('session.sms.pending.title')}
                </CustomText>
                <CustomText color="gray_strong" boldness="semiBold" numberOfLines={3}>
                  {t('session.sms.pending.subtitle')}
                </CustomText>   
              </View>
              <View className="mt-8">
                <CustomText color="gray_strong" boldness="semiBold" numberOfLines={2}>
                  {t('general.phone_number')}
                </CustomText>
                <Controller
                  control={control}
                  name="phone_number"
                  rules={{
                    required: t('general.phone_number_required'),
                    pattern: {
                      value: /^(\+351)?9\d{8}$/,
                      message: t('general.phone_number_invalid_portuguese'),
                    },
                  }}
                  render={({ field }) => (
                    <View className="mt-2 justify-center">
                      <CustomTextInput
                        {...field}
                        size="large"
                        onChangeText={(value: string) => {
                          const newValue = value.replace(/^\+351-?|\D/g, '').trim();
                          field.onChange(newValue ? `+351${newValue}` : '');
                        }}
                        placeholder={t('general.phone_number_placeholder')}
                        keyboardType="phone-pad"
                        maxLength={13}
                        textContentType="telephoneNumber"
                        error={errors.phone_number && errors.phone_number.message}
                        displayErrorIcon={true}
                        success={!errors.phone_number && field.value !== "+351"}
                        displaySuccessIcon={true}
                        // disabled={loading}
                        disabled={true}
                      />
                  </View>
                  )}
                />
                {errors.phone_number && errors.phone_number.message && (
                  <CustomText
                    size="small"
                    color="error"
                    classes="mt-1"
                  >
                    {errors.phone_number.message as string}
                  </CustomText>
                )}
              </View>
              <View className="mt-4">
                <CustomTouchableOpacity
                  type="transparent"
                  size="large"
                  text={t('session.sms.pending.edit_phone_number')}
                  textSize="medium"
                  textColor="secondary"
                  textBoldness="regular"
                  className="p-0"
                  onPress={goToEditProfile}
                  disabled={loading}
                />
              </View>
            </View>
            <View className="mt-4">
              <CustomTouchableOpacity
                type="primary"
                size="large"
                text={t('session.sms.pending.send_sms')}
                textSize="medium"
                textColor="secondary"
                textBoldness="semiBold"
                onPress={sendCode}
                disabled={loading}
              />
            </View>
          </View>
        )}
        {status === Status.SENT && (
          <View className="flex-1 justify-between">
            <View className="flex-1 mt-12">
              <View>
                <CustomText color="secondary" boldness="semiBold" size="large" numberOfLines={3}>
                  {t('session.sms.sent.title')}
                </CustomText>
                <CustomText color="gray_strong" boldness="semiBold" numberOfLines={3}>
                  {t('session.sms.sent.subtitle')}
                </CustomText>
              </View>
              <View className="w-full my-8">
                <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
                  {t('session.sms.sent.code')}
                </CustomText>

                <View className="w-full flex-row items-center justify-between mt-4">
                    <KeyboardAvoidingView
                      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <OtpInput
                            numberOfDigits={6}
                            focusColor="green"
                            autoFocus={true}
                            hideStick={true}
                            // placeholder="****"
                            blurOnFilled={true}
                            disabled={false}
                            type="alphanumeric"
                            secureTextEntry={false}
                            focusStickBlinkingDuration={500}
                            // onFocus={() => console.log("Focused")}
                            // onBlur={() => console.log("Blurred")}
                            onTextChange={text => {
                                setCode(text)
                                if (codeError) setCodeError(null);
                            }}
                            // onFilled={(text) => console.log(`OTP is ${text}`)}
                            textInputProps={{
                                accessibilityLabel: "SMS Code",
                            }}
                            theme={{
                                containerStyle: styles.container,
                                pinCodeContainerStyle: styles.pinCodeContainer,
                                pinCodeTextStyle: styles.pinCodeText,
                                // focusStickStyle: styles.focusStick,
                                focusedPinCodeContainerStyle: styles.activePinCodeContainer,
                                // placeholderTextStyle: styles.placeholderText,
                                filledPinCodeContainerStyle: styles.filledPinCodeContainer,
                                // disabledPinCodeContainerStyle: styles.disabledPinCodeContainer,
                            }}
                        />
                    </KeyboardAvoidingView>
                </View>
                {codeError && (
                  <CustomText
                    size="small"
                    color="error"
                    classes="mt-2"
                  >
                    {codeError}
                  </CustomText>
                )}

                <View className="flex-row items-center justify-between w-full mt-8">
                  <CustomTouchableOpacity
                    type="transparent"
                    size="large"
                    text={t('session.sms.sent.resend_code')}
                    textSize="medium"
                    textColor="secondary"
                    textBoldness="regular"
                    className="p-0"
                    onPress={resendCode}
                    disabled={loading || timer > 0}
                  />
                  <CustomText color="gray_strong" boldness="semiBold" numberOfLines={3}>
                    {formatTime(timer)}
                  </CustomText>
                </View>
              </View>
            </View>
            <CustomTouchableOpacity
              type="primary"
              size="large"
              text={t('session.sms.sent.verify')}
              textSize="medium"
              textColor="secondary"
              textBoldness="semiBold"
              onPress={verify}
              disabled={loading || codeError !== null || code.length < 6}
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
                  {t('session.sms.verified.title')}
                </ThemedText>
              </View>
            </View>
            <CustomTouchableOpacity
              type="primary"
              size="large"
              text={t('session.sms.verified.close')}
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
                  {t('session.sms.error.title')}
                </ThemedText>
              </View>
            </View>
            <CustomTouchableOpacity
              type="primary"
              size="large"
              text={t('session.sms.error.close')}
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


const styles = StyleSheet.create({
  container: {
  },
  pinCodeContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "15%",
    height: 60,
    // backgroundColor: "#dddddd",
    borderWidth: 2,
    borderColor: "#E4E3E3",
    borderRadius: 12,
  },
  pinCodeText: {
    fontSize: 20,
  },
  activePinCodeContainer: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  filledPinCodeContainer: {
    borderWidth: 2,
    borderColor: Colors.secondary,
  }
})

export default Sms;