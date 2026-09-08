import { Platform } from "react-native";
import Constants from "expo-constants";
import { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";

/**
 * Que motor de mapas usar.
 *
 * No iOS, PROVIDER_GOOGLE exige o SDK do Google Maps configurado com uma chave
 * (ios.config.googleMapsApiKey, vinda de GOOGLE_API_KEY). Sem chave a view
 * rebenta com "AirGoogleMaps dir must be added" e o utilizador fica com um
 * retângulo cinzento — foi o que aconteceu na build de desenvolvimento.
 *
 * Nesse caso vale mais o mapa nativo (Apple Maps), que funciona sempre e sem
 * chave, do que um mapa que não carrega. No Android o Google Maps é o motor do
 * sistema e não tem este problema.
 */
export const hasGoogleMapsIosKey = (): boolean => {
  const key = Constants?.expoConfig?.ios?.config?.googleMapsApiKey;
  return typeof key === "string" && key.trim().length > 0;
};

export const mapProvider = () =>
  Platform.OS === "android" || hasGoogleMapsIosKey() ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
