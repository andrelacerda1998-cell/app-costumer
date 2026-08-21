import { Platform } from "react-native";

/**
 * Costura para a presença no ecrã bloqueado enquanto o serviço decorre:
 *  - iOS 16.2+: Live Activity (ActivityKit).
 *  - Android: notificação persistente com cronómetro regressivo.
 *
 * Um único módulo nativo por plataforma, com a MESMA interface. Resolve-se de
 * forma OPCIONAL: em Expo Go ou num build sem o módulo, cai em no-ops. Assim a
 * lógica de negócio (ligar quando o técnico chega) não sabe de plataformas.
 */

type StartArgs = {
  technicianName: string;
  serviceType: string;
  /** Instante estimado de fim, em epoch ms. A Live Activity conta sozinha até lá. */
  endAtMs: number;
};

let native: any = null;
try {
  // requireOptionalNativeModule não rebenta quando o módulo não está presente.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requireOptionalNativeModule } = require("expo-modules-core");
  native = requireOptionalNativeModule?.("LiveActivity") ?? null;
} catch {
  native = null;
}

/**
 * Suportado quando o módulo nativo está presente e reporta que sim. A decisão de
 * versão (iOS 16.2+, Android 8+/permissão de notificações) vive no nativo, que é
 * quem a sabe — não se repete aqui.
 */
export const isLiveActivitySupported = (): boolean =>
  (Platform.OS === "ios" || Platform.OS === "android") &&
  !!native &&
  native.isSupported?.() === true;

export const startServiceActivity = (args: StartArgs): void => {
  if (!isLiveActivitySupported()) return;
  try {
    native.start(args.technicianName, args.serviceType, Math.round(args.endAtMs));
  } catch {
    // Uma Live Activity que não arranca não pode partir o serviço a decorrer.
  }
};

export const updateServiceActivity = (endAtMs: number): void => {
  if (!isLiveActivitySupported()) return;
  try {
    native.update(Math.round(endAtMs));
  } catch {}
};

export const endServiceActivity = (): void => {
  if (!isLiveActivitySupported()) return;
  try {
    native.end();
  } catch {}
};
