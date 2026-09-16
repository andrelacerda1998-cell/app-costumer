import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { CustomText } from "../CustomText";
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { Colors } from "@/constants/Colors";
import { useService } from "@/contexts/ServiceContext";
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
  const { setServiceToRequest } = useService();

  const ready = request.status === "Matching" && request.candidates_ready > 0;
  const reviewing = request.status === "PendingReview";
  // Já escolheu e não pagou. Sem este estado o cartão dizia-lhe que andávamos
  // "à procura de profissionais" — com um já escolhido à espera dele. Apanhado
  // a percorrer o fluxo: sair do checkout deixava o pedido a mentir.
  const awaiting = request.status === "AwaitingPayment" && !!request.selected;

  const label = awaiting
    ? t("services_tab.request_awaiting_payment")
    : ready
      ? t("services_tab.request_ready", { count: request.candidates_ready })
      : reviewing
        ? t("services_tab.request_reviewing")
        : t("services_tab.request_searching");

  const actionable = ready || awaiting;

  /**
   * A pagar retoma-se o checkout com o preço congelado; a escolher abre-se a
   * lista. São dois destinos porque são dois momentos diferentes do mesmo
   * pedido.
   */
  const onPress = () => {
    if (!awaiting) {
      router.navigate(`/(app)/(modals)/(services)/(request)/matching/${request.id}`);
      return;
    }

    // O mesmo contexto que o ecrã de escolha deixa ao avançar. Sem ele o
    // checkout abre a dizer "não conseguimos carregar os dados do pedido" e
    // com o botão de pagar desligado — apanhado a percorrer o atalho.
    const { vendor, amount, distance } = request.selected!;
    setServiceToRequest((prev: any) => ({
      ...(prev ?? {}),
      // Personalizado não tem tipo de catálogo: o que dá título ao checkout é
      // a descrição do próprio cliente. O id fica null de propósito.
      ...(request.is_custom ? { service_type: { id: null, name: request.title ?? "" } } : {}),
      vendor: { id: vendor.id, name: vendor.name, rate: amount, distance, rating: vendor.rating },
    }));

    router.navigate({
      pathname: "/(app)/(modals)/(services)/(request)/checkout/[serviceId]",
      params: {
        serviceId: String(request.id),
        matching: "1",
        amount: String(amount),
        travel: String(request.selected!.travel_amount),
        dist: String(distance),
      },
    });
  };

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
            name={awaiting ? "credit-card" : ready ? "users" : reviewing ? "clipboard" : "search"}
            size={14}
            color={actionable ? Colors.secondary : Colors.gray_medium}
          />
          <CustomText
            color={actionable ? "secondary" : "gray_strong"}
            boldness={actionable ? "bold" : "regular"}
            size="small"
            classes="ml-1.5"
          >
            {label}
          </CustomText>
        </View>
      </View>

      {/* O botão só quando há mesmo o que decidir. Nas outras duas esperas não
          há nada a fazer, e um botão convidava a um ecrã que só repete isto.
          Cada estado tinha uma frase de apoio por baixo — três linhas para
          dizer o que o título e o botão já diziam. Ficam o quê, o quanto e o
          que fazer a seguir; a garantia de que escolher não cobra está no ecrã
          seguinte, onde a hesitação acontece. */}
      {actionable && (
        <View className="px-4 pb-4">
          <CustomTouchableOpacity
            type="primary"
            size="medium"
            textColor="secondary"
            textBoldness="bold"
            text={awaiting ? t("services_tab.request_pay") : t("services_tab.request_choose")}
            onPress={onPress}
          />
        </View>
      )}
    </View>
  );
};

export default PendingRequestsList;
