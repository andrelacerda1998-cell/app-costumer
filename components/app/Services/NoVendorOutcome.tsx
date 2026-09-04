import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { CustomText } from "@/components/CustomText";

/**
 * Fim de linha sem técnico: ninguém apareceu, ninguém respondeu a tempo ou o
 * técnico recusou. É o momento em que se perde o cliente, por isso o ecrã evita
 * o ar de erro e oferece as duas saídas reais — repetir agora, ou agendar para
 * uma hora com técnicos livres.
 *
 * Vive num só sítio porque aparece em dois pontos do fluxo (escolha de técnico
 * e espera pela aceitação): duplicado, divergia à primeira alteração.
 */
const NoVendorOutcome = ({
  icon = "clock",
  title,
  subtitle,
  retryLabel,
  onRetry,
  scheduleLabel,
  onSchedule,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  retryLabel: string;
  onRetry: () => void;
  scheduleLabel: string;
  onSchedule: () => void;
}) => (
  <View className="flex-1 items-center justify-center px-8">
    <View
      className="items-center justify-center rounded-full mb-5"
      style={{ width: 96, height: 96, backgroundColor: "rgba(250,187,91,0.18)" }}
    >
      <Feather name={icon} size={38} color={Colors.secondary} />
    </View>

    <CustomText color="secondary" boldness="bold" size="large" classes="text-center">
      {title}
    </CustomText>
    <CustomText color="gray_strong" boldness="regular" size="small" classes="text-center mt-2 mb-7">
      {subtitle}
    </CustomText>

    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onRetry}
      className="rounded-full flex-row items-center justify-center w-full px-8 py-4"
      style={{
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Feather name="refresh-cw" size={17} color={Colors.secondary} />
      <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1} classes="ml-2">
        {retryLabel}
      </CustomText>
    </TouchableOpacity>

    {/* Agendar não é desistir: é a mesma reserva noutra hora, e nas horas
        marcadas há sempre mais técnicos livres. */}
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSchedule}
      className="rounded-full items-center justify-center w-full px-8 py-3.5 mt-3"
      style={{ borderWidth: 1.5, borderColor: Colors.secondary }}
    >
      <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1}>
        {scheduleLabel}
      </CustomText>
    </TouchableOpacity>
  </View>
);

export default NoVendorOutcome;
