import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { CustomText } from "@/components/CustomText";

/**
 * Botão de Apple Pay — PRÉ-VISUALIZAÇÃO.
 *
 * A Apple manda usar o `PKPaymentButton` nativo dela. Este é desenhado à mão,
 * segundo as medidas publicadas (altura 44 pt, fundo preto, logótipo e "Pay" em
 * branco), para se poder ver o ecrã antes de existir a peça nativa. Serve para
 * decidir o desenho; NÃO serve para publicar — a revisão da App Store recusa
 * botões que não sejam o deles. A substituição é a tarefa T2 do Rodrigo.
 *
 * O `logoApenas` existe para a linha da lista de métodos, onde o botão inteiro
 * não cabe e só se quer a marca ao lado do nome.
 */

/** Altura recomendada pela Apple. Abaixo de 30 pt o botão deixa de ser legível. */
export const APPLE_PAY_BUTTON_HEIGHT = 56;

interface Props {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** "Pagar com" antes da marca, como na folha da Apple. */
  label?: string;
}

/**
 * A marca. Com texto ("Pay") no botão; sem texto na lista de métodos, onde o
 * rótulo ao lado já diz "Apple Pay" e a palavra repetida não caberia no espaço
 * do ícone.
 */
export const ApplePayMark = ({
  size = 22,
  color = "#FFFFFF",
  comTexto = true,
}: {
  size?: number;
  color?: string;
  comTexto?: boolean;
}) => (
  <View className="flex-row items-center">
    {/* O glifo tem o peso certo, mas assenta abaixo da linha de base do texto —
        daí o deslocamento. Sem isto a maçã parece cair. */}
    <FontAwesome name="apple" size={size} color={color} style={{ marginTop: -size * 0.12 }} />
    {comTexto && (
      <CustomText
        color="secondary"
        size="large"
        boldness="semiBold"
        numberOfLines={1}
        classes="ml-1"
        style={{ color }}
      >
        Pay
      </CustomText>
    )}
  </View>
);

export default function ApplePayButton({ onPress, disabled, loading, label }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel="Pagar com Apple Pay"
      style={{
        backgroundColor: "#000000",
        borderRadius: 999,
        height: APPLE_PAY_BUTTON_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        opacity: disabled && !loading ? 0.4 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          {!!label && (
            <CustomText
              color="secondary"
              size="large"
              boldness="semiBold"
              numberOfLines={1}
              classes="mr-2"
              style={{ color: "#FFFFFF" }}
            >
              {label}
            </CustomText>
          )}
          <ApplePayMark />
        </>
      )}
    </TouchableOpacity>
  );
}
