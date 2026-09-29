import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as resources from './resources';
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

const locales = Localization.getLocales();
const code = locales[0]?.languageCode ?? 'pt';

// Preferência de idioma escolhida pelo utilizador (persiste entre arranques).
export const LANGUAGE_KEY = "piquet_language_v1";
export const SUPPORTED_LANGUAGES = ["pt_PT", "en_US", "fr_FR", "es_ES"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const isSupported = (v: unknown): v is AppLanguage =>
    typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);

/**
 * Idioma da app -> a etiqueta que o servidor entende.
 *
 * O servidor fala em BCP-47 curto (`pt-pt`, `en`, `fr`, `es`) e o
 * `Locale::normalize()` dele so aceita o que estiver em `config('app.locales')`.
 *
 * Isto vive AQUI e nao em cada sitio que precise dele. Antes havia duas
 * conversoes: o `Accept-Language` do ApiContext era um ternario
 * `pt_PT ? 'pt-PT' : 'en-US'` -- ou seja, frances e espanhol pediam INGLES ao
 * servidor --, e o SessionContext tinha o seu proprio mapa, correto, para
 * gravar o idioma na conta. A app aparecia em frances com o catalogo em
 * ingles, e ninguem via erro nenhum.
 */
/**
 * Os quatro idiomas, com o nome escrito na PRÓPRIA língua.
 *
 * "Français" e não "Francês": quem tem a app num idioma que não percebe não
 * reconhece o nome do seu próprio idioma traduzido para outro. O código curto
 * serve de apoio, não de rótulo principal.
 *
 * Vive aqui e não no ecrã das Definições porque o ecrã de escolha do idioma
 * precisa exactamente da mesma lista — e duas listas seriam duas verdades.
 */
export const IDIOMAS: ReadonlyArray<{
    code: AppLanguage;
    label: string;
    name: string;
    flag: string;
}> = [
    { code: "pt_PT", label: "PT", name: "Português", flag: "🇵🇹" },
    // 🇬🇧 e nao 🇺🇸, apesar de o codigo dizer `en_US`: o texto da app esta
    // escrito em ingles BRITANICO ("favourite", "tap", "cupboard"), e o
    // catalogo tambem ("FIXTURES & FITTINGS", "Build decking"). Uma bandeira
    // americana por cima de texto britanico e uma contradicao pequena mas
    // visivel, e quem a notar deixa de confiar no resto.
    { code: "en_US", label: "EN", name: "English", flag: "🇬🇧" },
    { code: "fr_FR", label: "FR", name: "Français", flag: "🇫🇷" },
    { code: "es_ES", label: "ES", name: "Español", flag: "🇪🇸" },
];

export const ETIQUETA_DO_SERVIDOR: Record<AppLanguage, string> = {
    pt_PT: "pt-pt",
    en_US: "en",
    fr_FR: "fr",
    es_ES: "es",
};

/** A etiqueta do servidor para o idioma activo, com recurso ao portugues. */
export const etiquetaDoServidor = (lng?: string): string =>
    ETIQUETA_DO_SERVIDOR[(lng ?? "") as AppLanguage] ?? "pt-pt";

/**
 * Idioma do telemóvel -> idioma da app.
 *
 * O inglês é o destino de quem não fala nenhum dos outros três: é a língua
 * franca, e mandar um alemão para português só porque a app é portuguesa era
 * deixá-lo sem perceber nada. A Piquet opera em Portugal, mas quem a usa nem
 * sempre é português.
 */
const POR_IDIOMA: Record<string, AppLanguage> = {
    pt: "pt_PT",
    fr: "fr_FR",
    es: "es_ES",
    ca: "es_ES", // catalão: mais perto do espanhol do que do inglês
    gl: "es_ES", // galego, idem
    en: "en_US",
};

export const idiomaDoDispositivo = (): AppLanguage =>
    POR_IDIOMA[(Localization.getLocales()[0]?.languageCode ?? "").toLowerCase()] ?? "en_US";

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
        lng: POR_IDIOMA[code.toLowerCase()] ?? 'en_US',
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
