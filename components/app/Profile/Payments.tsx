import React, {useEffect, useState} from 'react'
import {View, FlatList, Platform} from 'react-native';
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";
import {PaymentMethod} from "@/types/paymentMethods";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import {router, useFocusEffect} from "expo-router";
import { CustomText } from "@/components/CustomText";
import ArrowIcon from "@/assets/icons/arrow";
import { Colors } from "@/constants/Colors";
import { PaymentIcon } from "react-native-payment-icons";
import { useWallet } from "@/contexts/WalletContext";
import { useTranslation } from "react-i18next";

const Payments = () => {
    const { t } = useTranslation();
    const { paymentMethods, fetchPaymentMethods, isLoadingPaymentMethods } = useWallet();

    useFocusEffect(
        React.useCallback(() => {
            if (!paymentMethods) fetchPaymentMethods();
        }, [])
    );

    const handlePress = (item: PaymentMethod) => {
        router.navigate({
            pathname: '/(app)/(modals)/(profile)/edit-payment-method/[id]',
            params: {
                id: item.id,
                paymentMethod: JSON.stringify(item)
            }
        })
    }

    return (
        <View className="flex-1" style={{ paddingHorizontal: Platform.OS === "ios" ? 20 : 0 }}>
            {isLoadingPaymentMethods ? (
                <View className="flex-1 overflow-hidden">
                    <View className="space-y-4">
                        {Array.from({length: 5}).map((_, index) => (
                            <View key={`loading-payment-method-${index}`}>
                                <View className="space-x-2 flex-row items-center p-3">
                                    <View className="rounded-md overflow-hidden w-9 h-7">
                                        <View className="w-full h-full bg-gray_light"></View>
                                    </View>
                                    <View className="flex-1">
                                        <View className="rounded-md overflow-hidden w-[40%] h-5">
                                            <View className="w-full h-full bg-gray_light"></View>
                                        </View>
                                        {index === 0 && (
                                            <View className="rounded-md overflow-hidden w-[55%] h-4 mt-2">
                                                <View className="w-full h-full bg-gray_light"></View>
                                            </View>
                                        )}
                                    </View>
                                    <View className="rounded-full overflow-hidden w-5 h-5">
                                        <View className="w-full h-full bg-gray_light"></View>
                                    </View>
                                </View>
                                {index !== 4 && (
                                    <View className="h-[1px] w-full bg-[#2F2F2F] opacity-10 rounded-full"/>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            ) : (
                <FlatList
                    className="space-y-4 flex-1"
                    data={paymentMethods}
                    renderItem={({ item, index }) => {
                        return (
                            <CustomTouchableOpacity
                                size="small"
                                type="transparent"
                                onPress={() => handlePress(item)}
                                key={index}
                                className="flex-row justify-between items-center p-4"
                            >
                                <PaymentIcon width={30} type={item.brand?.toLowerCase() as any} />
                                <View className="flex-1 ml-4">
                                    <CustomText color="secondary" numberOfLines={1}>
                                        {item.brand} **** {item.last4}
                                    </CustomText>
                                    {
                                        item.isDefault?(
                                            <CustomText color={"gray_medium"}>{t('profile.payments.default_method')}</CustomText>
                                        ):null
                                    }
                                </View>
                                <View className="w-4 h-4 flex items-center">
                                    <ArrowIcon color={Colors.secondary} position="right"/>
                                </View>
                            </CustomTouchableOpacity>
                        )
                    }}
                    ItemSeparatorComponent={() =>
                        <View className="h-[1px] w-full bg-[#2F2F2F] opacity-10 rounded-full mt-2"/>
                    }
                    ListEmptyComponent={() => (
                        <View className="flex-1 items-center justify-center">
                            <CustomText color="secondary" numberOfLines={1}>
                                {t('profile.payments.no_payment_methods')}
                            </CustomText>
                        </View>
                    )}
                />
            )}
            <View className="py-4">
                <CustomTouchableOpacity
                    size="large"
                    type="primary"
                    textColor="secondary"
                    textBoldness="semiBold"
                    text={t('profile.payments.add_payment_method.title')}
                    onPress={() => {
                        router.navigate('/(app)/(bottom-sheets)/new-payment-method');
                    }}
                />
                <View className="mt-4">
                    <CustomTouchableOpacity
                        size="large"
                        type="secondary_outline"
                        textColor="secondary"
                        textBoldness="semiBold"
                        text={t('profile.payments.invoice_data.title')}
                        onPress={() => {
                            router.navigate('/(app)/(modals)/(payments)/invoice-data');
                        }}
                    />
                </View>
            </View>
        </View>
    );
}

export default Payments
