import {ConfigContext, ExpoConfig} from "@expo/config";
import { withGradleProperties, withProjectBuildGradle } from "@expo/config-plugins";
import packageInfo from "./package.json";

const APP_NAME = "Piquet";
const BUNDLE_IDENTIFIER = "com.piquetapp.customer";
const PACKAGE_NAME = "com.piquetapp.customer";
const ICON = "./assets/images/icon.png";
const SCHEME = "piquet.customer"
const VERSION = packageInfo.version;


export default ({config}: ConfigContext):ExpoConfig => {
    const {name, packageName, ICON, bundleIdentifier, apiEndpoint, apiProtocol, version, scheme} = getDynamicAppConfig(process.env.APP_ENV as "development" | "preview" | "production");
    //@ts-ignore
    let appConfig: ExpoConfig = {
        ...config,
        backgroundColor: "#FABB5B",
        name: name,
        slug: "customer",
        version: version,
        orientation: "portrait",
        icon: ICON,
        scheme: scheme,
        owner: "piquet",
        userInterfaceStyle: "automatic",
        jsEngine: "hermes",
        ios: {
            appleTeamId: "Z7V222283F",
            appStoreUrl:"",
            supportsTablet: false,
            bundleIdentifier: bundleIdentifier,
            config: {
                usesNonExemptEncryption: false,
                googleMapsApiKey: process.env.GOOGLE_API_KEY,
            },
            // splash: {
            //     image: "./assets/images/splash.png",
            //     resizeMode: "cover",
            //     backgroundColor: "#FABB5B"
            // },
            infoPlist: {
                CFBundleAllowMixedLocalizations: true,
                CFBundleLocalizations: ["pt", "en"],
                NSLocationWhenInUseUsageDescription: "This app requires access to your location to provide relevant services in your area.",
            }
        },
        locales: {
            en: "./assets/locales/en.json",
            pt: "./assets/locales/pt.json"
        },
        android: {
            backgroundColor: "#FABB5B",
            softwareKeyboardLayoutMode: "pan",
            package: packageName,
            versionCode:26,
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#FABB5B"
            },
            // splash: {
            //     image: "./assets/images/splash.png",
            //     resizeMode: "cover",
            //     backgroundColor: "#FABB5B"
            // },
            config: {
                googleMaps:{
                    apiKey: process.env.GOOGLE_API_KEY_ANDROID
                }
            },
            googleServicesFile: "./keys/google-services.json",
        },
        plugins: [
            "expo-localization",
            "expo-router",
            [
                "expo-splash-screen", {
                    "splashScreenDelay": 0,
                    "resizeMode": "contain",
                    "backgroundColor": "#FABB5B",
                    // "image": "./assets/images/splash-icon.png",
                    "image": "./assets/images/vector.png"
                }
            ],
            "expo-font",
            "expo-notifications",
            [
                "expo-build-properties",
                {
                    "android": {
                        "targetSdkVersion": 35,
                        "compileSdkVersion": 35
                    }
                }
            ],
            [
                "expo-secure-store",
                {
                    "faceIDPermission": "Allow $(PRODUCT_NAME) to access your Face ID biometric data."
                }
            ]/*,
            [
                "@sentry/react-native/expo",
                {
                  "url": "https://sentry.io/",
                  "project": "piquet-customer",
                  "organization": "testiong"
                }
            ]*/
        ],
        experiments: {
            "typedRoutes": true
        },
        extra: {
            API_URL: apiEndpoint,
            API_PROTOCOL: apiProtocol,
            APP_ENV: process.env.APP_ENV ?? 'development',
            "eas": {
                "projectId": "b9638ab3-4970-4bae-bdef-291360f41425"
            }
        },
    };

    appConfig = withProjectBuildGradle(appConfig, (config) => {
        config.modResults.contents = config.modResults.contents.replace(
            /ndkVersion = "[^"]+"/g,
            'ndkVersion = "27.1.12297006"'
        );
        return config;
    });

    appConfig = withGradleProperties(appConfig, (config) => {
        config.modResults = config.modResults.filter(
            (item) => !(item.type === "property" && item.key === "android.experimental.enableJni16k")
        );
        config.modResults.push({
            type: "property",
            key: "android.experimental.enableJni16k",
            value: "true",
        });
        return config;
    });

    return appConfig;
}

const getDynamicAppConfig = (environment: "development" | "preview" | "staging" | "production") => {
    if (environment === "production") {
        return {
            name: APP_NAME,
            bundleIdentifier: BUNDLE_IDENTIFIER,
            packageName: PACKAGE_NAME,
            ICON: ICON,
            scheme: SCHEME,
            version: VERSION,
            apiEndpoint: "app.piquetapp.com",
            apiProtocol: "https://",

        }
    }
    if (environment === "staging") {
        return {
            name: APP_NAME,
            bundleIdentifier: BUNDLE_IDENTIFIER+".staging",
            packageName: PACKAGE_NAME+".staging",
            ICON: ICON,
            scheme: SCHEME,
            version: VERSION,
            apiEndpoint: "piquet-stg.rwinteractive.net",
            apiProtocol: "https://",

        }
    }

    if (environment === "preview"){
        return {
            name: APP_NAME+" Preview",
            bundleIdentifier: BUNDLE_IDENTIFIER+".preview",
            packageName: PACKAGE_NAME+".preview",
            ICON: ICON,
            scheme: SCHEME,
            version: VERSION,
            apiEndpoint: "piquet.rwinteractive.net",
            apiProtocol: "https://",
        }
    }


    return {
        name: APP_NAME+" Development",
        bundleIdentifier: BUNDLE_IDENTIFIER+".development",
        packageName: PACKAGE_NAME+".development",
        ICON: ICON,
        scheme: SCHEME,
        version: VERSION,
        apiEndpoint: process.env.EXPO_PUBLIC_DEV_API_DOMAIN,
        apiProtocol: process.env.EXPO_PUBLIC_DEV_API_PROTOCOL,
    }
}

