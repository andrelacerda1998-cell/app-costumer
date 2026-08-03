import { router } from "expo-router";
import React, { useEffect } from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import PaymentResult from "@/components/app/PaymentResult";
import { useTranslation } from "react-i18next";
import { useService } from "@/contexts/ServiceContext";

const MbWayConfirmed = () => {
  const { t } = useTranslation();
  const { clearCheckoutState } = useService();

  // Pagamento MB Way confirmado: o rascunho do checkout (que pode ter sobrado de uma
  // tentativa anterior com cartão no mesmo serviço) deixa de ser válido.
  useEffect(() => {
    clearCheckoutState();
  }, []);

  const goToHomepage = () => {
    router.dismissTo({
      pathname: "/(app)/(tabs)/home",
    });
  };

  return (
    <PaymentResult
      variant="success"
      title={t("services.checkout.mb_way_confirmed.title")}
      descriptions={[
        t("services.checkout.mb_way_confirmed.first_description"),
        t("services.checkout.mb_way_confirmed.second_description"),
      ]}
      footer={
        <CustomTouchableOpacity
          size="large"
          type="primary"
          textColor="secondary"
          textBoldness="semiBold"
          text={t("services.checkout.mb_way_confirmed.go_to_homepage")}
          onPress={goToHomepage}
        />
      }
    />
  );
};

export default MbWayConfirmed;
