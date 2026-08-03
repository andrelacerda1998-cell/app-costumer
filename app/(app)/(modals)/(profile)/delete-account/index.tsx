import CheckMark from "@/assets/icons/check-mark";
import XIcon from "@/assets/icons/x";
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { API_ROUTES } from '@/constants/ApiRoutes';
import { Colors } from '@/constants/Colors';
import { useApi } from '@/contexts/ApiContext';
import { useDialog } from "@/contexts/DialogContext";
import { useSession } from '@/contexts/SessionContext';
import { Feather } from "@expo/vector-icons";
import { router } from 'expo-router';
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";

const DeleteAccount = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { signOut, userData } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingResetPassword, setLoadingResetPassword] = useState(false);
  // Contas criadas por telemóvel/OTP nunca definiram palavra-passe: sem este
  // caminho alternativo ficariam sem forma de exercer o direito ao apagamento.
  const [showNoPasswordHelp, setShowNoPasswordHelp] = useState(false);

  const accountEmail = userData?.email?.trim() || "";
  const hasEmail = accountEmail.length > 0;

  const { control, formState: { errors }, getValues, setError, handleSubmit } = useForm({
    mode: 'onChange',
    defaultValues: {
        password:  "",
    },
  });

  // Sem endpoint de "definir palavra-passe" para quem entrou por OTP, o único
  // caminho existente é o email de recuperação (o mesmo usado em editar perfil).
  const sendResetEmail = () => {
    if (!hasEmail) {
      return;
    }
    setLoadingResetPassword(true);
    api.post(API_ROUTES.AUTH_LOGIN_FORGOT_PASSWORD, {
      email: accountEmail,
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
      .catch((error) => {
        openDialog({
          icon: <XIcon color={Colors.secondary} />,
          title: t('errors.title'),
          subtitle: error?.response?.data?.metadata?.message
            || error?.response?.data?.message
            || t('errors.occurred_an_error'),
          closeAfterMSeconds: 2000,
          closeOnClickOutside: true,
        })
      })
      .finally(() => {
        setLoadingResetPassword(false);
      });
  };

  const goToSupport = () => {
    router.navigate('/(app)/(modals)/support-ticket');
  };

  const deleteAccount = () => {
    openDialog({
      title: t('delete_account.header'),
      subtitle: t('delete_account.confirm_subtitle'),
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
                    const status = error?.response?.status;

                    if ((status === 400 || status === 422) && error?.response?.data?.message) {
                        setError('password', { type: 'manual', message: error.response.data.message })
                    }

                    const errors = error?.response?.data?.errors;
                    if (errors && Object.keys(errors).length) {
                        Object.keys(errors).forEach((key) => {
                            const message = errors[key as any];
                            setError(
                                key as any,
                                { type: 'manual', message: Array.isArray(message) ? message[0] : message }
                            );
                        });
                    } else if (status !== 400 && status !== 422) {
                        openDialog({
                            title: t('errors.title'),
                            subtitle: error?.response?.data?.message || t('errors.occurred_an_error'),
                            closeOnClickOutside: true,
                            closeAfterMSeconds: 2000,
                        });
                    }

                    // A palavra-passe foi recusada: revela o caminho alternativo
                    // para quem, na prática, nunca definiu nenhuma.
                    if (status === 400 || status === 422) {
                        setShowNoPasswordHelp(true);
                    }
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
          <View
            className="flex-row rounded-xl p-4"
            style={{ backgroundColor: "rgba(237,73,73,0.08)", borderWidth: 1, borderColor: "rgba(237,73,73,0.25)" }}
          >
            <Feather name="alert-triangle" size={20} color={Colors.error} />
            <View className="flex-1 ml-3">
              <CustomText color="error" boldness="semiBold">
                {t('delete_account.warning.title')}
              </CustomText>
              <CustomText size="small" color="gray_strong" classes="mt-1">
                {t('delete_account.warning.description')}
              </CustomText>
            </View>
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

            {!showNoPasswordHelp && (
              <TouchableOpacity
                onPress={() => setShowNoPasswordHelp(true)}
                accessibilityRole="button"
                className="mt-3 self-start"
              >
                <CustomText size="small" color="secondary" boldness="semiBold">
                  {t('delete_account.no_password.link')}
                </CustomText>
              </TouchableOpacity>
            )}
          </View>

          {showNoPasswordHelp && (
            <View
              className="rounded-xl p-4"
              style={{ backgroundColor: "rgba(250,187,91,0.12)", borderWidth: 1, borderColor: "rgba(250,187,91,0.4)" }}
            >
              <CustomText color="secondary" boldness="semiBold">
                {t('delete_account.no_password.title')}
              </CustomText>
              <CustomText size="small" color="gray_strong" classes="mt-1">
                {hasEmail
                  ? t('delete_account.no_password.description_email')
                  : t('delete_account.no_password.description_no_email')}
              </CustomText>

              <View className="mt-4">
                {hasEmail ? (
                  <CustomTouchableOpacity
                    size="large"
                    type="secondary_outline"
                    onPress={sendResetEmail}
                    disabled={loading || loadingResetPassword}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="lock" size={16} color={Colors.secondary} />
                      <CustomText color="secondary" boldness="semiBold">
                        {loadingResetPassword
                          ? t('profile.edit.sending_reset_email')
                          : t('delete_account.no_password.set_password_cta')}
                      </CustomText>
                    </View>
                  </CustomTouchableOpacity>
                ) : (
                  <CustomTouchableOpacity
                    size="large"
                    type="secondary_outline"
                    onPress={goToSupport}
                    disabled={loading}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="life-buoy" size={16} color={Colors.secondary} />
                      <CustomText color="secondary" boldness="semiBold">
                        {t('delete_account.no_password.contact_support_cta')}
                      </CustomText>
                    </View>
                  </CustomTouchableOpacity>
                )}
              </View>
            </View>
          )}

        </ScrollView>

        <View className="p-5">
          <CustomTouchableOpacity
            size="large"
            type="danger"
            textColor="support_secondary"
            textBoldness="semiBold"
            text={loading ? t('delete_account.submit_loading') : t('delete_account.submit')}
            onPress={handleSubmit(deleteAccount)}
            disabled={loading || loadingResetPassword}
          />
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

export default DeleteAccount
