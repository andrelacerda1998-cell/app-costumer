import { CustomText } from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import DatePicker from '@/components/DatePicker'
import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { validateNIF } from "@/utils"
import React, { useState } from 'react'
import { Control, Controller, FieldErrors, FieldValues, useForm, UseFormHandleSubmit } from 'react-hook-form'
import { useTranslation } from "react-i18next"
import { TextInput, View } from 'react-native'
import { ScrollView } from 'react-native'

const ContactInformationStep = ({
    control,
    errors,
 }: {
    control: any,
    errors: FieldErrors<FieldValues>,
 }) => {
    const { t } = useTranslation();

  return (
    <View className="flex-1">
        <CustomText size="title" color="secondary" boldness="bold" numberOfLines={3}>
            {t('auth.sign_up.contact_information.title')}
        </CustomText>
        <CustomText color="gray_medium" numberOfLines={3} classes="mt-2">
            {t('auth.sign_up.contact_information.subtitle')}
        </CustomText>

        <View className="mt-8">
            <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                {t('general.email')}
            </CustomText>

            <Controller
                control={control}
                name="email"
                defaultValue=""
                rules={{
                  required: t('general.email_required'),
                  pattern: { value: /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i, message: t('general.email_invalid') }
                }}
                render={({ field }) => (
                    <View className="mt-2">
                        <CustomTextInput
                            {...field}
                            size="large"
                            onChangeText={(value: string) => {
                                value = value.trim()
                                field.onChange(value)
                            }}
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
                  classes="mt-1"
                >
                  {errors.email.message as string}
                </CustomText>
            )}
        </View>

        <View className="mt-8">
            <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
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
                                if (value.startsWith('+351')) {
                                    field.onChange(`+351${value.replace(/^\+351/, '').trim()}`)
                                }

                            }}
                            placeholder={t('general.phone_number_placeholder')}
                            keyboardType="phone-pad"
                            maxLength={13}
                            textContentType="telephoneNumber"
                            error={errors.phone_number && errors.phone_number.message}
                            displayErrorIcon={true}
                            success={!errors.phone_number && field.value !== "+351"}
                            displaySuccessIcon={true}
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

        <View className="mt-8">
            <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                {t('general.nif')}
            </CustomText>

            <Controller
                control={control}
                name="nif"
                rules={{
                    required: t('general.nif_required'),
                    pattern: { value: /^[0-9]{9}$/, message: t('general.nif_invalid') },
                    minLength: { value: 9, message: t('general.nif_min_length') },
                    validate: (value) => {
                        const isValid = validateNIF(value)
                        if (!isValid) return t('general.nif_invalid');
                    }
                }}
                render={({ field }) => (
                    <View className="mt-2">
                        <CustomTextInput
                            {...field}
                            size="large"
                            onChangeText={(value: string) => {
                                const newValue = value.replace(/\D/g, '').trim();
                                field.onChange(newValue)
                            }}
                            placeholder={t('general.nif_placeholder')}
                            keyboardType="number-pad"
                            type="numeric"
                            error={errors.nif && errors.nif.message}
                            displayErrorIcon={true}
                            success={!errors.nif && field.value}
                            displaySuccessIcon={true}
                        />
                    </View>
                )}
            />
            {errors.nif && errors.nif.message && (
                <CustomText
                  size="small"
                  color="error"
                  classes="mt-1"
                >
                  {errors.nif.message as string}
                </CustomText>
            )}
        </View>
      </View>
  )
}

export default ContactInformationStep;
