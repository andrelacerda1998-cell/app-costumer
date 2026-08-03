import React, { useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useDialog } from "@/contexts/DialogContext";
import { useService } from "@/contexts/ServiceContext";
import { renderMoney } from "@/utils/money";
import XIcon from "@/assets/icons/x";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Tempo extra / peças pedidas pelo técnico durante o serviço (ver
 * BACKEND_PENDENCIAS.md #9). Só aparece quando existe pelo menos um pedido —
 * silencioso enquanto o técnico não pedir nada. Tocar num pedido pendente
 * reabre a folha de revisão (ex.: se o cliente ignorou o pedido em tempo real).
 *
 * Um extra APROVADO pode ainda precisar de ação do cliente para ser
 * efetivamente cobrado (payment_status): sem cartão gravado, ou o banco a
 * pedir 3D Secure. Estes dois casos ficam visíveis aqui, com o botão certo
 * para cada um — nunca ficam presos sem o cliente perceber porquê.
 */
const ServiceExtrasCard = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { openService, serviceExtras, setServiceExtras, getServiceExtras } = useService();
  const [busyId, setBusyId] = useState<number | null>(null);

  if (serviceExtras.length === 0) return null;

  const pending = serviceExtras.filter((e) => e.status === "pending");
  const approved = serviceExtras.filter((e) => e.status === "approved");
  const rejected = serviceExtras.filter((e) => e.status === "rejected");
  const approvedTotal = approved.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Estados terminais/tranquilos do lado do cliente: nada para fazer agora.
  const settled = approved.filter(
    (e) => e.payment_status !== "requires_action" && e.payment_status !== "failed"
  );
  const needsAction = approved.filter(
    (e) => e.payment_status === "requires_action" || e.payment_status === "failed"
  );

  const label = (e: (typeof serviceExtras)[number]) =>
    e.type === "time" ? t("services.extras.time_label", { minutes: e.minutes ?? 0 }) : e.description || "";

  const openReview = (extraId: number) =>
    router.navigate({
      pathname: "/(app)/(bottom-sheets)/(services)/extra-request/[extraId]",
      params: { extraId: String(extraId) },
    });

  const showChargeError = (message?: string) => {
    openDialog({
      icon: <XIcon color={Colors.secondary} />,
      title: t("errors.title"),
      subtitle: message || t("services.extras.error_respond"),
      closeAfterMSeconds: 2500,
      closeOnClickOutside: true,
    });
  };

  const refreshOne = (extraId: number, updated: any) => {
    if (!updated) return;
    setServiceExtras((prev) => prev.map((e) => (e.id === extraId ? { ...e, ...updated } : e)));
  };

  // Cartão gravado, mas o banco pediu 3D Secure — reabre a mesma ordem já criada.
  const confirmPayment = async (extraId: number, validationUrl: string) => {
    setBusyId(extraId);
    try {
      const result = await WebBrowser.openAuthSessionAsync(validationUrl, "piquet.customer:://");
      if (result.type !== "success" && result.type !== "dismiss" && result.type !== "cancel") {
        return;
      }
    } catch {
      // segue para o refetch de qualquer forma — o estado real vem do backend
    } finally {
      await getServiceExtras();
      setBusyId(null);
    }
  };

  // Sem cartão gravado — tenta cobrar de novo (útil depois de o cliente adicionar um).
  const retryCharge = (extraId: number) => {
    if (!openService?.id) return;
    setBusyId(extraId);
    api
      .post(API_ROUTES.CUSTOMER_SERVICE_EXTRA_RETRY_CHARGE(openService.id, extraId))
      .then((response) => {
        refreshOne(extraId, response?.data?.data?.extra);
      })
      .catch((error: any) => {
        showChargeError(
          error?.response?.data?.metadata?.message || error?.response?.data?.message
        );
      })
      .finally(() => {
        setBusyId(null);
      });
  };

  const addPaymentMethod = () => router.navigate("/(app)/(bottom-sheets)/new-payment-method");

  return (
    <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
      <CustomText color="gray_medium" size="extraSmall" boldness="bold">
        {t("services.extras.card_title")}
      </CustomText>

      {pending.map((e) => (
        <TouchableOpacity
          key={e.id}
          activeOpacity={0.8}
          onPress={() => openReview(e.id)}
          className="flex-row items-center rounded-xl p-3 mt-3"
          style={{ backgroundColor: "rgba(250,187,91,0.18)" }}
        >
          <MaterialIcons name={e.type === "time" ? "more-time" : "construction"} size={18} color={Colors.secondary} />
          <CustomText color="secondary" size="small" boldness="semiBold" classes="flex-1 ml-2" numberOfLines={2}>
            {t("services.extras.waiting", { item: label(e) })}
          </CustomText>
          <Feather name="chevron-right" size={16} color={Colors.gray_medium} />
        </TouchableOpacity>
      ))}

      {needsAction.map((e) => {
        const isBusy = busyId === e.id;
        const needsCard = e.payment_error === "no_stored_payment_method";
        return (
          <View
            key={e.id}
            className="rounded-xl p-3 mt-3"
            style={{ backgroundColor: e.payment_status === "failed" ? "rgba(237,73,73,0.1)" : "rgba(250,187,91,0.18)" }}
          >
            <View className="flex-row items-start">
              <Feather
                name="alert-triangle"
                size={16}
                color={e.payment_status === "failed" ? Colors.error : Colors.secondary}
                style={{ marginTop: 1 }}
              />
              <CustomText
                color={e.payment_status === "failed" ? "error" : "secondary"}
                size="small"
                boldness="semiBold"
                classes="flex-1 ml-2"
                numberOfLines={3}
              >
                {t(
                  e.payment_status === "failed"
                    ? "services.extras.charge_failed"
                    : needsCard
                    ? "services.extras.needs_payment_method"
                    : "services.extras.needs_confirmation",
                  { item: label(e) }
                )}
              </CustomText>
            </View>
            <View className="flex-row mt-2.5" style={{ gap: 8 }}>
              {needsCard ? (
                <>
                  <TouchableOpacity
                    onPress={addPaymentMethod}
                    disabled={isBusy}
                    className="rounded-full px-3.5 py-2"
                    style={{ backgroundColor: Colors.primary }}
                  >
                    <CustomText color="secondary" size="extraSmall" boldness="bold">
                      {t("services.extras.add_payment_method")}
                    </CustomText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => retryCharge(e.id)} disabled={isBusy} className="rounded-full px-3.5 py-2 justify-center">
                    {isBusy ? (
                      <ActivityIndicator size="small" color={Colors.secondary} />
                    ) : (
                      <CustomText color="secondary" size="extraSmall" boldness="semiBold">
                        {t("services.extras.retry")}
                      </CustomText>
                    )}
                  </TouchableOpacity>
                </>
              ) : e.payment_validation_url ? (
                <TouchableOpacity
                  onPress={() => confirmPayment(e.id, e.payment_validation_url as string)}
                  disabled={isBusy}
                  className="rounded-full px-3.5 py-2 flex-row items-center"
                  style={{ backgroundColor: Colors.primary }}
                >
                  {isBusy && <ActivityIndicator size="small" color={Colors.secondary} style={{ marginRight: 6 }} />}
                  <CustomText color="secondary" size="extraSmall" boldness="bold">
                    {t("services.extras.confirm_payment")}
                  </CustomText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => retryCharge(e.id)} disabled={isBusy} className="rounded-full px-3.5 py-2" style={{ backgroundColor: Colors.primary }}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={Colors.secondary} />
                  ) : (
                    <CustomText color="secondary" size="extraSmall" boldness="bold">
                      {t("services.extras.retry")}
                    </CustomText>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {settled.map((e) => (
        <View key={e.id} className="flex-row items-center mt-3">
          <Feather name="check-circle" size={16} color={Colors.success} />
          <CustomText color="secondary" size="small" boldness="regular" classes="flex-1 ml-2" numberOfLines={2}>
            {t("services.extras.approved", { item: label(e) })}
          </CustomText>
        </View>
      ))}

      {rejected.map((e) => (
        <View key={e.id} className="flex-row mt-3">
          <Feather name="x-circle" size={16} color={Colors.error} style={{ marginTop: 2 }} />
          <View className="flex-1 ml-2">
            <CustomText color="error" size="small" boldness="regular" numberOfLines={2}>
              {t("services.extras.rejected", { item: label(e) })}
            </CustomText>
            {!!e.rejection_reason && (
              <CustomText color="gray_medium" size="extraSmall" boldness="regular" numberOfLines={3}>
                {t("services.extras.rejected_reason", { reason: e.rejection_reason })}
              </CustomText>
            )}
          </View>
        </View>
      ))}

      {approvedTotal > 0 && (
        <View className="flex-row items-center justify-between mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: Colors.support_primary }}>
          <CustomText color="gray_medium" size="small" boldness="regular">
            {t("services.extras.approved_total")}
          </CustomText>
          <CustomText color="secondary" size="medium" boldness="bold">
            {renderMoney(approvedTotal)}
          </CustomText>
        </View>
      )}
    </View>
  );
};

export default ServiceExtrasCard;
