import {CustomText} from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import DatePicker from '@/components/DatePicker'
import {ThemedText} from '@/components/ThemedText'
import {Colors} from '@/constants/Colors'
import {Poppins_600SemiBold} from "@expo-google-fonts/poppins"
import {Picker} from '@react-native-picker/picker'
import React, {useState} from 'react'
import {Control, Controller, FieldErrors, FieldValues, useForm, UseFormHandleSubmit} from 'react-hook-form'
import {Platform, TextInput, View} from 'react-native'
import {ScrollView} from 'react-native'
import TouchOpacity from "@/components/TouchOpacity";
import {useActionSheet} from "@expo/react-native-action-sheet";
import { useTranslation } from "react-i18next"

const PersonalInformationStep = ({
control,
errors,
availableGenders
}: {
    control: any,
    errors: FieldErrors<FieldValues>,
    availableGenders: any[],
}) => {
    const { t } = useTranslation();
    const {showActionSheetWithOptions} = useActionSheet();

    const handlePressIosPicker = (field: any) => {
        let options: string[] = [];

        if (availableGenders === null) {
            return;
        }

        for (const gender of availableGenders) {
            options.push(gender.name);
        }
        options.push(t('general.ios_picker.cancel'));

        const cancelButtonIndex = options.indexOf(t('general.ios_picker.cancel'));

        showActionSheetWithOptions({
            options: options,
            cancelButtonIndex: cancelButtonIndex,
            title: t('general.ios_picker.choose_an_option')
        }, (selectedIndex) => {
            // @ts-ignore
            const label = options[selectedIndex];

            if (label === t('general.ios_picker.cancel')) {
                return;
            }

            let gender = availableGenders.filter(value => value.name === label);
            if (availableGenders === null) {
                return;
            }
            if (gender === null) {
                return;
            }

            field.onChange(gender[0].id);
        });

    }

    const getGenderLabel = (genderId: number) => {
        const option = availableGenders.filter(value => value.id === genderId);

        if (option[0] === undefined) {
            return '';
        }

        return option[0]?.name ?? ''
    }

    return (
        <View className="flex-1">
            <CustomText size="title" color="secondary" boldness="bold" numberOfLines={3}>
                {t('auth.sign_up.personal_information.title')}
            </CustomText>
            <CustomText color="gray_medium" numberOfLines={3} classes="mt-2">
                {t('auth.sign_up.personal_information.subtitle')}
            </CustomText>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                    {t('general.full_name')}
                </CustomText>

                <Controller
                    control={control}
                    name="name"
                    rules={{
                        required: t('general.full_name_required'),
                        minLength: {value: 2, message: t('general.full_name_min_length')},
                        validate: (value) => {
                            if (value.length > 50) {
                                return t('general.full_name_max_length')
                            } else if (/[^a-zA-Z\sÀ-ÖØ-öø-ÿ]/.test(value)) {
                                return t('general.full_name_invalid_characters')
                            } else if (value.trim().length === 0) {
                                return t('general.full_name_cannot_be_only_spaces')
                            } else if (value.trim().split(/\s+/).length < 2 || value.trim().split(/\s+/).length > 2) {
                                return t('general.full_name_first_and_last_name')
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
                                placeholder={t('general.full_name_placeholder')}
                                autoCorrect={false}
                                error={errors.name && errors.name.message}
                                displayErrorIcon={true}
                                success={!errors.name && field.value}
                                displaySuccessIcon={true}
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

            <View className="mt-8">
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
                                placeholder={t('general.phone_number_placeholder')}
                                keyboardType="phone-pad"
                                textContentType="telephoneNumber"
                                error={errors.phone_number && errors.phone_number.message}
                                displayErrorIcon={true}
                                success={!errors.phone_number && field.value !== "+351" && field.value.trim() !== ""}
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
            </View>

            <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                    {t('general.email')}
                </CustomText>

                <Controller
                    control={control}
                    name="email"
                    defaultValue=""
                    rules={{
                        required: t('general.email_required'),
                        pattern: {
                            value: /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i,
                            message: t('general.email_invalid')
                        }
                    }}
                    render={({ field }) => (
                        <View className="mt-2">
                            <CustomTextInput
                                {...field}
                                size="large"
                                onChangeText={(value: string) => {
                                    value = value.trim()
                                    field.onChange(value)
                                }}
                                autoCapitalize="none"
                                placeholder={t('general.email_placeholder')}
                                textContentType="emailAddress"
                                error={errors.email && errors.email.message}
                                displayErrorIcon={true}
                                success={!errors.email && field.value}
                                displaySuccessIcon={true}
                            />
                        </View>
                    )}
                />
                {errors.email && errors.email.message && (
                    <CustomText
                    size="small"
                    color="error"
                    classes="mt-1"
                    >
                    {errors.email.message as string}
                    </CustomText>
                )}
            </View>

            {/* <View className="mt-4">
                <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                    {t('auth.sign_up.personal_information.gender')}
                </CustomText>

                <Controller
                    control={control}
                    name="gender_id"
                    rules={{
                        // required: t('auth.sign_up.personal_information.gender_required'),
                        // validate: value => value !== 0 || t('auth.sign_up.personal_information.gender_required')
                    }}
                    render={({field}) => (
                        <View
                            className="relative mt-2 border-[1px] border-support_primary focus:border-primary rounded-lg flex justify-center">
                            {
                                Platform.OS === 'android' ? (
                                    <Picker
                                        selectedValue={field.value}
                                        onValueChange={(value) => field.onChange(value)}
                                        style={{
                                            width: "96%",
                                            margin: "auto",
                                            height: 60,
                                            color: Colors.secondary,
                                        }}
                                        placeholder={t('auth.sign_up.personal_information.gender_placeholder')}
                                        dropdownIconColor={Colors.secondary}
                                    >
                                        <Picker.Item
                                            label={t('auth.sign_up.personal_information.gender_placeholder')}
                                            value={null}
                                            color={Colors.gray_medium}
                                        />
                                        {
                                            availableGenders.map((gender: { id: number, name: string }) => {
                                                return (
                                                    <Picker.Item
                                                        key={`gender-${gender.id}`}
                                                        label={gender.name}
                                                        value={gender.id}
                                                        color={Colors.secondary}
                                                    />
                                                )
                                            })
                                        }
                                    </Picker>
                                ) : (
                                    <View>
                                        <TouchOpacity
                                            className={`
                                          rounded-lg py-3 px-5 h-14
                                        `}
                                            onPress={() => handlePressIosPicker(field)}
                                        >
                                            <CustomText
                                                className="mt-1"
                                                color="gray_medium"
                                            >
                                                {getGenderLabel(field.value)}
                                            </CustomText>
                                        </TouchOpacity>
                                    </View>
                                )
                            }

                        </View>
                    )}
                />
                {errors.gender_id && errors.gender_id.message && (
                    <CustomText
                        size="small"
                        color="error"
                        classes="mt-1"
                    >
                        {errors.gender_id.message as string}
                    </CustomText>
                )}
            </View> */}

            {/* <View className="mt-8">
                <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                    {t('general.birth_date')}
                </CustomText>

                VERIFY IF ICONS IS DISPLAYING OVER TEXT ON SMALLER SCREENS
                DISPLAYING A WEIRD BUTTON ON IOS
                <Controller
                    control={control}
                    name="date_birthday"
                    rules={{
                        required: t('general.birth_date_required'),
                        validate: (value) => {
                            const date = new Date(value)
                            if (isNaN(date.getTime())) {
                                return t('general.birth_date_invalid')
                            } else if (date.getTime() > Date.now()) {
                                return t('general.birth_date_not_in_future')
                            } else if (date.getTime() < new Date('1900-01-01').getTime()) {
                                return t('general.birth_date_max_age')
                            } else if (date.getTime() > new Date().setFullYear(new Date().getFullYear() - 18)) {
                                return t('general.birth_date_min_age')
                            }
                            return true;
                        }
                    }}
                    render={({field}) => (
                        <DatePicker
                            onDateChange={field.onChange}
                            pressableClass="border-support_primary border-[1px]"
                            color={Colors.secondary}
                            textColor="secondary"
                            initialDate={field.value}
                            height={62}
                            fontSize="medium"
                            textBoldness="regular"
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
            </View> */}
        </View>
    )
}

export default PersonalInformationStep;
