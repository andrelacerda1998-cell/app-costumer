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

const DeleteAccount = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { signOut, setUserData } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingResetPassword, setLoadingResetPassword] = useState(false);
  const [asset, setAsset] = useState<ImagePickerAsset | null>(null);
  const [avatarError, setAvatarError] = useState<string|null>(null);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/profile");
  }

  const { control, handleSubmit, formState: { errors, isLoading, isValid },getValues, setError, reset } = useForm({
    mode: 'onChange',
    defaultValues: {
        password:  "",
    },
  });

  const deleteAccount = () => {
    openDialog({
      title: t('delete_account.header'),
      subtitle: '',
      successButtonText: t('profile.edit.save.confirm'),
      cancelButtonText: t('profile.edit.save.cancel'),
      onSuccess: () => {
          setLoading(true);
            api.post(API_ROUTES.COMMON_ACCOUNT_DELETE, {
                password: getValues('password'),
            })
                .then((response) => {
                    signOut();
                    router.dismissAll();
                    router.replace("/(auth)/signin");
                })
                .catch((error) => {
                    if (error.response.status === 400){
                        setError('password',{type:'manual', message:error.response.data.message})
                    }

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
          },
      })

  }



  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.support_secondary }}>
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="medium" numberOfLines={1}>
              {t('delete_account.header')}
            </CustomText>
          )}
          otherClasses="p-5"
        />

        <ScrollView
          className="space-y-4"
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {avatarError && (
                <CustomText
                  size="small"
                  color="error"
                  classes="mt-1"
                >
                  {avatarError}
                </CustomText>
            )}
          </View>

          <View>
            <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
              {t('general.password')}
            </CustomText>

            <Controller
                control={control}
                name="password"
                rules={{
                    required: t('general.password_required'),
                    minLength: { value: 8, message: t('general.password_min_length') },
                }}
                render={({ field }) => (
                    <View className="mt-2">
                        <CustomTextInput
                            secureTextEntry
                            {...field}
                            size="large"
                            onChangeText={(value: string) => {
                                value = value.replace(/\s{2,}/g, ' ')
                                field.onChange(value)
                            }}
                            placeholder={t('general.password_placeholder')}
                            autoCorrect={false}
                            error={errors.password && errors.password.message}
                            displayErrorIcon={true}
                            success={!errors.password && field.value}
                            displaySuccessIcon={true}
                            disabled={loading}
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



        </ScrollView>

        <View className="p-5">
          <CustomTouchableOpacity
            size="large"
            type="danger"
            textColor="support_secondary"
            textBoldness="semiBold"
            text={loading ? t('delete_account.submit_loading') : t('delete_account.submit')}
            onPress={deleteAccount}
            disabled={loading || loadingResetPassword}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

export default DeleteAccount
