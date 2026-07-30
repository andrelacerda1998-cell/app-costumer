import React from "react";
import { TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useService } from "@/contexts/ServiceContext";
import { renderMoney } from "@/utils/money";

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Tempo extra / peças pedidas pelo técnico durante o serviço (ver
 * BACKEND_PENDENCIAS.md #9). Só aparece quando existe pelo menos um pedido —
 * silencioso enquanto o técnico não pedir nada. Tocar num pedido pendente
 * reabre a folha de revisão (ex.: se o cliente ignorou o pedido em tempo real).
 */
const ServiceExtrasCard = () => {
  const { t } = useTranslation();
  const { serviceExtras } = useService();

  if (serviceExtras.length === 0) return null;

  const pending = serviceExtras.filter((e) => e.status === "pending");
  const approved = serviceExtras.filter((e) => e.status === "approved");
  const rejected = serviceExtras.filter((e) => e.status === "rejected");
  const approvedTotal = approved.reduce((sum, e) => sum + (e.amount || 0), 0);

  const label = (e: (typeof serviceExtras)[number]) =>
    e.type === "time" ? t("services.extras.time_label", { minutes: e.minutes ?? 0 }) : e.description || "";

  const openReview = (extraId: number) =>
    router.navigate({
      pathname: "/(app)/(bottom-sheets)/(services)/extra-request/[extraId]",
      params: { extraId: String(extraId) },
    });

  return (
    <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
      <CustomText color="gray_medium" size="extraSmall" boldness="bold">
        {t("services.extras.card_title")}
      </CustomText>

      {pending.map((e) => (
        <TouchableOpacity
          key={e.id}
          activeOpacity={0.8}
          onPress={() => openReview(e.id)}
          className="flex-row items-center rounded-xl p-3 mt-3"
          style={{ backgroundColor: "rgba(250,187,91,0.18)" }}
        >
          <MaterialIcons name={e.type === "time" ? "more-time" : "construction"} size={18} color={Colors.secondary} />
          <CustomText color="secondary" size="small" boldness="semiBold" classes="flex-1 ml-2" numberOfLines={2}>
            {t("services.extras.waiting", { item: label(e) })}
          </CustomText>
          <Feather name="chevron-right" size={16} color={Colors.gray_medium} />
        </TouchableOpacity>
      ))}

      {approved.map((e) => (
        <View key={e.id} className="flex-row items-center mt-3">
          <Feather name="check-circle" size={16} color={Colors.success} />
          <CustomText color="secondary" size="small" boldness="regular" classes="flex-1 ml-2" numberOfLines={2}>
            {t("services.extras.approved", { item: label(e) })}
          </CustomText>
        </View>
      ))}

      {rejected.map((e) => (
        <View key={e.id} className="flex-row mt-3">
          <Feather name="x-circle" size={16} color={Colors.error} style={{ marginTop: 2 }} />
          <View className="flex-1 ml-2">
            <CustomText color="error" size="small" boldness="regular" numberOfLines={2}>
              {t("services.extras.rejected", { item: label(e) })}
            </CustomText>
            {!!e.rejection_reason && (
              <CustomText color="gray_medium" size="extraSmall" boldness="regular" numberOfLines={3}>
                {t("services.extras.rejected_reason", { reason: e.rejection_reason })}
              </CustomText>
            )}
          </View>
        </View>
      ))}

      {approvedTotal > 0 && (
        <View className="flex-row items-center justify-between mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: Colors.support_primary }}>
          <CustomText color="gray_medium" size="small" boldness="regular">
            {t("services.extras.approved_total")}
          </CustomText>
          <CustomText color="secondary" size="medium" boldness="bold">
            {renderMoney(approvedTotal)}
          </CustomText>
        </View>
      )}
    </View>
  );
};

export default ServiceExtrasCard;
