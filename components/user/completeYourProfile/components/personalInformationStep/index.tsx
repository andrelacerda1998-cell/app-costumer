import CheckMark from "@/assets/icons/check-mark"
import XIcon from "@/assets/icons/x"
import {CustomText} from '@/components/CustomText'
import CustomTextInput from '@/components/CustomTextInput'
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import DatePicker from '@/components/DatePicker'
import {ThemedText} from '@/components/ThemedText'
import TouchOpacity from "@/components/TouchOpacity"
import {API_ROUTES} from "@/constants/ApiRoutes"
import {Colors} from '@/constants/Colors'
import {useApi} from "@/contexts/ApiContext"
import {useDialog} from "@/contexts/DialogContext"
import {useSession} from "@/contexts/SessionContext"
import i18n from "@/translation"
import {UserDataInterface} from "@/types/session"
import {validateNIF} from "@/utils"
import {useActionSheet} from "@expo/react-native-action-sheet"
import {Picker} from "@react-native-picker/picker"
import axios from "axios"
import React, {useEffect, useState} from 'react'
import {Control, Controller, FieldErrors, FieldValues, useForm, UseFormHandleSubmit} from 'react-hook-form'
import {useTranslation} from "react-i18next"
import {Platform, TextInput, View} from 'react-native'
import {ScrollView} from 'react-native'
import {KeyboardAwareScrollView} from "react-native-keyboard-controller"

