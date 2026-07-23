import ArrowIcon from "@/assets/icons/arrow"
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
import i18n from "@/translation"
import TouchOpacity from "@/components/TouchOpacity"
import { ServiceInterface, ServiceStatus } from "@/types/services"
import { renderMoney } from "@/utils/money"
import { AntDesign, Entypo, Feather } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import IDomParser from "advanced-html-parser"
import { router } from "expo-router"
import React, { useCallback, useState } from 'react'
import { useTranslation } from "react-i18next"
import { FlatList, Image, Platform, View } from 'react-native'
import { SafeAreaView } from "react-native-safe-area-context"

const History = () => {
  const { api } = useApi()
  const { openDialog } = useDialog()
  const { t } = useTranslation()
  const { historyServices, getHistoryServices, haveMoreServicesHistory, loadingServicesHistory, historyCounts } = useService()
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

  useFocusEffect(
    useCallback(() => {
      getHistoryServices(0, statusFilter);
    }, [statusFilter])
  );

  const goToServiceHistory = (service: ServiceInterface) => {
    router.navigate({
      pathname: '/(app)/(pages)/(services)/history/[serviceId]',
      params: {
        serviceId: service.id,
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
      hour12: true
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
        {loadingServicesHistory && historyServices.length === 0
          ? (
            <View className="flex-1">
              {Array.from({ length: 12 }).map((_, index) => (
                <View key={`skeleton-item-${index}`}>
                  <View className="flex flex-row my-4">
                    <View className="w-20 h-fit justify-center">
                      <View className="rounded-full overflow-hidden w-12 h-12">
                        <View className="w-full h-full bg-gray_light"></View>
                      </View>
                      <View className="rounded-full overflow-hidden w-12 h-12 absolute left-8 -z-[1]">
                        <View className="w-full h-full bg-gray_light"></View>
                      </View>
                    </View>

                    <View className="flex-1 space-y-2 ml-2">
                      <View className="w-[80%] rounded-xl overflow-hidden">
                        <View className="h-5 bg-gray_light"></View>
                      </View>
                      <View className="w-[50%] rounded-xl overflow-hidden">
                        <View className="h-4 bg-gray_light"></View>
                      </View>
                      <View className="w-[65%] rounded-xl overflow-hidden">
                        <View className="h-3 bg-gray_light"></View>
                      </View>
                    </View>

                    <View className="w-8 justify-center">
                      <View className="w-full h-5 bg-gray_light rounded-xl"></View>
                    </View>
                  </View>
                  <View className="h-[1px] mx-auto w-full bg-gray_strong" />
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
                const locationLabel = item?.address?.name || item?.vendor?.user?.name;
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
                        <Feather name="tool" size={22} color={D.AD} />
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
                                <Entypo name="location-pin" size={13} color={D.mut2} />
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
                            style={{ color: D.ink, fontSize: 15.5 }}
                          >
                            {priceLabel}
                          </CustomText>
                        </View>

                        <View className="my-2.5" style={{ height: 1, backgroundColor: D.line2 }} />

                        <View className="flex-row items-center">
                          <View
                            className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                            style={{ backgroundColor: isCanceled ? D.redSoft : D.greenSoft }}
                          >
                            <AntDesign
                              name={isCanceled ? 'close' : 'check'}
                              size={11}
                              color={isCanceled ? D.red : D.green}
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
