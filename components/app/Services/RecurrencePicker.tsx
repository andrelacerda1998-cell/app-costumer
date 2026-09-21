import React from "react";
import { Text, TouchableHighlight, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

export type Recurrence = "once" | "weekly" | "biweekly" | "monthly";

/**
 * A escolha de repetir uma marcação.
 *
 * Vivia no ecrã de escolher o dia e a hora, onde chegava cedo de mais: nessa
 * altura o cliente ainda está a resolver *quando*, e comprometer-se com uma
 * série semanal é uma decisão de outra ordem — tem preço, e o preço só aparece
 * no checkout. Aqui, ao lado do que vai pagar, a pergunta faz-se sozinha.
 *
 * As chaves de tradução ficam as do ecrã de agendamento: é o mesmo texto, e
 * duplicá-lo só criaria duas versões para divergirem.
 */
const RecurrencePicker = ({
  value,
  onChange,
}: {
  value: Recurrence;
  onChange: (value: Recurrence) => void;
}) => {
  const { t } = useTranslation();

  const opcoes = [
    { key: "once", label: t("services.schedule_service.repeat_once") },
    { key: "weekly", label: t("services.schedule_service.repeat_weekly") },
    { key: "biweekly", label: t("services.schedule_service.repeat_biweekly") },
    { key: "monthly", label: t("services.schedule_service.repeat_monthly") },
  ] as const;

  return (
    <View>
      <View className="flex-row items-center mb-3">
        <View
          className="items-center justify-center"
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.secondary }}
        >
          <Feather name="repeat" size={17} color={Colors.support_secondary} />
        </View>
        <View className="flex-1 ml-3">
          <CustomText color="secondary" boldness="bold" size="medium">
            {t("services.schedule_service.repeat_title")}
          </CustomText>
          <CustomText color="gray_strong" size="small" boldness="regular" numberOfLines={2}>
            {t("services.schedule_service.repeat_subtitle")}
          </CustomText>
        </View>
      </View>

      {/* Duas por linha, todas do mesmo tamanho: com larguras dependentes do
          texto, três ficavam numa fila e a quarta sozinha, como se tivesse
          sobrado. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {opcoes.map((option) => {
          const active = value === option.key;
          return (
            <TouchableHighlight
              key={option.key}
              underlayColor="transparent"
              onPress={() => onChange(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                width: "48.5%",
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                borderWidth: 1.5,
                backgroundColor: active ? Colors.primary : Colors.support_secondary,
                borderColor: active ? Colors.primary : Colors.support_primary,
              }}
            >
              <View className="flex-row items-center">
                {active && (
                  <Feather name="check" size={14} color={Colors.secondary} style={{ marginRight: 6 }} />
                )}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    color: Colors.secondary,
                    fontFamily: active ? "Poppins_600SemiBold" : "Poppins_400Regular",
                  }}
                >
                  {option.label}
                </Text>
              </View>
            </TouchableHighlight>
          );
        })}
      </View>

      {value !== "once" && (
        /* O que fica prometido, por escrito — mas curto: a versão longa era
           cortada pelo rodapé e ninguém a lia até ao fim. */
        <View className="flex-row items-start mt-3">
          <Feather name="info" size={14} color={Colors.gray_strong} style={{ marginTop: 2 }} />
          <CustomText color="gray_strong" size="small" boldness="regular" classes="ml-2 flex-1">
            {t("services.schedule_service.repeat_hint")}
          </CustomText>
        </View>
      )}
    </View>
  );
};

export default RecurrencePicker;