const PersonalInformationStep = ({
    onNext
}: {
    onNext: (data: UserDataInterface) => void;
}) => {
    const {api} = useApi();
    const {userData, setUserData, getAvailableGenders, availableGenders} = useSession();
    const {t} = useTranslation();
    const {showActionSheetWithOptions} = useActionSheet();
    const {openDialog} = useDialog();
    const [updating, setUpdating] = useState<boolean>(false);

    const {
        control,
        handleSubmit,
        setValue,
        clearErrors,
        formState: {errors, isLoading, isValid},
        getValues,
        setError
    } = useForm<any>({
        mode: 'onChange',
        defaultValues: {
            name: userData?.name || "",
            nif: userData?.nif || "",
            date_birthday: userData?.date_birthday
                ? new Date(userData.date_birthday)
                : new Date(new Date().setFullYear(new Date().getFullYear() - 18)),
            gender_id: Number(userData?.gender_id) || 0,
        }
    });

    useEffect(() => {
        if (availableGenders === null || availableGenders.length === 0) {
            getAvailableGenders();
        }
    }, []);

    const handlePressIosPicker = (field: any) => {
        let options: string[] = [];

        if (availableGenders === null) {
            return;
        }


        for (const gender of availableGenders) {
            options.push(gender.name);
        }
        options.push(t('general.ios_picker.cancel'))

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

    const handleUpdate = async () => {
        setUpdating(true);
        const fullName = String(getValues('name') || '').replace(/\s{2,}/g, ' ').trim();
        const nif = String(getValues('nif') || '').trim();
        const formattedBirthDate = new Date(getValues('date_birthday') as Date).toISOString().split('T')[0];
        const selectedGenderId = Number(getValues('gender_id') || '1');
        const formData = new FormData();
        formData.append('name', fullName);
        formData.append('date_birthday', formattedBirthDate);
        formData.append('phone_number', userData?.phone_number || '');
        formData.append('gender_id', String(selectedGenderId));

        if (nif.length > 0) {
            formData.append('nif', nif);
        }

        api.post(API_ROUTES.AUTH_UPDATE_PROFILE + '?_method=PUT', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json'
            },
            transformRequest: (data) => data,
            timeout: 30000
        })
            .then((response) => {
                const newUserData = response.data.data;
                const updatedUserData = {
                    ...userData,
                    ...newUserData,
                    name: fullName,
                    date_birthday: formattedBirthDate,
                    gender_id: selectedGenderId,
                    nif: nif.length > 0 ? nif : userData?.nif ?? null,
                };

                setUserData(updatedUserData);
                onNext(updatedUserData as UserDataInterface);
            })
            .catch((error) => {
                const responseErrors = error?.response?.data?.errors;

                if (responseErrors && typeof responseErrors === 'object') {
                    Object.keys(responseErrors).forEach((key: any) => {
                        const message = Array.isArray(responseErrors[key]) ? responseErrors[key][0] : responseErrors[key];
                        setError(
                            key,
                            {type: 'manual', message}
                        );
                    });
                    return;
                }

                openDialog({
                    icon: <XIcon color={Colors.secondary} />,
                    title: t('errors.title'),
                    subtitle: error?.response?.data?.message || t('errors.occurred_an_error'),
                    closeAfterMSeconds: 2000,
                    closeOnClickOutside: true,
                });
            })
            .finally(() => {
                setUpdating(false);
            })
    }

    // const openSaveDialog = () => {
    // 		openDialog({
    // 				title: t('profile.edit.save.title'),
    // 				subtitle: t('profile.edit.save.subtitle'),
    // 				successButtonText: t('profile.edit.save.confirm'),
    // 				cancelButtonText: t('profile.edit.save.cancel'),
    // 				onSuccess: () => {
    // 						handleUpdate();
    // 				},
    // 		})
    // }

    return (
        <View className="flex-1 p-5">
            <CustomText size="title" color="secondary" boldness="bold" numberOfLines={3}>
                {t('auth.sign_up.personal_information.title')}
            </CustomText>
            <CustomText color="gray_medium" numberOfLines={3} classes="mt-2">
                {t('auth.sign_up.personal_information.subtitle')}
            </CustomText>


            <KeyboardAwareScrollView bottomOffset={20}>
                <View className="flex-1">
                    <View className="mt-4">
                        <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                            {t('general.full_name')}
                        </CustomText>

                        <Controller
                            control={control}
                            name="name"
                            rules={{
                                required: t('general.full_name_required'),
                                minLength: { value: 2, message: t('general.full_name_min_length') },
                                validate: (value) => {
                                    if (value.length > 50) {
                                        return t('general.full_name_max_length');
                                    } else if (/[^a-zA-Z\sÀ-ÖØ-öø-ÿ]/.test(value)) {
                                        return t('general.full_name_invalid_characters');
                                    } else if (value.trim().length === 0) {
                                        return t('general.full_name_cannot_be_only_spaces');
                                    } else if (value.trim().split(/\s+/).length < 2 || value.trim().split(/\s+/).length > 2) {
                                        return t('general.full_name_first_and_last_name');
                                    }
                                    return true;
                                }
                            }}
                            render={({ field }) => (
                                <View className="mt-2">
                                    <CustomTextInput
                                        {...field}
                                        size="large"
                                        onChangeText={(value: string) => {
                                            value = value.replace(/\s{2,}/g, ' ');
                                            field.onChange(value);
                                        }}
                                        placeholder={t('general.full_name_placeholder')}
                                        autoCorrect={false}
                                        error={errors.name && errors.name.message}
                                        displayErrorIcon={true}
                                        success={!errors.name && field.value}
                                        displaySuccessIcon={true}
                                        classes="border-gray_strong focus:border-primary border-[1px] rounded-lg"
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
                            {t('auth.sign_up.personal_information.gender')}
                        </CustomText>

                        <Controller
                            control={control}
                            name="gender_id"
                            rules={{
                                required: t('auth.sign_up.personal_information.gender_required'),
                                validate: value => value !== 0 || t('auth.sign_up.personal_information.gender_required')
                            }}
                            render={({field}) => (
                                <View
                                    className="relative mt-2 border-[1px] border-gray_strong focus:border-support_primary rounded-lg flex justify-center">
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
                                                        className="mt-1 text-black"
                                                        color="support_secondary"
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
                    </View>

                    <View className="mt-8">
                        <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                            {t('general.birth_date')}
                        </CustomText>


                        <Controller
                            control={control}
                            name="date_birthday"
                            defaultValue=""
                            rules={{
                                required: t('general.birth_date_required'), validate: (value) => {
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
                                    pressableClass="border-gray_strong border-[1px]"
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
                    </View>

                    <View className="mt-8">
                        <CustomText color="secondary" boldness="semiBold" numberOfLines={1}>
                            {t('general.nif')}
                        </CustomText>

                        <Controller
                            control={control}
                            name="nif"
                            rules={{
                                pattern: { value: /^$|^[0-9]{9}$/, message: t('general.nif_invalid') },
                                validate: (value) => {
                                    if (!value?.trim?.()) {
                                        clearErrors('nif');
                                        return true;
                                    }
                                    const isValid = validateNIF(value)
                                    if (!isValid) return t('general.nif_invalid');
                                    clearErrors('nif');
                                    return true;
                                }
                            }}
                            render={({ field }) => (
                                <View className="mt-2">
                                    <CustomTextInput
                                        {...field}
                                        size="large"
                                        onChangeText={(value: string) => {
                                            const newValue = value.replace(/\D/g, '').trim();
                                            if (!newValue) {
                                                clearErrors('nif');
                                            }
                                            field.onChange(newValue)
                                        }}
                                        placeholder={t('general.nif_placeholder')}
                                        keyboardType="number-pad"
                                        type="numeric"
                                        error={errors.nif && errors.nif.message}
                                        displayErrorIcon={true}
                                        success={!errors.nif && field.value}
                                        displaySuccessIcon={true}
                                        classes="border-gray_strong focus:border-primary border-[1px] rounded-lg"
                                    />
                                </View>
                            )}
                        />
                        {errors.nif && errors.nif.message && (
                            <CustomText
                            size="small"
                            color="error"
                            classes="mt-1"
                            >
                            {errors.nif.message as string}
                            </CustomText>
                        )}
                    </View>
                </View>
            </KeyboardAwareScrollView>

            <View className="pt-5">
                {/* {signUpError && (
                <CustomText
                    size="small"
                    color="error"
                    boldness="medium"
                    className="text-center mb-2"
                >
                    {signUpError}
                </CustomText>
            )} */}

                <CustomTouchableOpacity
                    type="primary"
                    size="large"
                    text={t('auth.sign_up.continue_sign_up')}
                    textColor="secondary"
                    textBoldness="semiBold"
                    disabled={isLoading || updating}
                    onPress={handleSubmit(handleUpdate)}
                />
            </View>

        </View>
    )
}

export default PersonalInformationStep;
