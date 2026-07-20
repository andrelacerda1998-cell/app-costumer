import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View } from "react-native";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import { useTranslation } from "react-i18next";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { BackHandler } from "react-native";
import { useService } from "@/contexts/ServiceContext";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";

const CHECK_COOLDOWN_SECONDS = 10;

const MbWayWaiting = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const {
    verifyStatus,
    forceVerifyStatus,
    stopVerifyStatus,
    setServicePendingAcceptance,
    setServiceToRequest,
  } = useService();
  const { openDialog } = useDialog();

  const params = useLocalSearchParams();
  const serviceId = params.serviceId as string | undefined;

  const [checking, setChecking] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [stillPending, setStillPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        goToHomepage();
        return true;
      },
    );

    return () => {
      backHandler.remove();
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      // O polling não pode continuar a correr depois de sair deste ecrã.
      stopVerifyStatus();
    };
  }, []);

  useLayoutEffect(() => {
    if (serviceId) verifyStatus(serviceId, () => setTimedOut(true));
  }, []);

  const goToHomepage = () => {
    stopVerifyStatus();
    router.dismissTo({
      pathname: "/(app)/(tabs)/home",
    });
  };

  const startCooldown = () => {
    setCooldown(CHECK_COOLDOWN_SECONDS);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAlreadyPaid = async () => {
    if (!serviceId || checking || canceling || cooldown > 0) return;
    setChecking(true);
    setStillPending(false);

    const result = await forceVerifyStatus(serviceId);
    // 'paid' e 'refused' já navegaram (confirmed/denied) dentro do forceVerifyStatus.
    if (result === "pending") {
      setStillPending(true);
      startCooldown();
    } else if (result === "error") {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: t("errors.occurred_an_error"),
        closeAfterMSeconds: 2500,
        closeOnClickOutside: true,
      });
    }
    setChecking(false);
  };

  const handleCancelRequest = () => {
    if (!serviceId || checking || canceling) return;
    openDialog({
      title: t("services.checkout.mb_way_waiting.cancel_confirm_title"),
      subtitle: t("services.checkout.mb_way_waiting.cancel_confirm_subtitle"),
      successButtonText: t("services.cancel.confirm"),
      cancelButtonText: t("services.cancel.cancel"),
      onSuccess() {
        setCanceling(true);
        api
          .post(API_ROUTES.POST_CANCEL_SERVICE(serviceId))
          .then(() => {
            stopVerifyStatus();
            setServicePendingAcceptance(null);
            setServiceToRequest(null);
            openDialog({
              title: t(
                "services.checkout.mb_way_waiting.canceled_success_title",
              ),
              subtitle: t(
                "services.checkout.mb_way_waiting.canceled_success_subtitle",
              ),
              closeAfterMSeconds: 3000,
              closeOnClickOutside: false,
              onClose: () => {
                router.dismissAll();
                router.replace("/(app)/(tabs)/home");
              },
            });
          })
          .catch((error) => {
            // Afinal o pagamento já tinha sido confirmado: seguir o fluxo pago em vez de cancelar.
            if (
              error?.response?.status === 409 &&
              error?.response?.data?.metadata?.code === "already_paid"
            ) {
              stopVerifyStatus();
              const service = error.response.data?.data?.service;
              if (service) setServicePendingAcceptance(service);
              openDialog({
                title: t(
                  "services.checkout.mb_way_waiting.already_paid_dialog_title",
                ),
                subtitle: t(
                  "services.checkout.mb_way_waiting.already_paid_dialog_subtitle",
                ),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: false,
                onClose: () => {
                  router.dismissTo(
                    `/(app)/(modals)/(services)/(request)/checkout/mb-way/confirmed`,
                  );
                },
              });
              return;
            }

            openDialog({
              icon: <XIcon color={Colors.secondary} />,
              title: t("errors.title"),
              subtitle:
                error?.response?.data?.metadata?.message ||
                error?.response?.data?.message ||
                t("errors.occurred_an_error"),
              closeAfterMSeconds: 2500,
              closeOnClickOutside: true,
            });
          })
          .finally(() => {
            setCanceling(false);
          });
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <StatusBar animated style="light" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View>
          <Feather name="tool" size={110} color={Colors.primary} />
        </View>

        <View className="space-y-4 mt-8">
          <CustomText size="title" color="support_secondary" boldness="bold">
            {t("services.checkout.mb_way_waiting.title")}
          </CustomText>
          <View>
            <CustomText color="gray_medium" boldness="regular">
              {t("services.checkout.mb_way_waiting.first_description")}
            </CustomText>
            <CustomText color="gray_medium" boldness="regular">
              {t("services.checkout.mb_way_waiting.second_description")}
            </CustomText>
          </View>
          {timedOut ? (
            <CustomText color="primary" boldness="semiBold">
              {t("services.checkout.mb_way_waiting.timeout_message")}
            </CustomText>
          ) : (
            <CustomText color="support_secondary" boldness="semiBold">
              {t("services.checkout.mb_way_waiting.time_left.before")}
              <CustomText color="primary" boldness="semiBold">
                {" "}
                {t("services.checkout.mb_way_waiting.time_left.time", {
                  timeLeft: 4,
                })}{" "}
              </CustomText>
              {t("services.checkout.mb_way_waiting.time_left.after")}
            </CustomText>
          )}
          {stillPending && (
            <CustomText color="primary" boldness="regular">
              {t("services.checkout.mb_way_waiting.still_pending")}
            </CustomText>
          )}
        </View>
      </ScrollView>

      <View className="p-5 space-y-3">
        {/* <CustomTouchableOpacity
          size="large"
          type="primary"
          textColor="secondary"
          textBoldness="semiBold"
          text={
            checking
              ? t("general.loading")
              : cooldown > 0
                ? `${t("services.checkout.mb_way_waiting.already_paid_button")} (${cooldown}s)`
                : t("services.checkout.mb_way_waiting.already_paid_button")
          }
          disabled={checking || canceling || cooldown > 0}
          onPress={handleAlreadyPaid}
        /> */}

        <CustomTouchableOpacity
          size="large"
          type="transparent"
          textColor="primary"
          textBoldness="semiBold"
          text={
            canceling
              ? t("general.loading")
              : t("services.checkout.mb_way_waiting.cancel_request_button")
          }
          disabled={checking || canceling}
          onPress={handleCancelRequest}
        />

        {timedOut && (
          <CustomTouchableOpacity
            size="large"
            type="primary_outline"
            textColor="primary"
            textBoldness="semiBold"
            text={t("services.checkout.mb_way_waiting.go_to_homepage")}
            onPress={goToHomepage}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default MbWayWaiting;
