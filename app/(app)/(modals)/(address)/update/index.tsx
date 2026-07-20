import {View} from "react-native";
import React, {useEffect, useState} from "react";
import {SafeAreaView} from "react-native-safe-area-context";
import {router} from "expo-router";
import {Controller, useForm} from "react-hook-form";
import {useApi} from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import BackHeader from "@/components/app/BackHeader";
import { useSession } from "@/contexts/SessionContext";
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import LocationIcon from "@/assets/icons/location";
import { Colors } from "@/constants/Colors";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocationFill } from "@/hooks/useLocationFill";
import PostalCodeSheet from "@/components/sheets/PostalCodeSheet";

interface address {
    street_name: string | undefined;
    street_number: string | undefined;
    additional_info:  string | null | undefined;
    postal_code: string | undefined;
    city: string | undefined;
}

const ChangeAddress = () => {
    const { t } = useTranslation();
    const { userData, setUserData } = useSession();
    const { openDialog } = useDialog();

    const {control, handleSubmit, setValue, watch, formState: {errors, isValid}, setError} = useForm({
        mode: 'onChange',
        defaultValues: {
            street_name: userData?.address?.street_name,
            street_number: userData?.address?.street_number,
            additional_info: userData?.address?.additional_info ?? null,
            postal_code: userData?.address?.postal_code,
            city: userData?.address?.city,
        }
    });
  
    const {api} = useApi();
    const [loading, setLoading] = useState<boolean>(false);
    const [postalCodeSheet, setPostalCodeSheet] = useState<{ open: boolean; value: string }>({ open: false, value: '' });
    const { locationLoading, suppressSearch, requestLocation } = useLocationFill();

    // Coordenadas conhecidas (morada atual, sugestão do autocomplete ou GPS): enviá-las
    // permite ao backend saltar o geocoding no servidor — o caminho que pendurava o
    // pedido quando o Google estava lento. Invalidadas quando o user edita rua/cidade.
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
        userData?.address?.latitude && userData?.address?.longitude
            ? { latitude: userData.address.latitude, longitude: userData.address.longitude }
            : null,
    );

    const updateAddress = (data: address) => {
      setLoading(true);
      const payload = coords
          ? { ...data, latitude: coords.latitude, longitude: coords.longitude }
          : data;
      api.put(API_ROUTES.CUSTOMER_CHANGE_ADDRESS, payload)
        .then(({data}) => {
            const newUserData = {...userData, address: data.data.address, allowed_by_zone: data.data.allowed_by_zone};
            setUserData(newUserData);
            if (router.canGoBack()) {
                router.back();
            }
            if (!data.data.allowed_by_zone && userData?.allowed_by_zone) {
                router.push('/(app)/(modals)/blocked-by-zone');
            }
        }).catch((error) => {
            openDialog({
                icon: <XIcon color={Colors.secondary} />,
                title: t('errors.title'),
                subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
                closeAfterMSeconds: 2000,
                closeOnClickOutside: true,
            })
        }).finally(() => {
            setLoading(false);
        })
    };

    const onUpdateAddress = (data: address) => {
        openDialog({
            title: t('profile.update_address.update_address'),
            subtitle: t('profile.update_address.update_address_subtitle'),
            cancelButtonText: t('profile.update_address.cancel_update'),
            successButtonText: t('profile.update_address.confirm_update'),
            onSuccess: () => updateAddress(data)
        })
    };

    return (
        <SafeAreaView className=" bg-support_secondary flex-1">
<View className="p-5 flex-1">
 {/* <StatusBar animated backgroundColor="transparent" barStyle="dark-content"/> */}
            <BackHeader
              backButtonColor="secondary"
              middleItem={() => (
                <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                    {t('profile.update_address.header')}
                </CustomText>
              )}
              otherClasses="pb-5"
            />
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
                            setCoords({ latitude: fields.latitude, longitude: fields.longitude });
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
                            {t('general.street_name')}
                        </CustomText>
                        <CustomText color="secondary" size="extraSmall" classes="mt-1 opacity-75">
                            {t('general.street_name_with_number_hint')}
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
                                        onChangeText={(value: string) => {
                                            // Texto digitado à mão invalida as coordenadas anteriores.
                                            setCoords(null);
                                            field.onChange(value);
                                        }}
                                        placeholder={t('general.street_name_with_number_placeholder')}
                                        error={errors.street_name && errors.street_name.message}
                                        success={!errors.street_name && field.value}
                                        suppressSuggestions={suppressSearch}
                                        onSelect={(suggestion) => {
                                            if (suggestion.street_name) setValue('street_name', suggestion.street_name, { shouldValidate: true });
                                            if (suggestion.street_number) setValue('street_number', suggestion.street_number, { shouldValidate: true });
                                            if (suggestion.city) setValue('city', suggestion.city, { shouldValidate: true });
                                            if (suggestion.postal_code) setValue('postal_code', suggestion.postal_code, { shouldValidate: true });
                                            if (suggestion.latitude && suggestion.longitude) {
                                                setCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
                                            }

                                            const hasFullPostalCode = !!suggestion.postal_code && /^\d{4}-\d{3}$/.test(suggestion.postal_code);
                                            if (!hasFullPostalCode) {
                                                setPostalCodeSheet({ open: true, value: suggestion.postal_code ?? '' });
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
                                        onChangeText={(value: string) => {
                                            // Cidade editada à mão invalida as coordenadas anteriores.
                                            setCoords(null);
                                            field.onChange(value);
                                        }}
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

                </View>
            </KeyboardAwareScrollView>
            <View className="pt-4">
                <CustomTouchableOpacity
                    size="large"
                    type="secondary"
                    textColor="primary"
                    textBoldness="semiBold"
                    text={loading ? t('profile.update_address.updating_address') : t('profile.update_address.update_address')}
                    onPress={handleSubmit((data) => onUpdateAddress(data))}
                    disabled={loading || !isValid}
                />
            </View>

            <PostalCodeSheet
                visible={postalCodeSheet.open}
                initialValue={postalCodeSheet.value}
                onClose={() => setPostalCodeSheet({ open: false, value: '' })}
                onSave={(postalCode: string) => setValue('postal_code', postalCode, { shouldValidate: true })}
            />
        </View>
        </SafeAreaView>
    )
}

export default ChangeAddress;
