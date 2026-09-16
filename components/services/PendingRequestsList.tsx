import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { CustomText } from "../CustomText";
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { Colors } from "@/constants/Colors";
import type { CurrentMatchingRequest } from "@/hooks/useCurrentMatchingRequest";

/**
 * O separador "Pedidos": o que foi pedido e ainda não é um serviço marcado.
 *
 * Fica aqui, e não na Home, porque é onde o cliente vem perguntar "e o meu
 * pedido?" — ao lado do que está marcado e do que já passou. Antes só a
 * notificação lá levava: quem a descartasse ficava com propostas à espera e
 * nenhum caminho de volta.
 */
const PendingRequestsList = ({
  request,
  refreshing = false,
  onRefresh,
}: {
  request: CurrentMatchingRequest | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}) => {
  const { t } = useTranslation();

  const body = !request ? (
    <View className="items-center justify-center px-8" style={{ paddingTop: 72 }}>
      <View
        className="items-center justify-center rounded-full mb-4"
        style={{ width: 72, height: 72, backgroundColor: "rgba(250,187,91,0.18)" }}
      >
        <Feather name="inbox" size={28} color={Colors.primary} />
      </View>
      <CustomText color="secondary" boldness="bold" size="medium" classes="text-center">
        {t("services_tab.requests_empty_title")}
      </CustomText>
      <CustomText color="gray_medium" size="small" classes="text-center mt-1">
        {t("services_tab.requests_empty_subtitle")}
      </CustomText>
    </View>
  ) : (
    <RequestRow request={request} />
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} /> : undefined
      }
    >
      {body}
    </ScrollView>
  );
};

const RequestRow = ({ request }: { request: CurrentMatchingRequest }) => {
  const { t } = useTranslation();

  const ready = request.status === "Matching" && request.candidates_ready > 0;
  const reviewing = request.status === "PendingReview";

  const label = ready
    ? t("services_tab.request_ready", { count: request.candidates_ready })
    : reviewing
      ? t("services_tab.request_reviewing")
      : t("services_tab.request_searching");

  const hint = ready
    ? t("services_tab.request_ready_hint")
    : reviewing
      ? t("services_tab.request_reviewing_hint")
      : t("services_tab.request_searching_hint");

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: Colors.support_secondary, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}
    >
      <View className="p-4">
        {!!request.title && (
          <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={2}>
            {request.title}
          </CustomText>
        )}
        <View className="flex-row items-center mt-2">
          <Feather
            name={ready ? "users" : reviewing ? "clipboard" : "search"}
            size={14}
            color={ready ? Colors.secondary : Colors.gray_medium}
          />
          <CustomText
            color={ready ? "secondary" : "gray_strong"}
            boldness={ready ? "bold" : "regular"}
            size="small"
            classes="ml-1.5"
          >
            {label}
          </CustomText>
        </View>
        <CustomText color="gray_medium" size="extraSmall" classes="mt-1">
          {hint}
        </CustomText>
      </View>

      {/* O botão só quando há mesmo o que decidir. Nas outras duas esperas não
          há nada a fazer, e um botão convidava a um ecrã que só repete isto. */}
      {ready && (
        <View className="px-4 pb-4">
          <CustomTouchableOpacity
            type="primary"
            size="medium"
            textColor="secondary"
            textBoldness="bold"
            text={t("services_tab.request_choose")}
            onPress={() => router.navigate(`/(app)/(modals)/(services)/(request)/matching/${request.id}`)}
          />
        </View>
      )}
    </View>
  );
};

export default PendingRequestsList;
