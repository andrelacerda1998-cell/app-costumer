import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

/**
 * O código de convite que chegou com o link do amigo (/c/{codigo}).
 *
 * Fica guardado até ser usado: o checkout preenche-o e valida-o sozinho, e a
 * Carteira mostra-o no "Tenho um código". Chega por dois caminhos:
 *  - Android: o Google Play entrega à app, no primeiro arranque, o `referrer`
 *    do link da loja (`piquet_convite=CODIGO`). Lê-se uma vez.
 *  - Link "Já tenho a app" (piquet.customer://convite/CODIGO), nas duas
 *    plataformas: a rota app/convite/[code] guarda-o.
 * No iPhone, sem a app instalada, a App Store não passa nada: a página do link
 * copia o código, e cola-se no campo do código.
 */
const PENDENTE = "piquet_convite_pendente";
const REFERRER_LIDO = "piquet_convite_referrer_lido";

const normalizar = (codigo: string) => codigo.replace(/\s+/g, "").toUpperCase();

export const guardarCodigoPendente = async (codigo: string) => {
  const c = normalizar(codigo);
  if (!/^[A-Z0-9]{4,12}$/.test(c)) return;
  await AsyncStorage.setItem(PENDENTE, c).catch(() => {});
};

export const lerCodigoPendente = async (): Promise<string | null> =>
  AsyncStorage.getItem(PENDENTE).catch(() => null);

export const limparCodigoPendente = async () => {
  await AsyncStorage.removeItem(PENDENTE).catch(() => {});
};

/** Android: lê o referrer da instalação uma única vez. Silencioso se falhar. */
export const capturarCodigoDaInstalacao = async () => {
  if (Platform.OS !== "android") return;
  try {
    if (await AsyncStorage.getItem(REFERRER_LIDO)) return;
    await AsyncStorage.setItem(REFERRER_LIDO, "1");

    const referrer = await Application.getInstallReferrerAsync();
    // "piquet_convite=ANA3RU&utm_source=convite&utm_medium=link"
    const codigo = new URLSearchParams(referrer || "").get("piquet_convite");
    if (codigo) await guardarCodigoPendente(codigo);
  } catch {
    // Sem Play Services ou instalado fora da loja: não há referrer, segue.
  }
};
