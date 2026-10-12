import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useService } from "@/contexts/ServiceContext";
import type { CurrentMatchingRequest } from "@/hooks/useCurrentMatchingRequest";
import { openRequest, requestStatusKey } from "./PendingRequestsList";

/**
 * O pedido em curso, na Home.
 *
 * Um pedido que ainda não é serviço (à procura, a escolher, por pagar) só era
 * alcançável pela notificação ou pelo separador Serviços → Pedidos. Quem
 * voltava à Home não via que tinha um pedido vivo — e o servidor, ao pedir
 * outra coisa, devolvia-lhe esse.
 *
 * Âmbar quando há alguma coisa a decidir (escolher ou pagar), neutro quando é
 * só esperar: a cor diz sozinha se o cartão pede um toque.
 */
const PendingRequestHomeCard = ({ request }: { request: CurrentMatchingRequest }) => {
  const { t } = useTranslation();
  const { setServiceToRequest } = useService();
  const estado = requestStatusKey(request);
  const decidir =
    (request.status === "AwaitingPayment" && !!request.selected) ||
    (request.status === "Matching" && request.candidates_ready > 0);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      onPress={() => openRequest(request, setServiceToRequest)}
      className="flex-row items-center rounded-2xl px-4 py-3"
      style={{
        backgroundColor: decidir ? "rgba(250,187,91,0.22)" : Colors.support_secondary,
        borderWidth: 1,
        borderColor: decidir ? Colors.primary : Colors.support_primary,
      }}
    >
      <View
        className="items-center justify-center rounded-full mr-3"
        style={{ width: 40, height: 40, backgroundColor: decidir ? Colors.primary : "rgba(250,187,91,0.18)" }}
      >
        <Feather name={decidir ? "users" : "search"} size={18} color={Colors.secondary} />
      </View>
      <View className="flex-1">
        <CustomText color="gray_medium" size="extraSmall" boldness="semiBold" numberOfLines={1}>
          {t("matching.home_card.title")}
          {request.title ? ` · ${request.title}` : ""}
        </CustomText>
        <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
          {t(estado.key, estado.count !== undefined ? { count: estado.count } : undefined)}
        </CustomText>
      </View>
      <CustomText color="secondary" size="small" boldness="bold" classes="ml-2">
        {t("matching.home_card.open")}
      </CustomText>
      <Feather name="chevron-right" size={18} color={Colors.secondary} />
    </TouchableOpacity>
  );
};

export default PendingRequestHomeCard;
