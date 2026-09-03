import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import ServiceScopeCard from "@/components/app/Services/ServiceScopeCard";
import { Colors } from "@/constants/Colors";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useApi } from "@/contexts/ApiContext";
import { useDialog } from "@/contexts/DialogContext";
import { useService } from "@/contexts/ServiceContext";
import { renderMoney } from "@/utils/money";
import { formatScheduledTime } from "@/utils/schedule";
import { formatServiceAddress, serviceAddressExtra } from "@/utils/serviceContact";
import {
  cancellationPenaltyAmount,
  cancellationPenaltyRatio,
  hoursUntilSchedule,
} from "@/utils/scheduleCancellation";
import CheckMark from "@/assets/icons/check-mark";
import XIcon from "@/assets/icons/x";

/**
 * Detalhe de um serviço agendado.
 *
 * A lista de agendamentos mostrava o essencial e não tinha para onde levar:
 * quem quisesse confirmar a morada, o que ficou contratado ou o que ia pagar
 * não tinha onde ver. Aqui está tudo num sítio, e o cancelamento passou para
 * cá — junto das condições, em vez de um botão solto ao lado de cada cartão.
 *
 * O agendamento em si vem do contexto (já foi carregado); o detalhe do serviço
 * (morada, o que inclui, valor) é pedido ao servidor, porque a listagem de
 * agendamentos não o traz.
 */

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const ScheduleDetail = () => {
  const { t } = useTranslation();
  const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();
  const { scheduledServices, setScheduledServices } = useService();
  const { api } = useApi();
  const { openDialog, closeDialog } = useDialog();
  const insets = useSafeAreaInsets();

  const schedule = useMemo(
    () => (scheduledServices ?? []).find((item) => String(item.id) === String(scheduleId)) ?? null,
    [scheduledServices, scheduleId],
  );

  const [service, setService] = useState<any | null>(null);
  const [serviceType, setServiceType] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const serviceId = schedule?.service_id;
    if (!serviceId) {
      setLoading(false);
      return;
    }
    let alive = true;
    api
      .get(API_ROUTES.GET_SERVICE_DETAILS(String(serviceId)))
      .then(({ data }) => {
        if (alive) setService(data?.data?.service ?? null);
      })
      .catch(() => {
        // Sem detalhe fica o que o agendamento já traz — nome, data, técnico e
        // valor. Melhor isso do que um ecrã de erro por causa do que falta.
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [schedule?.service_id]);

  /**
   * O que o serviço inclui e quanto tempo demora são do TIPO de serviço, e a
   * listagem de agendamentos só traz o nome. Vai-se ao catálogo — o mesmo
   * pedido que o separador Explorar faz — em vez de deixar o ecrã sem metade
   * da informação quando o detalhe do serviço não chega.
   */
  useEffect(() => {
    const typeId = schedule?.service_type?.id;
    if (!typeId) return;
    let alive = true;
    api
      .post(API_ROUTES.POST_SEARCH_OPERATION_AREAS, { operation_areas: [] })
      .then(({ data }) => {
        if (!alive) return;
        const list = data?.data?.services_types ?? [];
        setServiceType(list.find((item: any) => item?.id === typeId) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [schedule?.service_type?.id]);

  const goBack = () => {
    if (router.canGoBack()) return router.back();
    return router.replace("/(app)/(tabs)/home");
  };

  const capitalize = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
  const includes = (service?.service_type?.includes ?? serviceType?.includes ?? []).map(capitalize);
  const excludes = (service?.service_type?.excludes ?? serviceType?.excludes ?? []).map(capitalize);

  const serviceName = schedule?.service_type?.name || service?.service_type?.name || t("schedules_screen.service_fallback");
  const dateLabel = schedule?.scheduled_day
    ? new Date(`${schedule.scheduled_day}T00:00:00`).toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : null;
  const timeLabel = formatScheduledTime(schedule?.scheduled_time_start);
  // A morada vem do detalhe do serviço; alguns payloads de agendamento também
  // a trazem — aceitar as duas evita a linha vazia quando só existe a segunda.
  const scheduleAddress = (schedule as any)?.address ?? null;
  const addressLabel = formatServiceAddress(service?.address ?? scheduleAddress);
  const addressExtra = serviceAddressExtra(service?.address ?? scheduleAddress);
  const technicianName = schedule?.vendor?.name || service?.vendor?.user?.name || null;

  const minutes = service?.service_type?.time ?? serviceType?.time;
  const durationLabel = (() => {
    if (typeof minutes !== "number" || minutes <= 0) return null;
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  })();

  // schedule.price vem em euros; service.amount em cêntimos. Preferir o valor do
  // serviço, que é o que a plataforma tem cativo.
  const amountCents =
    typeof service?.amount === "number"
      ? Math.abs(service.amount)
      : typeof schedule?.price === "number"
        ? Math.round(schedule.price * 100)
        : typeof serviceType?.starts_from === "number"
          ? Math.round(serviceType.starts_from * 100)
          : null;

  /**
   * "Valor pago" só quando o dinheiro já saiu de facto. Num agendamento o
   * valor está CATIVO até o serviço fechar — dizer "pago" antes disso era
   * dar por feito um pagamento que ainda pode ser libertado.
   */
  const isPaid =
    service?.payment_order?.status === "success" ||
    service?.paymentOrder?.status === "success" ||
    service?.status === "Closed";

  const hoursLeft = hoursUntilSchedule(schedule?.scheduled_day, schedule?.scheduled_time_start);
  const penaltyRatio = cancellationPenaltyRatio(hoursLeft);
  const penaltyCents = cancellationPenaltyAmount(amountCents, hoursLeft);
  const penaltyPercent = Math.round(penaltyRatio * 100);

  const cancelSchedule = async () => {
    if (!schedule?.id || canceling) return;
    setCanceling(true);
    try {
      await api.post(API_ROUTES.CUSTOMER_CANCEL_SCHEDULE(String(schedule.id)));
      setScheduledServices((prev) => (prev ? prev.filter((item) => item.id !== schedule.id) : prev));
      closeDialog();
      openDialog({
        icon: <CheckMark color={Colors.secondary} />,
        title: t("schedules_screen.cancel_success.title"),
        subtitle: t("schedules_screen.cancel_success.subtitle"),
        closeAfterMSeconds: 3000,
        closeOnClickOutside: true,
      });
      goBack();
    } catch {
      closeDialog();
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: t("errors.occurred_an_error"),
        closeAfterMSeconds: 3000,
        closeOnClickOutside: true,
      });
    } finally {
      setCanceling(false);
    }
  };

  /**
   * Confirmação em cartão claro, com a penalização em vermelho e o valor que
   * volta para o cliente ao lado: o diálogo escuro da app dava a mesma
   * importância visual a "vais perder 45 €" e a qualquer outro aviso.
   */
  const CancelDialogContent = () => (
    <View className="w-full rounded-3xl p-6" style={{ backgroundColor: Colors.support_secondary }}>
      <View className="items-center">
        <View
          className="w-14 h-14 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: penaltyRatio > 0 ? "rgba(237,73,73,0.12)" : "rgba(250,187,91,0.2)" }}
        >
          <Feather
            name={penaltyRatio > 0 ? "alert-triangle" : "calendar"}
            size={26}
            color={penaltyRatio > 0 ? Colors.error : Colors.secondary}
          />
        </View>
        <CustomText color="secondary" size="large" boldness="bold" classes="text-center">
          {t("schedules_screen.cancel_confirm.title")}
        </CustomText>
        <CustomText color="gray_strong" size="small" boldness="regular" classes="text-center mt-1">
          {t("schedules_screen.cancel_confirm.subtitle", { service: serviceName })}
        </CustomText>
      </View>

      {penaltyRatio > 0 && !!penaltyCents && (
        <View
          className="rounded-2xl p-4 mt-4"
          style={{ backgroundColor: "rgba(237,73,73,0.08)", borderWidth: 1, borderColor: "rgba(237,73,73,0.3)" }}
        >
          <View className="flex-row items-center justify-between">
            <CustomText color="error" size="small" boldness="semiBold" classes="flex-1 mr-2">
              {t("schedules_screen.cancel_confirm.penalty_label", { percent: penaltyPercent })}
            </CustomText>
            <CustomText color="error" size="large" boldness="bolder">
              {renderMoney(penaltyCents)}
            </CustomText>
          </View>
          {typeof amountCents === "number" && amountCents > penaltyCents && (
            <View className="flex-row items-center justify-between mt-2 pt-2" style={{ borderTopWidth: 1, borderTopColor: "rgba(237,73,73,0.2)" }}>
              <CustomText color="gray_strong" size="small" boldness="regular" classes="flex-1 mr-2">
                {t("schedules_screen.cancel_confirm.refund_label")}
              </CustomText>
              <CustomText color="secondary" size="small" boldness="bold">
                {renderMoney(amountCents - penaltyCents)}
              </CustomText>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          closeDialog();
          cancelSchedule();
        }}
        className="rounded-full items-center justify-center mt-5"
        style={{ paddingVertical: 15, backgroundColor: Colors.error }}
      >
        <CustomText color="support_secondary" size="medium" boldness="bold" numberOfLines={1}>
          {t("schedules_screen.cancel_confirm.confirm")}
        </CustomText>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={closeDialog}
        className="rounded-full items-center justify-center mt-2"
        style={{ paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.secondary }}
      >
        <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
          {t("schedules_screen.cancel_confirm.keep")}
        </CustomText>
      </TouchableOpacity>
    </View>
  );

  const confirmCancel = () => {
    openDialog({ customContent: <CancelDialogContent />, closeOnClickOutside: true });
  };

  const infoRow = (
    icon: React.ComponentProps<typeof Feather>["name"],
    label: string,
    value: string | null,
    highlight = false,
    hint?: string | null,
    last = false,
  ) =>
    value ? (
      <View className={`flex-row items-center ${last ? "" : "mb-3 pb-3 border-b border-support_primary"}`}>
        <Feather name={icon} size={17} color={Colors.secondary} />
        <View className="ml-3 mr-3" style={{ flexShrink: 1 }}>
          <CustomText color="secondary" size="small" boldness="regular" numberOfLines={2}>
            {label}
          </CustomText>
        </View>
        <View className="flex-1 items-end">
          <CustomText
            color="secondary"
            size={highlight ? "large" : "medium"}
            boldness={highlight ? "bold" : "semiBold"}
            numberOfLines={2}
            classes="text-right"
          >
            {value}
          </CustomText>
          {!!hint && (
            <CustomText color="gray_strong" size="extraSmall" boldness="regular" classes="text-right">
              {hint}
            </CustomText>
          )}
        </View>
      </View>
    ) : null;

  if (!schedule) {
    return (
      <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
        <View className="px-5 pt-3 pb-2">
          <BackHeader
            backButtonColor="secondary"
            middleItem={() => (
              <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                {t("schedules_screen.detail_header")}
              </CustomText>
            )}
            onBack={goBack}
          />
        </View>
        <View className="flex-1 rounded-t-3xl items-center justify-center px-8" style={{ backgroundColor: "#FAF7F2" }}>
          <Feather name="calendar" size={34} color={Colors.gray_medium} />
          <CustomText color="secondary" size="large" boldness="bold" classes="text-center mt-3">
            {t("schedules_screen.not_found_title")}
          </CustomText>
          <CustomText color="gray_strong" size="small" boldness="regular" classes="text-center mt-1 mb-5">
            {t("schedules_screen.not_found_subtitle")}
          </CustomText>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={goBack}
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: Colors.primary }}
          >
            <CustomText color="secondary" size="medium" boldness="bold">
              {t("services.service_overview.not_found_back")}
            </CustomText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {serviceName}
            </CustomText>
          )}
          onBack={goBack}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Quando é — em destaque, que é a razão de abrir este ecrã. */}
          <View
            className="rounded-2xl px-4 py-4 mb-4 flex-row items-center"
            style={{ backgroundColor: Colors.primary }}
          >
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: Colors.secondary }}
            >
              <Feather name="calendar" size={22} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={2}>
                {dateLabel ?? t("schedules_screen.time_fallback")}
              </CustomText>
              {!!timeLabel && (
                <CustomText color="secondary" size="small" boldness="semiBold">
                  {t("schedules_screen.at_hour", { time: timeLabel })}
                </CustomText>
              )}
            </View>
          </View>

          <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
            {infoRow("map-pin", t("services.service_overview.location"), addressLabel)}
            {infoRow("corner-down-right", t("services.service_overview.address_extra"), addressExtra)}
            {infoRow("user", t("services.service_overview.technician"), technicianName)}
            {infoRow("clock", t("services.service_overview.duration"), durationLabel)}
            {typeof amountCents === "number" &&
              infoRow(
                "credit-card",
                isPaid
                  ? t("services.service_overview.paid")
                  : t("schedules_screen.amount_to_pay"),
                renderMoney(amountCents) || null,
                true,
                t("services.checkout.resume.vat_included"),
                true,
              )}
          </View>

          {loading && !service && (
            <View className="items-center py-4">
              <ActivityIndicator color={Colors.secondary} />
            </View>
          )}

          <ServiceScopeCard
            title={t("services.select_service_type.includes")}
            items={includes}
            tone="included"
          />
          <ServiceScopeCard
            title={t("services.select_service_type.excludes")}
            items={excludes}
            tone="excluded"
          />

          {/* Condições de cancelamento, à letra do que o servidor faz
              (CancellationPolicy::isChargeable): enquanto o técnico não sai,
              cancelar não custa nada. */}
          <View
            className="rounded-2xl p-4 mt-1 flex-row items-start"
            style={
              penaltyRatio > 0
                ? { backgroundColor: "rgba(237,73,73,0.08)", borderWidth: 1, borderColor: "rgba(237,73,73,0.25)" }
                : { backgroundColor: "rgba(250,187,91,0.15)" }
            }
          >
            <Feather
              name={penaltyRatio > 0 ? "alert-triangle" : "info"}
              size={16}
              color={penaltyRatio > 0 ? Colors.error : Colors.secondary}
              style={{ marginTop: 2 }}
            />
            <CustomText color="secondary" size="small" boldness="regular" classes="ml-2 flex-1">
              {penaltyRatio <= 0
                ? t("schedules_screen.cancel_policy_free")
                : penaltyCents
                  ? t("schedules_screen.cancel_policy_charge", {
                      percent: penaltyPercent,
                      amount: renderMoney(penaltyCents),
                    })
                  : t("schedules_screen.cancel_policy_charge_percent", { percent: penaltyPercent })}
            </CustomText>
          </View>
        </ScrollView>

        <View
          className="px-5 pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: "#FAF7F2",
            borderTopWidth: 1,
            borderTopColor: Colors.support_primary,
          }}
        >
          <CustomTouchableOpacity
            size="large"
            type="danger_outline"
            text={t("services.cancel.title")}
            textColor="error"
            textBoldness="bold"
            onPress={confirmCancel}
            disabled={canceling}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ScheduleDetail;
