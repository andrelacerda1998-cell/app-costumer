import { router } from "expo-router";
import React from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import PaymentResult from "@/components/app/PaymentResult";
import { useTranslation } from "react-i18next";
import { useService } from "@/contexts/ServiceContext";

const MbWayDenied = () => {
  const { t } = useTranslation();
  const { serviceToRequest } = useService();

  const goToTryAgainScreen = () => {
    const serviceTypeId = serviceToRequest?.service_type?.id;
    // Guarda: nunca navegar para 'select-vendor/undefined'. Sem service_type
    // conhecido, cair para um destino seguro (home).
    if (!serviceTypeId) {
      router.dismissTo({ pathname: "/(app)/(tabs)/home" });
      return;
    }
    router.dismissTo(
      `/(app)/(modals)/(services)/(request)/select-vendor/${serviceTypeId}`,
    );
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
