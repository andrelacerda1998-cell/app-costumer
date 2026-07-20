import { CustomText } from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import PlacesAutocomplete from '@/components/PlacesAutocomplete'
import CustomTouchableOpacity from '@/components/CustomTouchableOpacity'
import DatePicker from '@/components/DatePicker'
import { ThemedText } from '@/components/ThemedText'
import LocationIcon from '@/assets/icons/location'
import { Colors } from '@/constants/Colors'
import { useLocationFill } from '@/hooks/useLocationFill'
import React, { useState } from 'react'
import { Control, Controller, FieldErrors, FieldValues, useForm, UseFormHandleSubmit } from 'react-hook-form'
import { useTranslation } from "react-i18next"
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native'
import { ScrollView } from 'react-native'

const AddressInformationStep = ({
    control,
    errors,
    setValue,
 }: {
    control: any,
    errors: FieldErrors<FieldValues>,
    setValue?: (name: string, value: any, options?: any) => void,
 }) => {
    const { t } = useTranslation();
    const { locationLoading, suppressSearch, requestLocation } = useLocationFill();

  return (
    <View className="flex-1">
        <CustomText size="title" color="secondary" boldness="bold">
            {t('auth.sign_up.address_information.title')}
        </CustomText>
        <CustomText color="gray_medium" classes="py-2">
            {t('auth.sign_up.address_information.subtitle')}
        </CustomText>

        <View className="flex-1">
            <CustomTouchableOpacity
                size="medium"
                type="secondary_outline"
                onPress={() => requestLocation((fields) => {
                    if (setValue) {
                        setValue('street_name', fields.street_name, { shouldValidate: true });
                        setValue('street_number', fields.street_number, { shouldValidate: true });
                        setValue('postal_code', fields.postal_code, { shouldValidate: true });
                        setValue('city', fields.city, { shouldValidate: true });
                        setValue('state', fields.state, { shouldValidate: true });
                        setValue('country', fields.country, { shouldValidate: true });
                    }
                })}
                disabled={locationLoading}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 14, height: 16 }}>
                        <LocationIcon color={Colors.secondary} />
                    </View>
                    <CustomText color="secondary" boldness="semiBold">
                        {locationLoading ? t('general.loading') : t('general.use_my_location')}
                    </CustomText>
                </View>
            </CustomTouchableOpacity>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.address_name')}
                </CustomText>

                <Controller
                    control={control}
                    name="address_name"
                    rules={{
                        required: false,
                        minLength: {
                            value: 3,
                            message: t('general.address_name_min_length')
                        },
                        maxLength: {
                            value: 50,
                            message: t('general.address_name_max_length')
                        },
                    }}
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={field.onChange}
                                placeholder={t('general.address_name_placeholder')}
                                error={errors.address_name && errors.address_name.message}
                                displayErrorIcon={true}
                                success={!errors.address_name && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.address_name && errors.address_name.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    
                    >
                        {errors.address_name.message as string}
                    </CustomText>
                )}
            </View>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.street_name')}
                </CustomText>

                <Controller
                    control={control}
                    name="street_name"
                    rules={{
                        required: t('general.street_name_required'),
                    }}
                    render={({ field }) => (
                        <View className="mt-2">
                            <PlacesAutocomplete
                                value={field.value ?? ''}
                                onChangeText={field.onChange}
                                placeholder={t('general.street_name_placeholder')}
                                error={errors.street_name && errors.street_name.message}
                                success={!errors.street_name && field.value}
                                suppressSuggestions={suppressSearch}
                                onSelect={(suggestion) => {
                                    if (suggestion.street_name) field.onChange(suggestion.street_name);
                                    if (setValue) {
                                        if (suggestion.street_number) setValue('street_number', suggestion.street_number, { shouldValidate: true });
                                        if (suggestion.city) setValue('city', suggestion.city, { shouldValidate: true });
                                        if (suggestion.postal_code) setValue('postal_code', suggestion.postal_code, { shouldValidate: true });
                                        if (suggestion.state) setValue('state', suggestion.state, { shouldValidate: true });
                                    }
                                }}
                            />
                        </View>
                    )}
                />
                {errors.street_name && errors.street_name.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    
                    >
                        {errors.street_name.message as string}
                    </CustomText>
                )}
            </View>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.street_number')}
                </CustomText>

                <Controller
                    control={control}
                    name="street_number"
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={field.onChange}
                                placeholder={t('general.street_number_placeholder')}
                                error={errors.street_number && errors.street_number.message}
                                displayErrorIcon={true}
                                success={!errors.street_number && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.street_number && errors.street_number.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    >
                    {errors.street_number.message as string}
                    </CustomText>
                )}
            </View>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.address_additional_info')}
                </CustomText>

                <Controller
                    control={control}
                    name="additional_info"
                    rules={{
                        required: false,
                        minLength: {
                            value: 3,
                            message: t('general.address_additional_info_min_length')
                        },
                        maxLength: {
                            value: 50,
                            message: t('general.address_additional_info_max_length')
                        },
                    }}
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={field.onChange}
                                placeholder={t('general.address_additional_info_placeholder')}
                                error={errors.additional_info && errors.additional_info.message}
                                displayErrorIcon={true}
                                success={!errors.additional_info && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.additional_info && errors.additional_info.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    
                    >
                        {errors.additional_info.message as string}
                    </CustomText>
                )}
            </View>


            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.locality')}
                </CustomText>

                <Controller
                    control={control}
                    name="state"
                    rules={{
                        required: t('general.locality_required'),
                    }}
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={field.onChange}
                                placeholder={t('general.locality_placeholder')}
                                error={errors.state && errors.state.message}
                                displayErrorIcon={true}
                                success={!errors.state && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.state && errors.state.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    >
                    {errors.state.message as string}
                    </CustomText>
                )}
            </View>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.city')}
                </CustomText>

                <Controller
                    control={control}
                    name="city"
                    rules={{
                        required: t('general.city_required'),
                    }}
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={field.onChange}
                                placeholder={t('general.city_placeholder')}
                                error={errors.city && errors.city.message}
                                displayErrorIcon={true}
                                success={!errors.city && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.city && errors.city.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    >
                    {errors.city.message as string}
                    </CustomText>
                )}
            </View>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.postal_code')}
                </CustomText>

                <Controller
                    control={control}
                    name="postal_code"
                    rules={{
                        required: t('general.postal_code_required'),
                        pattern: {
                            value: /^\d{4}-\d{3}$/,
                            message: t('general.postal_code_invalid_format'),
                        },
                    }}
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={(value: string) => {
                                    value = value.replace(/\s{2,}/g, ' ').replace(/[^\d]/g, '');
                                    if (value.endsWith('-')) {
                                        value = value.slice(0, -1)
                                    } else {
                                        value = value.replace(/(\d{4})(\d{1})/, '$1-$2')
                                    }
                                    field.onChange(value)
                                }}
                                maxLength={8}
                                placeholder={t('general.postal_code_placeholder')}
                                keyboardType="number-pad"
                                error={errors.postal_code && errors.postal_code.message}
                                displayErrorIcon={true}
                                success={!errors.postal_code && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.postal_code && errors.postal_code.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    >
                    {errors.postal_code.message as string}
                    </CustomText>
                )}
            </View>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold">
                    {t('general.country')}
                </CustomText>

                <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={field.onChange}
                                placeholder={t('general.country_placeholder')}
                                disabled
                                error={errors.country && errors.country.message}
                                displayErrorIcon={true}
                                success={!errors.country && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.country && errors.country.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    >
                    {errors.country.message as string}
                    </CustomText>
                )}
            </View>
        </View>
    </View>
  )
}

export default AddressInformationStep;
