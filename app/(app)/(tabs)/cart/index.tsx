import React, { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useCart, type CartMode } from "@/contexts/CartContext";
import { useService } from "@/contexts/ServiceContext";
import { useSchedule } from "@/contexts/ScheduleContext";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useDialog } from "@/contexts/DialogContext";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import RemoteThumb from "@/components/app/Services/RemoteThumb";
import { serviceIcon } from "@/components/app/Services/operationAreaIcon";
import { renderMoney } from "@/utils/money";
import { useTranslation } from "react-i18next";
import { ServiceTypeInterface } from "@/types/services";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/** Verde da poupança sobre âmbar — ver select-service-type/info.tsx. */
const SAVE_ON_AMBER = "#03543A";

/**
 * Cesto (espelho da build 15): junta serviços, mostra duração e total
 * "a partir de", e no fim escolhe-se Imediato ou Agendar — o ecrã seguinte
 * decide técnico único vs um técnico por serviço.
 */
const Cart = () => {
  const { t } = useTranslation();
  const { items, removeItem, queue, mode, clearQueue } = useCart();
  const { setServiceToRequest, setScheduledService, setSelectedProfessional } = useService();
  const { setDataToMakeSchedule } = useSchedule();
  const { session, userData } = useSession();
  const { guestSession, setSelectedVendor: setGuestSelectedVendor } = useGuestSession();
  const { openDialog, closeDialog } = useDialog();
  const { track } = useMixpanel();
  const { api } = useApi();

  /**
   * Imagens frescas do catálogo.
   *
   * O cesto guarda o serviço em armazenamento local, mas o URL da imagem que
   * o backoffice devolve é temporário (uma hora). O que ficou guardado ontem
   * já não carrega, e as linhas apareciam todas com o ícone da categoria.
   * Aqui pede-se o catálogo e usa-se o URL de agora, com o guardado como
   * recurso.
   */
  const [freshImages, setFreshImages] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!items.length) return;
    let alive = true;
    api
      .post(API_ROUTES.POST_SEARCH_OPERATION_AREAS, { operation_areas: [] })
      .then((response) => {
        if (!alive) return;
        const list: ServiceTypeInterface[] = response?.data?.data?.services_types ?? [];
        const map: Record<number, string> = {};
        list.forEach((service: any) => {
          if (service?.id && typeof service?.image === "string") map[service.id] = service.image;
        });
        setFreshImages(map);
      })
      .catch(() => {
        // Sem catálogo fica a imagem guardada (ou o ícone): não vale um erro
        // por causa de uma miniatura.
      });
    return () => {
      alive = false;
    };
  }, [items.length]);

  const totalFrom = items.reduce((acc, i) => acc + (i.starts_from ?? 0) * 100, 0); // cêntimos (starts_from vem em euros)
  // Agendar poupa 25% face ao imediato. Mostrar o valor poupado em euros
  // (não só "25%") torna o incentivo concreto.
  const SCHEDULE_DISCOUNT = 0.25;
  const scheduledTotal = Math.round(totalFrom * (1 - SCHEDULE_DISCOUNT));
  const savings = totalFrom - scheduledTotal;
  /**
   * A categoria de cada linha só ajuda quando o cesto mistura categorias.
   * Com três serviços de canalização, "CANALIZAÇÃO" três vezes é ruído.
   */
  const showCategories =
    new Set(items.map((i) => i.operation_area?.name).filter(Boolean)).size > 1;

  /** Os itens antigos do cesto guardam a categoria em CAIXA ALTA. */
  const categoryLabel = (name?: string | null) => {
    if (!name) return null;
    if (name !== name.toUpperCase()) return name;
    return name
      .toLocaleLowerCase("pt-PT")
      .replace(/(^|\s)(\p{L})/gu, (_m, sep, letter) => sep + letter.toLocaleUpperCase("pt-PT"));
  };

  const totalMinutes = items.reduce((acc, i) => (typeof i.time === "number" ? acc + i.time : acc), 0);
  const hasAddress = session
    ? !!userData?.address
    : !!(guestSession?.guest_address?.latitude && guestSession?.guest_address?.longitude);

  const durationTotalLabel = () => {
    if (totalMinutes <= 0) return null;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}min`;
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
  };

  const confirmRemove = (item: ServiceTypeInterface) => {
    openDialog({
      title: t("cart.remove_title"),
      subtitle: t("cart.remove_message", { name: item.name }),
      successButtonText: t("cart.remove_confirm"),
      cancelButtonText: t("services.cancel.back"),
      onSuccess: () => {
        removeItem(item.id);
        closeDialog();
      },
    });
  };

  const proceed = (nextMode: CartMode) => {
    // Mesmo evento do fluxo direto, com `source` a distinguir a origem: assim a
    // divisão imediato/agendado le-se de uma vez so, em vez de haver dois
    // eventos diferentes que ninguem consegue somar. Dispara na escolha, antes
    // da validação de morada, como no fluxo direto.
    track("service_mode_selected", {
      mode: nextMode,
      source: "cart",
      items: items.length,
      from_price_cents: totalFrom || null,
    });

    // Espelho do ensureServiceArea da build 15: sem morada não há pesquisa.
    // Leva o contexto do cesto (origem + modo) para o ecrã de morada poder
    // devolver o utilizador ao fluxo do cesto em vez de cair num só serviço.
    if (!hasAddress) {
      router.navigate({
        pathname: "/(app)/(modals)/(services)/(request)/address/guest",
        params: { returnTo: "cart", mode: nextMode },
      });
      return;
    }
    track("cart_proceed_pressed", { items: items.length, mode: nextMode });
    router.navigate({
      pathname: "/(app)/(modals)/(services)/(request)/cart-technicians",
      params: { mode: nextMode },
    });
  };

  // Retomar a fila de reservas (técnicos já escolhidos)
  const resumeQueue = () => {
    const next = queue[0];
    if (!next || !mode) return;
    setScheduledService(mode === "scheduled");
    setSelectedProfessional(next.vendor);
    setServiceToRequest({ service_type: next.serviceType, vendor: next.vendor });
    if (!session) setGuestSelectedVendor(next.vendor?.id, next.vendor);
    if (mode === "scheduled") {
      router.navigate("/(app)/(modals)/(services)/(schedule)/schedule/schedule-service");
    } else {
      // Mesma razão do cart-technicians: reserva imediata não pode herdar um
      // dataToMakeSchedule antigo, senão o checkout envia scheduled=true com data errada.
      setDataToMakeSchedule(null);
      router.navigate(`/(app)/(modals)/(services)/(request)/checkout/${next.serviceType.id}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <View className="px-5 pt-4 pb-3">
        <CustomText color="secondary" boldness="bold" size="extraLarge" classes="text-center">
          {t("cart.title")}
        </CustomText>
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        {/* Estado vazio a ~1/3 do topo em vez de centrado: centrado, ficava a
            flutuar no meio com 40% do ecrã em branco por baixo. Mais acima
            lê-se primeiro e o vazio deixa de ser o elemento dominante. */}
        {items.length === 0 ? (
          <View className="flex-1 items-center px-8" style={{ paddingTop: 72, paddingBottom: 96 }}>
            <View
              className="items-center justify-center rounded-full mb-6"
              style={{ width: 120, height: 120, backgroundColor: "rgba(250,187,91,0.12)" }}
            >
              <Ionicons name="cart-outline" size={52} color={Colors.primary} />
            </View>
            <CustomText color="secondary" boldness="bold" size="large" classes="text-center mb-2">
              {t("cart.empty_title")}
            </CustomText>
            <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mb-8">
              {t("cart.empty_subtitle")}
            </CustomText>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.navigate("/(app)/(tabs)/list")}
              style={{
                backgroundColor: Colors.primary,
                borderRadius: 999,
                paddingVertical: 16,
                paddingHorizontal: 28,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: Colors.primary,
                shadowOpacity: 0.45,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                {t("cart.browse_services")}
              </CustomText>
              <Feather name="arrow-right" size={18} color={Colors.secondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
              {/* Reservas em curso: retomar onde ficou */}
              {queue.length > 0 && (
                <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: "rgba(5,150,105,0.12)" }}>
                  <View className="flex-row items-center">
                    <Ionicons name="play-circle" size={22} color={Colors.success} style={{ marginRight: 10 }} />
                    <View className="flex-1">
                      <CustomText color="secondary" size="small" boldness="bold">
                        {queue.length === 1
                          ? t("cart.queue_pending_one")
                          : t("cart.queue_pending", { count: queue.length })}
                      </CustomText>
                      <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-0.5">
                        {t("cart.queue_hint", { name: queue[0]?.vendor?.name ?? "" })}
                      </CustomText>
                    </View>
                  </View>
                  <View className="flex-row mt-3" style={{ gap: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={resumeQueue}
                      className="flex-1 rounded-full py-2.5 items-center"
                      style={{ backgroundColor: Colors.primary }}
                    >
                      <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1}>
                        {t("cart.queue_resume")}
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={clearQueue}
                      className="rounded-full py-2.5 px-4 items-center"
                      style={{ borderWidth: 1, borderColor: Colors.gray_strong }}
                    >
                      <CustomText color="gray_medium" size="small" boldness="semiBold" numberOfLines={1}>
                        {t("cart.queue_cancel")}
                      </CustomText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Itens */}
              {items.map((item) => (
                <View key={item.id} className="bg-support_secondary rounded-2xl p-4 mb-3 flex-row items-center" style={CARD_SHADOW}>
                  {/* Imagem do tipo de serviço, do backoffice. Antes eram
                      todos a mesma chave inglesa. */}
                  <View className="mr-3">
                    <RemoteThumb
                      uri={freshImages[item.id as number] ?? (item as any)?.image}
                      size={48}
                      radius={12}
                      fit="cover"
                      fallbackIcon={serviceIcon(item?.name, item?.operation_area?.name)}
                    />
                  </View>
                  <View className="flex-1">
                    <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={2}>
                      {item.name}
                    </CustomText>
                    {/* Só o preço: a duração de cada serviço já está somada na
                        "Duração total" ali abaixo, e ao lado do nome era um
                        número que ninguém usa para decidir. */}
                    <View className="flex-row items-center mt-0.5">
                      <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1} classes="flex-1">
                        {[
                          // A categoria só aparece quando o cesto tem mais do que
                          // uma: com três serviços de canalização, repeti-la em
                          // cada linha não distingue nada.
                          showCategories ? categoryLabel(item.operation_area?.name) : null,
                          typeof item.starts_from === "number" && item.starts_from > 0
                            ? t("cart.from_price_capitalized", {
                                price: renderMoney((item.starts_from as number) * 100),
                              })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </CustomText>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmRemove(item)}
                    className="p-2"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Totais (build 15) */}
              {(!!durationTotalLabel() || totalFrom > 0) && (
                <View className="rounded-2xl px-4 py-3 mt-1" style={{ backgroundColor: "rgba(250,187,91,0.15)" }}>
                  {!!durationTotalLabel() && (
                    <View className="flex-row justify-between items-center">
                      <CustomText color="secondary" size="small" boldness="regular">
                        {t("cart.duration_total")}
                      </CustomText>
                      <CustomText color="secondary" size="small" boldness="semiBold">
                        {durationTotalLabel()}
                      </CustomText>
                    </View>
                  )}
                  {/* O preço vive aqui, com o resto do resumo; os botões dizem
                      só o que fazem. */}
                  {totalFrom > 0 && (
                    <View className="flex-row justify-between items-center mt-1.5">
                      <CustomText color="secondary" size="small" boldness="regular">
                        {t("services.service.starting_from_label")}
                      </CustomText>
                      <CustomText color="secondary" size="large" boldness="bolder">
                        {renderMoney(totalFrom)}
                      </CustomText>
                    </View>
                  )}
                </View>
              )}

              <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-2 mb-2 text-center">
                {t("cart.total_hint")}
              </CustomText>
            </ScrollView>

            {/* Lado a lado, mas não iguais: agendar leva quase dois terços da
                largura, fundo cheio e a poupança em euros; pedir agora fica em
                contorno. A hierarquia está no peso, não em esconder a opção. */}
            <View className="px-5 pb-8 pt-2 flex-row" style={{ gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                accessibilityRole="button"
                onPress={() => proceed("scheduled")}
                className="rounded-2xl items-center justify-center py-3"
                style={{
                  flex: 1.6,
                  backgroundColor: Colors.primary,
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 6,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={16} color={Colors.secondary} />
                  <CustomText color="secondary" size="medium" boldness="bold" classes="ml-1.5" numberOfLines={1}>
                    {t("services.select_service_type.scheduled")}
                  </CustomText>
                </View>
                {/* Um só argumento debaixo do nome: quanto se poupa, em euros.
                    Sem cesto avaliado (sem "a partir de"), fica a percentagem,
                    que é o que se sabe. */}
                <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1} classes="mt-0.5" style={{ color: SAVE_ON_AMBER }}>
                  {savings > 0
                    ? t("cart.schedule_save_amount", { savings: renderMoney(savings) })
                    : t("cart.schedule_save_percent")}
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                accessibilityRole="button"
                onPress={() => proceed("immediate")}
                className="flex-1 rounded-2xl items-center justify-center py-3"
                style={{ borderWidth: 1, borderColor: Colors.gray_light }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={15} color={Colors.secondary} />
                  <CustomText color="secondary" size="medium" boldness="semiBold" classes="ml-1.5" numberOfLines={1}>
                    {t("cart.request_now")}
                  </CustomText>
                </View>

              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Cart;
