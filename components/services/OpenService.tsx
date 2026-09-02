import { useService } from "@/contexts/ServiceContext";
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient";
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { CustomText } from "../CustomText";
import ArrowIcon from "@/assets/icons/arrow";
import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import { buildCountdownInfo } from "@/utils/serviceCountdown";

/**
 * Cartão do serviço a decorrer, na home.
 *
 * Âmbar tostado: a cor da marca com menos luz. Fica na mesma família do
 * cabeçalho, da pesquisa e das restantes peças quentes da Home, mas escura o
 * suficiente para ser o único bloco de cor forte do ecrã — sem recorrer ao
 * preto, que a Home já usa na prova social e na barra de tabs.
 *
 * Contraste: branco sobre #8F4E0A dá 7:1 e o creme dos acentos 6,4:1.
 */

// Âmbar tostado, do mais claro para o mais fundo, na diagonal.
const GRADIENT = ["#B26A12", "#8F4E0A"] as const;
const ACCENT_SOFT = "rgba(253,243,225,0.18)";

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
  const statusIcon: React.ComponentProps<typeof Feather>["name"] =
    openService?.status === ServiceStatus.FINISHED
      ? "check-circle"
      : minutesLeft
        ? "clock"
        : "truck";

  // Pulsar lento no ponto de "ao vivo": sinaliza que o serviço está a decorrer
  // agora sem acrescentar mais texto ao cartão.
  const pulse = useRef(new Animated.Value(0)).current;
  const isLive = !!minutesLeft;
  useEffect(() => {
    if (!isLive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLive, pulse]);

  return (
    <View className="px-5 my-2">
      <CustomTouchableOpacity
        type="transparent"
        size="large"
        itemsCenter={false}
        onPress={() => {
          router.navigate(`/(app)/(pages)/(services)/(open)/overview/${openService?.id}`);
        }}
        // O style vem por props e substitui o do componente; o gradiente entra
        // por baixo, por isso aqui só ficam a forma e a sombra.
        style={{
          borderRadius: 20,
          padding: 0,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(253,243,225,0.28)",
          shadowColor: "#8F4E0A",
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: "100%", paddingHorizontal: 18, paddingVertical: 18 }}
        >
          <View className="flex-row items-center gap-4">
            <View className="items-center justify-center">
              {/* Halo por trás do ícone: dá relevo sem uma segunda cor. */}
              <View
                className="absolute rounded-full"
                style={{ width: 52, height: 52, backgroundColor: ACCENT_SOFT }}
              />
              <View
                className="w-11 h-11 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(253,243,225,0.22)" }}
              >
                <Feather name={statusIcon} size={22} color="#FDF3E1" />
              </View>
            </View>

            <View className="flex-1">
              <CustomText color="support_secondary" size="medium" boldness="bold" numberOfLines={1}>
                {openService?.service_type?.name}
              </CustomText>
              <View className="flex-row items-center mt-0.5">
                {isLive && (
                  <Animated.View
                    className="rounded-full mr-1.5"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: "#FDF3E1",
                      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
                    }}
                  />
                )}
                <CustomText color="support_secondary" size="extraSmall" boldness="semiBold" numberOfLines={1}>
                  {minutesLeft
                    ? t('services.service.open.time_left', { min: minutesLeft })
                    : (
                      <>
                        {openService?.status === ServiceStatus.ACCEPTED && t('services.service.open.in_progress')}
                        {openService?.status === ServiceStatus.FINISHED && t('services.service.open.finished')}
                        {openService?.status === ServiceStatus.ARRIVED && t('services.service.open.arrived')}
                      </>
                    )}
                </CustomText>
              </View>
            </View>

            <View className="h-4 w-4">
              <ArrowIcon position="right" color="#FDF3E1" />
            </View>
          </View>
        </LinearGradient>
      </CustomTouchableOpacity>
    </View>
  )
}

export default OpenService
