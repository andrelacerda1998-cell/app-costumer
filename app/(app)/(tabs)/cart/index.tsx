import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useCart } from "@/contexts/CartContext";
import { useService } from "@/contexts/ServiceContext";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { renderMoney } from "@/utils/money";
import { useTranslation } from "react-i18next";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Cesto: junta vários serviços e reserva-os. O backend processa um serviço
 * por pedido, por isso cada item entra no fluxo normal à vez. A verificação
 * de "técnico único" cruza as pesquisas reais de técnicos de cada serviço.
 */
const Cart = () => {
  const { t } = useTranslation();
  const { items, removeItem } = useCart();
  const { setServiceToRequest } = useService();
  const { session, userData } = useSession();
  const { guestSession } = useGuestSession();
  const { api } = useApi();
  const { track } = useMixpanel();

  const [checkingCommon, setCheckingCommon] = useState(false);
  const [commonCount, setCommonCount] = useState<number | null>(null);

  const totalFrom = items.reduce((acc, i) => acc + (i.starts_from ?? 0), 0);
  const hasAddress = session
    ? !!userData?.address
    : !!(guestSession?.guest_address?.latitude && guestSession?.guest_address?.longitude);

  // Técnico único: interseção (por id) dos técnicos devolvidos para cada serviço.
  const checkCommonTechnician = useCallback(async () => {
    if (items.length < 2 || !hasAddress) {
      setCommonCount(null);
      return;
    }
    setCheckingCommon(true);
    try {
      const results = await Promise.all(
        items.map((item) => {
          const endpoint = session ? API_ROUTES.CUSTOMER_REQUEST_SERVICE : API_ROUTES.GUEST_SEARCH_VENDORS;
          const payload = session
            ? { service_type: item.id }
            : {
                service_type_id: item.id,
                latitude: guestSession?.guest_address?.latitude,
                longitude: guestSession?.guest_address?.longitude,
              };
          return api
            .post(endpoint, payload)
            .then((res) => {
              const vendors = res?.data?.data?.vendors;
              const list = Array.isArray(vendors) ? vendors : Object.values(vendors ?? {});
              return new Set(list.map((v: any) => v?.id).filter(Boolean));
            })
            .catch(() => new Set<number>());
        }),
      );
      const common = results.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))));
      setCommonCount(common.size);
      track("cart_common_technician_checked", { items: items.length, common: common.size });
    } catch {
      setCommonCount(null);
    } finally {
      setCheckingCommon(false);
    }
  }, [items, session, hasAddress]);

  useFocusEffect(
    useCallback(() => {
      checkCommonTechnician();
    }, [checkCommonTechnician]),
  );

  const bookItem = (item: (typeof items)[number]) => {
    setServiceToRequest({ service_type: item });
    track("cart_item_booking_started", { service_type_id: item.id });
    router.navigate("/(app)/(modals)/(services)/(request)/select-service-type/info");
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
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Técnico único para todos os serviços? */}
            {items.length >= 2 && hasAddress && (
              <View
                className="flex-row items-center rounded-2xl p-4 mb-4"
                style={{
                  backgroundColor:
                    commonCount === null ? "rgba(250,187,91,0.15)" : commonCount > 0 ? "rgba(34,197,94,0.12)" : "rgba(250,187,91,0.15)",
                }}
              >
                {checkingCommon ? (
                  <ActivityIndicator size="small" color={Colors.secondary} style={{ marginRight: 12 }} />
                ) : (
                  <Ionicons
                    name={commonCount !== null && commonCount > 0 ? "person" : "people-outline"}
                    size={20}
                    color={commonCount !== null && commonCount > 0 ? Colors.success : Colors.secondary}
                    style={{ marginRight: 12 }}
                  />
                )}
                <View className="flex-1">
                  <CustomText color="secondary" size="small" boldness="semiBold">
                    {checkingCommon
                      ? t("cart.common_checking")
                      : commonCount === null
                        ? t("cart.common_unknown")
                        : commonCount > 0
                          ? commonCount === 1
                            ? t("cart.common_found_one")
                            : t("cart.common_found", { count: commonCount })
                          : t("cart.common_none")}
                  </CustomText>
                  {!checkingCommon && commonCount === 0 && (
                    <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-0.5">
                      {t("cart.common_none_hint")}
                    </CustomText>
                  )}
                </View>
              </View>
            )}

            {/* Itens */}
            {items.map((item) => (
              <View
                key={item.id}
                className="bg-support_secondary rounded-2xl p-4 mb-3"
                style={CARD_SHADOW}
              >
                <View className="flex-row items-center">
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
                    {typeof item.starts_from === "number" && item.starts_from > 0 && (
                      <CustomText color="gray_medium" size="small" boldness="regular" classes="mt-0.5">
                        {t("cart.from_price", { price: renderMoney(item.starts_from) })}
                      </CustomText>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    className="p-2"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => bookItem(item)}
                  className="mt-3 rounded-full py-3 items-center justify-center flex-row"
                  style={{ backgroundColor: Colors.primary }}
                >
                  <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1}>
                    {t("cart.book_item")}
                  </CustomText>
                  <Feather name="arrow-right" size={15} color={Colors.secondary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Resumo */}
            {totalFrom > 0 && (
              <View className="bg-support_secondary rounded-2xl p-4 mt-1" style={CARD_SHADOW}>
                <View className="flex-row justify-between items-center">
                  <CustomText color="secondary" size="medium" boldness="regular">
                    {t("cart.total_from")}
                  </CustomText>
                  <CustomText color="secondary" size="extraLarge" boldness="bold">
                    {renderMoney(totalFrom)}
                  </CustomText>
                </View>
                <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-1">
                  {t("cart.total_hint")}
                </CustomText>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Cart;
