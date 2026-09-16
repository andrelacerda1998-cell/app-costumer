import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { CustomText } from "../CustomText";
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { Colors } from "@/constants/Colors";
import type { CurrentMatchingRequest } from "@/hooks/useCurrentMatchingRequest";

/**
 * O pedido que espera pelo cliente, no topo da Home.
 *
 * Três esperas diferentes, e o cartão diz qual é: em análise pela Piquet (um
 * personalizado, antes de sair aos técnicos), à procura de quem possa ir, ou
 * com propostas já à espera de escolha. Só a última tem pressa — e é a única
 * em que o cartão fica âmbar, porque só aí a demora custa o pedido.
 */
const AMBER = "#FABB5B";

const CurrentRequestCard = ({ request }: { request: CurrentMatchingRequest }) => {
  const { t } = useTranslation();

  const ready = request.status === "Matching" && request.candidates_ready > 0;
  const reviewing = request.status === "PendingReview";

  const label = ready
    ? t("home.current_request.ready", { count: request.candidates_ready })
    : reviewing
      ? t("home.current_request.reviewing")
      : t("home.current_request.searching");

  return (
    <View className="px-5 my-1">
      <CustomTouchableOpacity
        type="transparent"
        size="large"
        itemsCenter={false}
        onPress={() => router.navigate(`/(app)/(modals)/(services)/(request)/matching/${request.id}`)}
        style={{
          borderRadius: 20,
          padding: 0,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: ready ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.08)",
        }}
      >
        <View
          className="flex-row items-center"
          style={{
            width: "100%",
            backgroundColor: ready ? AMBER : Colors.support_secondary,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <View
            className="items-center justify-center rounded-xl"
            style={{ width: 38, height: 38, backgroundColor: ready ? "rgba(0,0,0,0.10)" : "rgba(250,187,91,0.22)" }}
          >
            <Feather
              name={ready ? "users" : reviewing ? "clipboard" : "search"}
              size={18}
              color={Colors.secondary}
            />
          </View>

          <View className="flex-1 ml-3">
            <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1}>
              {label}
            </CustomText>
            {!!request.title && (
              <CustomText
                color={ready ? "secondary" : "gray_strong"}
                size="extraSmall"
                numberOfLines={1}
              >
                {request.title}
              </CustomText>
            )}
          </View>

          <Feather name="chevron-right" size={20} color={Colors.secondary} />
        </View>
      </CustomTouchableOpacity>
    </View>
  );
};

export default CurrentRequestCard;
