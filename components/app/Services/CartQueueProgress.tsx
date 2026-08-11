import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useCart } from "@/contexts/CartContext";

/**
 * "Serviço 2 de 3" — onde o cliente está dentro de uma reserva de cesto.
 *
 * O fluxo direto tem quatro passos previsíveis e um fim visível. O do cesto tem
 * N×2 e, sem isto, os ecrãs de data e de checkout são exatamente iguais em
 * qualquer iteração: nada dizia se faltava um serviço ou três. Só se descobria
 * ao voltar ao cesto e ler "Faltam reservar N serviços" — depois de já ter pago.
 *
 * Não aparece fora do cesto: sem fila, um serviço único não tem progresso a
 * mostrar e a barra seria ruído.
 */
const CartQueueProgress = ({ classes }: { classes?: string }) => {
  const { t } = useTranslation();
  const { queue, queueTotal } = useCart();

  // Só faz sentido com mais do que um serviço — "serviço 1 de 1" não informa nada.
  if (queueTotal < 2 || queue.length === 0) return null;

  const current = queueTotal - queue.length + 1;

  return (
    <View
      className={`flex-row items-center rounded-2xl px-4 py-2.5 ${classes ?? ""}`}
      style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
    >
      <Feather name="layers" size={14} color={Colors.secondary} />
      <CustomText color="secondary" size="small" boldness="bold" classes="ml-2 flex-1" numberOfLines={1}>
        {t("cart.queue_progress", { current, total: queueTotal })}
      </CustomText>

      {/* Pontos em vez de barra: com 2 ou 3 serviços a barra é grosseira, e os
          pontos dizem de relance quantos faltam. */}
      <View className="flex-row items-center" style={{ gap: 5 }}>
        {Array.from({ length: queueTotal }).map((_, index) => (
          <View
            key={index}
            style={{
              width: index + 1 === current ? 18 : 7,
              height: 7,
              borderRadius: 4,
              backgroundColor:
                index + 1 <= current ? Colors.secondary : "rgba(27,27,27,0.25)",
            }}
          />
        ))}
      </View>
    </View>
  );
};

export default CartQueueProgress;
