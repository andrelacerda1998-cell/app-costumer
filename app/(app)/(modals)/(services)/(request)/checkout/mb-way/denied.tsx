import { router } from "expo-router";
import React from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import PaymentResult from "@/components/app/PaymentResult";
import { useTranslation } from "react-i18next";
import { useService } from "@/contexts/ServiceContext";

const MbWayDenied = () => {
  const { t } = useTranslation();
  const { serviceToRequest } = useService();

  // Voltar ao checkout (não a select-vendor) com o rascunho preservado no ServiceContext,
  // para o cliente tentar de novo sem reescolher o técnico nem repreencher o formulário.
  // Mesmo destino do card/denied — a recusa é do pagamento, não da escolha do técnico.
  // Guarda: sem service_type conhecido, cair para um destino seguro (home).
  const goToTryAgainScreen = () => {
    const serviceTypeId = serviceToRequest?.service_type?.id;
    if (!serviceTypeId) {
      router.dismissAll();
      router.replace("/(app)/(tabs)/home");
      return;
    }
    const pathname = `/(app)/(modals)/(services)/(request)/checkout/${serviceTypeId}`;
    try {
      router.dismissTo(pathname as any);
    } catch {
      try {
        router.replace(pathname as any);
      } catch {
        router.replace("/(app)/(tabs)/home");
      }
    }
  };

  return (
    <PaymentResult
      variant="error"
      title={t("services.checkout.mb_way_denied.title")}
      descriptions={[
        t("services.checkout.mb_way_denied.first_description"),
        t("services.checkout.mb_way_denied.second_description"),
      ]}
      footer={
        <CustomTouchableOpacity
          size="large"
          type="primary"
          textColor="secondary"
          textBoldness="semiBold"
          text={t("services.checkout.mb_way_denied.try_again")}
          onPress={goToTryAgainScreen}
        />
      }
    />
  );
};

export default MbWayDenied;
