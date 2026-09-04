import React, { useCallback, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { useApi } from "@/contexts/ApiContext";
import { useSession } from "@/contexts/SessionContext";
import { useDialog } from "@/contexts/DialogContext";
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

const AddressList = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog, closeDialog } = useDialog();
  const { userData, setUserData } = useSession();
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    api.get(API_ROUTES.CUSTOMER_ADDRESSES)
      .then(({ data }) => setAddresses(data?.data?.addresses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setMain = (a: AddressItem) => {
    if (a.main_address) return;
    setBusyId(a.id);
    api.put(API_ROUTES.CUSTOMER_ADDRESS_SET_MAIN(a.id))
      .then(({ data }) => {
        // A morada ativa passa a ser esta: o chip da Home e os pedidos usam a
        // principal, por isso atualiza-se já a sessão sem esperar por refetch.
        const updated = data?.data?.address ?? a;
        setUserData({ ...userData, address: updated });
        load();
      })
      .finally(() => setBusyId(null));
  };

  const remove = (a: AddressItem) => {
    openDialog({
      title: t("addresses.delete_title"),
      subtitle: t("addresses.delete_subtitle"),
      cancelButtonText: t("general.cancel"),
      successButtonText: t("addresses.delete"),
      onSuccess: () => {
        setBusyId(a.id);
        api.delete(API_ROUTES.CUSTOMER_ADDRESS_DELETE(a.id))
          .then(() => load())
          .finally(() => setBusyId(null));
      },
    });
  };

  const edit = (a: AddressItem) =>
    router.push({ pathname: "/(app)/(modals)/(address)/update", params: { address: JSON.stringify(a) } });

  const add = () =>
    router.push({ pathname: "/(app)/(modals)/(address)/update", params: { mode: "create" } });

  return (
    <SafeAreaView className="flex-1 bg-support_secondary">
      <View className="p-5 flex-1">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("addresses.list_title")}
            </CustomText>
          )}
          otherClasses="pb-4"
        />

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            // flexGrow: sem isto o conteúdo mede o que ocupa e a mensagem
            // vazia não tem altura contra a qual centrar-se.
            contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {addresses.length === 0 ? (
              <View className="flex-1 items-center justify-center px-6">
                <View className="items-center justify-center rounded-full mb-5" style={{ width: 88, height: 88, backgroundColor: "rgba(250,187,91,0.12)" }}>
                  <Feather name="map-pin" size={38} color={Colors.primary} />
                </View>
                <CustomText color="secondary" boldness="bold" size="large" classes="text-center mb-1">
                  {t("addresses.empty_title")}
                </CustomText>
                <CustomText color="gray_medium" size="small" classes="text-center">
                  {t("addresses.empty_subtitle")}
                </CustomText>
              </View>
            ) : (
              addresses.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  activeOpacity={0.85}
                  onPress={() => setMain(a)}
                  disabled={busyId === a.id}
                  className="rounded-2xl p-4 mb-3 border"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: a.main_address ? Colors.primary : Colors.gray_light,
                    borderWidth: a.main_address ? 2 : 1,
                  }}
                >
                  <View className="flex-row items-center justify-between">
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
                    {/* radio de principal */}
                    <View className="items-center justify-center rounded-full" style={{ width: 24, height: 24, borderWidth: 2, borderColor: a.main_address ? Colors.primary : Colors.gray_light }}>
                      {!!a.main_address && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary }} />}
                    </View>
                  </View>

                  <View className="flex-row mt-3" style={{ gap: 18 }}>
                    <TouchableOpacity onPress={() => edit(a)} hitSlop={8} className="flex-row items-center" style={{ gap: 6 }}>
                      <Feather name="edit-2" size={15} color={Colors.gray_medium} />
                      <CustomText color="gray_medium" size="small" boldness="semiBold">{t("addresses.edit")}</CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(a)} hitSlop={8} className="flex-row items-center" style={{ gap: 6 }}>
                      <Feather name="trash-2" size={15} color={Colors.error} />
                      <CustomText color="error" size="small" boldness="semiBold">{t("addresses.delete")}</CustomText>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        <View className="pt-2">
          <CustomTouchableOpacity
            size="large"
            type="primary"
            textColor="secondary"
            textBoldness="bold"
            text={t("addresses.add_title")}
            onPress={add}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AddressList;
