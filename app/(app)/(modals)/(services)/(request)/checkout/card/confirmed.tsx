import { router } from "expo-router";
import React, { useEffect } from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import PaymentResult from "@/components/app/PaymentResult";
import { useTranslation } from "react-i18next";
import { useService } from "@/contexts/ServiceContext";
import { renderMoney } from "@/utils/money";

const CardConfirmed = () => {
  const { t } = useTranslation();
  const { clearCheckoutState, servicePendingAcceptance } = useService();

  // Pagamento confirmado: o rascunho do checkout deixa de ser válido. Sem isto, reabrir
  // o checkout do mesmo serviço reidratava o voucher já consumido neste pagamento.
  // (O caminho 3DS direto já limpa no goToWaitAccept; este cobre a chegada por polling
  // do ecrã de espera e o 409 "already_paid" do cancelamento.)
  useEffect(() => {
    clearCheckoutState();
  }, []);

  const paid = servicePendingAcceptance;
  // Depois de pagar, o destino natural é o serviço — nao a Home. O caminho feliz
  // do checkout ja vai para wait-accept; so estes ecras (chegada por polling)
  // e que despejavam o cliente no inicio a ter de procurar o que acabou de
  // comprar.
  const goToService = () => {
    if (!paid?.id) {
      router.dismissTo({ pathname: "/(app)/(tabs)/home" });
      return;
    }
    router.dismissTo(
      `/(app)/(modals)/(services)/(request)/wait-accept/${paid.id}` as any,
    );
  };

  const goToHomepage = () => {
    router.dismissTo({ pathname: "/(app)/(tabs)/home" });
  };

  return (
    <PaymentResult
      variant="success"
      title={t("services.checkout.card_confirmed.title")}
      summary={{
        serviceName: paid?.service_type?.name ?? null,
        vendorName: paid?.vendor?.user?.name ?? null,
        amount: renderMoney(paid?.amount ?? null),
      }}
      descriptions={[
        t("services.checkout.card_confirmed.first_description"),
        t("services.checkout.card_confirmed.second_description"),
      ]}
      footer={
        <>
          <CustomTouchableOpacity
            size="large"
            type="primary"
            textColor="secondary"
            textBoldness="bold"
            text={t("services.checkout.receipt.track_service")}
            onPress={goToService}
          />
          <CustomTouchableOpacity
            size="large"
            type="transparent"
            textColor="gray_medium"
            textBoldness="semiBold"
            text={t("services.checkout.card_confirmed.go_to_homepage")}
            onPress={goToHomepage}
          />
        </>
      }
    />
  );
};

export default CardConfirmed;
