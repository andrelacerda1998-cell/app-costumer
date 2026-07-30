import React, { useEffect, useMemo, useState } from "react";
import { View, TextInput } from "react-native";
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
  const { extraId } = useLocalSearchParams();

  const extra = useMemo(
    () => serviceExtras.find((e) => String(e.id) === String(extraId)) ?? null,
    [serviceExtras, extraId]
  );

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
    api
      .post(API_ROUTES.CUSTOMER_SERVICE_EXTRA_RESPOND(openService.id, extra.id), {
        status,
        ...(status === "rejected" && reason.trim() ? { rejection_reason: reason.trim() } : {}),
      })
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
            {isTime ? t("services.extras.time_request_title") : t("services.extras.part_request_title")}
          </CustomText>
          <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mt-1">
            {isTime
              ? t("services.extras.time_request_body", { minutes: extra.minutes ?? 0 })
              : t("services.extras.part_request_body")}
          </CustomText>
        </View>

        <View className="bg-support_secondary rounded-2xl p-4 mb-2" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <View className="flex-row items-center justify-between">
            <CustomText color="gray_medium" size="small" boldness="regular" classes="flex-1 mr-2" numberOfLines={2}>
              {itemLabel}
            </CustomText>
            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1}>
              {hasCost ? renderMoney(extra.amount) : t("services.extras.no_additional_cost")}
            </CustomText>
          </View>
          {hasCost && (
            <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-1">
              {t("services.extras.additional_cost")}
            </CustomText>
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
              <CustomTouchableOpacity
                size="large"
                type="primary"
                textColor="secondary"
                textBoldness="bold"
                text={t("services.extras.approve")}
                onPress={() => respond("approved")}
                disabled={submitting}
                className="mb-2"
              />
              <CustomTouchableOpacity
                size="large"
                type="transparent"
                textColor="error"
                textBoldness="semiBold"
                text={t("services.extras.reject")}
                onPress={() => setRejecting(true)}
                disabled={submitting}
              />
            </>
          ) : (
            <>
              <CustomTouchableOpacity
                size="large"
                type="danger"
                textColor="support_secondary"
                textBoldness="bold"
                text={t("services.extras.confirm_reject")}
                onPress={() => respond("rejected")}
                disabled={submitting}
                className="mb-2"
              />
              <CustomTouchableOpacity
                size="large"
                type="transparent"
                textColor="gray_medium"
                textBoldness="regular"
                text={t("general.cancel")}
                onPress={() => setRejecting(false)}
                disabled={submitting}
              />
            </>
          )}
        </View>
      </View>
    </DynamicSizingSheet>
  );
};

export default ExtraRequestSheet;
