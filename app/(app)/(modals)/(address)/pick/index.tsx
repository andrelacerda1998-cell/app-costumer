import React, { useCallback, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { useApi } from "@/contexts/ApiContext";
import { useService } from "@/contexts/ServiceContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { Colors } from "@/constants/Colors";

interface AddressItem {
  id: number;
  address_name?: string | null;
  name?: string | null;
  street_name?: string | null;
  street_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  main_address: boolean | number;
}

const lineFor = (a: AddressItem) =>
  [[a.street_name, a.street_number].filter(Boolean).join(", ") || a.name, a.postal_code, a.city]
    .filter(Boolean)
    .join(" · ");

/**
 * Escolher, para ESTE pedido, uma morada diferente da principal.
 *
 * Ao contrário de (address)/list, tocar numa morada aqui NÃO a torna
 * principal — só marca a exceção deste pedido em `ServiceContext.selectedAddress`
 * e volta atrás. Gerir (criar/editar/apagar/trocar principal) continua a viver
 * só em (address)/list, acessível daqui pelo link "Gerir moradas".
 */
const PickAddress = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { setSelectedAddress } = useService();
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.get(API_ROUTES.CUSTOMER_ADDRESSES)
      .then(({ data }) => setAddresses(data?.data?.addresses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pick = (a: AddressItem) => {
    const label = a.address_name || a.city || t("addresses.unnamed");
    setSelectedAddress(a.main_address ? null : { id: a.id, label });
    router.back();
  };

  const manage = () => router.push("/(app)/(modals)/(address)/list");

  return (
    <SafeAreaView className="flex-1 bg-support_secondary">
      <View className="p-5 flex-1">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("addresses.pick_title")}
            </CustomText>
          )}
          otherClasses="pb-4"
        />

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {addresses.map((a) => (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.85}
                onPress={() => pick(a)}
                className="rounded-2xl p-4 mb-3 border flex-row items-center justify-between"
                style={{ backgroundColor: "#FFFFFF", borderColor: Colors.gray_light, borderWidth: 1 }}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1}>
                      {a.address_name || a.city || t("addresses.unnamed")}
                    </CustomText>
                    {!!a.main_address && (
                      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                        <CustomText color="secondary" size="extraSmall" boldness="bold">
                          {t("addresses.main")}
                        </CustomText>
                      </View>
                    )}
                  </View>
                  <CustomText color="gray_medium" size="small" numberOfLines={2} classes="mt-1">
                    {lineFor(a)}
                  </CustomText>
                </View>
                <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity onPress={manage} className="items-center py-3" hitSlop={8}>
          <CustomText color="gray_medium" size="small" boldness="semiBold">
            {t("addresses.manage")}
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PickAddress;
