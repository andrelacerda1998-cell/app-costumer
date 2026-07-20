import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, BackHandler } from "react-native";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import { useTranslation } from "react-i18next";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useService } from "@/contexts/ServiceContext";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";

// Fluxo de cartão isolado do MBWay: este ecrã faz o seu próprio polling ao
// checkPaymentStatus e navega para os ecrãs card/confirmed | card/denied.
// Não usa verifyStatus/forceVerifyStatus do ServiceContext (que fixam navegação mb-way).
const POLL_INTERVAL_MS = 10000;
const MAX_ATTEMPTS = 24; // 24 x 10s = 240s

const CardWaiting = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { serviceToRequest, setServicePendingAcceptance } = useService();
  const { openDialog } = useDialog();

  const params = useLocalSearchParams();
  const serviceId = params.serviceId as string | undefined;

  const [canceling, setCanceling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const navigatedRef = useRef(false);
  const checkingRef = useRef(false);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const goToConfirmed = (service?: any) => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    stopPolling();
    if (service) setServicePendingAcceptance(service);
    router.dismissTo(
      "/(app)/(modals)/(services)/(request)/checkout/card/confirmed",
    );
  };

  const goToDenied = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    stopPolling();
    router.dismissTo(
      "/(app)/(modals)/(services)/(request)/checkout/card/denied",
    );
  };

  const checkOnce = async () => {
    if (!serviceId || navigatedRef.current || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const res = await api.get(API_ROUTES.GET_SERVICE_PAYMENT_STATUS(serviceId));
      goToConfirmed(res?.data?.data?.service);
    } catch (error: any) {
      // 402 → recusado; 400/outros → ainda pendente (continua o polling).
      if (error?.response?.status === 402) {
        goToDenied();
      }
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        goToHomepage();
        return true;
      },
    );

    if (serviceId) {
      // Verificação imediata (caso o pagamento já esteja assente ao chegar, ex. Wise)
      checkOnce();
      intervalRef.current = setInterval(() => {
        if (navigatedRef.current) {
          stopPolling();
          return;
        }
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          stopPolling();
          setTimedOut(true);
          return;
        }
        checkOnce();
      }, POLL_INTERVAL_MS);
    }

    return () => {
      backHandler.remove();
      stopPolling();
    };
  }, []);

  const goToHomepage = () => {
    stopPolling();
    navigatedRef.current = true;
    router.dismissTo({ pathname: "/(app)/(tabs)/home" });
  };

  // Voltar ao checkout com os dados preservados (rascunho no ServiceContext), para o cliente
  // não preencher tudo de novo. Sem service_type conhecido, cai para a home.
  const goToCheckout = () => {
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

  const handleCancelRequest = () => {
    if (!serviceId || canceling) return;
    openDialog({
      title: t("services.checkout.card_waiting.cancel_confirm_title"),
      subtitle: t("services.checkout.card_waiting.cancel_confirm_subtitle"),
      successButtonText: t("services.cancel.confirm"),
      cancelButtonText: t("services.cancel.cancel"),
      onSuccess() {
        setCanceling(true);
        api
          // Endpoint dedicado: cancela um Pending3DS não confirmado e é idempotente quando o
          // serviço já foi marcado CANCELED pela recusa do banco (nunca devolve erro "já cancelado").
          .post(API_ROUTES.POST_CANCEL_PENDING_3DS(serviceId))
          .then(() => {
            stopPolling();
            navigatedRef.current = true;
            // Não limpar serviceToRequest nem o rascunho: o cliente volta ao checkout preenchido.
            openDialog({
              title: t("services.checkout.card_waiting.canceled_success_title"),
              subtitle: t(
                "services.checkout.card_waiting.canceled_success_subtitle",
              ),
              closeAfterMSeconds: 3000,
              closeOnClickOutside: false,
              onClose: goToCheckout,
            });
          })
          .catch((error) => {
            // Afinal o pagamento já tinha sido confirmado: seguir o fluxo pago.
            if (
              error?.response?.status === 409 &&
              error?.response?.data?.metadata?.code === "already_paid"
            ) {
              stopPolling();
              navigatedRef.current = true;
              const service = error.response.data?.data?.service;
              if (service) setServicePendingAcceptance(service);
              openDialog({
                title: t(
                  "services.checkout.card_waiting.already_paid_dialog_title",
                ),
                subtitle: t(
                  "services.checkout.card_waiting.already_paid_dialog_subtitle",
                ),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: false,
                onClose: () => {
                  router.dismissTo(
                    "/(app)/(modals)/(services)/(request)/checkout/card/confirmed",
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
          <Feather name="credit-card" size={110} color={Colors.primary} />
        </View>

        <View className="space-y-4 mt-8">
          <CustomText size="title" color="support_secondary" boldness="bold">
            {t("services.checkout.card_waiting.title")}
          </CustomText>
          <View>
            <CustomText color="gray_medium" boldness="regular">
              {t("services.checkout.card_waiting.first_description")}
            </CustomText>
            <CustomText color="gray_medium" boldness="regular">
              {t("services.checkout.card_waiting.second_description")}
            </CustomText>
          </View>
          {timedOut ? (
            <CustomText color="primary" boldness="semiBold">
              {t("services.checkout.card_waiting.timeout_message")}
            </CustomText>
          ) : (
            <CustomText color="support_secondary" boldness="semiBold">
              {t("services.checkout.card_waiting.time_left.before")}
              <CustomText color="primary" boldness="semiBold">
                {" "}
                {t("services.checkout.card_waiting.time_left.time", {
                  timeLeft: 4,
                })}{" "}
              </CustomText>
              {t("services.checkout.card_waiting.time_left.after")}
            </CustomText>
          )}
        </View>
      </ScrollView>

      <View className="p-5 space-y-3">
        <CustomTouchableOpacity
          size="large"
          type="transparent"
          textColor="primary"
          textBoldness="semiBold"
          text={
            canceling
              ? t("general.loading")
              : t("services.checkout.card_waiting.cancel_request_button")
          }
          disabled={canceling}
          onPress={handleCancelRequest}
        />

        {timedOut && (
          <CustomTouchableOpacity
            size="large"
            type="primary_outline"
            textColor="primary"
            textBoldness="semiBold"
            text={t("services.checkout.card_waiting.go_to_homepage")}
            onPress={goToHomepage}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default CardWaiting;
