import CheckMark from "@/assets/icons/check-mark";
import XIcon from "@/assets/icons/x";
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import DatePicker from '@/components/DatePicker';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { Colors } from '@/constants/Colors';
import { useApi } from '@/contexts/ApiContext';
import { useDialog } from "@/contexts/DialogContext";
import { useSession } from '@/contexts/SessionContext';
import { validateNIF } from "@/utils";
import { Feather } from "@expo/vector-icons";
import { router } from 'expo-router';
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, ImageBackground } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import {ImagePickerAsset} from "expo-image-picker/src/ImagePicker.types";
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from "react-i18next";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useMixpanel } from "@/contexts/MixpanelContext";

const EditProfile = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { userData, setUserData } = useSession();
  const { setUserProfile } = useMixpanel();
  const [loading, setLoading] = useState(false);
  const [loadingResetPassword, setLoadingResetPassword] = useState(false);
  const [asset, setAsset] = useState<ImagePickerAsset | null>(null);
  const [avatarError, setAvatarError] = useState<string|null>(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.4,
        selectionLimit: 1,
        // presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });

      if (!result.canceled && result.assets?.length) {
        setAsset(result.assets[0]);
      }
    } catch (error: any) {
      setAvatarError(error.response.data.message)
    }
  };

  // console.log({asset})

  const handleGoBack = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/profile");
  }

  const { control, handleSubmit, formState: { errors, isLoading, isValid },getValues, setError, reset } = useForm({
    mode: 'onChange',
    defaultValues: {
      name: userData?.name || "",
      date_birthday: userData?.date_birthday ? new Date(userData.date_birthday) : new Date(),
      nif: userData?.nif || "",
      phone_number: userData?.phone_number || "",
    },
  });

  const updateProfile = () => {
    setLoading(true);
    const newPhoneNumber = getValues('phone_number').startsWith('+351-') ? getValues('phone_number') : getValues('phone_number').replace('+351', '+351-');

    const formData = new FormData();
    formData.append('name', getValues('name'));
    formData.append('date_birthday', new Date(getValues('date_birthday') as Date).toISOString().split('T')[0]);
    formData.append('nif', getValues('nif'));
    formData.append('phone_number', newPhoneNumber);
    
    if (asset) {
      formData.append('avatar', {
        uri: asset.uri,
        name: asset.fileName || 'image.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
    }

    api.post(API_ROUTES.AUTH_UPDATE_PROFILE + '?_method=PUT', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      transformRequest: (data) => data,
      timeout: 30000
    })
      .then((response) => {
        const newUserData = response.data.data;
        const updatedUserData = {
          ...userData,
          ...newUserData,
          name: getValues('name'),
        };

        setUserData(updatedUserData);
        setUserProfile({
          $name: updatedUserData.name,
          $email: updatedUserData.email,
          $phone: updatedUserData.phone_number,
          gender_id: updatedUserData.gender_id,
          date_birthday: updatedUserData.date_birthday,
          has_address: !!updatedUserData.address,
          phone_number_verified_at: updatedUserData.phone_number_verified_at,
          email_verified_at: updatedUserData.email_verified_at,
          nif: updatedUserData.nif,
        });
        handleGoBack();
        openDialog({
          icon: <CheckMark color={Colors.secondary} />,
          title: t('profile.edit.success.title'),
          subtitle: t('profile.edit.success.subtitle'),
          closeAfterMSeconds: 2000,
          closeOnClickOutside: true,
        })
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

  const sendResetEmail = () => {
    setLoadingResetPassword(true);
    api.post(API_ROUTES.AUTH_LOGIN_FORGOT_PASSWORD, {
      email: userData?.email,
      type: 'customer',
    })
      .then(() => {
        openDialog({
          icon: <CheckMark color={Colors.secondary} />,
          title: t('auth.forgot_password.email_sent.title'),
          subtitle: t('auth.forgot_password.email_sent.subtitle_when_logged'),
          closeAfterMSeconds: 2000,
          closeOnClickOutside: true,
        })
      })
      .catch(error => {
        if (error.response?.status === 500) {
          openDialog({
            icon: <XIcon color={Colors.secondary} />,
            title: t('errors.title'),
            subtitle: t('errors.server_error'),
            closeAfterMSeconds: 2000,
            closeOnClickOutside: true,
          })
        } else if (error.response?.status === 400) {
          openDialog({
            icon: <XIcon color={Colors.secondary} />,
            title: t('errors.title'),
            subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
            closeAfterMSeconds: 2000,
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
      })
      .finally(() => {
        setLoadingResetPassword(false);
      });
  };

  const openSaveDialog = () => {
    openDialog({
      title: t('profile.edit.save.title'),
      subtitle: t('profile.edit.save.subtitle'),
      successButtonText: t('profile.edit.save.confirm'),
      cancelButtonText: t('profile.edit.save.cancel'),
      onSuccess: updateProfile,
    })
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAF7F2" }}>
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="medium" numberOfLines={1}>
            {t('profile.edit.header')}
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
            <View className="relative w-32 h-32 mt-2 mx-auto">
              <View
                className="w-full h-full rounded-full overflow-hidden"
                style={{ borderWidth: 4, borderColor: Colors.primary }}
              >
                {(asset?.uri || userData?.avatar?.src) ? (
                  <ImageBackground
                    source={asset ? { uri: asset.uri } : { uri: userData?.avatar?.src || "" }}
                    className="w-full h-full bg-center"
                    imageStyle={{ borderRadius: 999 }}
                  />
                ) : (
                  <View
                    className="w-full h-full items-center justify-center"
                    style={{ backgroundColor: "rgba(250,187,91,0.25)" }}
                  >
                    <Feather name="user" size={48} color={Colors.secondary} />
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => pickImage()}
                className="absolute bottom-0 right-0 h-10 w-10 rounded-full items-center justify-center"
                style={{
                  backgroundColor: Colors.secondary,
                  borderWidth: 2,
                  borderColor: "#FAF7F2",
                }}
              >
                <Feather name="camera" size={17} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {avatarError && (
                <CustomText
                  size="small"
                  color="error"
                  classes="mt-1 text-center"
                >
                  {avatarError}
                </CustomText>
            )}
          </View>

          <View>
            <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
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
          </View>

          <View>
            <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
              {t('general.birth_date')}
            </CustomText>
            <Controller
              control={control}
              name="date_birthday"
              rules={{
                required: t('general.birth_date_required'),
                validate: (value) => {
                  const date = new Date(value)
                  if (isNaN(date.getTime())) {
                      return t('general.birth_date_invalid');
                  } else if (date.getTime() > Date.now()) {
                      return t('general.birth_date_not_in_future');
                  } else if (date.getTime() < new Date('1900-01-01').getTime()) {
                      return t('general.birth_date_max_age');
                  } else if (date.getTime() > new Date().setFullYear(new Date().getFullYear() - 18)) {
                      return t('general.birth_date_min_age');
                  }
                  return true;
                }
              }}
              render={({ field }) => (
                <DatePicker
                  onDateChange={field.onChange}
                  pressableClass="border-support_primary border-[1px]"
                  color={Colors.secondary}
                  textColor="secondary"
                  initialDate={field.value}
                  height={60}
                  textBoldness="semiBold"
                  disabled={loading}
                />
              )}
            />
            {errors.date_birthday && errors.date_birthday.message && (
              <CustomText
                size="small"
                color="error"
                classes="mt-1"
              >
                {errors.date_birthday.message as string}
              </CustomText>
            )}
          </View>

          {/* NIF continua no estado do formulário (enviado como está); campo visível removido */}

          <View>
            <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
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
                      const newValue = value.replace(/^\+351-?|\D/g, '').trim();
                      field.onChange(newValue ? `+351${newValue}` : '');
                    }}
                    placeholder={t('general.phone_number_placeholder')}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    error={errors.phone_number && errors.phone_number.message}
                    displayErrorIcon={true}
                    success={!errors.phone_number && field.value !== "+351"}
                    displaySuccessIcon={true}
                    disabled={loading}
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

          <View>
            <CustomTouchableOpacity
              size="large"
              type="secondary_outline"
              onPress={sendResetEmail}
              disabled={loading || loadingResetPassword}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="lock" size={16} color={Colors.secondary} />
                <CustomText color="secondary" boldness="semiBold">
                  {loadingResetPassword ? t('profile.edit.sending_reset_email') : t('profile.edit.reset_password')}
                </CustomText>
              </View>
            </CustomTouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>

      <View className="p-5">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openSaveDialog}
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

export default EditProfile
