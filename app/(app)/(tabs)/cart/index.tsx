import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useCart, type CartMode } from "@/contexts/CartContext";
import { useService } from "@/contexts/ServiceContext";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useDialog } from "@/contexts/DialogContext";
import { useMixpanel } from "@/contexts/MixpanelContext";
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

/**
 * Cesto (espelho da build 15): junta serviços, mostra duração e total
 * "a partir de", e no fim escolhe-se Imediato ou Agendar — o ecrã seguinte
 * decide técnico único vs um técnico por serviço.
 */
const Cart = () => {
  const { t } = useTranslation();
  const { items, removeItem, queue, mode, clearQueue } = useCart();
  const { setServiceToRequest, setScheduledService, setSelectedProfessional } = useService();
  const { session, userData } = useSession();
  const { guestSession, setSelectedVendor: setGuestSelectedVendor } = useGuestSession();
  const { openDialog, closeDialog } = useDialog();
  const { track } = useMixpanel();

  const totalFrom = items.reduce((acc, i) => acc + (i.starts_from ?? 0), 0);
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
    // Espelho do ensureServiceArea da build 15: sem morada não há pesquisa.
    if (!hasAddress) {
      router.navigate("/(app)/(modals)/(services)/(request)/address/guest");
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
        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8" style={{ paddingBottom: 96 }}>
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
                <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>
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
                  <View
                    className="h-12 w-12 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
                  >
                    <Feather name="tool" size={20} color={Colors.secondary} />
                  </View>
                  <View className="flex-1">
                    <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={2}>
                      {item.name}
                    </CustomText>
                    <CustomText color="gray_medium" size="small" boldness="regular" classes="mt-0.5" numberOfLines={1}>
                      {[
                        item.operation_area?.name,
                        itemDurationLabel(item),
                        typeof item.starts_from === "number" && item.starts_from > 0
                          ? t("cart.from_price", { price: renderMoney(item.starts_from) })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </CustomText>
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
              <View className="rounded-2xl p-4 mt-1" style={{ backgroundColor: "rgba(250,187,91,0.15)" }}>
                <View className="flex-row justify-between items-center">
                  <CustomText color="secondary" size="small" boldness="regular">
                    {t("cart.services_row")}
                  </CustomText>
                  <CustomText color="secondary" size="small" boldness="semiBold">
                    {items.length}
                  </CustomText>
                </View>
                {durationTotalLabel() && (
                  <View className="flex-row justify-between items-center mt-1.5">
                    <CustomText color="secondary" size="small" boldness="regular">
                      {t("cart.duration_total")}
                    </CustomText>
                    <CustomText color="secondary" size="small" boldness="semiBold">
                      {durationTotalLabel()}
                    </CustomText>
                  </View>
                )}
                {totalFrom > 0 && (
                  <View className="flex-row justify-between items-center mt-1.5">
                    <CustomText color="secondary" size="small" boldness="regular">
                      {t("cart.from_total")}
                    </CustomText>
                    <CustomText color="secondary" size="large" boldness="bolder">
                      {renderMoney(totalFrom)}
                    </CustomText>
                  </View>
                )}
              </View>

              <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-2 mb-2">
                {t("cart.total_hint")}
              </CustomText>
            </ScrollView>

            {/* Imediato / Agendar (build 15) */}
            <View className="px-5 pb-4 pt-1 flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => proceed("immediate")}
                className="flex-1 rounded-2xl items-center justify-center py-3.5"
                style={{
                  backgroundColor: Colors.primary,
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 6,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={18} color={Colors.secondary} />
                  <CustomText color="secondary" size="large" boldness="bold" classes="ml-1.5">
                    {t("services.select_service_type.immediate")}
                  </CustomText>
                </View>
                <CustomText color="secondary" size="extraSmall" boldness="semiBold">
                  {t("services.select_service_type.availableTech")}
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => proceed("scheduled")}
                className="flex-1 rounded-2xl items-center justify-center py-3.5"
                style={{ backgroundColor: Colors.secondary }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={17} color={Colors.support_secondary} />
                  <CustomText color="support_secondary" size="large" boldness="bold" classes="ml-1.5">
                    {t("services.select_service_type.scheduled")}
                  </CustomText>
                </View>
                <CustomText color="success" size="extraSmall" boldness="semiBold">
                  {t("services.select_service_type.spare25")}
                </CustomText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Cart;
