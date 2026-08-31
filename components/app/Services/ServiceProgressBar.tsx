import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { ServiceStatus } from "@/types/services";

/**
 * Onde vai o serviço, em quatro passos: aceite → a caminho → em execução →
 * concluído.
 *
 * O passo é deduzido do estado que o backend envia, e "a caminho" só conta
 * quando existe `on_the_way_at` — ACCEPTED sozinho significa apenas que o
 * técnico aceitou, ainda não saiu.
 */

export const PROGRESS_STEP_COUNT = 4;

export type ServiceProgressStep = 0 | 1 | 2 | 3;

type Service = {
  status?: string | null;
  on_the_way_at?: string | null;
  arrived_at?: string | null;
} | null | undefined;

/** Índice do passo ATUAL (0-3). Passos anteriores contam como concluídos. */
export const resolveProgressStep = (service: Service): ServiceProgressStep => {
  const status = service?.status;

  if (status === ServiceStatus.FINISHED || status === ServiceStatus.CLOSED) return 3;
  if (status === ServiceStatus.ARRIVED) return 2;
  if (status === ServiceStatus.ACCEPTED) return service?.on_the_way_at ? 1 : 0;

  return 0;
};

const ServiceProgressBar = ({ service }: { service: Service }) => {
  const { t } = useTranslation();
  const current = resolveProgressStep(service);

  const steps = [
    { key: "accepted", label: t("services.service_overview.progress.accepted"), icon: "check" as const },
    { key: "on_the_way", label: t("services.service_overview.progress.on_the_way"), icon: "navigation" as const },
    { key: "in_progress", label: t("services.service_overview.progress.in_progress"), icon: "tool" as const },
    { key: "done", label: t("services.service_overview.progress.done"), icon: "flag" as const },
  ];

  return (
    <View className="mb-4">
      <View className="flex-row">
        {steps.map((step, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          const isReached = isDone || isCurrent;

          return (
            <View key={step.key} className="flex-1 items-center">
              {/* Linha + marcador */}
              <View className="flex-row items-center w-full">
                <View
                  className="flex-1 h-0.5"
                  style={{
                    backgroundColor: index === 0
                      ? "transparent"
                      : (isReached ? Colors.primary : Colors.support_primary),
                  }}
                />
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: isCurrent ? 30 : 24,
                    height: isCurrent ? 30 : 24,
                    backgroundColor: isReached ? Colors.primary : Colors.support_secondary,
                    borderWidth: isReached ? 0 : 1,
                    borderColor: Colors.support_primary,
                  }}
                >
                  <Feather
                    name={isDone ? "check" : step.icon}
                    size={isCurrent ? 15 : 12}
                    color={isReached ? Colors.secondary : Colors.gray_light}
                  />
                </View>
                <View
                  className="flex-1 h-0.5"
                  style={{
                    backgroundColor: index === steps.length - 1
                      ? "transparent"
                      : (index < current ? Colors.primary : Colors.support_primary),
                  }}
                />
              </View>

              <CustomText
                color={isReached ? "secondary" : "gray_medium"}
                size="extraSmall"
                boldness={isCurrent ? "bold" : "regular"}
                numberOfLines={1}
                classes="mt-1.5 text-center"
              >
                {step.label}
              </CustomText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default ServiceProgressBar;
