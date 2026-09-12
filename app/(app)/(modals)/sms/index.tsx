import React from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/contexts/SessionContext";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import PhoneVerifyModal from "@/components/PhoneVerifyModal";

/**
 * "Verificação de Telefone" a partir do Perfil.
 *
 * Era um ecrã próprio, com outro visual e a tratar por "você". Passa a ser o
 * mesmo ecrã de confirmar o telemóvel do checkout (PhoneVerifyModal), em
 * modo conta: o número vem do perfil e não se edita aqui — "Alterar" leva ao
 * perfil —, e os endpoints são os de utilizador autenticado.
 */
const SmsValidation = () => {
  const { userData, setUserData } = useSession();
  const { api } = useApi();

  const close = () => {
    if (router.canGoBack()) return router.back();
    router.push("/(app)/(tabs)/home");
  };

  const goToEditProfile = () => {
    close();
    router.push("/(app)/(tabs)/profile");
    router.push("/(app)/(modals)/(profile)/edit-profile");
  };

  const sendCode = async (): Promise<boolean> => {
    try {
      await api.get(API_ROUTES.GET_SMS_VALIDATION);
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      // 403 = já verificado; 400 = código ainda válido a caminho. Em ambos, avança.
      if (status === 403) {
        setUserData({ ...userData, phone_number_verified_at: new Date().toISOString() });
        close();
        return false;
      }
      return status === 400;
    }
  };

  const verify = async (code: string): Promise<boolean> => {
    try {
      const res = await api.post(API_ROUTES.POST_SMS_VALIDATION, { code });
      const verifiedAt = res?.data?.data?.verified_at;
      if (verifiedAt) setUserData({ ...userData, phone_number_verified_at: verifiedAt });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <View className="flex-1 bg-primary">
      <PhoneVerifyModal
        visible
        onClose={close}
        initialStep="number"
        phoneNumber={userData?.phone_number}
        numberEditable={false}
        onChangeNumber={goToEditProfile}
        onSendCode={sendCode}
        onValidate={verify}
        onResend={() => { sendCode(); }}
        onVerified={() => setTimeout(close, 1200)}
      />
    </View>
  );
};

export default SmsValidation;
