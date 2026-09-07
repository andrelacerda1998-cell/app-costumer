import React, { useEffect, useMemo, useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { Colors } from "@/constants/Colors";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useDialog } from "@/contexts/DialogContext";
import { useService } from "@/contexts/ServiceContext";
import { useWallet } from "@/contexts/WalletContext";
import { renderMoney } from "@/utils/money";
import XIcon from "@/assets/icons/x";

/**
 * Revisão de um pedido de tempo extra / peça-material feito pelo técnico
 * durante o serviço (ver BACKEND_PENDENCIAS.md #9). Aberta automaticamente
 * pelo ServiceContext quando chega o evento em tempo real, ou pelo cartão de
 * extras no ecrã "overview" para reabrir um pedido pendente.
 */
const ExtraRequestSheet = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { openService, serviceExtras, setServiceExtras, getServiceExtras } = useService();
  const { paymentMethods } = useWallet();
  const { extraId } = useLocalSearchParams();

  const extra = useMemo(
    () => serviceExtras.find((e) => String(e.id) === String(extraId)) ?? null,
    [serviceExtras, extraId]
  );

  /**
   * Onde o extra vai ser cobrado.
   *
   * É o método que pagou o serviço — o servidor cobra nesse mesmo (ver
   * ChargeServiceExtra) —, não o predefinido da carteira, que pode ser outro.
   * Com MB Way mostra-se o número; com cartão, a marca e os últimos quatro.
   */
  const payWith = useMemo(() => {
    const fromService = (openService as any)?.payment_method;
    if (fromService?.type) {
      const isMbway = String(fromService.type).toLowerCase().includes("mb");
      return {
        label: isMbway
          ? `MB Way · ${fromService.phone_number ?? ""}`.trim()
          : `${fromService.brand ?? ""} •••• ${fromService.last4 ?? ""}`.trim(),
        icon: isMbway ? "smartphone" : "credit-card",
      } as const;
    }

    // Sem o dado do serviço (app antiga a falar com servidor novo, ou o
    // contrário): o cartão predefinido é a melhor aproximação, mas nunca se
    // inventa um método que não existe.
    const fallback = Array.isArray(paymentMethods) && paymentMethods.length > 0
      ? paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0]
      : null;

    return fallback
      ? { label: `${fallback.brand ?? ""} •••• ${fallback.last4 ?? ""}`.trim(), icon: "credit-card" as const }
      : null;
  }, [openService, paymentMethods]);

  const [triedFetch, setTriedFetch] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Contexto ainda sem este pedido (ex.: app reaberta depois do evento) → tenta
  // ir buscar a lista uma vez antes de desistir.
  useEffect(() => {
    if (!extra && !triedFetch) {
      setTriedFetch(true);
      getServiceExtras();
    }
  }, [extra, triedFetch]);

  // Já não há nada para decidir (não encontrado após tentar, ou já foi
  // respondido/retirado noutro sítio) → fecha em segurança.
  useEffect(() => {
    if (triedFetch && !extra) {
      router.back();
    } else if (extra && extra.status !== "pending") {
      router.back();
    }
  }, [extra, triedFetch]);

  if (!extra || !openService?.id) {
    return null;
  }

  const isTime = extra.type === "time";
  const hasCost = typeof extra.amount === "number" && extra.amount > 0;

  const itemLabel = isTime
    ? t("services.extras.time_label", { minutes: extra.minutes ?? 0 })
    : extra.description || t("services.extras.part_request_title");

  const respond = (status: "approved" | "rejected") => {
    setSubmitting(true);
    const request =
      status === "approved"
        ? api.post(API_ROUTES.CUSTOMER_SERVICE_EXTRA_APPROVE(openService.id, extra.id))
        : api.post(API_ROUTES.CUSTOMER_SERVICE_EXTRA_REJECT(openService.id, extra.id), {
            ...(reason.trim() ? { reason: reason.trim() } : {}),
          });
    request
      .then((response) => {
        const updated = response?.data?.data?.extra;
        setServiceExtras((prev) =>
          prev.map((e) => (e.id === extra.id ? (updated ?? { ...e, status, rejection_reason: reason.trim() || null }) : e))
        );
        router.back();
      })
      .catch((error: any) => {
        openDialog({
          icon: <XIcon color={Colors.secondary} />,
          title: t("errors.title"),
          subtitle:
            error?.response?.data?.metadata?.message ||
            error?.response?.data?.message ||
            t("services.extras.error_respond"),
          closeAfterMSeconds: 2500,
          closeOnClickOutside: true,
        });
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <DynamicSizingSheet
      type="scrollView"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
      }}
      handleStyle={{
        backgroundColor: "#FAF7F2",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{ backgroundColor: Colors.gray_light }}
      backgroundStyle={{ backgroundColor: "#FAF7F2" }}
      backdropComponent={() => <View style={{ flex: 1, backgroundColor: "black", opacity: 0.6 }} />}
      enablePanDownToClose={!submitting}
    >
      <View className="px-5 pt-6 pb-6" style={{ backgroundColor: "#FAF7F2" }}>
        <View className="items-center mb-4">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
          >
            {isTime ? (
              <MaterialIcons name="more-time" size={28} color={Colors.secondary} />
            ) : (
              <MaterialIcons name="construction" size={28} color={Colors.secondary} />
            )}
          </View>
          <CustomText color="secondary" size="title" boldness="bold" classes="text-center" numberOfLines={2}>
            {isTime
              ? t("services.extras.time_request_title", { minutes: extra.minutes ?? 0 })
              : t("services.extras.part_request_title")}
          </CustomText>
          <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mt-1">
            {isTime
              ? t("services.extras.time_request_body")
              : t("services.extras.part_request_body")}
          </CustomText>
        </View>

        <View className="bg-support_secondary rounded-2xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <View className="flex-row items-center justify-between">
            <CustomText color="secondary" size="medium" boldness="semiBold" classes="flex-1 mr-2" numberOfLines={2}>
              {itemLabel}
            </CustomText>
            <View className="items-end">
              <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1}>
                {hasCost ? renderMoney(extra.amount) : t("services.extras.no_additional_cost")}
              </CustomText>
              {hasCost && (
                <CustomText color="gray_strong" size="extraSmall" boldness="regular" numberOfLines={1}>
                  {t("services.checkout.resume.vat_included")}
                </CustomText>
              )}
            </View>
          </View>

          {/* Onde vai ser cobrado, e como mudar. Sem isto, aprovar era assinar
              em branco. */}
          {hasCost && (
            <>
              <View className="h-[1px] bg-support_primary my-3" />
              <View className="flex-row items-center">
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center"
                  style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
                >
                  <Feather name={payWith?.icon ?? "credit-card"} size={16} color={Colors.secondary} />
                </View>
                <View className="flex-1 ml-3 mr-2">
                  <CustomText color="gray_strong" size="extraSmall" boldness="regular" numberOfLines={1}>
                    {t("services.extras.charged_to")}
                  </CustomText>
                  <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1}>
                    {payWith?.label || t("services.extras.no_payment_method")}
                  </CustomText>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push("/(app)/(pages)/(payments)/payments")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CustomText color="primary" size="small" boldness="bold" numberOfLines={1}>
                    {payWith ? t("general.change") : t("services.extras.add_payment_method")}
                  </CustomText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {rejecting && (
          <View className="mt-3">
            <CustomText color="secondary" size="small" boldness="semiBold" classes="mb-2">
              {t("services.extras.reject_reason_label")}
            </CustomText>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t("services.extras.reject_reason_placeholder")}
              placeholderTextColor={Colors.gray_medium}
              multiline
              textAlignVertical="top"
              editable={!submitting}
              maxLength={300}
              style={{
                minHeight: 70,
                borderWidth: 1,
                borderColor: Colors.support_primary,
                borderRadius: 12,
                padding: 12,
                backgroundColor: Colors.support_secondary,
                fontFamily: "Poppins_400Regular",
                fontSize: 14,
                color: Colors.secondary,
              }}
            />
          </View>
        )}

        <View className="mt-5">
          {!rejecting ? (
            <>
              {/* O botão diz o que faz e quanto custa — "Aceitar" sozinho não
                  dizia que autorizava uma cobrança. */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => respond("approved")}
                disabled={submitting}
                className="rounded-full flex-row items-center justify-center"
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 16,
                  opacity: submitting ? 0.6 : 1,
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 5,
                }}
              >
                <Feather name="lock" size={15} color={Colors.secondary} />
                <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1} classes="ml-2">
                  {hasCost
                    ? t("services.extras.approve_and_pay", { amount: renderMoney(extra.amount) })
                    : t("services.extras.approve")}
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setRejecting(true)}
                disabled={submitting}
                className="rounded-full items-center justify-center mt-2.5"
                style={{ paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.error }}
              >
                <CustomText color="error" size="medium" boldness="bold" numberOfLines={1}>
                  {/* "Terminar como está" só faz sentido no tempo extra; numa
                      peça, o que se recusa é a peça. */}
                  {isTime ? t("services.extras.reject") : t("services.extras.reject_part")}
                </CustomText>
              </TouchableOpacity>

              {hasCost && (
                <CustomText color="gray_strong" size="extraSmall" boldness="regular" classes="text-center mt-3">
                  {t("services.extras.charge_hint")}
                </CustomText>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => respond("rejected")}
                disabled={submitting}
                className="rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.error, paddingVertical: 15, opacity: submitting ? 0.6 : 1 }}
              >
                <CustomText color="support_secondary" size="medium" boldness="bold" numberOfLines={1}>
                  {t("services.extras.confirm_reject")}
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setRejecting(false)}
                disabled={submitting}
                className="rounded-full items-center justify-center mt-2.5"
                style={{ paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.secondary }}
              >
                <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                  {t("general.cancel")}
                </CustomText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </DynamicSizingSheet>
  );
};

export default ExtraRequestSheet;
