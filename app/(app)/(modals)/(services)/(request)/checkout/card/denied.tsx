import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import PaymentResult from "@/components/app/PaymentResult";
import { useTranslation } from "react-i18next";
import { useService } from "@/contexts/ServiceContext";

const CardDenied = () => {
  const { t } = useTranslation();
  const { serviceToRequest } = useService();
  const params = useLocalSearchParams();
  // Seleção de profissional: o serviço já existe no servidor. Tentar de novo é
  // pagá-lo, não criar outro — sem isto o botão abria um serviço novo e o
  // cliente ficava com dois.
  const isMatchingFlow = params.matching === "1";

  // Voltar ao checkout (não a select-vendor) com o rascunho preservado no ServiceContext,
  // para o cliente tentar de novo sem reescolher o vendor nem repreencher o formulário.
  const goToTryAgainScreen = () => {
    if (isMatchingFlow && params.serviceId) {
      const target = {
        pathname: "/(app)/(modals)/(services)/(request)/checkout/[serviceId]" as const,
        params: { serviceId: String(params.serviceId), matching: "1", amount: String(params.amount ?? "") },
      };
      try {
        router.dismissTo(target);
      } catch {
        try {
          router.replace(target);
        } catch {
          router.replace("/(app)/(tabs)/home");
        }
      }

      return;
    }

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
      title={t("services.checkout.card_denied.title")}
      descriptions={[
        t("services.checkout.card_denied.first_description"),
        t("services.checkout.card_denied.second_description"),
      ]}
      footer={
        <CustomTouchableOpacity
          size="large"
          type="primary"
          textColor="secondary"
          textBoldness="semiBold"
          text={t("services.checkout.card_denied.try_again")}
          onPress={goToTryAgainScreen}
        />
      }
    />
  );
};

export default CardDenied;
