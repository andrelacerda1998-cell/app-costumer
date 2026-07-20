import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import XIcon from "@/assets/icons/x";

const POSTAL_CODE_REGEX = /^\d{4}-\d{3}$/;

const formatPostalCode = (value: string) => {
    value = value.replace(/\s{2,}/g, ' ').replace(/[^\d]/g, '');
    if (value.endsWith('-')) {
        value = value.slice(0, -1);
    } else {
        value = value.replace(/(\d{4})(\d{1})/, '$1-$2');
    }
    return value;
};

interface PostalCodeSheetProps {
    visible: boolean;
    initialValue?: string;
    onClose: () => void;
    onSave: (postalCode: string) => void;
}

export default function PostalCodeSheet({ visible, initialValue = '', onClose, onSave }: PostalCodeSheetProps) {
    const { t } = useTranslation();
    const [postalCode, setPostalCode] = useState<string>(formatPostalCode(initialValue));

    useEffect(() => {
        if (visible) {
            setPostalCode(formatPostalCode(initialValue));
        }
    }, [visible, initialValue]);

    const isValid = POSTAL_CODE_REGEX.test(postalCode);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-support_secondary">
                <StatusBar style="dark" backgroundColor={Colors.support_secondary} animated />
                <SafeAreaView edges={["top", "bottom"]} className="flex-1">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                        style={{ flex: 1 }}
                    >
                        <View className="flex-row items-start justify-between px-5 pt-4">
                            <View className="flex-1 pr-3">
                                <CustomText color="secondary" boldness="bold" size="extraLarge">
                                    {t('profile.update_address.postal_code_required_title')}
                                </CustomText>
                            </View>
                            <CustomTouchableOpacity
                                size="small"
                                type="secondary_outline"
                                onPress={onClose}
                            >
                                <View style={{ width: 12, height: 12 }}>
                                    <XIcon color={Colors.secondary} />
                                </View>
                            </CustomTouchableOpacity>
                        </View>

                        <ScrollView
                            contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <CustomText color="secondary" size="small" classes="opacity-75">
                                {t('profile.update_address.postal_code_drawer_why')}
                            </CustomText>

                            <View className="mt-6 bg-white rounded-2xl pb-5">
                                <CustomText color="secondary" boldness="semiBold" classes="mb-2">
                                    {t('general.postal_code')}
                                </CustomText>
                                <CustomTextInput
                                    size="large"
                                    value={postalCode}
                                    onChangeText={(value: string) => setPostalCode(formatPostalCode(value))}
                                    maxLength={8}
                                    autoFocus
                                    placeholder={t('general.postal_code_placeholder')}
                                    keyboardType="number-pad"
                                    success={isValid}
                                    displaySuccessIcon={true}
                                />
                            </View>

                        <View className="">
                            <CustomTouchableOpacity
                                size="large"
                                type="secondary"
                                textColor="primary"
                                textBoldness="semiBold"
                                text={t('general.confirm')}
                                disabled={!isValid}
                                onPress={() => {
                                    onSave(postalCode);
                                    onClose();
                                }}
                            />
                        </View>
                        </ScrollView>

                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}
