import CheckMark from '@/assets/icons/check-mark'
import XIcon from '@/assets/icons/x'
import { CustomText } from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import DatePicker from '@/components/DatePicker'
import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { commonPasswords } from "@/utils"
import { Feather, FontAwesome6 } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import { Control, Controller, FieldErrors, FieldValues, set } from 'react-hook-form'
import { useTranslation } from "react-i18next"
import { Pressable, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import { ScrollView } from 'react-native'

const PasswordInformationStep = ({
  control,
  errors
}: {
  control: any,
  errors: FieldErrors<FieldValues>,
}) => {
  const { t } = useTranslation();
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

  const validatePassword = () => {
    const password = control._formValues.password;
    const password_confirmation = control._formValues.password_confirmation;
    const errors = {
      MINIMUM: password.length < 8,
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

  return (
    <View className="flex-1">
      <CustomText size="title" color="secondary" boldness="bold" numberOfLines={3}>
        {t('auth.sign_up.password_information.title')}
      </CustomText>
      <CustomText color="gray_medium" numberOfLines={3} classes="mt-2">
        {t('auth.sign_up.password_information.subtitle')}
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
    </View>
  )
}

export default PasswordInformationStep;