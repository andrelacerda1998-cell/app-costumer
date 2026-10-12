import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useApi } from "@/contexts/ApiContext";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { API_ROUTES } from "@/constants/ApiRoutes";

const COOLDOWN_SECONDS = 30;

/** Já em E.164 fica como está; só dígitos, assume-se Portugal. */
export const formatPhone = (raw: string) => {
  if (raw.trim().startsWith("+")) return `+${raw.replace(/\D/g, "")}`;
  return `+351${raw.replace(/\D/g, "")}`;
};

/**
 * Convidado -> conta, por SMS, no momento em que carrega em "Pedir".
 *
 * Isto vivia só no checkout, e por isso um cliente novo nunca entrava no
 * matching (que precisa de sessão): caía no fluxo antigo, escolhia um técnico
 * que ninguém tinha perguntado, cativava o dinheiro e só depois sabia se ele
 * aceitava. Com a conta criada aqui, o primeiro pedido é igual a todos os
 * outros.
 *
 * O servidor guarda a morada de convidado como morada principal da conta
 * (GuestRegisterController), por isso o pedido sai já com ela.
 *
 * Mesma lógica do checkout (enviar, validar, registar), com o mesmo modal.
 */
export function useGuestPhoneLogin() {
  const { t } = useTranslation();
  const { api } = useApi();
  const { setSession } = useSession();
  const { guestSession, setGuestPhone: saveGuestPhone } = useGuestSession();
  const { track } = useMixpanel();

  const [phone, setPhone] = useState<string>(guestSession?.guest_phone ?? "");
  const [step, setStep] = useState<"number" | "code">("number");
  const [mockCode, setMockCode] = useState<string | undefined>(undefined);
  const [remaining, setRemaining] = useState(0);
  const sentAt = useRef<number | null>(null);
  const sending = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startTimer = () => {
    setRemaining(COOLDOWN_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const sendCode = useCallback(async (phoneOverride?: string): Promise<boolean> => {
    if (sending.current) return false;
    const source = phoneOverride ?? phone;
    if (phoneOverride) setPhone(phoneOverride);
    const formatted = formatPhone(source);

    if (!source || formatted.length < 13) {
      Alert.alert(t("errors.title"), t("general.phone_number_invalid"));
      return false;
    }

    sending.current = true;
    track("phone_entered", { source: "request" });
    try {
      const res = await api.post(API_ROUTES.GUEST_SEND_OTP, { phone_number: formatted });
      track("sms_sent", { source: "request" });
      sentAt.current = Date.now();
      setStep("code");
      startTimer();
      const mock = res?.data?.data?.mock_code;
      if (mock) setMockCode(mock);
      return true;
    } catch (error: any) {
      Alert.alert(t("errors.title"), error?.response?.data?.message || t("errors.otp_send_failed"));
      return false;
    } finally {
      sending.current = false;
    }
  }, [api, phone, t, track]);

  const validate = useCallback(async (code: string): Promise<boolean> => {
    const formatted = formatPhone(phone);
    const morada: any = guestSession?.guest_address ?? {};
    try {
      const verify = await api.post(API_ROUTES.GUEST_VERIFY_OTP, { phone_number: formatted, code });
      const register = await api.post(API_ROUTES.GUEST_REGISTER, {
        phone_number: formatted,
        verification_token: verify.data.data.verification_token,
        address: {
          latitude: morada.latitude,
          longitude: morada.longitude,
          street_name: morada.street_name,
          street_number: morada.street_number,
          additional_info: morada.additional_info,
          postal_code: morada.postal_code,
          city: morada.city,
          state: morada.state,
          country: morada.country,
        },
      });
      setSession(register.data.data.access_token);
      saveGuestPhone(formatted);
      track("sms_verified", {
        source: "request",
        time_to_verify_seconds: sentAt.current ? Math.round((Date.now() - sentAt.current) / 1000) : undefined,
      });
      if (timer.current) clearInterval(timer.current);
      return true;
    } catch (error: any) {
      const status = error?.response?.status;
      // Código errado: quem o diz é o modal, inline. Rede ou 500: só o alerta.
      if (typeof status === "number" && status >= 400 && status < 500) return false;
      Alert.alert(t("errors.title"), error?.response?.data?.message || t("errors.otp_verify_failed"));
      return false;
    }
  }, [api, guestSession?.guest_address, phone, saveGuestPhone, setSession, t, track]);

  return { phone, step, setStep, mockCode, remaining, sendCode, validate };
}

export default useGuestPhoneLogin;
