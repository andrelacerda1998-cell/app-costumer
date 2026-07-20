import {ApiProvider} from '@/contexts/ApiContext';
import {SessionProvider} from '@/contexts/SessionContext';
import {GuestSessionProvider} from '@/contexts/GuestSessionContext';
import {MixpanelProvider, useMixpanel} from '@/contexts/MixpanelContext';
import ConsentBanner from '@/components/ConsentBanner';
import {Slot} from 'expo-router';
import {useFonts} from 'expo-font';
import {
    Poppins_100Thin,
    Poppins_100Thin_Italic,
    Poppins_200ExtraLight,
    Poppins_200ExtraLight_Italic,
    Poppins_300Light,
    Poppins_300Light_Italic,
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
    Poppins_600SemiBold,
    Poppins_600SemiBold_Italic,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
    Poppins_800ExtraBold,
    Poppins_800ExtraBold_Italic,
    Poppins_900Black,
    Poppins_900Black_Italic,
} from '@expo-google-fonts/poppins';
import React, {useCallback, useEffect, useState, useRef} from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StatusBar} from 'expo-status-bar';
import {ServiceProvider} from "@/contexts/ServiceContext";
import {DialogProvider, useDialog} from "@/contexts/DialogContext";
import {ClickOutsideProvider} from "react-native-click-outside";
import Dialog from "@/components/Dialog";
import {ActionSheetProvider} from "@expo/react-native-action-sheet";
import NotificationsProvider from "@/contexts/NotificationsContext";
import {CampaignProvider} from "@/contexts/CampaignContext";
import {NativeModules, Platform, Text, View, Image, ImageBackground, Animated, StyleSheet } from "react-native";
import {WalletProvider} from "@/contexts/WalletContext";
import '@/translation';
import AppStateStatusProvider from "@/contexts/AppStateStatusContext";
import {API_ROUTES} from "@/constants/ApiRoutes";
import axios from "axios";
import {Colors} from "@/constants/Colors";
import {useTranslation} from "react-i18next";
import {SafeAreaView} from "react-native-safe-area-context";
import {CustomText} from "@/components/CustomText";
import XIcon from "@/assets/icons/x";
import packageInfo from '@/package.json';
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import {Linking} from 'react-native';
import {PACKAGE_NAME, APP_STORE_URL} from "@/constants/AppInfo";
import {isVersionOutdated} from "@/utils";
// import * as Sentry from '@sentry/react-native';
import i18n from "@/translation";
import {KeyboardProvider} from "react-native-keyboard-controller";
import {ScheduleProvider} from "@/contexts/ScheduleContext";
import { Dimensions } from 'react-native';
import ConsentBannerWrapper from "@/components/ConsentBannerWrapper";
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/*Sentry.init({
    dsn: 'https://ff8ad4ab6526a440a522b1a4890158ed@o4508772901126144.ingest.us.sentry.io/4509281896628224',

    // Adds more context data to events (IP address, cookies, user, etc.)
    // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
    sendDefaultPii: true,

    // Configure Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration()],

    environment: __DEV__ ? 'development' : 'production',

    enabled: __DEV__,

    // uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: __DEV__,
});*/

// Keep the splash screen visible while fonts are loading
SplashScreen.preventAutoHideAsync();

