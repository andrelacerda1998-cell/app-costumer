import {Platform, View} from "react-native";
import React, {useEffect, useState} from "react";
import {SafeAreaView} from "react-native-safe-area-context";
import {router, useLocalSearchParams} from "expo-router";
import {Controller, useForm} from "react-hook-form";
import {useApi} from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import BackHeader from "@/components/app/BackHeader";
import { useSession } from "@/contexts/SessionContext";
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import LocationIcon from "@/assets/icons/location";
import { Colors } from "@/constants/Colors";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocationFill } from "@/hooks/useLocationFill";
import PostalCodeSheet from "@/components/sheets/PostalCodeSheet";

// Google só no Android; iOS usa o mapa nativo (evita a dependência do SDK Google).
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

interface address {
    address_name?: string | null;
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
    // Multi-morada: `mode=create` cria uma nova; `address` (JSON) edita essa.
    // Sem params, é o fluxo legado de edição da morada única.
    const params = useLocalSearchParams<{ address?: string; mode?: string }>();
    const editing: any = params.address ? JSON.parse(String(params.address)) : null;
    const isCreate = params.mode === 'create';
    const isMulti = !!editing || isCreate;
    // Criar começa vazio; editar usa a morada escolhida; legado usa a única.
    const source: any = isMulti ? editing : userData?.address;

