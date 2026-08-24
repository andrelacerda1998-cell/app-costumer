import React from "react";
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useService } from "@/contexts/ServiceContext";
import { renderMoney } from "@/utils/money";
import { formatScheduledTime } from "@/utils/schedule";
import { ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import ServiceExtrasCard from "@/components/app/Services/ServiceExtrasCard";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Vista geral do serviço em curso (espelho da build 15 — booking_detail):
 * estado, resumo, técnico, valor e acesso ao acompanhamento em direto.
 * Só mostra dados reais do serviço; sem método de pagamento nem ETA
 * (não vêm no payload do serviço aberto).
 */
const ServiceOverview = () => {
  const { t } = useTranslation();
  const { openService, getOpenService } = useService();

  const goBack = () => {
    if (router.canGoBack()) return router.back();
    return router.replace("/(app)/(tabs)/home");
  };

  // Sem serviço em contexto (deep-link, reabertura da app, id inválido) tenta-se
  // ir buscá-lo uma vez. Antes ficava num "A carregar…" eterno, sem timeout nem
  // saída — um beco sem saída confirmado na auditoria de 2026-08-03.
  const [loadState, setLoadState] = React.useState<"idle" | "loading" | "failed">("idle");

  React.useEffect(() => {
    if (openService?.id || loadState !== "idle") return;
    setLoadState("loading");
    Promise.resolve(getOpenService())
      .then(() => setLoadState("idle"))
      .catch(() => setLoadState("failed"));
  }, [openService?.id, loadState]);

  if (!openService?.id) {
    const failed = loadState === "failed";
    return (
      <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
        <View className="px-5 pt-3 pb-2">
          <BackHeader
            backButtonColor="secondary"
            middleItem={() => (
              <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                {t("services.service_overview.header")}
              </CustomText>
            )}
            onBack={goBack}
          />
        </View>
        <View className="flex-1 rounded-t-3xl items-center justify-center px-8" style={{ backgroundColor: "#FAF7F2" }}>
          {failed ? (
            <>
              <Feather name="alert-circle" size={34} color={Colors.gray_medium} />
              <CustomText color="secondary" size="large" boldness="bold" classes="text-center mt-3">
                {t("services.service_overview.not_found_title")}
              </CustomText>
              <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mt-1 mb-5">
                {t("services.service_overview.not_found_subtitle")}
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
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={Colors.secondary} />
              <CustomText color="gray_medium" size="small" boldness="regular" classes="mt-3">
                {t("general.loading")}
              </CustomText>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const mins = openService?.service_type?.time;
  const durationLabel = (() => {
    if (typeof mins !== "number" || mins <= 0) return null;
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  })();

  const isScheduled = !!(openService?.scheduled || openService?.is_scheduled);
  // Só o início: scheduled_time_end é o tamanho da marcação (30 min), não uma
  // janela de chegada acordada. Ver utils/schedule.ts.
  const scheduledTime = formatScheduledTime(openService?.scheduled_time_start);
  const whenValue = isScheduled && openService?.scheduled_day
    ? `${openService.scheduled_day}${scheduledTime ? ` · ${scheduledTime}` : ""}`
    : t("services.service_overview.when_immediate");

  const addr = openService?.address;
  const addressLabel = addr
    ? [
        [addr.street_name, addr.street_number].filter(Boolean).join(" "),
        [addr.postal_code, addr.city].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const technicianName = openService?.vendor?.user?.name;
  // amount está garantidamente em cêntimos (renderMoney ÷100); price é um valor
  // de analytics de unidade não garantida — não o usar aqui.
  const paidValue = openService?.amount;

  const statusMeta = (() => {
    switch (openService?.status) {
      case ServiceStatus.ACCEPTED:
        return { label: t("services.service_overview.status_confirmed"), bg: "rgba(34,197,94,0.12)", color: Colors.success };
      case ServiceStatus.ARRIVED:
        return { label: t("services.service_overview.status_arrived"), bg: "rgba(34,197,94,0.12)", color: Colors.success };
      case ServiceStatus.SCHEDULED:
        return { label: t("services.service_overview.status_scheduled"), bg: "rgba(250,187,91,0.2)", color: Colors.secondary };
      case ServiceStatus.PENDING:
        return { label: t("services.service_overview.status_pending"), bg: "rgba(250,187,91,0.2)", color: Colors.secondary };
      case ServiceStatus.FINISHED:
        return { label: t("services.service_overview.status_finished"), bg: "rgba(228,227,227,0.6)", color: Colors.gray_medium };
      default:
        return { label: t("services.service_overview.status_confirmed"), bg: "rgba(34,197,94,0.12)", color: Colors.success };
    }
  })();

  const canCancel =
    openService?.status === ServiceStatus.ACCEPTED ||
    openService?.status === ServiceStatus.ARRIVED;

  const infoRow = (icon: React.ComponentProps<typeof Feather>["name"], label: string, value: string | null, highlight = false) =>
    value ? (
      <View className="flex-row items-start mb-4">
        <Feather name={icon} size={18} color={Colors.gray_medium} style={{ marginTop: 1 }} />
        <View className="w-24 ml-3">
          <CustomText color="gray_medium" size="small" boldness="regular">
            {label}
          </CustomText>
        </View>
        <View className="flex-1">
          <CustomText color="secondary" size={highlight ? "large" : "medium"} boldness={highlight ? "bold" : "semiBold"} numberOfLines={3}>
            {value}
          </CustomText>
        </View>
      </View>
    ) : null;

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {openService?.service_type?.name || t("services.service_overview.header")}
            </CustomText>
          )}
          onBack={goBack}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Resumo + estado */}
          <View className="flex-row items-center mb-4">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
            >
              <Ionicons name="flash" size={26} color={Colors.secondary} />
            </View>
            <View className="flex-1">
              <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1}>
                {t("services.service_overview.one_service")}
              </CustomText>
              {durationLabel && (
                <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                  {t("services.service_overview.total_duration", { duration: durationLabel })}
                </CustomText>
              )}
            </View>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: statusMeta.bg }}>
              <CustomText color="secondary" size="small" boldness="semiBold" numberOfLines={1} style={{ color: statusMeta.color }}>
                {statusMeta.label}
              </CustomText>
            </View>
          </View>

          {/* Acompanhar em direto */}
          {openService?.status !== ServiceStatus.FINISHED && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.navigate(`/(app)/(pages)/(services)/(open)/progress/${openService?.id}`)}
              className="rounded-full items-center justify-center flex-row mb-5"
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: 16,
                shadowColor: Colors.primary,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 5 },
                elevation: 6,
              }}
            >
              <Feather name="map" size={18} color={Colors.secondary} />
              <CustomText color="secondary" size="large" boldness="bold" classes="ml-2" numberOfLines={1}>
                {t("services.service_overview.track_live")}
              </CustomText>
            </TouchableOpacity>
          )}

          {/* Linha do serviço */}
          <View className="bg-support_secondary rounded-2xl p-4 mb-4 flex-row items-center" style={CARD_SHADOW}>
            <Ionicons name="flash" size={18} color={Colors.secondary} />
            <CustomText color="secondary" size="medium" boldness="semiBold" classes="ml-3 flex-1" numberOfLines={2}>
              {openService?.service_type?.name}
            </CustomText>
            {durationLabel && (
              <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                {durationLabel}
              </CustomText>
            )}
          </View>

          {/* Info principal */}
          <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
            {infoRow("clock", t("services.service_overview.when"), whenValue)}
            {infoRow("clock", t("services.service_overview.duration"), durationLabel)}
            {infoRow("map-pin", t("services.service_overview.location"), addressLabel)}
            {infoRow("user", t("services.service_overview.technician"), technicianName ?? null)}
            {typeof paidValue === "number" && (
              <View className="flex-row items-start">
                <Feather name="credit-card" size={18} color={Colors.gray_medium} style={{ marginTop: 1 }} />
                <View className="w-24 ml-3">
                  <CustomText color="gray_medium" size="small" boldness="regular">
                    {t("services.service_overview.paid")}
                  </CustomText>
                </View>
                <View className="flex-1">
                  <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1}>
                    {renderMoney(paidValue)}
                  </CustomText>
                </View>
              </View>
            )}
          </View>

          {/* Tempo extra / peças pedidas pelo técnico */}
          <ServiceExtrasCard />

          {/* Notas do pedido */}
          {!!openService?.customer_notes && (
            <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
              <View className="flex-row items-center mb-2">
                <Feather name="edit-3" size={16} color={Colors.secondary} />
                <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2">
                  {t("services.service_overview.notes_title")}
                </CustomText>
              </View>
              <CustomText color="gray_medium" size="small" boldness="regular">
                {openService.customer_notes}
              </CustomText>
            </View>
          )}

          {/* Chat com o técnico */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/(app)/(pages)/(services)/(open)/(chat)/service/${openService?.id}`)}
            className="bg-support_secondary rounded-2xl p-4 mb-4 flex-row items-center"
            style={CARD_SHADOW}
          >
            <View className="h-11 w-11 rounded-full overflow-hidden mr-3 flex-shrink-0">
              {openService?.vendor?.user?.avatar?.small ? (
                <Image source={{ uri: openService.vendor.user.avatar.small }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full items-center justify-center" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
                  <Feather name="user" size={20} color={Colors.secondary} />
                </View>
              )}
            </View>
            <View className="flex-1">
              <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                {t("services.service_overview.chat_title")}
              </CustomText>
              {!!technicianName && (
                <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                  {t("services.service_overview.chat_subtitle", { name: technicianName })}
                </CustomText>
              )}
            </View>
            <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
          </TouchableOpacity>

          {/* Cancelar */}
          {canCancel && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/(app)/(pages)/(services)/(open)/cancel/${openService?.id}`)}
              className="items-center justify-center flex-row py-3 mt-1"
            >
              <Feather name="x" size={16} color={Colors.error} />
              <CustomText color="error" size="medium" boldness="semiBold" classes="ml-2" numberOfLines={1}>
                {t("services.service_overview.cancel")}
              </CustomText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ServiceOverview;
