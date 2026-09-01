import ArrowIcon from "@/assets/icons/arrow"
import { serviceIcon } from "@/components/app/Services/operationAreaIcon";
import UserAvatarIcon from "@/assets/icons/user-avatar"
import XIcon from "@/assets/icons/x"
import BackHeader from "@/components/app/BackHeader"
import { CustomText } from "@/components/CustomText"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { API_ROUTES } from "@/constants/ApiRoutes"
import { Colors } from "@/constants/Colors"
import { DesignTokens as D } from "@/constants/DesignTokens"
import FilterTabs from "@/components/FilterTabs"
import { useApi } from "@/contexts/ApiContext"
import { useDialog } from "@/contexts/DialogContext"
import { useService } from "@/contexts/ServiceContext"
import { useSession } from "@/contexts/SessionContext"
import i18n from "@/translation"
import TouchOpacity from "@/components/TouchOpacity"
import { ServiceInterface, ServiceStatus } from "@/types/services"
import { renderMoney } from "@/utils/money"
import { AntDesign, Entypo, Feather, Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import IDomParser from "advanced-html-parser"
import { router } from "expo-router"
import React, { useCallback, useState } from 'react'
import { useTranslation } from "react-i18next"
import { FlatList, Image, Platform, ScrollView, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from "react-native-safe-area-context"

const History = () => {
  const { api } = useApi()
  const { openDialog } = useDialog()
  const { t } = useTranslation()
  const { session } = useSession()
  const { historyServices, getHistoryServices, haveMoreServicesHistory, loadingServicesHistory, historyError, historyCounts, setServiceToRequest } = useService()

  // Repetir um serviço já feito: o atalho existia só dentro do detalhe, ou seja a
  // dois toques a partir daqui. Quem repete já sabe o que quer — não devia ter de
  // reabrir a ficha antiga para chegar ao pedido novo.
  const requestAgain = (service: ServiceInterface) => {
    setServiceToRequest({ service_type: service.service_type ?? undefined })
    router.navigate('/(app)/(modals)/(services)/(request)/select-service-type/info')
  }
  // const [loadingServices, setLoadingServices] = useState(true)
  // const [haveMoreServices, setHaveMoreServices] = useState(true)

  type HistoryFilter = 'all' | 'closed' | 'canceled'
  const [statusFilter, setStatusFilter] = useState<HistoryFilter>('all')

  // Totais vêm do backend (closed_count/canceled_count) — independentes da paginação.
  const closedCount = historyCounts.closed
  const canceledCount = historyCounts.canceled
  const historyTotal = closedCount + canceledCount
  // O backend já devolve a lista filtrada; a lista é usada tal e qual.
  const filteredServices = historyServices

  // Mudar o filtro refaz o fetch via useFocusEffect (statusFilter está nas dependências).
  const changeFilter = (key: HistoryFilter) => {
    if (key !== statusFilter) setStatusFilter(key);
  }

  const filters: { key: HistoryFilter; label: string; count: number }[] = [
    { key: 'all', label: t('services.history.filter_all'), count: historyTotal },
    { key: 'closed', label: t('services.history.filter_completed'), count: closedCount },
    { key: 'canceled', label: t('services.history.filter_canceled'), count: canceledCount },
  ]

  const desc = (text: string) => {
    if (text[0] !== "<") return text;
    try {
      const parsed = IDomParser.parse(text);
      return parsed.documentElement?.textContent;
    } catch (error) {
      return text;
    }
  };

  // Marca se algum pedido chegou a ser feito. Sem isto o ecrã nao distingue
  // "ainda nao pedi nada" de "pedi e veio vazio" — era dai que vinha o esqueleto
  // eterno quando o useFocusEffect nao disparava.
  const hasFetchedRef = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Sem sessão o pedido dava 401 engolido e o convidado via uma lista vazia
      // sem explicação — abaixo mostramos antes o convite a criar conta.
      if (!session) return;
      hasFetchedRef.current = true;
      getHistoryServices(0, statusFilter);
    }, [statusFilter, session])
  );

  // Rede de segurança: o useFocusEffect nao dispara em todas as formas de chegar
  // a este ecrã (deep link, por exemplo). Sem isto o ecrã ficava parado à espera
  // de um pedido que ninguém tinha feito.
  React.useEffect(() => {
    if (!session || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    getHistoryServices(0, statusFilter);
  }, [session]);

  // Convidado: mesmo convite a criar conta que o ecrã de perfil usa, em vez de
  // uma lista vazia sem explicação.
  if (!session) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View
            style={{
              backgroundColor: Colors.primary,
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: Colors.support_secondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AntDesign name="clockcircleo" size={34} color={Colors.secondary} />
            </View>
            <CustomText size="large" color="secondary" boldness="bold" classes="text-center mb-1">
              {t('auth.home.history_title')}
            </CustomText>
            <CustomText size="small" color="secondary" boldness="regular" classes="text-center">
              {t('auth.home.history_subtitle')}
            </CustomText>
          </View>

          {/* Vantagens num cartão */}
          <View
            className="bg-support_secondary rounded-2xl px-4"
            style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
          >
            {[
              { icon: 'time-outline', label: t('auth.home.benefits.service_history') },
              { icon: 'location-outline', label: t('auth.home.benefits.saved_address') },
              { icon: 'card-outline', label: t('auth.home.benefits.payment_methods') },
              { icon: 'shield-checkmark-outline', label: t('auth.home.benefits.secure_account') },
            ].map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: i < 3 ? 1 : 0,
                  borderBottomColor: Colors.support_primary,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: Colors.primary + '33',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons name={item.icon as any} size={18} color={Colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomText size="medium" color="secondary" boldness="regular">
                    {item.label}
                  </CustomText>
                </View>
                <Feather name="check" size={16} color={Colors.success} />
              </View>
            ))}
          </View>

          {/* Ações */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.navigate('/(auth)/signup')}
              style={{
                backgroundColor: Colors.primary,
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: Colors.primary,
                shadowOpacity: 0.45,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <CustomText size="medium" color="secondary" boldness="bold" numberOfLines={1}>
                {t('auth.home.create_account')}
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.navigate('/(auth)/signin')}
              style={{
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: Colors.secondary,
              }}
            >
              <CustomText size="medium" color="secondary" boldness="semiBold" numberOfLines={1}>
                {t('auth.home.access_account')}
              </CustomText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const goToServiceHistory = (service: ServiceInterface) => {
    router.navigate({
      pathname: '/(app)/(pages)/(services)/history/[serviceId]',
      params: {
        serviceId: service.id,
      },
    })
  }

  // Avaliar a partir do histórico: o mesmo ecrã que aparece logo a seguir a
  // fechar o serviço, para quem na altura o dispensou.
  const goToRate = (service: ServiceInterface) => {
    router.navigate({
      pathname: '/(app)/(bottom-sheets)/(services)/rate/[serviceId]',
      params: {
        serviceId: service.id,
        service: JSON.stringify(service),
      },
    })
  }

  const renderDate = (date: string) => {
    const parsedDate = new Date(date);
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    };

    const locale = i18n.language === 'pt_PT' ? 'pt-PT' : 'en-US';
    const formattedDate = parsedDate.toLocaleDateString(locale, dateOptions);

    return formattedDate.replace(',', ' |');
  }

  // "04 jul 2026" (pt) / "Jul 04, 2026" (en)
  const renderShortDate = (date: string) => {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '';
    const locale = i18n.language === 'pt_PT' ? 'pt-PT' : 'en-US';
    return parsedDate
      .toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/ de /g, ' ')
      .replace(/\./g, '');
  }

  const renderRating = (rating: number | null) => {
    if (rating === null || rating === undefined) return null;
    const formatted = Number(rating).toFixed(1);
    return i18n.language === 'pt_PT' ? formatted.replace('.', ',') : formatted;
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <BackHeader
        hideBack
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t('services.history.header')}
          </CustomText>
        )}
        otherClasses="p-5"
      />
      <View className="bg-support_secondary h-full rounded-t-3xl p-5">
        {historyTotal > 0 && (
          <View>
            <View className="flex-row gap-3 mb-4">
              <View
                className="flex-1 rounded-2xl px-4 py-3"
                style={{ backgroundColor: D.soft, borderWidth: 1, borderColor: D.line }}
              >
                <CustomText color="secondary" boldness="bold" classes="text-2xl" style={{ color: D.ink }}>
                  {closedCount}
                </CustomText>
                <CustomText size="extraSmall" color="gray_medium" boldness="medium" style={{ color: D.mut }}>
                  {t('services.history.stat_completed')}
                </CustomText>
              </View>
              <View
                className="flex-1 rounded-2xl px-4 py-3"
                style={{ backgroundColor: D.soft, borderWidth: 1, borderColor: D.line }}
              >
                <CustomText color="error" boldness="bold" classes="text-2xl" style={{ color: D.red }}>
                  {canceledCount}
                </CustomText>
                <CustomText size="extraSmall" color="gray_medium" boldness="medium" style={{ color: D.mut }}>
                  {t('services.history.stat_canceled')}
                </CustomText>
              </View>
            </View>

            {/* Filtros só fazem sentido com volume; com pouco histórico são ruído */}
            {historyTotal > 10 && (
              <View className="mb-5">
                <FilterTabs
                  tabs={filters}
                  activeKey={statusFilter}
                  onChange={(key) => changeFilter(key as HistoryFilter)}
                />
              </View>
            )}
          </View>
        )}
        {historyError && historyServices.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: D.AT, borderWidth: 1, borderColor: D.AT2 }}
            >
              <Feather name="wifi-off" size={26} color={D.AD} />
            </View>
            <CustomText size="medium" color="secondary" boldness="bold" classes="text-center mb-2">
              {t('errors.load_failed_title')}
            </CustomText>
            <CustomText size="small" color="gray_medium" boldness="medium" classes="text-center mb-6">
              {t('errors.load_failed_subtitle')}
            </CustomText>
            <TouchOpacity
              onPress={() => getHistoryServices(0, statusFilter)}
              style={{
                backgroundColor: D.A,
                borderRadius: 999,
                paddingHorizontal: 24,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Feather name="refresh-cw" size={15} color={D.ink} />
              <CustomText size="small" color="secondary" boldness="bold" style={{ color: D.ink }}>
                {t('errors.try_again')}
              </CustomText>
            </TouchOpacity>
          </View>
        ) : loadingServicesHistory && historyServices.length === 0
          ? (
            <View className="flex-1">
              {Array.from({ length: 12 }).map((_, index) => (
                <View
                  key={`skeleton-item-${index}`}
                  className="flex-row rounded-[18px] px-4 py-4 mb-3"
                  style={{ backgroundColor: D.bg, borderWidth: 1, borderColor: D.line, gap: 13 }}
                >
                  <View className="w-[46px] h-[46px] rounded-[14px] bg-gray_light" />

                  <View className="flex-1">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-2">
                        <View className="w-[70%] h-4 rounded-md bg-gray_light" />
                        <View className="w-[45%] h-3 rounded-md bg-gray_light mt-1.5" />
                      </View>
                      <View className="w-14 h-4 rounded-md bg-gray_light" />
                    </View>

                    <View className="my-2.5" style={{ height: 1, backgroundColor: D.line2 }} />

                    <View className="flex-row items-center">
                      <View className="w-20 h-5 rounded-full bg-gray_light" />
                      <View className="w-10 h-3 rounded-md bg-gray_light ml-auto" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={filteredServices}
              keyExtractor={(item, index) => `${item?.id ?? index}`}
              style={{ flex: 1 }}
              className={`h-full ${Platform.OS === 'android' ? 'mb-[40px]' : 'mb-[10px]'}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isCanceled = item.status === ServiceStatus.CANCELED;
                // Com uma casa só, a morada repetia-se em todos os cartões e não
                // distinguia nada. Quem fez o trabalho, sim — e não estava em
                // lado nenhum da lista. A morada fica para quem tem várias casas.
                const technicianLabel = item?.vendor?.user?.name;
                const locationLabel = technicianLabel || item?.address?.name;
                const showsTechnician = !!technicianLabel;
                // Concluído e por avaliar: dá para avaliar a partir daqui.
                const canRate = !isCanceled && (item?.rating_by_customer === null || item?.rating_by_customer === undefined);
                const ratingLabel = !isCanceled ? renderRating(item?.rating_by_customer) : null;
                // Mostrar sempre o preço quando existe (também nos cancelados, em cinza);
                // renderMoney devolve false para amount null — "—" só nesse caso.
                const priceLabel = renderMoney(item?.amount ?? null) || '—';
                return (
                  <TouchOpacity otherClasses="mb-3" onPress={() => goToServiceHistory(item)}>
                    <View
                      className="flex-row rounded-[18px] px-4 py-4"
                      style={{ backgroundColor: D.bg, borderWidth: 1, borderColor: D.line, gap: 13 }}
                    >
                      <View
                        className="w-[46px] h-[46px] rounded-[14px] items-center justify-center"
                        style={{ backgroundColor: D.AT, borderWidth: 1, borderColor: D.AT2 }}
                      >
                        <Feather name={serviceIcon(item?.service_type?.name, item?.service_type?.operation_area?.name)} size={22} color={D.AD} />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-2">
                            <CustomText
                              size="small"
                              color="secondary"
                              boldness="bold"
                              numberOfLines={1}
                              style={{ color: D.ink, fontSize: 15.5 }}
                            >
                              {item?.service_type?.name || t('services.service.no_area')}
                            </CustomText>
                            {locationLabel && (
                              <View className="flex-row items-center mt-0.5">
                                <Feather name={showsTechnician ? "user" : "map-pin"} size={12} color={D.mut2} />
                                <CustomText
                                  size="extraSmall"
                                  color="gray_medium"
                                  boldness="medium"
                                  numberOfLines={1}
                                  classes="ml-1 flex-1"
                                  style={{ color: D.mut }}
                                >
                                  {locationLabel}
                                </CustomText>
                              </View>
                            )}
                          </View>
                          <CustomText
                            size="small"
                            color="secondary"
                            boldness="bold"
                            style={{ color: isCanceled ? D.mut : D.ink, fontSize: 15.5 }}
                          >
                            {priceLabel}
                          </CustomText>
                        </View>

                        <View className="my-2.5" style={{ height: 1, backgroundColor: D.line2 }} />

                        <View className="flex-row items-center">
                          <View className="flex-row items-center gap-1.5">
                            <View
                              className="rounded-full"
                              style={{ width: 7, height: 7, backgroundColor: isCanceled ? D.red : D.green }}
                            />
                            <CustomText
                              size="specExtraSmall"
                              color="secondary"
                              boldness="bold"
                              style={{ color: isCanceled ? D.red : D.green, lineHeight: 16 }}
                            >
                              {isCanceled
                                ? t('services.history.status_canceled')
                                : t('services.history.status_completed')}
                            </CustomText>
                          </View>

                          {ratingLabel && (
                            <View className="flex-row items-center gap-1 ml-2">
                              <AntDesign name="star" size={12} color={D.A} />
                              <CustomText
                                size="specExtraSmall"
                                color="secondary"
                                boldness="bold"
                                style={{ color: D.ink2, lineHeight: 16 }}
                              >
                                {ratingLabel}
                              </CustomText>
                            </View>
                          )}

                          <CustomText
                            size="specExtraSmall"
                            color="gray_medium"
                            boldness="semiBold"
                            classes="ml-auto"
                            style={{ color: D.mut2, lineHeight: 16 }}
                          >
                            {renderShortDate(item?.created_at)}
                          </CustomText>
                        </View>

                        {/* Só faz sentido repetir o que se sabe repetir: precisa do tipo
                            de serviço. Nos cancelados aparece na mesma — quem cancelou
                            por causa da hora é exatamente quem quer voltar a marcar. */}
                        <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
                        {canRate && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            onPress={() => goToRate(item)}
                            className="flex-row items-center rounded-full px-3 py-1.5"
                            style={{ borderWidth: 1, borderColor: D.green }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <AntDesign name="star" size={12} color={D.green} />
                            <CustomText
                              size="specExtraSmall"
                              color="secondary"
                              boldness="bold"
                              classes="ml-1.5"
                              style={{ color: D.green, lineHeight: 16 }}
                            >
                              {t('services.history.rate_now')}
                            </CustomText>
                          </TouchableOpacity>
                        )}
                        {!!item?.service_type?.id && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={t('services.history.request_again_a11y', {
                              service: item?.service_type?.name ?? '',
                            })}
                            onPress={() => requestAgain(item)}
                            className="flex-row items-center rounded-full px-3 py-1.5"
                            style={{ borderWidth: 1, borderColor: D.AT2 }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Feather name="rotate-ccw" size={12} color={D.AD} />
                            <CustomText
                              size="specExtraSmall"
                              color="secondary"
                              boldness="bold"
                              classes="ml-1.5"
                              style={{ color: D.AD, lineHeight: 16 }}
                            >
                              {t('services.history.request_again')}
                            </CustomText>
                          </TouchableOpacity>
                        )}
                        </View>
                      </View>
                    </View>
                  </TouchOpacity>
                );
              }}
              ListEmptyComponent={() => historyTotal > 0 ? (
                <View
                  className="items-center rounded-[18px] px-6 py-8 mt-2"
                  style={{ backgroundColor: D.soft, borderWidth: 1, borderColor: D.line }}
                >
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
                    style={{ backgroundColor: D.AT, borderWidth: 1, borderColor: D.AT2 }}
                  >
                    <Feather name="tool" size={24} color={D.AD} />
                  </View>
                  <CustomText size="medium" color="secondary" boldness="bold" classes="text-center mb-2" style={{ color: D.ink }}>
                    {t('services.history.filter_empty_title')}
                  </CustomText>
                  <CustomText size="small" color="gray_medium" boldness="medium" classes="text-center mb-6" style={{ color: D.mut }}>
                    {t('services.history.filter_empty_subtitle')}
                  </CustomText>
                  <TouchOpacity
                    onPress={() => router.navigate('/(app)/(tabs)/list')}
                    style={{
                      backgroundColor: D.A,
                      borderRadius: 18,
                      paddingHorizontal: 22,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CustomText size="small" color="secondary" boldness="bold" style={{ color: D.ink }}>
                      {t('services.history.empty_cta')}
                    </CustomText>
                    <AntDesign name="arrowright" size={16} color={D.ink} />
                  </TouchOpacity>
                </View>
              ) : (
                <View className="items-center px-4 pt-10">
                  <View
                    className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
                    style={{ backgroundColor: D.AT, borderWidth: 1, borderColor: D.AT2 }}
                  >
                    <AntDesign name="clockcircleo" size={36} color={D.AD} />
                  </View>
                  <CustomText
                    size="large"
                    color="secondary"
                    boldness="bold"
                    classes="text-center mb-3"
                  >
                    {t('services.history.empty_title')}
                  </CustomText>
                  <CustomText
                    size="small"
                    color="gray_medium"
                    boldness="medium"
                    classes="text-center mb-8"
                  >
                    {t('services.history.empty_subtitle')}
                  </CustomText>
                       <CustomTouchableOpacity
                  size="large"
                          type="primary"
                          textColor="secondary"
                          textBoldness="semiBold"
                    onPress={() => router.navigate('/(app)/(tabs)/list')}
                  >
                    <CustomText size="small" color="secondary" boldness="bold">
                      {t('services.history.empty_cta')}
                    </CustomText>
                    <AntDesign name="arrowright" size={18} color={Colors.secondary} />
                  </CustomTouchableOpacity>
           
                </View>
              )}
              ListFooterComponent={() => {
                // Só faz sentido "Carregar mais" quando a lista visível (já filtrada) tem itens.
                if (filteredServices.length > 0 && haveMoreServicesHistory) {
                  return (
                    <View className="mt-2 py-2">
                      <CustomTouchableOpacity
                        size="large"
                        type="secondary"
                        text={t('services.history.load_more')}
                        textBoldness="semiBold"
                        textColor="primary"
                        onPress={() => getHistoryServices(undefined, statusFilter)}
                      />
                    </View>
                  )
                } else {
                  return undefined
                }
              }}
            />
          )
        }
      </View>

    </SafeAreaView>
  )
}

export default History
