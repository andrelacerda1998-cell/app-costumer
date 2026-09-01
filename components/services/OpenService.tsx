import { useService } from "@/contexts/ServiceContext";
import React from 'react'
import { View } from "react-native"
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { CustomText } from "../CustomText";
import ArrowIcon from "@/assets/icons/arrow";
import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import { buildCountdownInfo } from "@/utils/serviceCountdown";

// Âmbar cheio: um serviço a decorrer é o que há de mais urgente na home e tem
// de saltar à vista por entre os cartões claros. Todo o texto vai em
// `secondary` — branco sobre âmbar dá 1,7:1 e é ilegível.
const CARD_BACKGROUND = Colors.primary;
const ICON_BACKGROUND = "rgba(27,27,27,0.12)";

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

  return (
    <View className="px-5 my-2">
      <CustomTouchableOpacity
        type="transparent"
        size="large"
        itemsCenter={false}
        onPress={() => {
          router.navigate(`/(app)/(pages)/(services)/(open)/overview/${openService?.id}`);
        }}
        // O style vem por props e substitui o do componente, por isso repete-se
        // aqui o raio e o padding do tamanho "large".
        style={{
          backgroundColor: CARD_BACKGROUND,
          borderRadius: 10,
          borderWidth: 0,
          shadowColor: Colors.primary,
          shadowOpacity: 0.45,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
          paddingHorizontal: 18,
          paddingVertical: 18,
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "flex-start",
        }}
      >
        <View className="flex-row items-center gap-4">
          <View
            className="p-2 items-center justify-center rounded-lg"
            style={{ backgroundColor: ICON_BACKGROUND }}
          >
            <Feather name={statusIcon} size={24} color={Colors.secondary} />
          </View>
          <View className="flex-1">
            <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1}>{openService?.service_type?.name}</CustomText>
            <CustomText color="secondary" size="extraSmall" boldness={minutesLeft ? "semiBold" : "regular"} numberOfLines={1}>
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
          <View className="h-4 w-4">
            <ArrowIcon position="right" color={Colors.secondary} />
          </View>
        </View>
      </CustomTouchableOpacity>
    </View>
  )
}

export default OpenService
