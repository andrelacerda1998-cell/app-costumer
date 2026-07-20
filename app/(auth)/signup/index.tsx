import { useEffect, useState } from 'react';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, BackHandler, KeyboardAvoidingView, Linking, Platform, ScrollView, View } from 'react-native';
import ProgressBar from "@/components/auth/signup/ProgressBar";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { API_ROUTES } from '@/constants/ApiRoutes';
import axios, { AxiosError } from 'axios';
import PersonalInformationStep from '@/components/auth/signup/Steps/PersonalInformation';
import ContactInformationStep from '@/components/auth/signup/Steps/ContactInformation';
import PasswordInformationStep from '@/components/auth/signup/Steps/PasswordInformation';
import { useSession } from '@/contexts/SessionContext';
import { useApi } from '@/contexts/ApiContext';
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from '@/components/CustomText';
import CustomTouchableOpacity from '@/components/CustomTouchableOpacity';
import InstructionsStep from '@/components/auth/signup/Steps/IntructionsStep';
import AddressInformationStep from '@/components/auth/signup/Steps/AddressInformation';
import { Colors } from '@/constants/Colors';
import { useTranslation } from "react-i18next";
import i18n from "@/translation";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import { useMixpanel } from '@/contexts/MixpanelContext';

type SignUpData = {
    name: string;
    nif: string;
    email: string;
    date_birthday: Date;
    password: string;
    password_confirmation: string;
    phone_number: string;
    gender_id: number;
    address_name: string;
    street_name: string;
    street_number: string;
    postal_code: string;
    city: string;
    state: string;
    country: string;
};

enum SignUpSteps {
    // 'instructions' = 0,
    'personalInformation' = 1,
    // 'contactInformation' = 2,
    // 'addressInformation' = 3,
    'password' = 2,
}

