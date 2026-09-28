import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, {useEffect, useRef, useState} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler, Dimensions, Platform, ScrollView, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import TouchOpacity from '@/components/TouchOpacity';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import useEcho from '@/hooks/echo';
import { jwtDecode } from 'jwt-decode';
import { useSession } from '@/contexts/SessionContext';
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import Timer, { R, TIME_TO_WAIT_FOR_VENDOR } from "@/components/Timer";
import { ServiceInterface, ServiceStatus } from "@/types/services";
import { buildCountdownInfo, formatMinutesLeft } from "@/utils/serviceCountdown";
import { technicianPhoneNumber } from "@/utils/serviceContact";
import ServiceInProgress from "@/components/modals/services/ServiceInProgress";
import { useService } from "@/contexts/ServiceContext";
import ServiceRouteMap from "@/components/app/Services/ServiceRouteMap";
import TechnicianContactCard from "@/components/app/Services/TechnicianContactCard";
import { useTranslation } from "react-i18next";
import ArrowIcon from "@/assets/icons/arrow";
import haversineDistance from "@/utils/map/distanceCoords";

const isValidCoordinate = (coord?: number) =>
    coord !== undefined && coord !== null && !isNaN(coord);

const Progress = () => {
  const { t } = useTranslation();
  const { openService, getOpenService } = useService();
  const technicianPhone = technicianPhoneNumber(openService?.vendor?.user);

  // Logo a seguir ao checkout, o serviço em memória vem do evento de aceitação
  // ou do detalhe do pedido — e nenhum dos dois traz o telefone do técnico. O
  // endpoint do serviço aberto traz. Sem isto, o "Ligar" só aparecia depois de
  // fechar e reabrir a app: no ecrã em que o cliente mais precisa dele.
  useEffect(() => {
    if (openService?.id && !technicianPhone) {
      getOpenService();
    }
  }, [openService?.id]);

  const houseLat = parseFloat(String(openService?.address?.latitude));
  const houseLng = parseFloat(String(openService?.address?.longitude));

  const vendorLat = parseFloat(String(openService?.vendor?.location?.latitude));
  const vendorLng = parseFloat(String(openService?.vendor?.location?.longitude));

  const validDestination = isValidCoordinate(houseLng) && isValidCoordinate(houseLat);
  const validUserLocation = isValidCoordinate(vendorLng) && isValidCoordinate(vendorLat);
  const distanceKm = validDestination && validUserLocation
    ? haversineDistance(houseLat, houseLng, vendorLat, vendorLng)
    : null;
  const distanceLabel = distanceKm !== null
    ? `${distanceKm.toFixed(2)} ${t('services.service.history.labels.km')}`
    : t('services.service.open.no_distance');
  // ETA estimado: velocidade urbana média ~22 km/h. Aproximação — não é um
  // dado do backend; arredondado a 5 min (min. 5) para não fingir precisão.
  const etaMinutes = distanceKm !== null
    ? Math.max(5, Math.round((distanceKm / 22) * 60 / 5) * 5)
    : null;

  // Já chegou ao local: a partir daqui não há "a caminho" nem ETA — o que
  // interessa é quanto falta para acabar. É a mesma conta da Live Activity
  // (buildCountdownInfo), para o ecrã e o ecrã bloqueado não se contradizerem.
  const hasArrived = openService?.status === ServiceStatus.ARRIVED;
  // Terminado pelo técnico, à espera da confirmação do cliente. Sem este ramo
  // caía no "está a caminho" — um serviço acabado a dizer que vem a caminho.
  const hasFinished = openService?.status === ServiceStatus.FINISHED;
  // Aceite mas ainda parado. O texto decidia-se só pelo estado e escrevia
  // "{nome} está a caminho · Chega em ~N min" três segundos depois do
  // pagamento — quando o técnico ainda nem sabia que fora escolhido. O facto
  // que diz se ele saiu é o `on_the_way_at`, e o payload já o traz.
  const hasLeft = !!openService?.on_the_way_at;
  const countdown = buildCountdownInfo(openService);
  const minutesLeft = countdown.active
    ? Math.max(1, Math.ceil(countdown.secondsRemaining / 60))
    : null;




  const { height: screenH } = Dimensions.get("window");
  // Com o técnico a caminho, o mapa é o ecrã. Depois de chegar deixa de haver
  // trajeto para seguir — passa a ser contexto, e o espaço vai para a contagem.
  const mapHeight = Math.round(screenH * (hasArrived || hasFinished ? 0.34 : 0.46));
  const vendorName = openService?.vendor?.user?.name ?? "";

  const StatusCard = () => (
    <View className="bg-support_secondary rounded-2xl px-4 py-3 flex-row items-center" style={{ shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
      <View className="w-11 h-11 rounded-full items-center justify-center mr-3" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
        <Ionicons name={hasFinished ? "checkmark-done" : hasArrived ? "construct" : "car"} size={20} color={Colors.secondary} />
      </View>
      <View className="flex-1">
        {/* Chegado: o tempo que falta é o dado principal e vem em primeiro,
            grande. A caminho manda o estado, e o ETA é uma estimativa que não
            merece o mesmo peso. */}
        {hasFinished ? (
          <>
            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={2}>
              {t("services.service.open.work_done_title")}
            </CustomText>
            <CustomText color="gray_strong" size="small" boldness="regular" numberOfLines={2}>
              {t("services.service.open.work_done_subtitle", { name: vendorName })}
            </CustomText>
          </>
        ) : hasArrived && minutesLeft ? (
          <>
            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1}>
              {t("services.service.open.time_left", { time: formatMinutesLeft(minutesLeft) })}
            </CustomText>
            <CustomText color="gray_strong" size="small" boldness="regular" numberOfLines={1}>
              {t("services.service.open.working_here", { name: vendorName })}
            </CustomText>
          </>
        ) : (
          <>
            <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
              {hasArrived
                ? t("services.service.open.working_here", { name: vendorName })
                : hasLeft
                  ? t("services.service.open.on_the_way", { name: vendorName })
                  : t("services.service.open.accepted_waiting", { name: vendorName })}
            </CustomText>
            {/* A preto: é a estimativa de chegada, o dado que o cliente vem
                mesmo ver a este ecrã. Em cinzento lia-se como uma nota de
                rodapé do nome do técnico. */}
            <CustomText color="secondary" size="small" boldness="semiBold" numberOfLines={1}>
              {hasArrived
                ? t("services.service.open.arrived")
                : !hasLeft
                  // Sem ETA antes de ele sair: uma estimativa de chegada para
                  // quem ainda não se pôs a caminho é um número inventado.
                  ? t("services.service.open.accepted_waiting_hint")
                  : (etaMinutes
                      ? t("services.service.open.eta", { min: etaMinutes })
                      : t("services.service.open.eta_arriving"))}
            </CustomText>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      {/* Título centrado no ecrã, como nos outros cabeçalhos: a seta sai do
          fluxo para o texto se centrar no cabeçalho inteiro e não no espaço
          que sobra à direita dela. */}
      <View className="px-5 pt-3 pb-3 bg-primary justify-center">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) return router.back();
            router.dismissAll();
            return router.replace("/(app)/(tabs)/home");
          }}
          className="absolute left-5 top-0 bottom-0 w-9 justify-center"
        >
          <View className="w-5 h-5">
            <ArrowIcon color={Colors.secondary} position="left" />
          </View>
        </TouchableOpacity>
        <CustomText color="secondary" boldness="bold" size="large" numberOfLines={1} classes="text-center px-12">
          {t("services.service.open.tracking_header")}
        </CustomText>
      </View>

      {/* Mapa */}
      <View style={{ height: mapHeight, backgroundColor: "#FAF7F2" }}>
        <ServiceRouteMap
          interactive
          fallback={
            /* Sem coordenadas não há nada para enquadrar, e um mapa do mundo com
               uma rota imaginária informa menos do que dizer que ainda não se
               sabe onde o técnico vai. O resto do ecrã — estado, técnico, chat —
               continua a funcionar. */
            <View className="flex-1 items-center justify-center px-8">
              <View
                className="items-center justify-center rounded-full mb-3"
                style={{ width: 64, height: 64, backgroundColor: "rgba(250,187,91,0.18)" }}
              >
                <Ionicons name="location-outline" size={28} color={Colors.secondary} />
              </View>
              <CustomText color="secondary" boldness="bold" size="medium" classes="text-center">
                {t("services.service.open.map_unavailable_title")}
              </CustomText>
              <CustomText color="gray_strong" boldness="regular" size="small" classes="text-center mt-1">
                {t("services.service.open.map_unavailable_subtitle")}
              </CustomText>
            </View>
          }
        />

        {/* Estado, sobreposto ao mapa — só enquanto vai a caminho, que é
            quando o mapa manda. Chegado, o cartão passa para o fluxo abaixo:
            o mapa encolhido não o comporta sem ficar apertado. */}
        {vendorName && !hasArrived && !hasFinished ? (
          <View className="absolute left-4 right-4 bottom-3">
            <StatusCard />
          </View>
        ) : null}
      </View>

      {/* Conteúdo */}
      <ScrollView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} contentContainerStyle={{ padding: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {vendorName && (hasArrived || hasFinished) ? (
          <View className="mb-4">
            <StatusCard />
          </View>
        ) : null}

        <TechnicianContactCard />

        {/* Precisa de ajuda */}
        <TouchableOpacity
          onPress={() => router.navigate({ pathname: "/(app)/(modals)/support-ticket", params: { serviceId: String(openService?.id ?? "") } })}
          className="flex-row items-center justify-center mt-5 py-2"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.gray_medium} />
          <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-2">
            {t("general.need_help")}
          </CustomText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Progress;
