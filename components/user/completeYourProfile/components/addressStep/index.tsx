import CheckMark from "@/assets/icons/check-mark"
import XIcon from "@/assets/icons/x"
import LocationIcon from "@/assets/icons/location"
import {CustomText} from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import PlacesAutocomplete from '@/components/PlacesAutocomplete'
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import DatePicker from '@/components/DatePicker'
import {ThemedText} from '@/components/ThemedText'
import TouchOpacity from "@/components/TouchOpacity"
import {API_ROUTES} from "@/constants/ApiRoutes"
import {Colors} from '@/constants/Colors'
import {useApi} from "@/contexts/ApiContext"
import {useDialog} from "@/contexts/DialogContext"
import {useSession} from "@/contexts/SessionContext"
import i18n from "@/translation"
import {UserDataInterface} from "@/types/session"
import {validateNIF} from "@/utils"
import {useActionSheet} from "@expo/react-native-action-sheet"
import {Picker} from "@react-native-picker/picker"
import axios from "axios"
import { router } from "expo-router"
import React, {useEffect, useState} from 'react'
import {Control, Controller, FieldErrors, FieldValues, useForm, UseFormHandleSubmit} from 'react-hook-form'
import {useTranslation} from "react-i18next"
import {Platform, StatusBar, TextInput, View} from 'react-native'
import {ScrollView} from 'react-native'
import {KeyboardAwareScrollView} from "react-native-keyboard-controller"
import { useLocationFill } from "@/hooks/useLocationFill"

interface address {
    country: string | undefined;
    address_name: string | null | undefined;
    street_name: string | undefined;
    street_number: string | undefined;
    additional_info: string | null | undefined;
    postal_code: string | undefined;
    city: string | undefined;
    state: string | undefined;
}

const AddressStep = ({
    onNext
}: {
    onNext: (data: UserDataInterface) => void;
}) => {
    const { t } = useTranslation();
    const { userData, setUserData } = useSession();
    const { openDialog } = useDialog();

    const {control, handleSubmit, setValue, formState: {errors, isValid}, setError} = useForm({
        mode: 'onChange',
        defaultValues: {
            address_name: userData?.address?.address_name,
            street_name: userData?.address?.street_name,
            street_number: userData?.address?.street_number,
            additional_info: userData?.address?.additional_info,
            postal_code: userData?.address?.postal_code,
            city: userData?.address?.city,
            state: userData?.address?.state,
            country: userData?.address?.country || 'Portugal',
        }
    });

    const {api} = useApi();
    const [loading, setLoading] = useState<boolean>(false);
    const { locationLoading, suppressSearch, requestLocation } = useLocationFill();

    const updateAddress = (data: address) => {
      setLoading(true);
      api.put(API_ROUTES.CUSTOMER_CHANGE_ADDRESS, {
            address_name: data.address_name || '',
            street_name: data.street_name,
            street_number: data.street_number,
            postal_code: data.postal_code,
            city: data.city,
            state: data.state,
            country: data.country || 'Portugal',
      })
        .then(({data}) => {
            const newUserData = {...userData, address: data.data.address, allowed_by_zone: data.data.allowed_by_zone};
            setUserData(newUserData);
            onNext(newUserData as UserDataInterface);
            // if (router.canGoBack()) {
            //     router.back();
            // }
            // if (!data.data.allowed_by_zone && userData?.allowed_by_zone) {
            //     router.push('/(app)/(modals)/blocked-by-zone');
            // }
        }).catch((error) => {
            if (error.response.data.message === 'Address is invalid') {
                openDialog({
                    icon: <XIcon color={Colors.secondary} />,
                    title: t('errors.title'),
                    subtitle: t('errors.address_invalid'),
                    closeAfterMSeconds: 3000,
                    closeOnClickOutside: true,
                })
            } else {
                openDialog({
                    icon: <XIcon color={Colors.secondary} />,
                    title: t('errors.title'),
                    subtitle: t('errors.occurred_an_error'),
                    closeAfterMSeconds: 2000,
                    closeOnClickOutside: true,
                })
            }
        }).finally(() => {
            setLoading(false);
        })
    };

    // const onUpdateAddress = (data: address) => {
    //     openDialog({
    //         title: t('profile.update_address.update_address'),
    //         subtitle: t('profile.update_address.update_address_subtitle'),
    //         cancelButtonText: t('profile.update_address.cancel_update'),
    //         successButtonText: t('profile.update_address.confirm_update'),
    //         onSuccess: () => updateAddress(data)
    //     })
    // };

    return (
        <View className="flex-1 p-5">

            {/* <StatusBar backgroundColor="#FFF" barStyle="dark-content" /> */}

            <CustomText size="title" color="secondary" boldness="bold" numberOfLines={3} classes="mb-4">
                {t('profile.update_address.header')}
            </CustomText>
            {/* <CustomText color="gray_medium" numberOfLines={3} classes="mt-2">
                {t('auth.sign_up.personal_information.subtitle')}
            </CustomText> */}


            <KeyboardAwareScrollView bottomOffset={40}>
                <View className="flex-1">
                    <CustomTouchableOpacity
                        size="medium"
                        type="secondary_outline"
                        onPress={() => requestLocation((fields) => {
                            setValue('street_name', fields.street_name, { shouldValidate: true });
                            setValue('street_number', fields.street_number, { shouldValidate: true });
                            setValue('postal_code', fields.postal_code, { shouldValidate: true });
                            setValue('city', fields.city, { shouldValidate: true });
                            setValue('state', fields.state, { shouldValidate: true });
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
                                            if (suggestion.street_name) setValue('street_name', suggestion.street_name, { shouldValidate: true });
                                            if (suggestion.street_number) setValue('street_number', suggestion.street_number, { shouldValidate: true });
                                            if (suggestion.city) setValue('city', suggestion.city, { shouldValidate: true });
                                            if (suggestion.postal_code) setValue('postal_code', suggestion.postal_code, { shouldValidate: true });
                                            if (suggestion.state) setValue('state', suggestion.state, { shouldValidate: true });
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
            </KeyboardAwareScrollView>
            <View className="pt-4">
                <CustomTouchableOpacity
                    size="large"
                    type="primary"
                    textColor="secondary"
                    textBoldness="semiBold"
                    text={loading ? t('profile.update_address.updating_address') : t('profile.update_address.update_address')}
                    onPress={handleSubmit((data) => updateAddress(data))}
                    disabled={loading || !isValid}
                />
            </View>
        </View>
    )
}

export default AddressStep;
