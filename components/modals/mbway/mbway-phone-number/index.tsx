import {KeyboardAvoidingView, Platform, ScrollView, Text, View} from "react-native";
import {Colors} from "@/constants/Colors";
import {CustomText} from "@/components/CustomText";
import React, {useRef, useState} from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import {Controller, useForm} from "react-hook-form";
import CustomTextInput from "@/components/CustomTextInput";
import { StatusBar } from "expo-status-bar";
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet";
import { useTranslation } from "react-i18next";

export default function MbWayPhoneNumber({ onClose, onSave, initialPhoneNumber }: { onClose: () => void, onSave: (phoneNumber: string) => void, initialPhoneNumber?: string | null }) {
    const { t } = useTranslation();
    // Pré-preenche com o número usado no registo (só se for um móvel PT válido);
    // o user pode alterá-lo caso use outro número no MB WAY.
    const normalizedInitial = (initialPhoneNumber ?? '').replace(/[\s.\-]/g, '');
    const prefilledPhone = /^(\+351)?9\d{8}$/.test(normalizedInitial)
        ? (normalizedInitial.startsWith('+351') ? normalizedInitial : `+351${normalizedInitial}`)
        : null;
    const {control, handleSubmit, formState: {errors, isLoading, isValid}, getValues, setError, reset} = useForm({
        mode: 'onChange',
        defaultValues: {
            phone_number: prefilledPhone ?? '+351'
        },
    });

    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="light" backgroundColor="rgba(0,0,0,.6)" animated />
            <KeyboardAvoidingView
                behavior="height"
                keyboardVerticalOffset={40}
                style={{
                    flex: 1,
                    width: "100%",
                }}
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
                    enablePanDownToClose
                    // enableDynamicSizing={false}
                    // enableContentPanningGesture
                    // enableHandlePanningGesture
                    onClose={onClose}
                    backdropComponent={() => <View style={{ flex: 1, backgroundColor: 'black', opacity: 0.6 }} />}
                >
                    <View >
                        <View className="space-y-4 flex-1 p-5">
                            <View>
                                <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
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
                                                    if (value.startsWith('+351')) {
                                                        field.onChange(`+351${value.replace(/^\+351/, '').trim()}`)
                                                    }
                                                }}
                                                autoFocus
                                                placeholder={t('general.phone_number_placeholder')}
                                                keyboardType="phone-pad"
                                                maxLength={13}
                                                textContentType="telephoneNumber"
                                                error={errors.phone_number && errors.phone_number.message}
                                                displayErrorIcon={true}
                                                success={!errors.phone_number && field.value !== "+351"}
                                                displaySuccessIcon={true}
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
                                {prefilledPhone && !errors.phone_number && (
                                    <CustomText
                                        size="small"
                                        color="gray_medium"
                                        classes="mt-1"
                                    >
                                        {t('services.checkout.mb_way_phone_modal.prefilled_hint')}
                                    </CustomText>
                                )}
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
                    text={t('services.checkout.mb_way_phone_modal.save')}
                    onPress={() => {
                        onSave(getValues('phone_number'))
                        onClose()
                    }}
                />
            </View>
        </View>
    )
}
