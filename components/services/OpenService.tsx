import { useService } from "@/contexts/ServiceContext";
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, View } from "react-native"
import { CustomText } from "../CustomText";
import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import { buildCountdownInfo } from "@/utils/serviceCountdown";
import { Radius, Spacing } from "@/constants/Layout";
import CustomTouchableOpacity from "../CustomTouchableOpacity";

/**
 * Cartão do serviço a decorrer, na Home. Só existe quando há um.
 *
 * Três níveis de leitura, do mais genérico ao mais específico: a etiqueta
 * "Serviço em curso" diz o que é isto, o nome diz qual é, e a linha do relógio
 * diz em que ponto vai. Antes o nome do serviço era o topo e o utilizador tinha
 * de deduzir porque é que aquele cartão estava ali.
 *
 * Laranja da marca em superfície clara em vez de um bloco saturado: destaca-se
 * pela borda e pelo acento, e não compete com os CTA do ecrã.
 */

const SURFACE = "#FFF6E9";
const ACCENT = "#A85F12";

const OpenService = () => {
  const { t } = useTranslation();
  const { openService } = useService();

  const countdown = buildCountdownInfo(openService);
  const minutesLeft = countdown.active
    ? Math.max(1, Math.ceil(countdown.secondsRemaining / 60))
    : null;

  // Pulsar lento enquanto o trabalho decorre: sinaliza "agora" sem mais texto.
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

  if (!openService) return null;

  const statusLine = minutesLeft
    ? t('services.service.open.time_left', { min: minutesLeft })
    : openService.status === ServiceStatus.FINISHED
      ? t('services.service.open.finished')
      : openService.status === ServiceStatus.ARRIVED
        ? t('services.service.open.arrived')
        : t('services.service.open.in_progress');

  return (
    <View style={{ paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg }}>
      <CustomTouchableOpacity
        type="transparent"
        size="large"
        itemsCenter={false}
        accessibilityRole="button"
        accessibilityLabel={`${t('home.open_service_title')}: ${openService?.service_type?.name ?? ''}. ${statusLine}`}
        onPress={() => router.navigate(`/(app)/(pages)/(services)/(open)/overview/${openService?.id}`)}
        style={{
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          backgroundColor: SURFACE,
          borderWidth: 1,
          borderColor: "rgba(250,187,91,0.55)",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {isLive && (
              <Animated.View
                className="rounded-full mr-2"
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: ACCENT,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] }) }],
                }}
              />
            )}
            <CustomText
              size="extraSmall"
              boldness="bold"
              color="secondary"
              style={{ color: ACCENT, letterSpacing: 0.4 }}
            >
              {t('home.open_service_title').toUpperCase()}
            </CustomText>
          </View>

          <View className="flex-row items-center">
            <CustomText size="extraSmall" boldness="bold" color="secondary" style={{ color: ACCENT }}>
              {t('home.open_service_cta')}
            </CustomText>
            <Feather name="chevron-right" size={15} color={ACCENT} style={{ marginLeft: 2 }} />
          </View>
        </View>

        <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1} classes="mt-1.5">
          {openService?.service_type?.name}
        </CustomText>

        <View className="flex-row items-center mt-1">
          <Feather name="clock" size={13} color={Colors.gray_strong} />
          <CustomText color="gray_strong" size="extraSmall" boldness="regular" classes="ml-1.5" numberOfLines={1}>
            {statusLine}
          </CustomText>
        </View>
      </CustomTouchableOpacity>
    </View>
  )
}

export default OpenService
