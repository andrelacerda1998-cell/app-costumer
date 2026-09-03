import { Colors } from '@/constants/Colors';
import { AntDesign, Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import BackHeader from '@/components/app/BackHeader';
import { CustomText } from "@/components/CustomText";
import IDomParser from "advanced-html-parser";
import { router } from "expo-router";
import { ServiceInterface, ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router/build/hooks";
import i18n from "@/translation";
import { useService } from "@/contexts/ServiceContext";
import * as WebBrowser from 'expo-web-browser';
import { renderMoney } from "@/utils/money";
import { formatServiceAddress, serviceAddressExtra } from "@/utils/serviceContact";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Detalhe de um serviço do histórico.
 *
 * Reescrito para o mesmo registo do resto da app: fundo claro, cabeçalho âmbar
 * e cartões brancos. Estava em fundo preto com uma chave inglesa de 90px ao
 * centro e três campos — parecia outra aplicação, e o cartão do histórico
 * promete "detalhes e fatura".
 */
const HistoryServiceDetail = () => {
  const { t } = useTranslation();
  const { serviceId } = useLocalSearchParams();
  const { historyServices, setServiceToRequest } = useService();
  const insets = useSafeAreaInsets();
  const [service, setService] = useState<ServiceInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!serviceId) return;
    const found = historyServices.find(
      (item: ServiceInterface) => Number(item.id) === Number(serviceId),
    );
    if (found) setService(found);
    setIsLoading(false);
  }, [historyServices, serviceId]);

  const goBack = () => {
    if (router.canGoBack()) return router.back();
    return router.replace("/(app)/(tabs)/history");
  };

  const desc = (text: string) => {
    if (!text || text[0] !== "<") return text;
    try {
      return IDomParser.parse(text).documentElement?.textContent ?? text;
    } catch {
      return text;
    }
  };

  const renderDate = (date?: string | null) => {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    const locale = i18n.language === 'pt_PT' ? 'pt-PT' : 'en-US';
    return parsed.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const goToRateService = (target: ServiceInterface) => {
    router.push({
      pathname: "/(app)/(bottom-sheets)/(services)/rate/[serviceId]",
      params: { serviceId: target.id, service: JSON.stringify(target) },
    });
  };

  const requestAgain = () => {
    if (!service?.service_type) return;
    setServiceToRequest({ service_type: service.service_type });
    router.navigate('/(app)/(modals)/(services)/(request)/select-service-type/info');
  };

  const openInvoice = async () => {
    if (service?.invoice) await WebBrowser.openBrowserAsync(service.invoice);
  };

  const isCanceled = service?.status === ServiceStatus.CANCELED;
  const wasRefunded = service?.payment_status === 'Refunded' || service?.payment_status === 'Canceled';
  const rating = service?.rating_by_customer;
  const hasRating = rating !== null && rating !== undefined && rating >= 1;
  const canRate = !isCanceled && !hasRating && service?.status === ServiceStatus.CLOSED;
  const addressLabel = formatServiceAddress(service?.address);
  const addressExtra = serviceAddressExtra(service?.address);
  const technicianName = service?.vendor?.user?.name;
  const technicianAvatar = service?.vendor?.user?.avatar?.small;
  const description = desc(service?.service_type?.description || "");
  const areaName = service?.service_type?.operation_area?.name;
  const durationMinutes = service?.service_type?.time;
  const durationLabel = (() => {
    if (typeof durationMinutes !== "number" || durationMinutes <= 0) return null;
    // Aqui a linha já tem rótulo próprio ("Tempo de execução"), por isso só o
    // valor — a frase inteira das chaves duration_* repetiria o rótulo.
    if (durationMinutes < 60) return `${durationMinutes} min`;
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  })();

  const infoRow = (
    icon: React.ComponentProps<typeof Feather>["name"],
    label: string,
    value: string | null,
    highlight = false,
    last = false,
    hint?: string | null,
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
              {t('services.history.see_details')}
            </CustomText>
          )}
          onBack={goBack}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        {isLoading && !service ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.secondary} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
              {/* Resumo centrado: o que foi, em que categoria, em que estado
                  e quanto custou. Antes o valor estava perdido no meio da
                  tabela e o topo do ecrã alinhado à esquerda. */}
              <View className="items-center mb-5 mt-2">
                <CustomText color="secondary" size="extraLarge" boldness="bold" numberOfLines={2} classes="text-center">
                  {service?.service_type?.name || t('services.service.no_area')}
                </CustomText>
                {!!areaName && (
                  <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mt-0.5">
                    {areaName}
                  </CustomText>
                )}
                <View className="flex-row items-center mt-2">
                  <View
                    className="rounded-full mr-1.5"
                    style={{ width: 7, height: 7, backgroundColor: isCanceled ? Colors.error : Colors.success }}
                  />
                  <CustomText
                    size="small"
                    color="secondary"
                    boldness="bold"
                    style={{ color: isCanceled ? Colors.error : Colors.success }}
                  >
                    {isCanceled
                      ? t('services.history.status_canceled')
                      : t('services.history.status_completed')}
                  </CustomText>
                </View>
              </View>

              {/* Dados do serviço */}
              <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
                {infoRow("calendar", t('services.service.history.labels.date'), renderDate(service?.created_at))}
                {infoRow("clock", t('services.service_overview.duration'), durationLabel)}
                {infoRow("map-pin", t('services.service_overview.location'), addressLabel)}
                {infoRow("corner-down-right", t('services.service_overview.address_extra'), addressExtra)}
                {/* Num serviço cancelado nada foi pago: chamar-lhe "valor pago"
                    seria mentir sobre dinheiro. */}
                {infoRow(
                  "credit-card",
                  isCanceled
                    ? t('services.service_overview.service_value')
                    : t('services.service.history.labels.paid_value'),
                  isCanceled && wasRefunded
                    ? t('services.history.not_charged')
                    : (renderMoney(service?.amount ?? null) || null),
                  true,
                  true,
                  isCanceled ? null : t('services.checkout.resume.vat_included'),
                )}
              </View>

              {/* Técnico */}
              {!!technicianName && (
                <View className="bg-support_secondary rounded-2xl p-4 mb-4 flex-row items-center justify-between" style={CARD_SHADOW}>
                  <CustomText color="gray_medium" size="small" boldness="regular">
                    {t('services.service_overview.technician')}
                  </CustomText>
                  <View className="flex-row items-center flex-1 justify-end ml-3">
                    {technicianAvatar ? (
                      <View className="h-7 w-7 rounded-full overflow-hidden mr-2">
                        <Image source={{ uri: technicianAvatar }} className="w-full h-full" />
                      </View>
                    ) : null}
                    <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                      {technicianName}
                    </CustomText>
                  </View>
                </View>
              )}

              {/* A avaliação que foi dada */}
              {hasRating && (
                <View className="bg-support_secondary rounded-2xl p-4 mb-4 flex-row items-center justify-between" style={CARD_SHADOW}>
                  <CustomText color="gray_medium" size="small" boldness="regular">
                    {t('services.service.history.your_rating')}
                  </CustomText>
                  <View className="flex-row items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <AntDesign
                        key={star}
                        name="star"
                        size={20}
                        color={(rating ?? 0) >= star ? Colors.primary : Colors.support_primary}
                        style={{ marginLeft: 4 }}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* O que o técnico registou no fim do trabalho. Vinha no payload
                  e não era mostrado em lado nenhum. */}
              {!!service?.vendor_notes && (
                <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
                  <View className="flex-row items-center mb-2">
                    <Feather name="clipboard" size={16} color={Colors.secondary} />
                    <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2">
                      {t('services.service.history.vendor_notes_title')}
                    </CustomText>
                  </View>
                  <CustomText color="gray_strong" size="small" boldness="regular">
                    {service.vendor_notes}
                  </CustomText>
                </View>
              )}

              {/* Descrição do tipo de serviço, quando existe */}
              {!!description && (
                <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
                  <CustomText color="gray_strong" size="small" boldness="regular">
                    {description}
                  </CustomText>
                </View>
              )}

              {/* Fatura: a linha aparece sempre num serviço concluído, mesmo
                  antes de a fatura existir — de outro modo o cliente não sabia
                  que ia haver uma, nem onde a procurar. Sem ficheiro, fica
                  inerte e diz porquê. */}
              {!isCanceled && (
                <TouchableOpacity
                  activeOpacity={service?.invoice ? 0.85 : 1}
                  disabled={!service?.invoice}
                  onPress={openInvoice}
                  className="bg-support_secondary rounded-2xl p-4 mb-4 flex-row items-center"
                  style={CARD_SHADOW}
                >
                  <View
                    className="h-11 w-11 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: service?.invoice ? "rgba(250,187,91,0.25)" : Colors.support_primary }}
                  >
                    <Feather
                      name="file-text"
                      size={20}
                      color={service?.invoice ? Colors.secondary : Colors.gray_medium}
                    />
                  </View>
                  <View className="flex-1">
                    <CustomText
                      color={service?.invoice ? "secondary" : "gray_medium"}
                      size="medium"
                      boldness="bold"
                      numberOfLines={1}
                    >
                      {t('services.service.history.download_invoice')}
                    </CustomText>
                    {!service?.invoice && (
                      <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={2}>
                        {t('services.service.history.invoice_pending')}
                      </CustomText>
                    )}
                  </View>
                  {!!service?.invoice && (
                    <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.navigate({
                  pathname: "/(app)/(modals)/support-ticket",
                  params: { serviceId: String(service?.id ?? "") },
                })}
                className="bg-support_secondary rounded-2xl p-4 mb-4 flex-row items-center"
                style={CARD_SHADOW}
              >
                <View
                  className="h-11 w-11 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "rgba(250,187,91,0.25)" }}
                >
                  <Feather name="help-circle" size={20} color={Colors.secondary} />
                </View>
                <View className="flex-1">
                  <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                    {t('services.service.history.need_help_title')}
                  </CustomText>
                  <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={2}>
                    {t('services.service.history.need_help_subtitle')}
                  </CustomText>
                </View>
                <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
              </TouchableOpacity>

              {canRate && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => service && goToRateService(service)}
                  className="rounded-full items-center justify-center flex-row"
                  style={{ paddingVertical: 14, borderWidth: 1.5, borderColor: Colors.success }}
                >
                  <AntDesign name="star" size={16} color={Colors.success} />
                  <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2" style={{ color: Colors.success }}>
                    {t('services.history.rate_now')}
                  </CustomText>
                </TouchableOpacity>
              )}
            </ScrollView>

            {!!service?.service_type?.id && (
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
                  onPress={requestAgain}
                  className="rounded-full items-center justify-center flex-row"
                  style={{
                    paddingVertical: 16,
                    backgroundColor: Colors.primary,
                    shadowColor: Colors.primary,
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 5 },
                    elevation: 6,
                  }}
                >
                  <Feather name="rotate-ccw" size={18} color={Colors.secondary} />
                  <CustomText color="secondary" size="large" boldness="bold" classes="ml-2" numberOfLines={1}>
                    {t('services.history.request_again')}
                  </CustomText>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default HistoryServiceDetail;
