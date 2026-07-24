import { router } from "expo-router";
import React from "react";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import PaymentResult from "@/components/app/PaymentResult";
import { useTranslation } from "react-i18next";

const CardConfirmed = () => {
  const { t } = useTranslation();

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
