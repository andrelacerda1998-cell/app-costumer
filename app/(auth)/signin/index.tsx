import { Keyboard, Pressable, Text, TextInput, View, TouchableWithoutFeedback, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import React, { useEffect, useRef, useState } from "react";
import { Link, router, useNavigation } from "expo-router";
import Entypo from "@expo/vector-icons/Entypo";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/Colors";
import { ApiProvider, useApi } from "@/contexts/ApiContext";
import { SessionProvider, useSession } from "@/contexts/SessionContext";
import axios from "axios";
import { API_BASE_URL, API_ROUTES } from "@/constants/ApiRoutes";
import { Controller, useForm } from "react-hook-form";
import TouchOpacity from "@/components/TouchOpacity";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import GoogleIcon from "@/assets/icons/google";
import AppleIcon from "@/assets/icons/apple";
import FacebookIcon from "@/assets/icons/facebook";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { OtpInput } from "react-native-otp-entry";
import { useMixpanel } from "@/contexts/MixpanelContext";

const SignIn = () => {
  const { api } = useApi();
  const { setSession } = useSession();
  const { t } = useTranslation();
  const { track } = useMixpanel();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [otpState, setOtpState] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<any>(null);
  const verifyingRef = useRef(false);
  const sendingRef = useRef(false);

  const { control, handleSubmit, formState: { errors, isValid }, setError } = useForm({
    mode: "onChange",
    defaultValues: {
        email: "",
        password: "",
    }
  });

  useEffect(() => {
    if (otpResendTimer > 0) {
      const interval = setInterval(() => {
        setOtpResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpResendTimer]);

  const startOtpTimer = () => {
    setOtpResendTimer(30);
    if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    otpTimerRef.current = setInterval(() => {
      setOtpResendTimer(prev => {
        if (prev <= 1) { clearInterval(otpTimerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const formatPhone = (raw: string) => {
    const stripped = raw.replace(/^\+351/, '').replace(/\D/g, '');
    return `+351${stripped}`;
  };

  const sendPhoneCode = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    track('phone_entered');
    const formatted = formatPhone(phone);
    if (!phone || formatted.length < 13) {
      setPhoneError(t('general.phone_number_invalid'));
      sendingRef.current = false;
      return;
    }
    setPhoneError('');
    setIsLoggingIn(true);
    try {
      await api.post(API_ROUTES.PHONE_LOGIN, { phone_number: formatted });
      track('sms_sent');
      setOtpState('sent');
      startOtpTimer();
    } catch (error: any) {
      setPhoneError(error.response?.data?.message || t('errors.occurred_an_error'));
    } finally {
      setIsLoggingIn(false);
      sendingRef.current = false;
    }
  };

  const verifyPhoneCode = async (code: string) => {
    // Evita duplo-envio: o auto-submit (onFilled) pode disparar mais que uma vez
    // antes de o estado isLoggingIn atualizar (batching do React), consumindo o
    // limite de throttle e provocando 429 "à primeira".
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    const formatted = formatPhone(phone);
    const startTime = Date.now();
    setIsLoggingIn(true);
    try {
      const response = await api.post(API_ROUTES.PHONE_LOGIN_VERIFY, {
        phone_number: formatted,
        code,
      });
      const { access_token } = response.data.data;
      const timeToVerify = Math.round((Date.now() - startTime) / 1000);
      track('sms_verified', { time_to_verify_seconds: timeToVerify });
      if (access_token) {
        setSession(access_token);
      }
      setOtpState('verified');
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    } catch (error: any) {
      setCodeError(error.response?.data?.message || t('errors.occurred_an_error'));
      otpInputRef.current?.setValue('');
    } finally {
      setIsLoggingIn(false);
      verifyingRef.current = false;
    }
  };

  const resendCode = async () => {
    setCodeError('');
    setOtpState('idle');
    otpInputRef.current?.clear();
    await sendPhoneCode();
  };

  const signIn = async (data: { email: string, password: string }) => {
    setIsLoggingIn(true);
    try {
      const response = await api.post(API_ROUTES.AUTH_LOGIN, {
        email: data.email,
	      password: data.password,
        type: "customer"
      });


      const { access_token } = response?.data.data;

      if (access_token) {
        setSession(access_token);
      }
    } catch (error) {
      console.log(error);
      if (axios.isAxiosError(error)) {
        if (
          error.response?.status === 400 ||
          error.response?.status === 422
        ) {
          setError("email", {
            type: "manual",
            message: error.response?.data.message || t('errors.invalid_email_or_password')
          });
          setError("password", {
            type: "manual",
            message: ""
          })
        } else if (
          error.response?.status === 500 ||
          error.response?.status === 503
        ) {
          setError("email", {
            type: "manual",
            message: t('errors.server_error')
          });
          setError("password", {
            type: "manual",
            message: ""
          })
        }
      }
    }
    setIsLoggingIn(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-support_secondary p-6">
      <BackHeader
        backButtonColor="secondary"
        onBack={() => router.push("/(app)/(tabs)/home")}
      />
      <KeyboardAwareScrollView bottomOffset={20}>
        <View className="flex-1">
          <View className="mt-8">
            <CustomText
              size="title"
              color="secondary"
              boldness="bold"
            >
              {t('auth.sign_in.title')}
            </CustomText>
            <CustomText
              size="medium"
              color="gray_medium"
              boldness="regular"
              numberOfLines={2}
              classes="mt-2"
            >
              {t('auth.sign_in.subtitle')}
            </CustomText>
          </View>

          <View className="flex-1 mt-8">
            {loginMethod === 'phone' ? (
              <View className="mt-4 space-y-4">
                <View>
                  <CustomText
                    size="medium"
                    color="secondary"
                    boldness="bold"
                  >
                    {t('general.phone_number')}
                  </CustomText>
                  <View className="flex-row items-center space-x-2">
                    <View className={`flex-1 flex-row items-center border rounded-xl bg-support_secondary px-3 ${phoneError ? 'border-error' : 'border-gray-400'}`}>
                      <CustomText color="gray_medium" size="small" boldness="regular">+351</CustomText>
                      <TextInput
                          value={phone.replace(/^\+351/, '')}
                          onChangeText={(text) => {
                            const digits = text.replace(/\D/g, '');
                            setPhone(`+351${digits}`);
                            setPhoneError('');
                            setCodeError('');
                            if (otpState === 'sent') {
                              setOtpState('idle');
                              otpInputRef.current?.clear();
                            }
                          }}
                          placeholder="912 345 678"
                          placeholderTextColor={Colors.gray_strong}
                          keyboardType="phone-pad"
                          maxLength={9}
                          className="flex-1 py-3 pl-2 pr-6 text-secondary text-sm font-poppins-regular"
                      />
                      <View className="absolute right-3">
                        {otpState === 'sent' && (
                          <Feather name="edit-2" size={18} color={Colors.secondary} />
                        )}
                        {otpState === 'verified' && (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.secondary} />
                        )}
                      </View>
                    </View>
                  </View>
                  {phoneError ? (
                    <CustomText size="small" color="error" classes="mt-1">
                      {phoneError}
                    </CustomText>
                  ) : null}
                </View>

                {otpState === 'sent' && (
                  <View className="space-y-4 py-2">
                    <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center">
                      {t('guest.checkout.otp_sent_to', { phone: formatPhone(phone) })}
                    </CustomText>
                    <View className="mt-4">
                      <OtpInput
                        ref={otpInputRef}
                        numberOfDigits={6}
                        onFilled={verifyPhoneCode}
                        focusColor={Colors.primary}
                        disabled={isLoggingIn}
                        theme={{
                          containerStyle: { justifyContent: 'center', gap: 8, flexDirection: 'row' },
                          pinCodeContainerStyle: {
                            borderColor: codeError ? Colors.error : Colors.gray_strong,
                            borderRadius: 12,
                            backgroundColor: Colors.support_secondary,
                            flex: 1,
                            height: 48,
                          },
                          pinCodeTextStyle: { color: Colors.secondary, fontSize: 18 },
                          focusedPinCodeContainerStyle: { borderColor: Colors.primary, borderWidth: 2 },
                        }}
                      />
                    </View>
                    {codeError ? (
                      <CustomText color="error" size="small" boldness="regular" classes="text-center">
                        {codeError}
                      </CustomText>
                    ) : null}
                    {isLoggingIn && (
                      <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center">
                        {t('general.loading')}
                      </CustomText>
                    )}
                    <View className="items-center py-1 mt-4">
                      <TouchableWithoutFeedback
                        onPress={otpResendTimer === 0 ? resendCode : undefined}
                        disabled={otpResendTimer > 0 || isLoggingIn}
                      >
                        <CustomText
                          color={otpResendTimer > 0 ? 'gray_medium' : 'secondary'}
                          size="small"
                          boldness={otpResendTimer > 0 ? 'regular' : 'semiBold'}
                        >
                          {otpResendTimer > 0
                            ? t('guest.checkout.otp_resend_in', { seconds: otpResendTimer })
                            : t('guest.checkout.otp_resend')}
                        </CustomText>
                      </TouchableWithoutFeedback>
                    </View>
                  </View>
                )}

                <TouchableWithoutFeedback onPress={() => setLoginMethod('email')}>
                  <CustomText
                    size="medium"
                    color="secondary"
                    boldness="bold"
                    classes="mt-4 text-center"
                  >
                    {t('auth.sign_in.use_email_instead')}
                  </CustomText>
                </TouchableWithoutFeedback>
              </View>
            ) : (
              <View className="mt-4">
                <View className="mt-4">
                  <CustomText
                    size="medium"
                    color="secondary"
                    boldness="bold"
                  >
                    {t('general.email')}
                  </CustomText>

                  <Controller
                    control={control}
                    name="email"
                    defaultValue=""
                    rules={{
                      required: `${t('general.email_required')}`,
                      pattern: { value: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, message: `${t('general.email_invalid')}` }
                    }}
                    render={({ field }) => (
                      <View className="relative mt-2">
                        <CustomTextInput
                          {...field}
                          size="large"
                          onChangeText={field.onChange}
                          autoCapitalize="none"
                          placeholder={t('general.email_placeholder')}
                          textContentType="emailAddress"
                          error={errors.email && errors.email.message}
                          displayErrorIcon={true}
                          success={!errors.email && field.value}
                          displaySuccessIcon={true}
                        />
                      </View>
                    )}
                  />
                  {errors.email && errors.email.message && (
                    <CustomText
                      size="small"
                      color="error"
                      boldness="regular"
                      classes="mt-1"
                      numberOfLines={5}
                    >
                      {errors.email.message}
                    </CustomText>
                  )}
                </View>

                <View className="mt-6">
                  <CustomText
                    size="medium"
                    color="secondary"
                    boldness="bold"
                  >
                    {t('general.password')}
                  </CustomText>

                  <Controller
                    control={control}
                    name="password"
                    defaultValue=""
                    rules={{
                      required: `${t('general.password_required')}`,
                      minLength: { value: 8, message: t('general.password_min_length') }
                    }}
                    render={({ field }) => (
                      <View className="relative mt-2">
                        <CustomTextInput
                          {...field}
                          onChangeText={(value: string) => {
                            const filteredValue = value.replace(/\s/g, "");
                            field.onChange(filteredValue);
                          }}
                          textContentType="password"
                          placeholder={t('general.password_placeholder')}
                          autoCapitalize="none"
                          secureTextEntry={!showPassword}
                          size="large"
                          Icon={() => (
                            <View className="w-12 h-full items-center justify-center">
                              <TouchableWithoutFeedback
                                onPress={() => setShowPassword(prev => !prev)}
                              >
                                <View className="w-full h-full items-center justify-center">
                                  <Feather name={showPassword ? "eye" : "eye-off"} size={24} color={Colors.secondary} />
                                </View>
                              </TouchableWithoutFeedback>
                            </View>
                          )}
                        />
                      </View>
                    )}
                  />
                  {errors.password && errors.password.message && (
                    <CustomText
                      size="small"
                      color="error"
                      boldness="regular"
                      classes="mt-1"
                      numberOfLines={5}
                    >
                      {errors.password.message}
                    </CustomText>
                  )}
                </View>
                <TouchableWithoutFeedback
                  onPress={() => {
                    router.push("/(auth)/forgot-password");
                  }}
                  disabled={isLoggingIn}
                >
                  <CustomText
                    size="medium"
                    color={isLoggingIn ? "gray_light" : "secondary"}
                    boldness="bold"
                    numberOfLines={1}
                    classes="mt-4 self-end"
                  >
                    {t('auth.sign_in.forgot_password')}
                  </CustomText>
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback onPress={() => setLoginMethod('phone')}>
                  <CustomText
                    size="medium"
                    color="secondary"
                    boldness="bold"
                    classes="mt-4 text-center"
                  >
                    {t('auth.sign_in.use_phone_instead')}
                  </CustomText>
                </TouchableWithoutFeedback>
              </View>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>
<View className="mt-6">
        {loginMethod === 'phone' && (
          <CustomTouchableOpacity
            type="primary"
            size="large"
            text={isLoggingIn ? t('general.loading') : otpState === 'idle' ? t('auth.sign_in.send_code') : otpState === 'verified' ? t('auth.sign_in.login') : t('general.continue')}
            textColor="secondary"
            textBoldness="bold"
            onPress={otpState === 'idle' ? sendPhoneCode : () => otpInputRef.current?.validateOtp()}
            disabled={isLoggingIn || (otpState === 'idle' && (!phone || phone === '+351'))}
          />
        )}
        {loginMethod === 'email' && (
          <CustomTouchableOpacity
            type="primary"
            size="large"
            text={isLoggingIn ? t('general.loading') : t('auth.sign_in.sign_in')}
            textSize="medium"
            textColor="secondary"
            textBoldness="bold"
            onPress={handleSubmit((data) => signIn(data))}
            disabled={isLoggingIn || !isValid}
          />
        )}

        {/* <View className="flex-grow-0 flex-row justify-center items-center w-full relative space-x-4 my-6">
          <View className="flex-1 h-[1px] bg-support_primary rounded-full"></View>
          <CustomText
            size="small"
            color="gray_light"
            boldness="semiBold"
          >
            Or sign in with
          </CustomText>
          <View className="flex-1 h-[1px] bg-support_primary rounded-full"></View>
        </View>

        <View className="flex-row justify-between">
          <CustomTouchableOpacity
            type="support_primary_outline"
            size="large"
            classes="w-[30%]"
            disabled={isLoggingIn}
          >
            <FacebookIcon />
          </CustomTouchableOpacity>
          <CustomTouchableOpacity
            type="support_primary_outline"
            size="large"
            classes="w-[30%]"
            disabled={isLoggingIn}
          >
            <GoogleIcon />
          </CustomTouchableOpacity>
          <CustomTouchableOpacity
            type="support_primary_outline"
            size="large"
            classes="w-[30%]"
            disabled={isLoggingIn}
          >
            <AppleIcon />
          </CustomTouchableOpacity>
        </View> */}
      </View>
    </SafeAreaView>
  );
};

export default SignIn;