export default function Root() {
    const {t} = useTranslation();
    const [needsUpdate, setNeedsUpdate] = useState(false);
    const translateX = useRef(new Animated.Value(0)).current;

    const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
    const splashHidden = useRef(false);

    const [fontsLoaded] = useFonts({
        Poppins_100Thin,
        Poppins_100Thin_Italic,
        Poppins_200ExtraLight,
        Poppins_200ExtraLight_Italic,
        Poppins_300Light,
        Poppins_300Light_Italic,
        Poppins_400Regular,
        Poppins_400Regular_Italic,
        Poppins_500Medium,
        Poppins_500Medium_Italic,
        Poppins_600SemiBold,
        Poppins_600SemiBold_Italic,
        Poppins_700Bold,
        Poppins_700Bold_Italic,
        Poppins_800ExtraBold,
        Poppins_800ExtraBold_Italic,
        Poppins_900Black,
        Poppins_900Black_Italic,
    });


    const onLayoutAnimatedSplash = useCallback(async () => {
        if (fontsLoaded && !splashHidden.current) {
            splashHidden.current = true;

            await SplashScreen.hideAsync();

            setTimeout(() => {
            setShowAnimatedSplash(false);
            }, 3650);

        }
    }, [fontsLoaded]);

    // const onLayoutRootView = useCallback(async () => {
    //     if (fontsLoaded) {
    //         await SplashScreen.hideAsync();
    //     }
    // }, [fontsLoaded]);



    // useEffect(() => {
    //     onLayoutRootView();
    // }, [fontsLoaded]);



    // useEffect(() => {
    // if (fontsLoaded && showAnimatedSplash) {

    //     SplashScreen.hideAsync().finally(() => {

    //     setTimeout(() => {
    //         setShowAnimatedSplash(false);
    //     }, 1500);
    //     });
    // }
    // }, [fontsLoaded, showAnimatedSplash]);




    useEffect(() => {
    if (!showAnimatedSplash) return;

    const animation = Animated.loop(
        Animated.sequence([
        Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 15000,
            useNativeDriver: true,
        }),
        Animated.timing(translateX, {
            toValue: 0, // reset
            duration: 0,
            useNativeDriver: true,
        }),
        ])
    );

    animation.start();

    return () => animation.stop();
    }, [showAnimatedSplash]);




    useEffect(() => {
            getUpdate();
    }, [])




    const getUpdate = async () => {
        try {
            const res = await axios.get(API_ROUTES.COMMON_APP_VERSION);
            // @ts-ignore
            const min = res?.data?.data?.['customer']?.[Platform.OS];
            setNeedsUpdate(!!min && isVersionOutdated(packageInfo.version, min));
        } catch (error) {
            // fail-open: não conseguir verificar a versão não bloqueia o utilizador
            setNeedsUpdate(false);
        }
    };

    if (!fontsLoaded) {
        return <SafeAreaView style={{flex: 1, backgroundColor: Colors.primary}}></SafeAreaView>;
    }

    if (needsUpdate) {
        return (
            <SafeAreaView style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: Colors.primary,
                padding: 20
            }}>
                <StatusBar backgroundColor="transparent" animated/>
                <View className="flex-1 items-center justify-center">
                    <View className="w-16 h-16 p-4 rounded-full bg-secondary mb-4">
                        <XIcon color={Colors.primary}/>
                    </View>
                    <CustomText
                        color="secondary"
                        size="large"
                        boldness="semiBold"
                        className="text-center"
                    >
                        {t('errors.need_update.title')}
                    </CustomText>
                    <CustomText
                        color="secondary"
                        size="medium"
                        className="text-center"
                    >
                        {t('errors.need_update.subtitle')}
                    </CustomText>
                </View>
                <View className="w-full">
                    <CustomTouchableOpacity
                        size="large"
                        type="secondary"
                        textColor="primary"
                        textBoldness="semiBold"
                        text={t('errors.need_update.button')}
                        onPress={() => {
                            const storeUrl =
                                Platform.OS === 'ios'
                                    ? APP_STORE_URL
                                    : `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
                            if (storeUrl) Linking.openURL(storeUrl);
                        }}
                    />
                </View>
            </SafeAreaView>
        );
    }

   if (showAnimatedSplash) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FABB5B' }}>
                <StatusBar
                    style="dark"
                    backgroundColor="#FABB5B"
                    translucent={false}
                />

                <View
                    onLayout={onLayoutAnimatedSplash}
                    style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    }}
                >
                    <Animated.Image
                    source={require('../assets/images/vector.png')}
                    resizeMode="stretch"
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                        width: SCREEN_WIDTH * 2,
                        transform: [{ translateX }],
                        },
                    ]}
                    />

                    <Image
                    source={require('../assets/images/piquet-animated-logo.gif')}
                    style={{ width: 220, height: 220 }}
                    resizeMode="contain"
                    />

                    <Text
                    style={{
                        position: 'absolute',
                        bottom: 30,
                        color: '#000',
                        fontSize: 14,
                        fontWeight: '600',
                        letterSpacing: 1,
                        fontFamily: 'Poppins_600SemiBold',
                    }}
                    >
                    Made in Portugal
                    </Text>
                </View>
            </View>
        );
    }


    // if (!fontsLoaded) {
    //     return <View style={{ flex: 1, backgroundColor: '#FABB5B' }} />;
    // }


    // Set up the auth context and render our layout inside of it.
    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <StatusBar backgroundColor="transparent" style="dark" animated/>
            <KeyboardProvider>
                <AppStateStatusProvider>
                    <ActionSheetProvider>
                        <ClickOutsideProvider>
                            <DialogProvider>
                                <SessionProvider>
                                    <GuestSessionProvider>
                                        <ApiProvider>
                                            <MixpanelProvider>
                                                <ServiceProvider>
                                                    <CampaignProvider>
                                                        <NotificationsProvider>
                                                            <WalletProvider>
                                                                <ScheduleProvider>
                                                                    <Dialog/>
                                                                    <Slot/>
                                                                    <ConsentBannerWrapper/>
                                                                </ScheduleProvider>
                                                            </WalletProvider>
                                                        </NotificationsProvider>
                                                    </CampaignProvider>
                                                </ServiceProvider>
                                            </MixpanelProvider>
                                        </ApiProvider>
                                    </GuestSessionProvider>
                                </SessionProvider>
                            </DialogProvider>
                        </ClickOutsideProvider>
                    </ActionSheetProvider>
                </AppStateStatusProvider>
            </KeyboardProvider>
        </GestureHandlerRootView>
    );
};
