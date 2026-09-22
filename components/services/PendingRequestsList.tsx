import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import i18n from "@/translation";
import { CustomText } from "../CustomText";
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { Colors } from "@/constants/Colors";
import { renderMoney } from "@/utils/money";
import { formatBookingDay, formatScheduledTime } from "@/utils/schedule";
import { useDeadlineCountdown } from "./useDeadlineCountdown";
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
  /**
   * Altura REAL da barra de separadores, medida pelo React Navigation.
   *
   * A barra e personalizada e a altura varia com o `insets.bottom`; as margens
   * adivinhadas ficavam curtas e o ultimo item aparecia cortado por baixo
   * dela. A folga vive no conteudo do scroll, nao no contentor.
   */
  const tabBarHeight = useBottomTabBarHeight();
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
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabBarHeight + 16 }}
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
   * Quando. Um pedido marcado mostra o dia e a hora que o cliente escolheu;
   * um imediato não tem hora escolhida, e o que responde a "quando é que eu
   * pedi isto?" é a hora a que o pedido saiu.
   *
   * Formata-se aqui e não no servidor: "Hoje" e o dia da semana dependem do
   * fuso e do idioma de quem está a olhar.
   */
  const when = (() => {
    const day = formatBookingDay(request.schedule?.scheduled_day, i18n.language);
    const time = formatScheduledTime(request.schedule?.scheduled_time_start);
    if (day) return [day, time].filter(Boolean).join(" · ");

    if (!request.requested_at) return null;
    const at = new Date(request.requested_at);
    if (Number.isNaN(at.getTime())) return null;

    const locale = i18n.language === "pt_PT" ? "pt-PT" : "en-US";
    const hour = at.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    const isToday = at.toDateString() === new Date().toDateString();

    return isToday
      ? t("services_tab.requested_today", { time: hour })
      : `${formatBookingDay(at.toISOString(), i18n.language)} · ${hour}`;
  })();


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

  /**
   * O estado sobe para uma faixa no topo, como o selo dos cartões de
   * profissional. Antes era uma linha solta entre o título e o botão: com o
   * título à esquerda e o estado ao centro, o cartão tinha dois eixos e não se
   * sabia o que era cabeçalho e o que era conteúdo.
   *
   * Âmbar quando há alguma coisa a fazer, neutro quando é só esperar. A cor
   * diz sozinha se o cartão pede uma decisão.
   */
  /**
   * O tempo que resta para escolher e pagar.
   *
   * Vive na faixa, ao lado do estado: é a mesma informação — em que ponto está
   * o pedido — e uma linha só para o relógio dava-lhe um peso que ele não tem
   * enquanto faltam cinquenta minutos.
   *
   * Abaixo de cinco minutos passa a negrito. É o ponto em que deixa de ser
   * contexto e passa a ser um aviso.
   */
  const remaining = useDeadlineCountdown(request.expires_at, request.server_time);
  const urgent = remaining !== null && remaining > 0 && remaining <= 300;
  const countdown =
    remaining === null
      ? null
      : remaining <= 0
        ? t("services_tab.request_expired")
        : remaining >= 60
          ? t("services_tab.request_left_minutes", { count: Math.ceil(remaining / 60) })
          : t("services_tab.request_left_seconds", { count: remaining });

  const strip = actionable
    ? { bg: Colors.primary, ink: Colors.secondary }
    : { bg: Colors.support_primary, ink: Colors.gray_medium };

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: Colors.support_secondary, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" }}
    >
      <View className="flex-row items-center px-4 py-1.5" style={{ backgroundColor: strip.bg }}>
        <Feather
          name={awaiting ? "credit-card" : ready ? "users" : reviewing ? "clipboard" : "search"}
          size={13}
          color={strip.ink}
        />
        <CustomText
          size="extraSmall"
          boldness="bold"
          color="secondary"
          numberOfLines={1}
          classes="ml-1.5 flex-1"
          style={{ color: strip.ink, letterSpacing: 0.6 }}
        >
          {label.toUpperCase()}
        </CustomText>

        {!!countdown && (
          <View className="flex-row items-center ml-2">
            <Feather name="clock" size={12} color={strip.ink} />
            <CustomText
              size="extraSmall"
              boldness={urgent ? "bolder" : "medium"}
              color="secondary"
              numberOfLines={1}
              classes="ml-1"
              style={{ color: strip.ink }}
            >
              {countdown}
            </CustomText>
          </View>
        )}
      </View>

      <View className="px-4 pt-3">
        {/* O rótulo antes da descrição: sem ele, uma frase escrita pelo próprio
            cliente ("Trocar a fechadura...") aparecia como título do cartão e
            não como aquilo que é — o que ele pediu. */}
        {!!request.title && (
          <>
            <CustomText color="gray_medium" size="small" boldness="regular">
              {t("services_tab.request_service_type")}
            </CustomText>
            <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={3} classes="mt-0.5">
              {request.title}
            </CustomText>
          </>
        )}

        {!!when && (
          <View className="flex-row items-center mt-3">
            <Feather name="calendar" size={15} color={Colors.gray_medium} />
            <CustomText color="gray_strong" size="small" numberOfLines={1} classes="ml-2">
              {when}
            </CustomText>
          </View>
        )}

        {/* Já escolhido: quem e quanto. Sem isto o cartão mandava pagar sem
            dizer a quem nem o quê — e o cliente tinha de abrir o checkout só
            para se lembrar do que tinha escolhido. */}
        {awaiting && (
          <View
            className="flex-row items-center justify-between mt-2.5 pt-2.5"
            style={{ borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.07)" }}
          >
            <View className="flex-row items-center flex-1 mr-3">
              <Feather name="user" size={15} color={Colors.gray_medium} />
              <CustomText color="gray_strong" size="small" numberOfLines={1} classes="ml-2">
                {request.selected!.vendor.name}
              </CustomText>
            </View>
            <CustomText color="secondary" size="medium" boldness="bolder" numberOfLines={1}>
              {renderMoney(request.selected!.amount)}
            </CustomText>
          </View>
        )}
      </View>

      {/* O botão só quando há mesmo o que decidir. Nas outras duas esperas não
          há nada a fazer, e um botão convidava a um ecrã que só repete isto. */}
      {actionable ? (
        <View className="px-4 pt-3 pb-4">
          <CustomTouchableOpacity
            type="primary"
            size="medium"
            textColor="secondary"
            textBoldness="bold"
            text={awaiting ? t("services_tab.request_pay") : t("services_tab.request_choose")}
            onPress={onPress}
          />
        </View>
      ) : (
        <View className="pb-4" />
      )}
    </View>
  );
};

export default PendingRequestsList;
