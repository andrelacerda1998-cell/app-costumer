import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, View, TextInput } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import BackHeader from "@/components/app/BackHeader";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession, GuestAddress } from "@/contexts/GuestSessionContext";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { useService } from "@/contexts/ServiceContext";
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
import * as Location from "expo-location";
import { useLocationFill } from "@/hooks/useLocationFill";

interface AddressFormData {
    address_name: string | null;
    street_name: string | undefined;
    street_number: string | undefined;
    additional_info: string | null;
    postal_code: string | undefined;
    city: string | undefined;
    state: string | undefined;
    country: string;
}

const GuestAddressScreen = () => {
    const { t } = useTranslation();
    const { track } = useMixpanel();
    const { session } = useSession();
    const { guestSession, setGuestAddress: setGuestSessionAddress } = useGuestSession();
    const { serviceToRequest, scheduledService } = useService();
    const { openDialog } = useDialog();
    const { api } = useApi();

    const [loading, setLoading] = useState<boolean>(false);
    const { locationLoading, suppressSearch, requestLocation } = useLocationFill();
    const [zoneAllowed, setZoneAllowed] = useState<boolean | null>(null);
    const [zoneChecking, setZoneChecking] = useState(false);
    const zoneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
        guestSession?.guest_address?.latitude && guestSession?.guest_address?.longitude
            ? { latitude: guestSession.guest_address.latitude, longitude: guestSession.guest_address.longitude }
            : null
    );

    const { control, handleSubmit, setValue, formState: { errors, isValid }, watch } = useForm<AddressFormData>({
        mode: 'onChange',
        defaultValues: {
            address_name: guestSession?.guest_address?.name || null,
            street_name: guestSession?.guest_address?.street_name || '',
            street_number: guestSession?.guest_address?.street_number || '',
            additional_info: guestSession?.guest_address?.additional_info || null,
            postal_code: guestSession?.guest_address?.postal_code || '',
            city: guestSession?.guest_address?.city || '',
            state: guestSession?.guest_address?.state || '',
            country: guestSession?.guest_address?.country || 'Portugal',
        }
    });

    const watchedCity = watch('city');

    const buildZonePayload = (coordsOverride?: { latitude: number; longitude: number } | null) => {
        const currentCoords = coordsOverride !== undefined ? coordsOverride : coords;
        const values = watch();
        const base = {
            street_name: values.street_name || undefined,
            street_number: values.street_number || undefined,
            postal_code: values.postal_code || undefined,
            city: values.city || undefined,
        };
        if (currentCoords) {
            return { ...base, latitude: currentCoords.latitude, longitude: currentCoords.longitude };
        }
        return base;
    };

    const checkZone = (coordsOverride?: { latitude: number; longitude: number } | null) => {
        const payload = buildZonePayload(coordsOverride);
        if (!payload.city && !('latitude' in payload)) {
            setZoneAllowed(null);
            return;
        }
        setZoneChecking(true);
        api.post(API_ROUTES.COMMON_CHECK_ZONE, payload)
            .then((res) => {
                setZoneAllowed(res.data?.data?.allowed_by_zone ?? false);
            })
            .catch(() => setZoneAllowed(null))
            .finally(() => setZoneChecking(false));
    };

    useEffect(() => {
        if (zoneDebounceRef.current) clearTimeout(zoneDebounceRef.current);
        zoneDebounceRef.current = setTimeout(() => {
            checkZone();
        }, 600);
        return () => {
            if (zoneDebounceRef.current) clearTimeout(zoneDebounceRef.current);
        };
    }, [watchedCity]);

    const handleRequestLocation = () => {
        requestLocation((fields) => {
            setCoords({ latitude: fields.latitude, longitude: fields.longitude });
            setValue('street_name', fields.street_name, { shouldValidate: true });
            setValue('street_number', fields.street_number, { shouldValidate: true });
            setValue('postal_code', fields.postal_code, { shouldValidate: true });
            setValue('city', fields.city, { shouldValidate: true });
            setValue('state', fields.state, { shouldValidate: true });
            setValue('country', fields.country, { shouldValidate: true });
        });
    };

    const onSubmit = async (data: AddressFormData) => {
        let resolvedCoords = coords;

        // Os ecrãs seguintes (select-vendor/select-technician) exigem coords reais;
        // sem elas o guard devolve o guest a este ecrã em loop.
        if (!resolvedCoords) {
            setLoading(true);
            try {
                const fullAddress = `${data.street_name || ''} ${data.street_number || ''}, ${data.postal_code || ''} ${data.city || ''}, ${data.country || 'Portugal'}`;
                const results = await Location.geocodeAsync(fullAddress);
                if (results.length > 0) {
                    resolvedCoords = { latitude: results[0].latitude, longitude: results[0].longitude };
                    setCoords(resolvedCoords);
                }
            } catch (_) {
            } finally {
                setLoading(false);
            }
        }

        if (!resolvedCoords) {
            openDialog({
                icon: <XIcon color={Colors.secondary} />,
                title: t('errors.title'),
                subtitle: t('errors.occurred_an_error'),
                closeAfterMSeconds: 2000,
                closeOnClickOutside: true,
            });
            return;
        }

        const address: GuestAddress = {
            name: data.address_name || '',
            street_name: data.street_name || '',
            street_number: data.street_number || '',
            additional_info: data.additional_info || '',
            postal_code: data.postal_code || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'Portugal',
            latitude: resolvedCoords.latitude,
            longitude: resolvedCoords.longitude,
        };

        let allowed = zoneAllowed;

        if (allowed === null && (data.city || resolvedCoords)) {
            setLoading(true);
            try {
                const payload = buildZonePayload(resolvedCoords);
                const res = await api.post(API_ROUTES.COMMON_CHECK_ZONE, payload);
                allowed = res.data?.data?.allowed_by_zone ?? false;
                setZoneAllowed(allowed);
            } catch {
                allowed = false;
            } finally {
                setLoading(false);
            }
        }

        if (allowed === false) {
            router.push('/(app)/(modals)/blocked-by-zone');
            return;
        }

        setGuestSessionAddress(address);
        track("guest_address_submitted", { city: address.city, country: address.country });

        const serviceTypeId = guestSession?.selected_service_type_id || serviceToRequest?.service_type?.id;

        if (!serviceTypeId) {
            if (router.canGoBack()) {
                router.back();
            }
            return;
        }

        if (scheduledService) {
            router.replace(`/(app)/(modals)/(services)/(schedule)/select-technician/${serviceTypeId}`);
        } else {
            router.replace(`/(app)/(modals)/(services)/(request)/select-vendor/${serviceTypeId}`);
        }
    };

    return (
        <SafeAreaView className="p-5 bg-support_secondary flex-1">
            <BackHeader
                backButtonColor="secondary"
                middleItem={() => (
                    <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                        {t('guest.address.title')}
                    </CustomText>
                )}
                otherClasses="pb-5"
            />

            <KeyboardAwareScrollView bottomOffset={40}>
                <View className="flex-1">
                    <CustomTouchableOpacity
                        size="medium"
                        type="secondary_outline"
                        onPress={handleRequestLocation}
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

                        <Controller
                            control={control}
                            name="street_name"
                            rules={{ required: t('general.street_name_required') }}
                            render={({ field }) => (
                                <View className="mt-2">
                                    <PlacesAutocomplete
                                        value={field.value ?? ''}
                                        onChangeText={field.onChange}
                                        placeholder={t('general.street_name_placeholder')}
                                        error={errors.street_name && errors.street_name.message}
                                        success={!errors.street_name && field.value}
                                        suppressSuggestions={suppressSearch}
                                        onSelect={async (suggestion) => {
                                            if (suggestion.street_name) setValue('street_name', suggestion.street_name, { shouldValidate: true });
                                            if (suggestion.street_number) setValue('street_number', suggestion.street_number, { shouldValidate: true });
                                            if (suggestion.city) setValue('city', suggestion.city, { shouldValidate: true });
                                            if (suggestion.postal_code) setValue('postal_code', suggestion.postal_code, { shouldValidate: true });
                                            if (suggestion.state) setValue('state', suggestion.state, { shouldValidate: true });
                                            if (suggestion.latitude && suggestion.longitude) {
                                                const newCoords = { latitude: suggestion.latitude, longitude: suggestion.longitude };
                                                setCoords(newCoords);
                                                checkZone(newCoords);
                                                return;
                                            }
                                            try {
                                                const results = await Location.geocodeAsync(suggestion.description);
                                                if (results.length > 0) {
                                                    const newCoords = { latitude: results[0].latitude, longitude: results[0].longitude };
                                                    setCoords(newCoords);
                                                    checkZone(newCoords);
                                                }
                                            } catch (_) {}
                                        }}
                                    />
                                </View>
                            )}
                        />
                        {errors.street_name && errors.street_name.message && (
                            <CustomText size="small" color="error" classes="mt-1">
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
                                    />
                                </View>
                            )}
                        />
                    </View>

                    <View className="mt-8">
                        <CustomText color="secondary" boldness="semiBold">
                            {t('general.address_additional_info')}
                        </CustomText>

                        <Controller
                            control={control}
                            name="additional_info"
                            render={({ field }) => (
                                <View className="mt-2">
                                    <CustomTextInput
                                        {...field}
                                        size="large"
                                        onChangeText={field.onChange}
                                        placeholder={t('general.address_additional_info_placeholder')}
                                    />
                                </View>
                            )}
                        />
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
                                                value = value.slice(0, -1);
                                            } else {
                                                value = value.replace(/(\d{4})(\d{1})/, '$1-$2');
                                            }
                                            field.onChange(value);
                                        }}
                                        maxLength={8}
                                        placeholder={t('general.postal_code_placeholder')}
                                        keyboardType="number-pad"
                                        error={errors.postal_code && errors.postal_code.message}
                                    />
                                </View>
                            )}
                        />
                        {errors.postal_code && errors.postal_code.message && (
                            <CustomText size="small" color="error" classes="mt-1">
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
                            rules={{ required: t('general.city_required') }}
                            render={({ field }) => (
                                <View className="mt-2">
                                    <CustomTextInput
                                        {...field}
                                        size="large"
                                        onChangeText={field.onChange}
                                        placeholder={t('general.city_placeholder')}
                                        error={errors.city && errors.city.message}
                                    />
                                </View>
                            )}
                        />
                        {errors.city && errors.city.message && (
                            <CustomText size="small" color="error" classes="mt-1">
                                {errors.city.message as string}
                            </CustomText>
                        )}
                        {!errors.city && zoneChecking && watchedCity ? (
                            <CustomText size="small" color="gray_medium" classes="mt-1">
                                {t('general.checking_zone')}
                            </CustomText>
                        ) : !errors.city && zoneAllowed === false && watchedCity ? (
                            <CustomText size="small" color="error" classes="mt-1">
                                {t('general.zone_not_available')}
                            </CustomText>
                        ) : null}
                    </View>

                </View>
            </KeyboardAwareScrollView>

            <View className="pt-4">
                <CustomTouchableOpacity
                    size="large"
                    type="secondary"
                    textColor="primary"
                    textBoldness="semiBold"
                    text={loading ? t('general.loading') : t('general.confirm')}
                    onPress={handleSubmit(onSubmit)}
                    disabled={loading || !isValid}
                />
            </View>
        </SafeAreaView>
    );
};

export default GuestAddressScreen;
