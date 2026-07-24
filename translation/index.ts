import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as resources from './resources';
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

const locales = Localization.getLocales();
const code = locales[0]?.languageCode ?? 'pt';

// Preferência de idioma escolhida pelo utilizador (persiste entre arranques).
export const LANGUAGE_KEY = "piquet_language_v1";
export const SUPPORTED_LANGUAGES = ["pt_PT", "en_US"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const isSupported = (v: unknown): v is AppLanguage =>
    v === "pt_PT" || v === "en_US";

i18n
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v4',
        resources: {
            ...Object.entries(resources).reduce((acc, [key, value]) => {
                return {
                    ...acc,
                    [key]: {
                        translation: value,
                    },
                };
            }, {}),
        },
        lng: code === 'pt' ? 'pt_PT' : 'en_US',
        fallbackLng: 'pt_PT',
        interpolation: {
            escapeValue: false,
        },
    })
    // Só depois do init resolver aplicamos a escolha guardada, para não haver
    // corrida entre o idioma do dispositivo (init) e a preferência do utilizador.
    .then(() => AsyncStorage.getItem(LANGUAGE_KEY))
    .then((saved) => {
        if (isSupported(saved) && saved !== i18n.language) {
            return i18n.changeLanguage(saved);
        }
    })
    .catch(() => {});

export async function setAppLanguage(lng: AppLanguage) {
    await i18n.changeLanguage(lng);
    AsyncStorage.setItem(LANGUAGE_KEY, lng).catch(() => {});
}

// Preferência manual guardada (ou null quando o utilizador ainda não escolheu).
// Tem prioridade sobre o locale do dispositivo em toda a app.
export async function getSavedLanguage(): Promise<AppLanguage | null> {
    try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        return isSupported(saved) ? saved : null;
    } catch {
        return null;
    }
}

export default i18n;
