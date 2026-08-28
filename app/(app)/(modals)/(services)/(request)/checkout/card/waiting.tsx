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
import { useAppStateStatus } from "@/contexts/AppStateStatusContext";
import useDeadlineCountdown from "@/hooks/useDeadlineCountdown";

// Fluxo de cartão isolado do MBWay: este ecrã faz o seu próprio polling ao
// checkPaymentStatus e navega para os ecrãs card/confirmed | card/denied.
// Não usa verifyStatus/forceVerifyStatus do ServiceContext (que fixam navegação mb-way).
const POLL_INTERVAL_MS = 10000;
const MAX_ATTEMPTS = 24; // 24 x 10s = 240s
// Mesma janela do MB Way, e a mesma que o polling acima esgota.
const PAYMENT_WINDOW_SECONDS = (POLL_INTERVAL_MS / 1000) * MAX_ATTEMPTS;
const CHECK_COOLDOWN_SECONDS = 10;

const CardWaiting = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { serviceToRequest, setServicePendingAcceptance } = useService();
  const { openDialog } = useDialog();

  const params = useLocalSearchParams();
  const serviceId = params.serviceId as string | undefined;
  // Seleção de profissional: o serviço já existe, e voltar ao checkout tem de
  // o pagar em vez de criar outro. Ver checkout/[serviceId].tsx.
  const isMatchingFlow = params.matching === "1";
  const matchingAmount = params.amount as string | undefined;

  const [canceling, setCanceling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Contagem real, ancorada num instante — ver hooks/useDeadlineCountdown.
  // Este ecrã mostrava "4 minutos" escrito à mão, que ficava nos 4 minutos para
  // sempre: pior do que não ter contador, porque parecia informação e não era.
  const { appStateStatus } = useAppStateStatus();
  const { label: countdownLabel } = useDeadlineCountdown(
    PAYMENT_WINDOW_SECONDS,
    appStateStatus,
  );

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

  const checkOnce = async (): Promise<"paid" | "denied" | "pending"> => {
    if (!serviceId || navigatedRef.current || checkingRef.current) return "pending";
    checkingRef.current = true;
    try {
      const res = await api.get(API_ROUTES.GET_SERVICE_PAYMENT_STATUS(serviceId));
      goToConfirmed(res?.data?.data?.service);
      return "paid";
    } catch (error: any) {
      // 402 → recusado; 400/outros → ainda pendente (continua o polling).
      if (error?.response?.status === 402) {
        goToDenied();
        return "denied";
      }
      return "pending";
    } finally {
      checkingRef.current = false;
    }
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

  /**
   * "Verificar novamente": força já uma verificação em vez de esperar pelos
   * próximos 10s do polling. Sem isto, quem voltava do 3DS ficava num ecrã mudo
   * sem forma nenhuma de agir — a chave i18n do botão já existia, o botão é que
   * nunca tinha sido construído.
   */
  const handleAlreadyPaid = async () => {
    if (checking || canceling || cooldown > 0 || navigatedRef.current) return;
    setChecking(true);
    setStillPending(false);
    const result = await checkOnce();
    // 'paid' e 'denied' já navegaram dentro do checkOnce.
    if (result === "pending") {
      setStillPending(true);
      startCooldown();
    }
    setChecking(false);
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
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
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
    // Seleção de profissional: volta-se ao MESMO serviço, que já existe no
    // servidor. Sem isto o checkout abria em modo antigo e o botão de tentar de
    // novo criava um serviço novo em vez de pagar este.
    if (isMatchingFlow) {
      const target = {
        pathname: "/(app)/(modals)/(services)/(request)/checkout/[serviceId]" as const,
        params: { serviceId: String(serviceId), matching: "1", amount: String(matchingAmount ?? "") },
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
        <View className="items-center">
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 140, height: 140, backgroundColor: "rgba(250,187,91,0.12)" }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 96, height: 96, backgroundColor: "rgba(250,187,91,0.18)" }}
            >
              <Feather name="credit-card" size={44} color={Colors.primary} />
            </View>
          </View>

          <CustomText
            size="title"
            color="support_secondary"
            boldness="bold"
            classes="text-center mt-8"
          >
            {t("services.checkout.card_waiting.title")}
          </CustomText>

          <View className="mt-4 space-y-1">
            <CustomText color="gray_medium" boldness="regular" classes="text-center">
              {t("services.checkout.card_waiting.first_description")}
            </CustomText>
            <CustomText color="gray_medium" boldness="regular" classes="text-center">
              {t("services.checkout.card_waiting.second_description")}
            </CustomText>
          </View>

          {timedOut ? (
            <CustomText color="primary" boldness="semiBold" classes="text-center mt-4">
              {t("services.checkout.card_waiting.timeout_message")}
            </CustomText>
          ) : (
            <View className="items-center mt-5">
              <CustomText color="primary" boldness="bold" style={{ fontSize: 44, lineHeight: 52 }}>
                {countdownLabel}
              </CustomText>
              <CustomText color="gray_medium" size="small" boldness="regular">
                {t("services.checkout.card_waiting.time_left.after")}
              </CustomText>
            </View>
          )}

          {stillPending && (
            <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mt-5">
              {t("services.checkout.card_waiting.still_pending")}
            </CustomText>
          )}
        </View>
      </ScrollView>

      <View className="p-5 space-y-3">
        {/* Verificar já, em vez de esperar pelos proximos 10s do polling. */}
        <CustomTouchableOpacity
          size="large"
          type="primary"
          textColor="secondary"
          textBoldness="bold"
          text={
            checking
              ? t("general.loading")
              : cooldown > 0
              ? `${t("services.checkout.card_waiting.already_paid_button")} (${cooldown}s)`
              : t("services.checkout.card_waiting.already_paid_button")
          }
          disabled={checking || canceling || cooldown > 0}
          onPress={handleAlreadyPaid}
        />

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
