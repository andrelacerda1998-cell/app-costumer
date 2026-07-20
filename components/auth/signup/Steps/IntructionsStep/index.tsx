import { CustomText } from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import DatePicker from '@/components/DatePicker'
import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import React, { useState } from 'react'
import { Control, Controller, FieldErrors, FieldValues, useForm, UseFormHandleSubmit } from 'react-hook-form'
import { TextInput, View } from 'react-native'
import { ScrollView } from 'react-native'
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from "react-i18next"

const InstructionsStep = () => {
    const { width } = useWindowDimensions();
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const adjustedWidth = width - 40; // Adjusting for padding (p-5 is 20px on each side)

    const screens = [
        {
            title: t('auth.sign_up.instructions.first_title'),
            description: t('auth.sign_up.instructions.first_description'),
        },
        {
            title: t('auth.sign_up.instructions.second_title'),
            description: t('auth.sign_up.instructions.second_description'),
        },
        {
            title: t('auth.sign_up.instructions.third_title'),
            description: t('auth.sign_up.instructions.third_description'),
        }
    ];

    const handleScroll = (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / width);
        setCurrentIndex(index);
    };

    return (
        <View className="flex-1">
            <ScrollView
                horizontal
                pagingEnabled
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, alignItems: 'flex-end' }}
            >
                {screens.map((screen, index) => (
                    <View key={index} style={{ width: adjustedWidth }}>
                        <CustomText size="title" color="secondary" boldness="medium" numberOfLines={8}>
                            {screen.title}
                        </CustomText>
                        <CustomText color="gray_medium" numberOfLines={8} classes="mt-2">
                            {screen.description}
                        </CustomText>
                    </View>
                ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', marginBottom: 40, marginTop: 20 }}>
                {screens.map((_, index) => (
                    <View
                        key={index}
                        style={{
                            width: index === currentIndex ? 26 : 8,
                            height: 8,
                            backgroundColor: index === currentIndex ? Colors.primary : Colors.support_primary,
                            marginHorizontal: 5,
                            borderRadius: 999
                        }}
                    />
                ))}
            </View>
        </View>
    )
}

export default InstructionsStep;