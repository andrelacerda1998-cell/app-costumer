import React from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useService } from "@/contexts/ServiceContext";
import { useApi } from "@/contexts/ApiContext";
import { useDialog } from "@/contexts/DialogContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import useEcho from "@/hooks/echo";
import XIcon from "@/assets/icons/x";
import { renderMoney } from "@/utils/money";
import { formatScheduledTime } from "@/utils/schedule";
import { ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import ServiceExtrasCard from "@/components/app/Services/ServiceExtrasCard";
import ServiceScopeCard from "@/components/app/Services/ServiceScopeCard";
import ServiceProgressBar from "@/components/app/Services/ServiceProgressBar";
import { formatServiceAddress, serviceAddressExtra } from "@/utils/serviceContact";

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
  const { openService, getOpenService, setOpenService, getHistoryServices } = useService();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const echo = useEcho();
  const [isClosing, setIsClosing] = React.useState(false);

  /**
   * Confirmar a conclusão fecha o serviço e leva direto à avaliação.
   *
   * Antes eram três passos para a mesma coisa: este botão abria um ecrã que só
   * repetia a pergunta, esse abria um diálogo, e só então se fechava. O botão
   * é já a confirmação — daí não haver aqui um diálogo por cima.
   */
  const confirmCompletion = () => {
    if (!openService?.id || isClosing) return;
    setIsClosing(true);

    api.post(API_ROUTES.POST_CLOSE_SERVICE(String(openService.id)))
      .then(({ data }) => {
        const service = data.data.service;
        if (echo) echo.leaveChannel(`common.services.${service.id}`);
        setOpenService(null);
        getHistoryServices(0);
        router.dismissTo("/(app)/(tabs)/home");
        router.navigate({
          pathname: "/(app)/(bottom-sheets)/(services)/rate/[serviceId]",
          params: { serviceId: service.id, service: JSON.stringify(service) },
        });
      })
      .catch(() => {
        openDialog({
          icon: <XIcon color={Colors.secondary} />,
          title: t("services.close.error.title"),
          subtitle: t("services.close.error.subtitle"),
          closeAfterMSeconds: 2000,
          closeOnClickOutside: true,
        });
      })
      .finally(() => setIsClosing(false));
  };
  const insets = useSafeAreaInsets();

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

  // Com o técnico já no local, "Imediato" descreve como o pedido foi feito — e
  // isso já é passado. A hora a que começou diz mais.
  const startedAtLabel = (() => {
    if (!openService?.arrived_at) return null;
    const started = new Date(openService.arrived_at);
    if (Number.isNaN(started.getTime())) return null;
    return started.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  })();

  const isSettled = openService?.status === ServiceStatus.CLOSED;

  // O payload do serviço aberto envia a morada como `name`; a forma composta
  // (street_name + ...) só aparece noutros endpoints. Ver utils/serviceContact.
  const addressLabel = formatServiceAddress(openService?.address);
  const addressExtra = serviceAddressExtra(openService?.address);

  const technicianName = openService?.vendor?.user?.name;
  const capitalize = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
  const serviceIncludes = (openService?.service_type?.includes ?? []).map(capitalize);
  const serviceExcludes = (openService?.service_type?.excludes ?? []).map(capitalize);
  // amount está garantidamente em cêntimos (renderMoney ÷100); price é um valor
  // de analytics de unidade não garantida — não o usar aqui.
  const paidValue = openService?.amount;


  const canCancel =
    openService?.status === ServiceStatus.ACCEPTED ||
    openService?.status === ServiceStatus.ARRIVED;

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
        <Feather name={icon} size={17} color={Colors.gray_medium} />
        <View className="w-20 ml-3">
          <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
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
            <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="text-right">
              {hint}
            </CustomText>
          )}
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
          {/* Onde vai o serviço */}
          {openService?.status !== ServiceStatus.CANCELED && (
            <ServiceProgressBar service={openService} />
          )}

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

          {/* Info principal */}
          <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
            {startedAtLabel
              ? infoRow("play-circle", t("services.service_overview.started_at"), startedAtLabel)
              : infoRow("clock", t("services.service_overview.when"), whenValue)}
            {infoRow("clock", t("services.service_overview.duration"), durationLabel)}
            {infoRow("map-pin", t("services.service_overview.location"), addressLabel)}
            {infoRow("corner-down-right", t("services.service_overview.address_extra"), addressExtra)}
            {infoRow("user", t("services.service_overview.technician"), technicianName ?? null)}
            {/* "Pago" só depois de fechado: até lá o valor está cativo, não
                cobrado — a captura acontece em CloseService (ou num cancelamento
                cobrado). O "IVA incluído" repete aqui a promessa feita na
                escolha do técnico; omiti-la no fim levantava a dúvida. */}
            {typeof paidValue === "number" &&
              infoRow(
                "credit-card",
                isSettled
                  ? t("services.service_overview.paid")
                  : t("services.service_overview.service_value"),
                renderMoney(paidValue) || null,
                true,
                t("services.checkout.resume.vat_included"),
                true,
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

          {/* O que está e não está incluído, fechado por omissão. Ocupa o
              lugar do cartão do técnico: ligar e conversar vivem no ecrã de
              acompanhamento, que é onde se fala com ele em direto. */}
          <ServiceScopeCard
            title={t("services.select_service_type.includes")}
            items={serviceIncludes}
            tone="included"
          />
          <ServiceScopeCard
            title={t("services.select_service_type.excludes")}
            items={serviceExcludes}
            tone="excluded"
          />

        </ScrollView>

        {/* Cancelar: fixo no fundo para estar sempre à mão, sem obrigar a
            percorrer o ecrã todo. Contorno vermelho em vez de preenchido —
            é uma ação destrutiva, deve dar nas vistas sem convidar ao toque. */}
        {openService?.status === ServiceStatus.FINISHED && (
          <View
            className="px-5 pt-3"
            style={{
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: "#FAF7F2",
              borderTopWidth: 1,
              borderTopColor: Colors.support_primary,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={confirmCompletion}
              disabled={isClosing}
              className="rounded-full items-center justify-center flex-row"
              style={{
                paddingVertical: 16,
                opacity: isClosing ? 0.6 : 1,
                backgroundColor: Colors.primary,
                shadowColor: Colors.primary,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 5 },
                elevation: 6,
              }}
            >
              <Feather name="check-circle" size={18} color={Colors.secondary} />
              <CustomText color="secondary" size="large" boldness="bold" classes="ml-2" numberOfLines={1}>
                {t("services.service_overview.confirm_completion")}
              </CustomText>
            </TouchableOpacity>
          </View>
        )}

        {canCancel && (
          <View
            className="px-5 pt-3"
            style={{
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: "#FAF7F2",
              borderTopWidth: 1,
              borderTopColor: Colors.support_primary,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push(`/(app)/(pages)/(services)/(open)/cancel/${openService?.id}`)}
              className="rounded-full items-center justify-center flex-row"
              style={{
                paddingVertical: 15,
                borderWidth: 1.5,
                borderColor: Colors.error,
                backgroundColor: "rgba(237,73,73,0.06)",
              }}
            >
              <Feather name="x" size={18} color={Colors.error} />
              <CustomText color="error" size="large" boldness="bold" classes="ml-2" numberOfLines={1}>
                {t("services.service_overview.cancel")}
              </CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ServiceOverview;
