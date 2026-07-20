import {Alert, KeyboardAvoidingView, Platform, Text, View} from "react-native";
import {Colors} from "@/constants/Colors";
import BackHeader from "@/components/app/BackHeader";
import {CustomText} from "@/components/CustomText";
import React, {useEffect, useState} from "react";
import {router, useLocalSearchParams} from "expo-router";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";
import {PaymentMethod} from "@/types/paymentMethods";
import {PaymentIcon} from "react-native-payment-icons";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useWallet } from "@/contexts/WalletContext";
import { useDialog } from "@/contexts/DialogContext";
import { useTranslation } from "react-i18next";

export default function EditPaymentMethod() {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const { id, paymentMethod: paymentMethodFromParams } = params;
    const paymentMethod: PaymentMethod = paymentMethodFromParams ? JSON.parse(paymentMethodFromParams as string) : null;
    const {api} = useApi();
    const { fetchPaymentMethods } = useWallet();
    const { openDialog } = useDialog();

    // useEffect(() => {
    //     api.get(API_ROUTES.GET_PAYMENT_METHOD(params.id))
    //         .then(response => {
    //             setPaymentMethod(response.data.data)
    //         })
    // }, []);

    const handleGoBack = () => {
        if (router.canGoBack()) {
            return router.back();
        }
        return router.push("/(app)/(tabs)/profile");
    }

    const handlePressDeleteButton = () => {
        openDialog({
            title: t('profile.payments.edit_payment_method.delete_payment_method_confirmation.title'),
            subtitle: t('profile.payments.edit_payment_method.delete_payment_method_confirmation.subtitle'),
            cancelButtonText: t('profile.payments.edit_payment_method.delete_payment_method_confirmation.cancel'),
            successButtonText: t('profile.payments.edit_payment_method.delete_payment_method_confirmation.confirm'),
            onSuccess: () => deletePaymentMethod(),
        })
    }

    const handlePressSetAsDefaultButton = () => {
        openDialog({
            title: t('profile.payments.edit_payment_method.set_as_default_confirmation.title'),
            subtitle: t('profile.payments.edit_payment_method.set_as_default_confirmation.subtitle'),
            cancelButtonText: t('profile.payments.edit_payment_method.set_as_default_confirmation.cancel'),
            successButtonText: t('profile.payments.edit_payment_method.set_as_default_confirmation.confirm'),
            onSuccess: () => setPaymentMethodDefault(),
        })
    }

    const showRequestError = (error: any) => {
        openDialog({
            title: t('errors.title'),
            subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
            closeAfterMSeconds: 2000,
            closeOnClickOutside: true,
        });
    }

    const deletePaymentMethod = () => {
        api.delete(API_ROUTES.DELETE_PAYMENT_METHOD(id as string)).then(() => {
            handleGoBack();
            fetchPaymentMethods();
        }).catch(showRequestError)
    }

    const setPaymentMethodDefault = () => {
        api.put(API_ROUTES.SET_PAYMENT_METHOD_AS_DEFAULT(id as string), []).then(()=>{
            handleGoBack();
            fetchPaymentMethods();
        }).catch(showRequestError)
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, backgroundColor: Colors.support_secondary }}
        >
            {/* <StatusBar style="dark" backgroundColor={Colors.support_secondary} animated /> */}
            <SafeAreaView style={{ flex: 1 }}>
                <BackHeader
                    backButtonColor="secondary"
                    middleItem={() => (
                        <CustomText color="secondary" boldness="medium" numberOfLines={1}>
                            {t('profile.payments.edit_payment_method.header')}
                        </CustomText>
                    )}
                    otherClasses="p-5"
                />
                {!paymentMethod && (
                    <View className="flex-1 items-center justify-center">
                        <CustomText color="gray_medium" boldness="semiBold" size="large">
                            {t('profile.payments.edit_payment_method.loading')}
                        </CustomText>
                    </View>
                )}
                {paymentMethod && (
                    <View className="p-5">
                        <View className="flex flex-row justify-between">
                            <View className="flex flex-col items-start">
                                <CustomText size="large" boldness="bold" color="secondary" className="text-center">
                                    {paymentMethod?.brand}
                                </CustomText>
                                <CustomText size="large" boldness="light" color="gray_medium" className="text-center">
                                    **** {paymentMethod?.last4}
                                </CustomText>

                            </View>
                            {/* @ts-ignore */}
                            <PaymentIcon width={60} type={paymentMethod.brand?.toLowerCase()} style={{marginLeft: 10}}/>
                        </View>
                        <View className="flex flex-col items-start mt-5">
                            <CustomText size="large" boldness="bold" color="secondary" className="text-center">
                                {t('profile.payments.edit_payment_method.expiration_date')}
                            </CustomText>
                            <CustomText size="large" boldness="light" color="gray_medium" className="text-center">
                                {paymentMethod?.expire_month} / 20{paymentMethod?.expire_year}
                            </CustomText>
                        </View>
                    </View>
                )}
            </SafeAreaView>
            {paymentMethod && (
                <View className="p-5">
                    {!paymentMethod.isDefault && (
                        <View className="mb-4">
                            <CustomTouchableOpacity
                                size="large"
                                type="secondary"
                                textColor="primary"
                                textBoldness="semiBold"
                                text={t('profile.payments.edit_payment_method.set_as_default')}
                                onPress={handlePressSetAsDefaultButton}
                            />
                        </View>
                    )}
                    <CustomTouchableOpacity
                        size="large"
                        type="danger_outline"
                        textColor="error"
                        textBoldness="semiBold"
                        text={t('profile.payments.edit_payment_method.delete_payment_method')}
                        onPress={handlePressDeleteButton}
                    />
                </View>
            )}
        </KeyboardAvoidingView>

    )
}
