import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import LocationIcon from '@/assets/icons/location';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { Colors } from '@/constants/Colors';
import { useApi } from '@/contexts/ApiContext';
import { useDialog } from "@/contexts/DialogContext";
import { useSession } from '@/contexts/SessionContext';
import { useLocationFill } from '@/hooks/useLocationFill';
import { validateNIF } from "@/utils";
import { Feather } from "@expo/vector-icons";
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ImageBackground } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import {ImagePickerAsset} from "expo-image-picker/src/ImagePicker.types";
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const InvoiceData = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { userData, setUserData } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingResetPassword, setLoadingResetPassword] = useState(false);
  const { locationLoading, requestLocation } = useLocationFill();
  const [asset, setAsset] = useState<ImagePickerAsset | null>(null);
  const [avatarError, setAvatarError] = useState<string|null>(null);

  const [autocompleted, setAutocompleted] = useState({
    name: false,
    nif: false,
    address: false,
    postal_code: false,
    locality: false
  });

  useEffect(() => {
    getBillingInfo();
  }, []);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/profile");
  }

  const { control, handleSubmit, formState: { errors, isLoading, isValid }, getValues, setError, reset, setValue } = useForm({
    mode: 'onChange',
    defaultValues: {
      name: "",
      nif: "",
      address: "",
      postal_code: "",
      locality: "",
    },
  });

  // Localidade sem campo visível: derivada do CP (geoapi.pt), da localização ou da conta
  const localityLookupRef = useRef<string | null>(null);
  const maybeFillLocalityFromPostal = (postal: string) => {
    if (!/^\d{4}-\d{3}$/.test(postal)) return;
    if (getValues('locality')) return;
    if (localityLookupRef.current === postal) return;
    localityLookupRef.current = postal;
    fetch(`https://json.geoapi.pt/cp/${postal}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const city =
          d?.Localidade ||
          (Array.isArray(d?.partes) && d.partes[0]?.Localidade) ||
          d?.concelho?.nome ||
          d?.Concelho;
        if (typeof city === 'string' && city.length > 0 && !getValues('locality')) {
          setValue('locality', city);
        }
      })
      .catch(() => {});
  };

  const updateBillingInfo = () => {
    setLoading(true);

    api.post(API_ROUTES.POST_UPDATE_BILLING_INFO, {
      name: getValues('name'),
      nif: getValues('nif'),
      address: getValues('address'),
      postal_code: getValues('postal_code'),
      locality: getValues('locality') || userData?.address?.city || "",
    })
      .then((response) => {
        handleGoBack();
        // openDialog({
        //   icon: <CheckMark color={Colors.secondary} />,
        //   title: t('profile.edit.success.title'),
        //   subtitle: t('profile.edit.success.subtitle'),
        //   closeAfterMSeconds: 2000,
        //   closeOnClickOutside: true,
        // })
      })
      .catch((error) => {
        const errors = error.response.data.errors;
        Object.keys(errors).forEach((key) => {
          setError(
            key as any,
            { type: 'manual', message: errors[key as any] }
          );
        });
      })
      .finally(() => {
        setLoading(false);
      })
  }

  const getBillingInfo = () => {
    setLoading(true);

    api.get(API_ROUTES.GET_BILLING_INFO)
      .then((response) => {
        const billingInfo = response.data.data.billingInfo;
        setAutocompleted({
          name: !billingInfo?.name,
          nif: !billingInfo?.nif,
          address: !billingInfo?.address,
          postal_code: !billingInfo?.postal_code,
          locality: !billingInfo?.locality,
        });
        reset({
          name: billingInfo?.name || userData?.name || "",
          nif: billingInfo?.nif || userData?.nif || "",
          address: billingInfo?.address || userData?.address?.street_name
            ? `${userData?.address?.street_name}, ${userData?.address?.street_number}`
            : "",
          postal_code: billingInfo?.postal_code || userData?.address?.postal_code || "",
          locality: billingInfo?.locality || userData?.address?.city || "",
        });
      })
      .catch(() => {
        openDialog({
          title: t('errors.title'),
          subtitle: t('errors.server_error'),
          closeOnClickOutside: true,
          closeAfterMSeconds: 2000,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const openSaveDialog = () => {
    openDialog({
      title: t('profile.edit.save.title'),
      subtitle: t('profile.edit.save.subtitle'),
      successButtonText: t('profile.edit.save.confirm'),
      cancelButtonText: t('profile.edit.save.cancel'),
      onSuccess: updateBillingInfo,
    })
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF7F2" }}>
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="medium" numberOfLines={1}>
            {t('profile.payments.invoice_data.title')}
          </CustomText>
        )}
        otherClasses="p-5"
      />
      
      <KeyboardAwareScrollView bottomOffset={20}>
        <ScrollView
          className="space-y-4"
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <CustomText color="secondary" boldness="semiBold">
              {t('general.full_name')}
            </CustomText>

            <Controller
              control={control}
              name="name"
              rules={{
                required: t('general.full_name_required'),
                minLength: { value: 2, message: t('general.full_name_min_length') },
                validate: (value) => {
                  if (value.length > 50) {
                    return t('general.full_name_max_length');
                  } else if (/[^a-zA-Z\sÀ-ÖØ-öø-ÿ]/.test(value)) {
                    return t('general.full_name_invalid_characters');
                  } else if (value.trim().length === 0) {
                    return t('general.full_name_cannot_be_only_spaces');
                  } else if (value.trim().split(/\s+/).length < 2 || value.trim().split(/\s+/).length > 2) {
                    return t('general.full_name_first_and_last_name');
                  }
                  return true;
                }
              }}
              render={({ field }) => (
                <View className="mt-2">
                  <CustomTextInput
                    {...field}
                    size="large"
                    onChangeText={(value: string) => {
                      value = value.replace(/\s{2,}/g, ' ')
                      field.onChange(value)
                    }}
                    placeholder={t('general.full_name_placeholder')}
                    autoCorrect={false}
                    error={errors.name && errors.name.message}
                    displayErrorIcon={true}
                    success={!errors.name && field.value}
                    displaySuccessIcon={true}
                    disabled={loading}
                  />
                </View>
              )}
            />
            {errors.name && errors.name.message && (
              <CustomText
                size="small"
                color="error"
                classes="mt-1"
              >
                {errors.name.message as string}
              </CustomText>
            )}
            {autocompleted.name && (
              <CustomText size="extraSmall" color="gray_light" boldness="medium" className="my-1">
                {t('profile.payments.invoice_data.autocompleted.name')}
              </CustomText>
            )}
          </View>

          <View className="mt-8">
            <CustomText color="secondary" boldness="semiBold">
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
                    disabled={loading}
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
            {autocompleted.nif && (
              <CustomText size="extraSmall" color="gray_light" boldness="medium" className="my-1">
                {t('profile.payments.invoice_data.autocompleted.nif')}
              </CustomText>
            )}
          </View>

          <View className="mt-8">
            <CustomTouchableOpacity
                size="medium"
                type="secondary_outline"
                onPress={() => requestLocation((fields) => {
                    const addressStr = [fields.street_name, fields.street_number].filter(Boolean).join(', ');
                    setValue('address', addressStr);
                    setValue('postal_code', fields.postal_code);
                    setValue('locality', fields.city);
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
          </View>

          <View className="mt-8">
            <CustomText color="secondary" boldness="semiBold">
                {t('general.address')}
            </CustomText>

            <Controller
              control={control}
              name="address"
              rules={{
                required: t('general.address_required'),
              }}
              render={({ field }) => (
                <View className="mt-2">
                  <CustomTextInput
                    {...field}
                    size="large"
                    onChangeText={field.onChange}
                    placeholder={t('general.address_placeholder')}
                    error={errors.address && errors.address.message}
                    displayErrorIcon={true}
                    success={!errors.address && field.value}
                    displaySuccessIcon={true}
                  />
                </View>
              )}
            />
            {errors.address && errors.address.message && (
              <CustomText
                size="small"
                color="error"
                classes="mt-1"

              >
                {errors.address.message as string}
              </CustomText>
            )}
            {autocompleted.address && (
              <CustomText size="extraSmall" color="gray_light" boldness="medium" className="my-1">
                {t('profile.payments.invoice_data.autocompleted.address')}
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
                      maybeFillLocalityFromPostal(value)
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
            {autocompleted.postal_code && (
              <CustomText size="extraSmall" color="gray_light" boldness="medium" className="my-1">
                {t('profile.payments.invoice_data.autocompleted.postal_code')}
              </CustomText>
            )}
          </View>

          {/* Localidade: preenchida automaticamente (CP → geoapi, localização ou conta); sem campo visível */}
        </ScrollView>
      </KeyboardAwareScrollView>

      <View className="p-5">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSubmit(() => openSaveDialog())}
          disabled={loading || loadingResetPassword}
          style={{
            backgroundColor: loading || loadingResetPassword ? "rgba(250,187,91,0.35)" : Colors.primary,
            borderRadius: 999,
            paddingVertical: 18,
            alignItems: "center",
            justifyContent: "center",
            ...(loading || loadingResetPassword
              ? {}
              : {
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.5,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }),
          }}
        >
          <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1} style={{ opacity: loading || loadingResetPassword ? 0.5 : 1 }}>
            {loading ? t('profile.edit.saving_changes') : t('profile.edit.save_changes')}
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default InvoiceData