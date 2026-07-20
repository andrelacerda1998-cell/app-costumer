import {KeyboardAvoidingView, Platform, ScrollView, Text, View} from "react-native";
import {Colors} from "@/constants/Colors";
import BackHeader from "@/components/app/BackHeader";
import {CustomText} from "@/components/CustomText";
import React, {useRef, useState} from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import cardValidator from 'card-validator';
import {Controller, useForm} from "react-hook-form";
import CustomTextInput from "@/components/CustomTextInput";
import {TextInputMask} from "react-native-masked-text";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";
import {RSA}  from 'react-native-rsa-native';
import CheckMark from "@/assets/icons/check-mark";
import {router} from "expo-router";
import {useDialog} from "@/contexts/DialogContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useWallet } from "@/contexts/WalletContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import BottomSheet from "@gorhom/bottom-sheet";
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet";
import { useTranslation } from "react-i18next";
import XIcon from "@/assets/icons/x";

export default function NewPaymentMethod() {
    const { t } = useTranslation();
    const { api } = useApi();
    const { openDialog } = useDialog();
    const { fetchPaymentMethods, requestAutoSelectNewestPaymentMethod } = useWallet();
    const { setGuestToken } = useGuestSession();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const {control, handleSubmit, formState: {errors, isLoading, isValid}, getValues, setError, reset} = useForm({
        mode: 'onChange',
        defaultValues: {
            holderName: "",
            cardNumber: "",
            cvc: "",
            expiryDate: "",

        },
    });
    const [loading, setLoading] = useState(false);

    const validateExpiryDate = (value: string) => {
        if (!value || value.length !== 5) return t('profile.payments.information.expire_date.invalid');

        const [month, year] = value.split('/').map(Number);
        if (month < 1 || month > 12) return t('profile.payments.information.expire_date.invalid_month');

        const currentYear = new Date().getFullYear() % 100;
        if (year < currentYear) return t('profile.payments.information.expire_date.year_in_the_future');

        const validation = cardValidator.expirationDate(value);
        if (!validation.isPotentiallyValid) return t('profile.payments.information.expire_date.invalid');

        return true;
    };

    const handleGoBack = () => {
        if (router.canGoBack()) {
            return router.back();
        }
        return router.push("/(app)/(tabs)/profile");
    }

    const formatExpiryDate = (value: string) => {
        let formatted = value.replace(/\D/g, '');

        // "0" e "1" aguardam o 2º dígito (01-09 / 10-12); só dígitos >= 2 ganham prefixo
        if (formatted.length === 1 && Number(formatted) >= 2) {
            formatted = `0${formatted}`;
        }
        if (formatted.length > 2) {
            formatted = `${formatted.slice(0, 2)}/${formatted.slice(2, 4)}`;
        }
        return formatted.slice(0, 5);
    };

    const handleSubmitForm = async () => {
        setLoading(true);
        const creditCardData = getValues();
        const {cardNumber, holderName, cvc, expiryDate} = creditCardData;
        const expirationDate = cardValidator.expirationDate(expiryDate);
        const sanitizedCardNumber = cardNumber.replace(' ', '');

        if (!validateCardData(expirationDate, sanitizedCardNumber)) {
            setError('cardNumber', {
                type: 'manual',
                message: t('profile.payments.add_payment_method.invalid_card_number'),
            });
            setLoading(false);
            return;
        };

        const formattedCardData = {
            cardNumber,
            holderName,
            cvc,
            expirationMonth: expirationDate.month,
            expirationYear: expirationDate.year,
        };

        try {
            const {data: publicKeyResponse} = await api.get(API_ROUTES.GET_PUBLIC_KEY);
            const publicKey = publicKeyResponse.data.public_key;
            const guestToken = publicKeyResponse.data.guest_token;
            if (guestToken) setGuestToken(guestToken);

            const jsonData = JSON.stringify(formattedCardData);

            const signedData = await RSA.encrypt(jsonData, publicKey);

            const savePayload: any = { creditCardData: signedData };
            if (guestToken) savePayload.guest_token = guestToken;

            await api.post(API_ROUTES.SAVE_PAYMENT_METHOD, savePayload);
            requestAutoSelectNewestPaymentMethod();
            handleGoBack();
            openSuccessDialog();
            fetchPaymentMethods();
        } catch (error) {
            openDialog({
                icon: <XIcon color={Colors.secondary} />,
                title: t('errors.title'),
                subtitle: t('errors.occurred_an_error'),
                closeAfterMSeconds: 2000,
                closeOnClickOutside: true,
            })
        } finally {
            setLoading(false);
        }
    };

    const validateCardData = (expirationDate: any, cardNumber: string): boolean => {
        const isDateValid = expirationDate.isValid;
        const numberValidation = cardValidator.number(cardNumber);
        return isDateValid && numberValidation.isPotentiallyValid;
    };

    const openSuccessDialog = () => {
        openDialog({
            icon: <CheckMark color={Colors.secondary}/>,
            title: t('profile.payments.add_payment_method.success.title'),
            subtitle: t('profile.payments.add_payment_method.success.subtitle'),
            closeAfterMSeconds: 2000,
            closeOnClickOutside: true,
        });
    };

    // console.log({contentHeight})

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior="height"
                style={{ flex: 1 }}
            >
                <DynamicSizingSheet
                    type="scrollView"
                    // ref={bottomSheetRef}
                    // snapPoints={['30%', '70%']}
                    style={{
                        backgroundColor: Colors.support_secondary,
                        shadowColor: "#000",
                        shadowOffset: {
                            width: 0,
                            height: 3,
                        },
                        shadowOpacity: 0.27,
                        shadowRadius: 4.65,
                        elevation: 6,
                        borderTopLeftRadius: 40,
                        borderTopRightRadius: 40,
                    }}
                    backgroundStyle={{
                        backgroundColor: Colors.support_secondary,
                    }}
                    handleIndicatorStyle={{
                        backgroundColor: Colors.gray_strong,
                        width: 60,
                    }}
                    enablePanDownToClose={!loading}
                    // enableDynamicSizing={false}
                    // enableContentPanningGesture
                    // enableHandlePanningGesture
                    onClose={() => {
                        router.canGoBack() ? router.back() : router.push("/(app)/(tabs)/profile");
                    }}
                    backdropComponent={() => <View style={{ flex: 1, backgroundColor: 'black', opacity: 0.6 }} />}
                >
                    <StatusBar style="light" backgroundColor="rgba(0,0,0,.6)" animated />

                    <View >
                        <View className="space-y-4 flex-1 p-5">
                            <View>
                                <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
                                    {t('profile.payments.information.name.label')}
                                </CustomText>
                                <Controller
                                    control={control}
                                    name="holderName"
                                    rules={{
                                        required: t('profile.payments.information.name.required'),
                                        minLength: {value: 2, message: t('profile.payments.information.name.min_length')},
                                        validate: (value) => {
                                            if (value.length > 50) {
                                                return t('profile.payments.information.name.max_length')
                                            } else if (value.trim().split(/\s+/).length < 2) {
                                                return t('profile.payments.information.name.first_and_last_name')
                                            }
                                            return true;
                                        }
                                    }}
                                    render={({field}) => (
                                        <View className="mt-2">
                                            <CustomTextInput
                                                {...field}
                                                size="large"
                                                onChangeText={(value: string) => {
                                                    value = value.replace(/\s{2,}/g, ' ')
                                                    field.onChange(value)
                                                }}
                                                placeholder={t('profile.payments.information.name.placeholder')}
                                                autoCorrect={false}
                                                error={errors.holderName && errors.holderName.message}
                                                displayErrorIcon={true}
                                                success={!errors.holderName && field.value}
                                                displaySuccessIcon={true}
                                                disabled={loading}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.holderName && errors.holderName.message && (
                                    <CustomText
                                        size="small"
                                        color="error"
                                        classes="mt-1"
                                    >
                                        {errors.holderName.message as string}
                                    </CustomText>
                                )}
                            </View>
                            <View>
                                <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
                                    {t('profile.payments.information.card_number.label')}
                                </CustomText>
                                <Controller
                                    control={control}
                                    name="cardNumber"
                                    rules={{
                                        required: t('profile.payments.information.card_number.required'),
                                        validate: (value) => cardValidator.number(value).isValid || t('profile.payments.information.card_number.invalid')
                                    }}
                                    render={({field}) => (
                                        <View className="mt-2">
                                            <CustomTextInput
                                                {...field}
                                                size="large"
                                                onChangeText={(value: string) => {
                                                    value = value.replace(/\s{2,}/g, ' ');
                                                    const formattedValue = value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim();
                                                    field.onChange(formattedValue);
                                                }}
                                                keyboardType="numeric"
                                                textContentType="creditCardNumber"
                                                placeholder={t('profile.payments.information.card_number.placeholder')}
                                                maxLength={19}
                                                importantForAutofill="yes"
                                                autoCorrect={false}
                                                error={errors.cardNumber && errors.cardNumber.message}
                                                displayErrorIcon={true}
                                                success={!errors.cardNumber && field.value}
                                                displaySuccessIcon={true}
                                                disabled={loading}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.cardNumber && errors.cardNumber.message && (
                                    <CustomText
                                        size="small"
                                        color="error"
                                        classes="mt-1"
                                    >
                                        {errors.cardNumber.message as string}
                                    </CustomText>
                                )}
                            </View>
                            <View className="flex flex-row gap-2 justify-around">
                                <View className="w-[45%]">
                                    <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
                                        {t('profile.payments.information.expire_date.label')}
                                    </CustomText>
                                    <Controller
                                        control={control}
                                        name="expiryDate"
                                        rules={{
                                            required: t('profile.payments.information.expire_date.required'),
                                            validate: validateExpiryDate
                                        }}
                                        render={({field: {onChange, value}}) => (
                                            <View className="mt-2">
                                                <TextInputMask
                                                    type={"datetime"}
                                                    options={{
                                                        mask: '99/99'
                                                    }}
                                                    onChangeText={(text) => {
                                                        const formatted = formatExpiryDate(text);
                                                        onChange(formatted);
                                                    }}
                                                    value={value}
                                                    keyboardType="numeric"
                                                    placeholder={t('profile.payments.information.expire_date.placeholder')}
                                                    maxLength={5}
                                                    importantForAutofill="yes"
                                                    autoCorrect={false}
                                                    customTextInputProps={{
                                                        size: "large",
                                                        keyboardType: "numeric",
                                                        importantForAutofill: "yes",
                                                        autoCorrect: false,
                                                        error: errors.expiryDate && errors.expiryDate.message,
                                                        displayErrorIcon: true,
                                                        success: !errors.expiryDate && value,
                                                        displaySuccessIcon: true,
                                                        disabled: loading
                                                    }}
                                                    customTextInput={CustomTextInput}
                                                />
                                            </View>
                                        )}
                                    />
                                    {errors.expiryDate && errors.expiryDate.message && (
                                        <CustomText
                                            size="small"
                                            color="error"
                                            classes="mt-1"
                                        >
                                            {errors.expiryDate.message as string}
                                        </CustomText>
                                    )}
                                </View>
                                <View className="w-[45%]">
                                    <CustomText color="gray_strong" boldness="semiBold" numberOfLines={1}>
                                        {t('profile.payments.information.cvc.label')}
                                    </CustomText>
                                    <Controller
                                        control={control}
                                        name="cvc"
                                        rules={{
                                            required: t('profile.payments.information.cvc.required'),
                                            validate: (value) => cardValidator.cvv(value).isValid || t('profile.payments.information.cvc.invalid')
                                        }}
                                        render={({field}) => (
                                            <View className="mt-2">
                                                <CustomTextInput
                                                    {...field}
                                                    onChangeText={(text: string) => {
                                                        field.onChange(text);
                                                    }}
                                                    size="large"
                                                    keyboardType="numeric"
                                                    placeholder={t('profile.payments.information.cvc.placeholder')}
                                                    maxLength={4}
                                                    importantForAutofill="yes"
                                                    autoCorrect={false}
                                                    error={errors.cvc && errors.cvc.message}
                                                    displayErrorIcon={true}
                                                    success={!errors.cvc && field.value}
                                                    displaySuccessIcon={true}
                                                    disabled={loading}
                                                />
                                            </View>
                                        )}
                                    />
                                    {errors.cvc && errors.cvc.message && (
                                        <CustomText
                                            size="small"
                                            color="error"
                                            classes="mt-1"
                                        >
                                            {errors.cvc.message as string}
                                        </CustomText>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </DynamicSizingSheet>
            </KeyboardAvoidingView>
            <View className="p-5 bg-support_secondary">
                <CustomTouchableOpacity
                    size="large"
                    type="secondary"
                    textColor="primary"
                    textBoldness="semiBold"
                    text={loading ? t('profile.payments.add_payment_method.saving') : t('profile.payments.add_payment_method.save')}
                    onPress={handleSubmitForm}
                    disabled={loading}
                />
            </View>
        </SafeAreaView>
    )
}