const SignUp = () => {
    const { t } = useTranslation();
    const { api } = useApi();
    const { openDialog } = useDialog();
    const { track } = useMixpanel();
    const [step, setStep] = useState<SignUpSteps>(SignUpSteps.personalInformation);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
    const [isVerifyingAddress, setIsVerifyingAddress] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [signUpError, setSignUpError] = useState<string | null>(null);
    const [availableGenders, setAvailableGenders] = useState<[]>([]);
    const [address, setAddress] = useState(null);
    const { setSession } = useSession();
    const maxStep = Object.keys(SignUpSteps).length / 2;

    const { control, handleSubmit, setValue, formState: { errors, isLoading, isValid }, setError } = useForm<SignUpData>({
        mode: 'onChange',
        defaultValues: {
            name: '',
            // nif: '',
            email: '',
            password: '',
            password_confirmation: '',
            phone_number: '+351',
            // date_birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 18)),
            // address_name: "",
            // street_name: "",
            // street_number: "",
            // postal_code: "",
            // city: "",
            // state: "",
            // country: "Portugal",
        }
    });

    // useEffect(() => {
    //     getAvailableGenders();

    //     // const onBackPress = () => {
    //     //     if (step >= 2) {
    //     //         setStep(step - 1);
    //     //     }
    //     //     return true;
    //     // };

    //     // BackHandler.addEventListener("hardwareBackPress", onBackPress);

    //     // return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    // }, []);

    // const getAvailableGenders = () => {
    //     api.get(API_ROUTES.COMMON_GET_GENDERS, {
    //         headers: {
    //             'Accept-Language': i18n.language === 'pt_PT' ? 'pt-pt' : 'en',
    //         }
    //     })
    //         .then(response => {
    //             setAvailableGenders(response.data.data.genders);
    //         })
    //         .catch(error => {
    //             openDialog({
    //                 icon: <XIcon color={Colors.secondary} />,
    //                 title: t('errors.title'),
    //                 subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
    //                 closeAfterMSeconds: 2000,
    //                 closeOnClickOutside: true,
    //             })
    //         });
    // };

    const signUp = async (data: SignUpData) => {
        setIsSigningUp(true);
        if (signUpError) setSignUpError(null);
        try {
            const response = await api.post(API_ROUTES.AUTH_REGISTER, {
                ...data,
                // address,
                // date_birthday: data.date_birthday.toISOString().split('T')[0],
                phone_number: data.phone_number.replace('+351', '+351-'),
                language: i18n.language === 'pt_PT' ? 'pt-pt' : 'en',
                // gender_id: data.gender_id !== undefined && data.gender_id !== null ? String(data.gender_id) : ''
            }, {
                headers: {
                    'Accept-Language': i18n.language === 'pt_PT' ? 'pt-pt' : 'en',
                }
            });

            const responseStatus = response?.status;

            if (responseStatus === 200) {
                const { access_token } = response?.data.data;

                if (access_token) {
                    setSession(access_token);
                    track('sign_up_completed', { sign_up_method: 'email', platform: Platform.OS });
                }
            }
        } catch(error) {
            if (axios.isAxiosError(error)) {
                // console.log(error.response?.data)
                if (error.response?.status === 500) {
                    setSignUpError(t('errors.server_error'));
                } else if (error.response?.data.message === "Address is invalid") {
                    // setError('street_name', {
                    //     type: 'manual',
                    //     message: t('errors.address_invalid')
                    // });
                    // setStep(SignUpSteps.addressInformation);
                } else {
                    handleFinalErrorAndGoToStep(error);
                }
            }
        }
        setIsSigningUp(false);
    };

    const handleFinalErrorAndGoToStep = (error: AxiosError<any, any>) => {
        if (error.response?.status === 422) {
            Object.keys(error.response.data.errors).forEach((key: any) => {
                setError(key, {
                    type: 'manual',
                    message: error?.response?.data.errors[key][0]
                });
                // console.log({key});
                switch (key) {
                    case 'name':
                    case 'email':
                    case 'phone_number':
                        setStep(SignUpSteps.personalInformation);
                        break
                    // case 'nif':
                    //     setStep(SignUpSteps.contactInformation);
                    //     break
                    // case 'address':
                    //     setStep(SignUpSteps.addressInformation);
                    //     break
                    case 'password':
                        setStep(SignUpSteps.password);
                        break
                    default:
                        break;
                }
            });
        } else if (error.response?.status === 500) {
            setSignUpError(t('errors.server_error'));
        } else {
            setSignUpError(t('errors.occurred_an_error'));
        }
    }

    const verifyUserData = async (email: string, phone_number: string) => {
        try {
            const response = await axios.post(API_ROUTES.AUTH_VERIFY_USER_DATA, {
                email,
                // nif,
                phone_number: phone_number.replace('+351', '+351-'),
            }, {
                headers: {
                    'Accept-Language': i18n.language === 'pt_PT' ? 'pt-pt' : 'en',
                }
            });

            const { can_use } = response?.data.data;

            return can_use;
        } catch (err) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 500) {
                    setError('email', {
                        type: 'manual',
                        message: t('errors.server_error')
                    });
                } else if (err.response?.status === 422) {
                    handleFinalErrorAndGoToStep(err);
                }
            }
            return false;
        }
    }

    // const verifyAddress = async (data: SignUpData) => {
    //     const { address_name, street_name, street_number, postal_code, city, state, country } = data;

    //     const handleAddressError = (message?: string) => {
    //         setError('street_name', {
    //             type: 'manual',
    //             message: message || t('errors.address_invalid')
    //         }, {
    //             shouldFocus: true
    //         });
    //     }

    //     return api.put(API_ROUTES.CUSTOMER_CHANGE_ADDRESS, {
    //         address_name,
    //         street_name,
    //         street_number,
    //         postal_code,
    //         city,
    //         state,
    //         country
    //     })
    //         .then(response => {
    //             const addressData = response.data.data.address;
    //             // console.log(addressData)
    //             // const requiredFields = ['street_name', 'street_number', 'postal_code', 'city', 'state', 'country'];
    //             // const isValid = requiredFields.every(field => addressData[field]);
    //             // if (!isValid) {
    //             //     handleAddressError();
    //             //     return false;
    //             // }
    //             setAddress({
    //                 ...addressData,
    //                 address_name
    //             });
    //             return true;
    //         })
    //         .catch(err => {
    //             // console.log(err.response)
    //             handleAddressError(err?.response?.data?.message);
    //             return false;
    //         });
    // }

    const handleNextStep = async (data: SignUpData) => {
        // console.log('next step was called')
        Object.keys(data).forEach(key => setValue(key as keyof SignUpData, data[key as keyof SignUpData]));

        const nextStep = step + 1;
        if (step === SignUpSteps.personalInformation && data.email) {
            setIsVerifyingEmail(true);
            const validEmail = await verifyUserData(
                data.email,
                // data.nif,
                data.phone_number
            );
            setIsVerifyingEmail(false);
            if (!validEmail) return;
        } 
        // else if (step === SignUpSteps.addressInformation) {
        //     setIsVerifyingAddress(true);
        //     const validAddress = await verifyAddress(data);
        //     setIsVerifyingAddress(false);
        //     if (!validAddress) return;
        // }

        if (step === maxStep) {
            signUp(data);
        } else {
            setStep(nextStep);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-support_secondary">
            {/* <StatusBar backgroundColor={Colors.support_secondary} /> */}
            <BackHeader
                backButtonColor="secondary"
                middleItem={() => (
                    <CustomText
                        size="medium"
                        color="secondary"
                        boldness="medium"
                    >
                        {t('auth.sign_up.header')}
                    </CustomText>
                )}
                otherClasses="p-5"
                onBack={() => {
                    if (step === SignUpSteps.personalInformation) {
                        router.canGoBack() && router.back();
                    } else {
                        setStep(step - 1);
                    }
                }}
            />

            {/* {step !== SignUpSteps.instructions && ( */}
                <ProgressBar percentage={(step / maxStep) * 100} />
            {/* )} */}

            <View className="flex-1 p-5">
                {/* {step === SignUpSteps.instructions ? <InstructionsStep /> : ( */}
                    <KeyboardAwareScrollView bottomOffset={20}>
                        <View className="flex-1 ">
                            {step === SignUpSteps.personalInformation && <PersonalInformationStep control={control} errors={errors} availableGenders={availableGenders} />}
                            {/* {step === SignUpSteps.contactInformation && <ContactInformationStep control={control} errors={errors} />} */}
                            {/* {step === SignUpSteps.addressInformation && <AddressInformationStep control={control} errors={errors} />} */}
                            {step === SignUpSteps.password && <PasswordInformationStep control={control} errors={errors} />}
                        </View>
                    </KeyboardAwareScrollView>
                {/* )} */}

                <View className="pt-4">
                    {signUpError && (
                        <CustomText
                            size="small"
                            color="error"
                            boldness="medium"
                        >
                            {signUpError}
                        </CustomText>
                    )}
                    {step === maxStep && (
                        <View className="flex-row flex-wrap justify-center items-center mb-4">
                            <CustomText
                                size="small"
                                color="secondary"
                                boldness="medium"
                                className="text-center"
                            >
                                {t('auth.sign_up.advise.agree') + ' '}
                            </CustomText>
                            <CustomTouchableOpacity
                                type="transparent"
                                size="small"
                                text={t('auth.sign_up.advise.terms_of_use')}
                                textColor="secondary"
                                textBoldness="bold"
                                textSize="small"
                                onPress={() => Linking.openURL('https://piquetapp.com/termos-condicoes-de-utilizacao-da-aplicacao/')}
                                className="p-0 m-0 items-start justify-start"
                                accessibilityRole="link"
                                textNumberOfLines={3}
                            />
                            <CustomText
                                size="small"
                                color="secondary"
                                boldness="medium"
                                className="text-center"
                            >
                                {' ' + t('auth.sign_up.advise.and') + ' '}
                            </CustomText>
                            <CustomTouchableOpacity
                                type="transparent"
                                size="small"
                                text={t('auth.sign_up.advise.privacy_policy')}
                                textColor="secondary"
                                textBoldness="bold"
                                textSize="small"
                                onPress={() => Linking.openURL('https://piquetapp.com/politica-de-privacidade-para-utilizadores/')}
                                className="p-0 m-0 items-start justify-start"
                                accessibilityRole="link"
                                textNumberOfLines={3}
                            />
                        </View>
                    )}
                    <CustomTouchableOpacity
                        type="secondary"
                        size="large"
                        text={
                            isVerifyingEmail ? t('auth.sign_up.verifying_email') :
                            isVerifyingAddress ? t('auth.sign_up.verifying_address') :
                            isSigningUp ? t('auth.sign_up.signing_up') :
                            step === maxStep ? t('auth.sign_up.last_step') : t('auth.sign_up.continue_sign_up')
                        }
                        textColor="primary"
                        textBoldness="semiBold"
                        disabled={isLoading || isVerifyingEmail || isSigningUp || isVerifyingAddress}
                        onPress={handleSubmit((data) => handleNextStep(data))}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

export default SignUp;
