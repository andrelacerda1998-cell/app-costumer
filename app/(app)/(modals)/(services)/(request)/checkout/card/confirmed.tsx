import { router } from "expo-router";
import React, { useEffect } from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import PaymentResult from "@/components/app/PaymentResult";
import { useTranslation } from "react-i18next";
import { useService } from "@/contexts/ServiceContext";

const CardConfirmed = () => {
  const { t } = useTranslation();
  const { clearCheckoutState } = useService();

  // Pagamento confirmado: o rascunho do checkout deixa de ser válido. Sem isto, reabrir
  // o checkout do mesmo serviço reidratava o voucher já consumido neste pagamento.
  // (O caminho 3DS direto já limpa no goToWaitAccept; este cobre a chegada por polling
  // do ecrã de espera e o 409 "already_paid" do cancelamento.)
  useEffect(() => {
    clearCheckoutState();
  }, []);

  const goToHomepage = () => {
    router.dismissTo({ pathname: "/(app)/(tabs)/home" });
  };

  return (
    <PaymentResult
      variant="success"
      title={t("services.checkout.card_confirmed.title")}
      descriptions={[
        t("services.checkout.card_confirmed.first_description"),
        t("services.checkout.card_confirmed.second_description"),
      ]}
      footer={
        <CustomTouchableOpacity
          size="large"
          type="primary"
          textColor="secondary"
          textBoldness="semiBold"
          text={t("services.checkout.card_confirmed.go_to_homepage")}
          onPress={goToHomepage}
        />
      }
    />
  );
};

export default CardConfirmed;
