import { useService } from "@/contexts/ServiceContext";
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, View } from "react-native"
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { CustomText } from "../CustomText";
import ArrowIcon from "@/assets/icons/arrow";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import { buildCountdownInfo, formatMinutesLeft } from "@/utils/serviceCountdown";

/**
 * Cartão do serviço a decorrer, na home.
 *
 * Âmbar da marca (#FABB5B), com o texto a preto: branco sobre âmbar dá 1,7:1 e
 * é ilegível, o preto dá 10:1. O bloco é o mesmo tom do cabeçalho e da
 * pesquisa, e destaca-se pela largura e pela sombra, não por uma cor à parte.
 *
 * Alinhado à esquerda, com o mesmo quadrado preto do cartão dos agendamentos
 * que vem a seguir: os dois lêem-se como um par.
 */

const AMBER = "#FABB5B";
const ACCENT_SOFT = "rgba(0,0,0,0.10)";
const ON_AMBER = "#1A1A1A";

const OpenService = () => {
  const { t } = useTranslation();
  const { openService } = useService();

  // Com o técnico no local, "faltam ~X min" diz mais do que "chegou ao local"
  // — e é a mesma conta do ecrã de acompanhamento e da Live Activity.
  const countdown = buildCountdownInfo(openService);
  const minutesLeft = countdown.active
    ? Math.max(1, Math.ceil(countdown.secondsRemaining / 60))
    : null;

  // O ícone diz em que ponto vai o serviço, em vez de ser sempre a mesma chave
  // inglesa: a caminho, a decorrer (com o tempo a contar) ou à espera de
  // confirmação.
  // Sem glifo enquanto o serviço decorre: uma bolinha a pulsar diz "ao vivo"
  // sem desenhar nada, como o ponto de gravação. Só no fim entra um símbolo —
  // aí já não há nada a acontecer para animar.

  // Pulsar lento no ponto de "ao vivo": sinaliza que o serviço está a decorrer
  // agora sem acrescentar mais texto ao cartão.
  const pulse = useRef(new Animated.Value(0)).current;
  // Segundo anel, meio ciclo atrás: com um só, havia um instante morto entre o
  // fim de uma onda e o início da seguinte.
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const pulse4 = useRef(new Animated.Value(0)).current;
  // A bolinha pulsa enquanto o serviço estiver a decorrer — não só quando há
  // contagem: 'a caminho' também é o serviço a acontecer.
  const isLive = openService?.status !== ServiceStatus.FINISHED;
  useEffect(() => {
    if (!isLive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    // Quatro ondas, cada uma a um quarto de ciclo da anterior: quantas mais,
    // mais densa a expansão e mais o sinal puxa o olho.
    const ripple = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const loop2 = ripple(pulse2, 550);
    const loop3 = ripple(pulse3, 1100);
    const loop4 = ripple(pulse4, 1650);
    loop.start();
    loop2.start();
    loop3.start();
    loop4.start();
    return () => {
      loop.stop();
      loop2.stop();
      loop3.stop();
      loop4.stop();
    };
  }, [isLive, pulse, pulse2, pulse3, pulse4]);

  const vendorName = (openService as any)?.vendor?.name ?? null;
  // "Serviço em curso" com o técnico ainda a caminho dizia o que não era: o
  // trabalho só começa quando ele chega. Com on_the_way_at e sem chegada, o
  // estado é esse mesmo.
  const onTheWay = !minutesLeft
    && !!(openService as any)?.on_the_way_at
    && openService?.status !== ServiceStatus.ARRIVED
    && openService?.status !== ServiceStatus.FINISHED;

  const statusLabel = minutesLeft
    ? t('services.service.open.time_left', { time: formatMinutesLeft(minutesLeft) })
    : openService?.status === ServiceStatus.FINISHED
      ? t('services.service.open.finished')
      : openService?.status === ServiceStatus.ARRIVED
        ? t('services.service.open.arrived')
        : onTheWay
          ? t('services.service.open.vendor_on_the_way')
          : t('services.service.open.in_progress');

  return (
    <View className="px-5 my-1">
      <CustomTouchableOpacity
        type="transparent"
        size="large"
        itemsCenter={false}
        onPress={() => {
          router.navigate(`/(app)/(pages)/(services)/(open)/overview/${openService?.id}`);
        }}
        style={{
          borderRadius: 20,
          padding: 0,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)",
          shadowColor: "#B26A12",
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        {/* Alinhado à esquerda como o cartão dos agendamentos logo abaixo, e
            com o mesmo quadrado preto de cantos redondos: os dois cartões do
            topo passam a ler-se como um par, e não como duas ideias soltas.
            Centrar o texto obrigava a manter o cartão alto para o conjunto não
            parecer torto — encostado, cabe em metade da altura. */}
        <View
          style={{
            width: "100%",
            backgroundColor: AMBER,
            paddingHorizontal: 14,
            paddingVertical: 12,
            justifyContent: "center",
          }}
        >
          {/* Ícone e seta fora do fluxo, encostados às pontas: assim o texto
              centra-se no cartão inteiro e não no espaço que sobra entre os
              dois. */}
          <View className="absolute left-5 top-0 bottom-0 justify-center">
            {/* Sem o quadrado preto por baixo: a bolinha a pulsar já é o sinal,
                e a caixa só a fechava. A preto sobre o âmbar tem o mesmo
                contraste que o texto do cartão. */}
            {isLive ? (
              <View className="items-center justify-center" style={{ width: 34, height: 34 }}>
                <Animated.View
                  className="absolute rounded-full"
                  style={{
                    width: 30,
                    height: 30,
                    backgroundColor: ON_AMBER,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] }) }],
                  }}
                />
                <Animated.View
                  className="absolute rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    borderWidth: 2,
                    borderColor: ON_AMBER,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 1.3] }) }],
                  }}
                />
                <Animated.View
                  className="absolute rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    borderWidth: 2,
                    borderColor: ON_AMBER,
                    opacity: pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                    transform: [{ scale: pulse2.interpolate({ inputRange: [0, 1], outputRange: [0.42, 1.3] }) }],
                  }}
                />
                <Animated.View
                  className="absolute rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    borderWidth: 2,
                    borderColor: ON_AMBER,
                    opacity: pulse3.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                    transform: [{ scale: pulse3.interpolate({ inputRange: [0, 1], outputRange: [0.42, 1.3] }) }],
                  }}
                />
                <Animated.View
                  className="absolute rounded-full"
                  style={{
                    width: 26,
                    height: 26,
                    borderWidth: 2,
                    borderColor: ON_AMBER,
                    opacity: pulse4.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                    transform: [{ scale: pulse4.interpolate({ inputRange: [0, 1], outputRange: [0.42, 1.3] }) }],
                  }}
                />
                <Animated.View
                  className="rounded-full"
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: ON_AMBER,
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
                  }}
                />
              </View>
            ) : (
              <Ionicons name="checkmark-circle" size={28} color={ON_AMBER} />
            )}
          </View>

          <View className="items-center px-12">
            <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1} classes="text-center">
              {openService?.service_type?.name}
            </CustomText>

            {/* Estado e técnico na mesma linha: é o que falta saber depois do
                nome do serviço, e enche a linha que antes ficava vazia. */}
            <View className="flex-row items-center justify-center mt-0.5">
              <CustomText color="secondary" size="extraSmall" boldness="semiBold" numberOfLines={1}>
                {statusLabel}
              </CustomText>
              {!!vendorName && (
                <>
                  <View
                    className="rounded-full mx-1.5"
                    style={{ width: 3, height: 3, backgroundColor: "rgba(0,0,0,0.45)" }}
                  />
                  <CustomText color="secondary" size="extraSmall" boldness="regular" numberOfLines={1}>
                    {vendorName}
                  </CustomText>
                </>
              )}
            </View>
          </View>

          <View className="absolute right-4 top-0 bottom-0 justify-center">
            <View className="h-4 w-4">
              <ArrowIcon position="right" color={ON_AMBER} />
            </View>
          </View>
        </View>
      </CustomTouchableOpacity>
    </View>
  )
}

export default OpenService
