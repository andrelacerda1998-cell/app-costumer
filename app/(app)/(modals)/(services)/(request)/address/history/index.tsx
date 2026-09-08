import React from "react";
import { ScrollView, TouchableOpacity, View, Dimensions} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import useAddressHistory from "@/hooks/useAddressHistory";
import {
  StoredAddress,
  formatAddressDetail,
  formatAddressLine,
} from "@/utils/addressHistory";

/**
 * Moradas já usadas — entre a home e o formulário de morada.
 *
 * O cliente volta quase sempre às mesmas duas ou três moradas. Antes, tocar na
 * morada da home abria logo o formulário vazio e obrigava a reescrever tudo,
 * mesmo para voltar à morada de ontem. Aqui escolhe-se com um toque, e o
 * formulário fica a um toque de distância para o que é mesmo novo.
 *
 * Só para convidados: quem tem sessão vai para a lista do servidor
 * ((address)/list), que é a fonte de verdade das moradas da conta.
 */
const AddressHistory = () => {
  const { t } = useTranslation();
  const { history, forget } = useAddressHistory();
  const { setGuestAddress } = useGuestSession();

  const goToForm = () =>
    router.push({
      pathname: "/(app)/(modals)/(services)/(request)/address/guest",
      params: { returnTo: "back" },
    });

  const choose = (address: StoredAddress) => {
    setGuestAddress(address as any);
    if (router.canGoBack()) return router.back();
    router.replace("/(app)/(tabs)/home");
  };

  return (
    <SafeAreaView className="flex-1 bg-support_secondary" edges={["top", "left", "right"]}>
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t("services.select_service_type.address_guest.history_title")}
          </CustomText>
        )}
        otherClasses="p-5"
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {history.length === 0 ? (
          /* Centrado no ecrã e não no espaço a seguir ao botão: com paddingTop
             fixo, o bloco ficava a um terço do topo e o resto do ecrã vazio. */
          <View
            className="items-center justify-center px-6"
            style={{ minHeight: Dimensions.get("window").height * 0.62 }}
          >
            <View
              className="items-center justify-center rounded-full mb-4"
              style={{ width: 84, height: 84, backgroundColor: "rgba(250,187,91,0.15)" }}
            >
              <Feather name="map-pin" size={34} color={Colors.primary} />
            </View>
            <CustomText color="secondary" boldness="bold" size="medium" classes="text-center">
              {t("services.select_service_type.address_guest.empty_title")}
            </CustomText>
            <CustomText color="gray_medium" size="small" classes="text-center mt-1 mb-6">
              {t("services.select_service_type.address_guest.empty_subtitle")}
            </CustomText>

            {/* Sem moradas guardadas, introduzir uma é a única coisa a fazer
                neste ecrã: o botão vem depois da explicação, cheio, em vez de um
                contorno pontilhado no topo a competir com o vazio. */}
            <TouchableOpacity
              activeOpacity={0.85}
              accessibilityRole="button"
              onPress={goToForm}
              className="rounded-full flex-row items-center justify-center px-7"
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: 16,
                shadowColor: Colors.primary,
                shadowOpacity: 0.45,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              <Feather name="plus" size={18} color={Colors.secondary} />
              <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1} classes="ml-2">
                {t("services.select_service_type.address_guest.add_new")}
              </CustomText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Com moradas guardadas o botão volta ao topo: aí o que se procura
                é a morada certa, e introduzir outra é a alternativa. */}
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={goToForm}
              className="flex-row items-center rounded-2xl px-4 py-4 mb-4"
              style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: Colors.primary }}
            >
              <View
                className="items-center justify-center rounded-full mr-3"
                style={{ width: 36, height: 36, backgroundColor: "rgba(250,187,91,0.22)" }}
              >
                <Feather name="plus" size={18} color={Colors.secondary} />
              </View>
              <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                {t("services.select_service_type.address_guest.add_new")}
              </CustomText>
            </TouchableOpacity>

            <CustomText color="gray_medium" size="small" boldness="bold" classes="mb-2 ml-1">
              {t("services.select_service_type.address_guest.recent_title")}
            </CustomText>

            {history.map((address, index) => (
              <View
                key={`${formatAddressLine(address)}-${index}`}
                className="flex-row items-center"
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: index < history.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.support_primary,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  onPress={() => choose(address)}
                  className="flex-row items-center flex-1"
                >
                  <Feather name="map-pin" size={20} color={Colors.primary} />
                  <View className="flex-1 ml-3">
                    <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                      {formatAddressLine(address)}
                    </CustomText>
                    {!!formatAddressDetail(address) && (
                      <CustomText color="gray_medium" size="small" numberOfLines={1} classes="mt-0.5">
                        {formatAddressDetail(address)}
                      </CustomText>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => forget(address)}
                  accessibilityRole="button"
                  accessibilityLabel={t("services.select_service_type.address_guest.remove_a11y")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="ml-2 p-1"
                >
                  <Feather name="x" size={16} color={Colors.gray_light} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddressHistory;
