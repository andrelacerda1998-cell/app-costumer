import React from "react";
import {View} from "react-native";
import {Colors} from "@/constants/Colors";
import {CustomText} from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import {router} from "expo-router";
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";

const Failed = () => {
    const { t } = useTranslation();

    const handleGoBack = () => {
        router.canGoBack() ? router.back() : router.push("/(app)/(tabs)/home");
    }

    return (
        <DynamicSizingSheet
            type="scrollView"
            style={{
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
            onClose={handleGoBack}
            backdropComponent={() => <View style={{ flex: 1, backgroundColor: 'black', opacity: 0.6 }} />}
        >
            {/* <StatusBar style="light" backgroundColor="transparent" animated /> */}
            <View className="space-y-4 py-5">
                <CustomText
                    color="secondary"
                    size="large"
                    boldness="semiBold"
                    className="text-center px-5"
                >
                    {t('services.checkout.payment_methods.failed.title')}
                </CustomText>

                <View className="h-[1px] bg-support_primary"></View>

                <CustomText
                    color="secondary"
                    size="medium"
                    boldness="regular"
                    className="text-center px-5"
                >
                    {t('services.checkout.payment_methods.failed.subtitle')}
                </CustomText>
                
                <View className="p-5">
                    <CustomTouchableOpacity
                        size="large"
                        type="secondary_outline"
                        textColor="secondary"
                        textBoldness="semiBold"
                        text={t('services.checkout.payment_methods.failed.try_again')}
                        onPress={handleGoBack}
                    />
                </View>
            </View>
        </DynamicSizingSheet>
    )
}

export default Failed;