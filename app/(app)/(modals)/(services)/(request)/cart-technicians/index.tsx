import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useCart, type CartBooking, type CartMode } from "@/contexts/CartContext";
import { useService } from "@/contexts/ServiceContext";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { renderMoney } from "@/utils/money";
import { useTranslation } from "react-i18next";
import { ServiceTypeInterface } from "@/types/services";

interface VendorOption {
  id: number;
  name: string;
  rating: number;
  rate: number;
  avatar: string | null;
  raw: any;
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Fluxo do cesto (espelho da build 15):
 * - se HÁ técnicos que fazem todos os serviços → escolha única (uma visita);
 * - se NÃO há → um técnico por serviço, em reservas separadas.
 * O backend processa um serviço por pedido, por isso a confirmação percorre
 * a fila (um checkout por serviço); o cesto vai limpando à medida que cria.
 */
const CartTechnicians = () => {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const mode: CartMode = params.mode === "scheduled" ? "scheduled" : "immediate";

  const { items, startQueue } = useCart();
  const { setServiceToRequest, setScheduledService, setSelectedProfessional } = useService();
  const { session } = useSession();
  const { guestSession, setSelectedVendor: setGuestSelectedVendor } = useGuestSession();
  const { api } = useApi();
  const { track } = useMixpanel();

  const [loading, setLoading] = useState(true);
  const [vendorsByService, setVendorsByService] = useState<Record<number, VendorOption[]>>({});
  // técnico único
  const [selectedCommon, setSelectedCommon] = useState<number | null>(null);
  // um técnico por serviço: serviceTypeId -> vendorId
  const [selectedPerService, setSelectedPerService] = useState<Record<number, number>>({});

  const normalize = (v: any): VendorOption => ({
    id: v?.id,
    name: v?.name ?? "",
    rating: typeof v?.rating === "number" ? v.rating : 0,
    rate: typeof v?.rate === "number" ? v.rate : Number(v?.rate) || 0,
    avatar: v?.avatar?.small ?? (typeof v?.avatar === "string" ? v.avatar : null),
    raw: v,
  });

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const results: Record<number, VendorOption[]> = {};
      await Promise.all(
        items.map(async (item) => {
          try {
            const endpoint = session
              ? mode === "scheduled"
                ? API_ROUTES.POST_SCHEDULE_VENDORS
                : API_ROUTES.CUSTOMER_REQUEST_SERVICE
              : API_ROUTES.GUEST_SEARCH_VENDORS;
            const payload = session
              ? { service_type: item.id }
              : {
                  service_type_id: item.id,
                  latitude: guestSession?.guest_address?.latitude,
                  longitude: guestSession?.guest_address?.longitude,
                  ...(mode === "scheduled" ? { scheduled: true } : {}),
                };
            const res = await api.post(endpoint, payload);
            const vendors = res?.data?.data?.vendors;
            const list = Array.isArray(vendors) ? vendors : Object.values(vendors ?? {});
            results[item.id] = list.map(normalize).filter((v: VendorOption) => v.id);
          } catch {
            results[item.id] = [];
          }
        }),
      );
      if (!cancelled) {
        setVendorsByService(results);
        setLoading(false);
      }
    };
    if (items.length > 0) fetchAll();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, []);

  // Técnicos comuns a TODOS os serviços, com preço total real (Σ rate por serviço)
  const commonVendors = useMemo(() => {
    if (items.length === 0 || Object.keys(vendorsByService).length < items.length) return [];
    const lists = items.map((i) => vendorsByService[i.id] ?? []);
    if (lists.some((l) => l.length === 0)) return [];
    const first = lists[0];
    return first
      .filter((v) => lists.every((l) => l.some((x) => x.id === v.id)))
      .map((v) => ({
        ...v,
        total: lists.reduce((sum, l) => sum + (l.find((x) => x.id === v.id)?.rate ?? 0), 0),
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [vendorsByService, items]);

  const isMultiMode = !loading && commonVendors.length === 0;

  const allChosen = isMultiMode
    ? items.every((i) => selectedPerService[i.id] !== undefined)
    : selectedCommon !== null;

  const total = useMemo(() => {
    if (!isMultiMode) {
      return commonVendors.find((v) => v.id === selectedCommon)?.total ?? 0;
    }
    return items.reduce((sum, i) => {
      const v = (vendorsByService[i.id] ?? []).find((x) => x.id === selectedPerService[i.id]);
      return sum + (v?.rate ?? 0);
    }, 0);
  }, [isMultiMode, commonVendors, selectedCommon, items, selectedPerService, vendorsByService]);

  const startBooking = (booking: CartBooking) => {
    const vendor = booking.vendor;
    setScheduledService(mode === "scheduled");
    setSelectedProfessional(vendor);
    setServiceToRequest({ service_type: booking.serviceType, vendor });
    if (!session) setGuestSelectedVendor(vendor.id, vendor);
    if (mode === "scheduled") {
      router.navigate("/(app)/(modals)/(services)/(schedule)/schedule/schedule-service");
    } else {
      router.navigate(`/(app)/(modals)/(services)/(request)/checkout/${booking.serviceType.id}`);
    }
  };

  const proceed = () => {
    if (!allChosen) return;
    const bookings: CartBooking[] = items.map((item) => {
      const vendorOpt = isMultiMode
        ? (vendorsByService[item.id] ?? []).find((v) => v.id === selectedPerService[item.id])
        : commonVendors.find((v) => v.id === selectedCommon);
      return { serviceType: item, vendor: vendorOpt?.raw };
    });
    startQueue(bookings, mode);
    track("cart_booking_flow_started", {
      items: items.length,
      single_technician: !isMultiMode,
      mode,
    });
    startBooking(bookings[0]);
  };

  const durationLabel = (st: ServiceTypeInterface) => {
    const mins = st.time;
    if (typeof mins !== "number" || mins <= 0) return null;
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  };

  const vendorTile = (
    v: VendorOption & { total?: number },
    selected: boolean,
    price: number,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={v.id}
      activeOpacity={0.85}
      onPress={onPress}
      className="bg-support_secondary rounded-2xl p-4 mb-2.5 flex-row items-center"
      style={{
        ...CARD_SHADOW,
        borderWidth: selected ? 2 : 0,
        borderColor: Colors.primary,
      }}
    >
      <View className="h-12 w-12 rounded-xl overflow-hidden mr-3 flex-shrink-0">
        {v.avatar ? (
          <Image source={{ uri: v.avatar }} className="w-full h-full" />
        ) : (
          <View className="w-full h-full items-center justify-center" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
            <Feather name="user" size={22} color={Colors.secondary} />
          </View>
        )}
      </View>
      <View className="flex-1">
        <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1}>
          {v.name}
        </CustomText>
        {v.rating > 0 && (
          <View className="flex-row items-center mt-0.5">
            <AntDesign name="star" size={13} color={Colors.primary} />
            <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1">
              {v.rating.toFixed(1)}
            </CustomText>
          </View>
        )}
      </View>
      <View className="items-end ml-2">
        <View className="rounded-xl px-3 py-1.5" style={{ backgroundColor: "rgba(250,187,91,0.15)" }}>
          <CustomText color="secondary" boldness="bolder" size="medium" numberOfLines={1}>
            {renderMoney(price)}
          </CustomText>
        </View>
      </View>
      <View className="ml-2">
        <Ionicons
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={selected ? Colors.primary : Colors.gray_strong}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("cart.technicians_header")}
            </CustomText>
          )}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.primary} />
            <CustomText color="gray_medium" size="small" boldness="regular" classes="mt-4">
              {t("cart.common_checking")}
            </CustomText>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <CustomText color="secondary" boldness="bold" size="extraLarge" classes="text-center mb-1">
                {t("cart.technicians_title")}
              </CustomText>
              <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mb-5">
                {isMultiMode ? t("cart.multi_subtitle") : t("cart.single_subtitle")}
              </CustomText>

              {!isMultiMode ? (
                <>
                  {commonVendors.map((v) =>
                    vendorTile(v, selectedCommon === v.id, v.total, () => setSelectedCommon(v.id)),
                  )}
                  {/* Os serviços cobertos */}
                  <View className="bg-support_secondary rounded-2xl p-4 mt-2" style={CARD_SHADOW}>
                    <CustomText color="gray_medium" size="small" boldness="semiBold" classes="mb-2">
                      {t("cart.covered_services")}
                    </CustomText>
                    {items.map((item) => (
                      <View key={item.id} className="flex-row items-center mt-1">
                        <Feather name="check" size={14} color={Colors.success} />
                        <CustomText color="secondary" size="small" boldness="regular" classes="ml-2 flex-1" numberOfLines={1}>
                          {item.name}
                          {durationLabel(item) ? `  ·  ${durationLabel(item)}` : ""}
                        </CustomText>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                items.map((item, index) => {
                  const options = (vendorsByService[item.id] ?? []).slice(0, 3);
                  return (
                    <View key={item.id} className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <View
                          className="items-center justify-center rounded-lg mr-2.5"
                          style={{ width: 30, height: 30, backgroundColor: Colors.secondary }}
                        >
                          <CustomText color="primary" size="small" boldness="bold">
                            {index + 1}
                          </CustomText>
                        </View>
                        <View className="flex-1">
                          <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1}>
                            {item.name}
                          </CustomText>
                          {durationLabel(item) && (
                            <CustomText color="gray_medium" size="extraSmall" boldness="regular">
                              {durationLabel(item)}
                            </CustomText>
                          )}
                        </View>
                      </View>
                      {options.length === 0 ? (
                        <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1">
                          {t("services.select_vendor.no_vendors_found")}
                        </CustomText>
                      ) : (
                        options.map((v) =>
                          vendorTile(v, selectedPerService[item.id] === v.id, v.rate, () =>
                            setSelectedPerService((prev) => ({ ...prev, [item.id]: v.id })),
                          ),
                        )
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View className="px-5 pb-5 pt-2">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={proceed}
                disabled={!allChosen}
                style={{
                  backgroundColor: allChosen ? Colors.primary : "rgba(250,187,91,0.35)",
                  borderRadius: 999,
                  paddingVertical: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  ...(allChosen
                    ? {
                        shadowColor: Colors.primary,
                        shadowOpacity: 0.5,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 8,
                      }
                    : {}),
                }}
              >
                <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1} style={{ opacity: allChosen ? 1 : 0.5 }}>
                  {allChosen
                    ? `${t("cart.continue")}  ·  ${renderMoney(total)}`
                    : isMultiMode
                      ? t("cart.pick_per_service")
                      : t("cart.pick_one")}
                </CustomText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CartTechnicians;
