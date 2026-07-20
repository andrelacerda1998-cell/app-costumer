import CheckMark from '@/assets/icons/check-mark'
import XIcon from '@/assets/icons/x'
import BackHeader from "@/components/app/BackHeader"
import { CustomText } from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { API_ROUTES } from "@/constants/ApiRoutes"
import { Colors } from '@/constants/Colors'
import { useApi } from "@/contexts/ApiContext"
import { useDialog } from "@/contexts/DialogContext"
import { useSession } from "@/contexts/SessionContext"
import { commonPasswords } from "@/utils"
import { Feather, FontAwesome6 } from '@expo/vector-icons'
import axios from "axios"
import { router, useLocalSearchParams } from "expo-router"
import React, { useEffect, useState } from 'react'
import { Control, Controller, FieldErrors, FieldValues, set, useForm } from 'react-hook-form'
import { useTranslation } from "react-i18next"
import { Pressable, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { SafeAreaView } from "react-native-safe-area-context"

const ResetPassword = () => {
  const { t } = useTranslation();
  const { email, token } = useLocalSearchParams();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { session } = useSession();

  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  const wrongPassword = {
    MINIMUM: t('general.password_min_length'),
    UPPERCASE: t('general.password_uppercase'),
    LOWERCASE: t('general.password_lowercase'),
    NUMBER: t('general.password_number'),
    SPECIAL_CHAR: t('general.password_special_character'),
    COMMON: t('general.password_common'),
    MATCH: t('general.password_match'),
  }
  const [passwordErrors, setPasswordErrors] = useState({
    MINIMUM: true,
    UPPERCASE: true,
    LOWERCASE: true,
    NUMBER: true,
    SPECIAL_CHAR: true,
    COMMON: true,
    MATCH: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, setValue, formState: { errors, isValid }, setError } = useForm({
    mode: 'onChange',
    defaultValues: {
      password: '',
      password_confirmation: '',
    }
  });

  const validatePassword = () => {
    if (setResetPasswordError) setResetPasswordError(null);
    const password = control._formValues.password;
    const password_confirmation = control._formValues.password_confirmation;
    const errors = {
      MINIMUM: password.length < 12,
      UPPERCASE: !/[A-Z]/.test(password),
      LOWERCASE: !/[a-z]/.test(password),
      NUMBER: !/[0-9]/.test(password),
      SPECIAL_CHAR: !/[!@?#$%^&*_/-]/.test(password),
      COMMON: commonPasswords.includes(password),
      MATCH: password !== password_confirmation,
    };

    setPasswordErrors(errors);

    if (Object.values(errors).some(error => error)) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    validatePassword();
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (session) {
        router.push('/(app)/(tabs)/home');
      } else {
        router.push('/(auth)/index');
      }
    }
  }

  const resetPassword = async (data: any) => {
    if (setResetPasswordError) setResetPasswordError(null);
    setIsLoading(true);
    try {
      await api.post(API_ROUTES.AUTH_RESET_PASSWORD, {
        ...data,
        email,
        token
      });

      openDialog({
        icon: <CheckMark color={Colors.secondary}/>,
        title: t('auth.reset_password.success.title'),
        subtitle: t('auth.reset_password.success.subtitle'),
        closeAfterMSeconds: 3000,
        closeOnClickOutside: true,
        onClose: () => {
          goBack();
        }
      });
    } catch(error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 422) {
          setResetPasswordError(t('auth.reset_password.errors.password_used_before'));
        } else if (error.response?.status === 404) {
          setResetPasswordError(t('auth.reset_password.errors.token_invalid'));
        } else if (error.response?.status === 500) {
          setResetPasswordError(t('errors.server_error'));
        } else {
          setResetPasswordError(t('errors.occurred_an_error'));
        }
      }
    }
    setIsLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 p-5">
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t('auth.reset_password.title')}
          </CustomText>
        )}
        otherClasses="pb-5"
        onBack={goBack}
      />
      <KeyboardAwareScrollView bottomOffset={20}>
        <CustomText size="title" color="secondary" boldness="bold" numberOfLines={3}>
          {t('auth.reset_password.title')}
        </CustomText>
        <CustomText color="gray_medium" numberOfLines={3} classes="mt-2">
          {t('auth.reset_password.subtitle')}
        </CustomText>

        <View className="mt-8">
          <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
            {t('general.password')}
          </CustomText>

          <Controller
            control={control}
            name="password"
            defaultValue=""
            rules={{
              required: t('general.password_required'),
              validate: () => validatePassword()
            }}
            render={({ field }) => (
              <View className="mt-2 justify-center" removeClippedSubviews={true}>
                <CustomTextInput
                  {...field}
                  size="large"
                  onChangeText={(value: string) => {
                    const filteredValue = value.replace(/\s/g, '');
                    field.onChange(filteredValue);
                  }}
                  textContentType="password"
                  placeholder={t('general.password_placeholder')}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  contextMenuHidden={true}
                  pointerEvents="box-only"
                  error={errors.password && errors.password.message}
                  success={!errors.password && field.value}
                  Icon={() => (
                    <View className="w-12 h-full items-center justify-center">
                      <TouchableWithoutFeedback
                        onPress={() => setShowPassword(prev => !prev)}
                      >
                        <View className="w-full h-full items-center justify-center">
                          <Feather name={showPassword ? 'eye' : 'eye-off'} size={24} color={Colors.secondary} />
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
              classes="mt-1"
            >
              {errors.password.message as string}
            </CustomText>
          )}
        </View>

        <View className="mt-8">
          <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
            {t('general.confirm_password')}
          </CustomText>

          <Controller
            control={control}
            name="password_confirmation"
            defaultValue=""
            rules={{
              required: t('general.confirm_password_required'),
              validate: () => validatePassword()
            }}
            render={({ field }) => (
              <View className="mt-2 justify-center" removeClippedSubviews={true}>
                <CustomTextInput
                    {...field}
                    size="large"
                    onChangeText={(value: string) => {
                      const filteredValue = value.replace(/\s/g, '');
                      field.onChange(filteredValue);
                    }}
                    textContentType="password_confirmation"
                    autoCorrect={false}
                    contextMenuHidden={true}
                    pointerEvents="box-only"
                    placeholder={t('general.confirm_password_placeholder')}
                    secureTextEntry={!showPassword}
                    error={errors.password_confirmation && errors.password_confirmation.message}
                    success={!errors.password_confirmation && field.value}
                />
              </View>
            )}
          />
        </View>

        <View className="mt-4 space-y-2">
          {
            Object.keys(passwordErrors).map((key) => (
              <View key={key} className="flex flex-row space-x-2">
                <View className="mt-1">
                  {
                    passwordErrors[key as keyof typeof passwordErrors] ? (
                      <View className="w-3 h-3">
                        <XIcon color={Colors.secondary} />
                      </View>
                    ) : (
                      <View className="w-4 h-4">
                        <CheckMark color={Colors.success} />
                      </View>
                    )
                  }
                </View>
                <CustomText color="gray_medium" size="small" numberOfLines={5}>
                  {wrongPassword[key as keyof typeof wrongPassword]}
                </CustomText>
              </View>
            ))
          }
        </View>
      </KeyboardAwareScrollView>

      <View className="pt-4">
        {resetPasswordError && (
            <CustomText
                size="small"
                color="error"
                boldness="medium"
                className="text-center mb-2"
            >
                {resetPasswordError}
            </CustomText>
        )}
        <CustomTouchableOpacity
            type="secondary"
            size="large"
            text={t('auth.reset_password.button')}
            textColor="primary"
            textBoldness="semiBold"
            disabled={isLoading}
            onPress={handleSubmit((data) => resetPassword(data))}
        />
      </View>

    </SafeAreaView>
  )
}

export default ResetPassword;