    const {control, handleSubmit, setValue, watch, formState: {errors, isValid}, setError} = useForm({
        mode: 'onChange',
        defaultValues: {
            address_name: source?.address_name ?? '',
            street_name: source?.street_name,
            street_number: source?.street_number,
            additional_info: source?.additional_info ?? null,
            postal_code: source?.postal_code,
            city: source?.city,
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
        source?.latitude && source?.longitude
            ? { latitude: source.latitude, longitude: source.longitude }
            : null,
    );

    // Fluxo em dois passos (como na referência): 'search' (pesquisa a morada)
    // -> 'confirm' (mapa com pin arrastável + campos). Criar começa na pesquisa;
    // editar entra logo na confirmação, com a morada já preenchida.
    const [step, setStep] = useState<'search' | 'confirm'>(isCreate ? 'search' : 'confirm');
    const [query, setQuery] = useState('');
    const POSTAL_RE = /^\d{4}-\d{3}$/;

    // Reverse-geocode: pin arrastado (ou GPS) -> preenche os campos.
    const fillFromCoords = async (latitude: number, longitude: number) => {
        setCoords({ latitude, longitude });
        try {
            const [g] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (g) {
                setValue('street_name', g.street ?? '', { shouldValidate: true });
                setValue('street_number', g.streetNumber ?? '', { shouldValidate: true });
                setValue('city', g.city ?? g.subregion ?? '', { shouldValidate: true });
                const pc = g.postalCode ?? '';
                if (pc && POSTAL_RE.test(pc)) setValue('postal_code', pc, { shouldValidate: true });
                else setPostalCodeSheet({ open: true, value: pc });
            }
        } catch {
            // mantém as coordenadas; o utilizador acerta a morada à mão
        }
    };

    // Escolha na pesquisa -> preenche e avança para a confirmação (mapa).
    const onPickSuggestion = (suggestion: any) => {
        if (suggestion.street_name) setValue('street_name', suggestion.street_name, { shouldValidate: true });
        if (suggestion.street_number) setValue('street_number', suggestion.street_number, { shouldValidate: true });
        if (suggestion.city) setValue('city', suggestion.city, { shouldValidate: true });
        if (suggestion.postal_code) setValue('postal_code', suggestion.postal_code, { shouldValidate: true });
        if (suggestion.latitude && suggestion.longitude) {
            setCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
        } else {
            setCoords(null);
        }
        if (!suggestion.postal_code || !POSTAL_RE.test(suggestion.postal_code)) {
            setPostalCodeSheet({ open: true, value: suggestion.postal_code ?? '' });
        }
        setStep('confirm');
    };

    const fillFromLocation = (fields: any) => {
        setValue('street_name', fields.street_name, { shouldValidate: true });
        setValue('street_number', fields.street_number, { shouldValidate: true });
        setValue('postal_code', fields.postal_code, { shouldValidate: true });
        setValue('city', fields.city, { shouldValidate: true });
        setCoords({ latitude: fields.latitude, longitude: fields.longitude });
        setStep('confirm');
    };

    const updateAddress = (data: address) => {
      setLoading(true);
      const payload = coords
          ? { ...data, latitude: coords.latitude, longitude: coords.longitude }
          : data;
      const request = editing?.id
          ? api.put(API_ROUTES.CUSTOMER_ADDRESS_UPDATE(editing.id), payload)
          : isCreate
              ? api.post(API_ROUTES.CUSTOMER_ADDRESSES, payload)
              : api.put(API_ROUTES.CUSTOMER_CHANGE_ADDRESS, payload);
      request
        .then(({data}) => {
            // Fluxo multi-morada: a lista refaz o fetch ao voltar.
            if (isMulti) {
                if (router.canGoBack()) router.back();
                return;
            }
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
        if (isMulti) { updateAddress(data); return; }
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
              onBack={() => {
                if (step === 'confirm' && isCreate) { setStep('search'); return; }
                if (router.canGoBack()) router.back();
              }}
              middleItem={() => (
                <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                    {step === 'search'
                        ? t('addresses.search_title')
                        : isCreate ? t('addresses.add_title') : editing ? t('addresses.edit_title') : t('profile.update_address.header')}
                </CustomText>
              )}
              otherClasses="pb-5"
            />
            {step === 'search' ? (
                <View className="flex-1">
                    <PlacesAutocomplete
                        value={query}
                        onChangeText={setQuery}
                        onSelect={onPickSuggestion}
                        placeholder={t('addresses.search_placeholder')}
                        suppressSuggestions={suppressSearch}
                    />
                    <View className="mt-6">
                        <CustomTouchableOpacity
                            size="medium"
                            type="secondary_outline"
                            onPress={() => requestLocation(fillFromLocation)}
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
                    </View>
                </View>
            ) : (
            <>
            <KeyboardAwareScrollView bottomOffset={40}>
                <View className="flex-1">
                    {/* Nome da morada ("Casa", "Escritório"). Aparecia só
                        quando se chegava pela lista de moradas; nos outros
                        caminhos — pedir um serviço, editar a morada da conta —
                        não existia, apesar de o backend o aceitar em todos
                        (UpdateRequest: address_name, nullable). */}
                    <View className="mb-6">
                            <CustomText color="secondary" boldness="semiBold">
                                {t('addresses.name_label')}
                            </CustomText>
                            <CustomText color="secondary" size="extraSmall" classes="mt-1 opacity-75">
                                {t('addresses.name_hint')}
                            </CustomText>
                            <Controller
                                control={control}
                                name="address_name"
                                render={({ field }) => (
                                    <View className="mt-2">
                                        <CustomTextInput
                                            {...field}
                                            size="large"
                                            onChangeText={field.onChange}
                                            placeholder={t('addresses.name_placeholder')}
                                        />
                                    </View>
                                )}
                            />
                    </View>
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

                    <View className="mt-6">
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

                    {/* Mapa da localização escolhida, como confirmação visual. */}
                    {coords && (
                        <View className="mt-6 rounded-2xl overflow-hidden" style={{ height: 160 }}>
                            <View style={{ flex: 1 }}>
                                <MapView
                                    provider={MAP_PROVIDER}
                                    style={{ flex: 1 }}
                                    region={{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                >
                                    <Marker
                                        coordinate={coords}
                                        draggable
                                        onDragEnd={(e) => fillFromCoords(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
                                    />
                                </MapView>
                                {/* Pista de que o pin é arrastável, como o "Editar Pin" da referência. */}
                                <View className="absolute rounded-full px-3 py-1.5" style={{ bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                    <CustomText color="support_secondary" size="extraSmall" boldness="bold">
                                        {t('addresses.edit_pin')}
                                    </CustomText>
                                </View>
                            </View>
                        </View>
                    )}

                    <View className="flex-row mt-6" style={{ gap: 12 }}>
                        <View className="flex-1">
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
                        <View className="flex-1">
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
                    </View>

                    <View className="flex-row" style={{ height: 0, overflow: 'hidden' }}>
                        <View className="flex-1">
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
                        <View className="flex-1">
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

                </View>
            </KeyboardAwareScrollView>
            <View
                className="pt-4"
                style={{
                    borderTopWidth: 1,
                    borderTopColor: Colors.support_primary,
                    marginHorizontal: -20,
                    paddingHorizontal: 20,
                }}
            >
                {/* Primário âmbar com texto escuro, como em toda a app. Estava
                    preto com texto âmbar — a mesma ação com duas linguagens
                    visuais obrigava a reaprender qual era o botão principal. */}
                <CustomTouchableOpacity
                    size="large"
                    type="primary"
                    textColor="secondary"
                    textBoldness="bold"
                    text={loading ? t('profile.update_address.updating_address') : isMulti ? t('addresses.confirm') : t('profile.update_address.update_address')}
                    onPress={handleSubmit((data) => onUpdateAddress(data))}
                    disabled={loading || !isValid}
                />
            </View>
            </>
            )}

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
