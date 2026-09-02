import React from "react";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
import RemoteThumb from "@/components/app/Services/RemoteThumb";
import { serviceIcon } from "@/components/app/Services/operationAreaIcon";
import { Radius } from "@/constants/Layout";
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
  const insets = useSafeAreaInsets();
  const { session, userData } = useSession();
  const { guestSession, setSelectedVendor: setGuestSelectedVendor } = useGuestSession();
  const { openDialog, closeDialog } = useDialog();
  const { track } = useMixpanel();

  const totalFrom = items.reduce((acc, i) => acc + (i.starts_from ?? 0) * 100, 0); // cêntimos (starts_from vem em euros)
  // Agendar poupa 25% face ao imediato. Mostrar o valor poupado em euros
  // (não só "25%") torna o incentivo concreto.
  const SCHEDULE_DISCOUNT = 0.25;
  const scheduledTotal = Math.round(totalFrom * (1 - SCHEDULE_DISCOUNT));
  const savings = totalFrom - scheduledTotal;
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

  /**
   * Alguns itens foram guardados no cesto com a categoria em CAIXA ALTA
   * ("CANALIZAÇÃO"), enquanto o servidor a devolve como "Canalização". Em vez
   * de a gritar, normaliza-se só quando vem toda em maiúsculas — assim um nome
   * já bem escrito fica intacto.
   */
  const categoryLabel = (name?: string | null) => {
    if (!name) return null;
    if (name !== name.toUpperCase()) return name;
    return name
      .toLocaleLowerCase("pt-PT")
      .replace(/(^|\s)(\p{L})/gu, (_m, sep, letter) => sep + letter.toLocaleUpperCase("pt-PT"));
  };

  const itemDurationLabel = (st: ServiceTypeInterface) => {
    const mins = st.time;
    if (typeof mins !== "number" || mins <= 0) return null;
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.background }} edges={["top", "left", "right"]}>
      {/* Cabeçalho branco: o laranja de largura total roubava o destaque à
          decisão que se toma no fundo do ecrã. */}
      <View className="px-5 pt-4 pb-3">
        <CustomText color="secondary" boldness="bold" size="subtitle">
          {t("cart.title")}
        </CustomText>
        {items.length > 0 && (
          <CustomText color="gray_strong" size="small" boldness="regular" classes="mt-0.5">
            {t("cart.services_count", { count: items.length })}
          </CustomText>
        )}
      </View>

      <View className="flex-1" style={{ backgroundColor: Colors.background }}>
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
                <View
                  key={item.id}
                  className="rounded-2xl p-3 mb-2.5 flex-row items-center"
                  style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
                >
                  {/* Imagem do backoffice; sem ela, ícone da categoria. */}
                  <RemoteThumb
                    uri={(item as any)?.image}
                    size={52}
                    radius={Radius.md}
                    fallbackIcon={serviceIcon(item?.name, item?.operation_area?.name)}
                  />
                  <View className="flex-1 ml-3">
                    <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={2}>
                      {item.name}
                    </CustomText>
                    {/* Categoria e duração em segundo plano; o preço com peso
                        próprio. Antes iam os três na mesma linha e com o mesmo
                        peso, e o preço perdia-se no meio. */}
                    <CustomText color="gray_strong" size="small" boldness="regular" classes="mt-0.5" numberOfLines={1}>
                      {[categoryLabel(item.operation_area?.name), itemDurationLabel(item)].filter(Boolean).join(" · ")}
                    </CustomText>
                    {typeof item.starts_from === "number" && item.starts_from > 0 && (
                      <CustomText color="secondary" size="small" boldness="semiBold" classes="mt-0.5" numberOfLines={1}>
                        {t("cart.from_price", { price: renderMoney((item.starts_from as number) * 100) })}
                      </CustomText>
                    )}
                  </View>
                  {/* Remover é destrutivo mas secundário: cinzento em repouso,
                      vermelho só ao tocar. */}
                  <Pressable
                    onPress={() => confirmRemove(item)}
                    accessibilityRole="button"
                    accessibilityLabel={t("cart.remove_a11y", { service: item.name })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={({ pressed }) => ({ padding: 8, opacity: pressed ? 1 : 0.9 })}
                  >
                    {({ pressed }) => (
                      <Feather name="trash-2" size={17} color={pressed ? Colors.error : Colors.gray_medium} />
                    )}
                  </Pressable>
                </View>
              ))}

              {/* Resumo. O valor deixa de ser mais uma linha de tabela: é o
                  número que decide, e o rótulo diz que é um mínimo. */}
              <View
                className="rounded-2xl p-4 mt-2"
                style={{ backgroundColor: Colors.surface_secondary, borderWidth: 1, borderColor: Colors.border }}
              >
                <CustomText color="gray_strong" size="extraSmall" boldness="bold" style={{ letterSpacing: 0.4 }}>
                  {t("cart.summary_title").toUpperCase()}
                </CustomText>

                <CustomText color="secondary" size="small" boldness="regular" classes="mt-1.5">
                  {[
                    t("cart.services_count", { count: items.length }),
                    durationTotalLabel(),
                  ].filter(Boolean).join(" · ")}
                </CustomText>

                {totalFrom > 0 && (
                  <View className="mt-3">
                    <CustomText color="gray_strong" size="small" boldness="regular">
                      {t("cart.min_estimate_label")}
                    </CustomText>
                    <CustomText color="secondary" size="title" boldness="bolder" classes="mt-0.5">
                      {renderMoney(totalFrom)}
                    </CustomText>
                  </View>
                )}
              </View>

              <CustomText color="gray_strong" size="extraSmall" boldness="regular" classes="mt-2 mb-2">
                {t("cart.total_hint")}
              </CustomText>
            </ScrollView>

            {/* Barra de decisão, colada ao fundo: é a parte mais importante do
                ecrã e estava a flutuar depois de um vazio grande. */}
            <View
              className="px-5 pt-3"
              style={{
                paddingBottom: Math.max(insets.bottom, 10),
                backgroundColor: Colors.background,
                borderTopWidth: 1,
                borderTopColor: Colors.border,
              }}
            >
              <CustomText color="gray_strong" size="extraSmall" boldness="bold" classes="mb-2" style={{ letterSpacing: 0.4 }}>
                {t("cart.when_title").toUpperCase()}
              </CustomText>

              {/* Agendar: a escolha incentivada. A poupança é real — o servidor
                  cobra o imediato a base ÷ 0,75 (RateService), o que dá
                  exatamente os 25% aqui anunciados. */}
              <Pressable
                accessibilityRole="button"
                onPress={() => proceed("scheduled")}
                style={({ pressed }) => ({
                  borderRadius: Radius.lg,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: Colors.primary_strong,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={17} color={Colors.support_secondary} />
                  <CustomText color="support_secondary" size="large" boldness="bold" classes="ml-2" numberOfLines={1}>
                    {t("services.select_service_type.scheduled")}
                  </CustomText>
                </View>
                {totalFrom > 0 && (
                  <CustomText color="support_secondary" size="small" boldness="semiBold" numberOfLines={1} classes="mt-0.5">
                    {t("cart.schedule_cta_save", { savings: renderMoney(savings), price: renderMoney(scheduledTotal) })}
                  </CustomText>
                )}
              </Pressable>

              {/* Pedir agora: secundário, e o texto diz o preço em vez de
                  "disponível já" — que aparecia num botão de aspeto desativado. */}
              <Pressable
                accessibilityRole="button"
                onPress={() => proceed("immediate")}
                style={({ pressed }) => ({
                  marginTop: 10,
                  borderRadius: Radius.lg,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: Colors.border,
                  backgroundColor: Colors.surface,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={15} color={Colors.secondary} />
                  <CustomText color="secondary" size="medium" boldness="semiBold" classes="ml-1.5" numberOfLines={1}>
                    {t("cart.request_now")}
                  </CustomText>
                </View>
                {totalFrom > 0 && (
                  <CustomText color="gray_strong" size="extraSmall" boldness="regular" numberOfLines={1} classes="mt-0.5">
                    {t("cart.from_price", { price: renderMoney(totalFrom) })}
                  </CustomText>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Cart;
