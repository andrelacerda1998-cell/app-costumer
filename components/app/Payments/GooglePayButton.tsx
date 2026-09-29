import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { CustomText } from "@/components/CustomText";

/**
 * Botão de Google Pay — PRÉ-VISUALIZAÇÃO.
 *
 * Tal como o do Apple Pay, este é desenhado à mão segundo as medidas
 * publicadas, para se poder ver o ecrã antes de existir a peça nativa. Serve
 * para decidir o desenho; NÃO serve para publicar.
 *
 * A diferença em relação à Apple importa: as regras da Google são MENOS
 * rígidas -- permitem um botão próprio desde que respeite altura mínima,
 * contraste e o logótipo oficial. Mas a forma correcta continua a ser o
 * `PayButton` do SDK, que trata sozinho de idioma, tema e variantes de marca.
 * Substituir isto é tarefa do mesmo lote do Apple Pay.
 *
 * @see https://developers.google.com/pay/api/android/guides/brand-guidelines
 */

/** Altura mínima recomendada pela Google. Abaixo disto o logótipo perde forma. */
export const GOOGLE_PAY_BUTTON_HEIGHT = 56;

interface Props {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** "Pagar com" antes da marca, como no ecrã da Google. */
  label?: string;
}

/**
 * A marca.
 *
 * O "G" a cores é o que a Google exige; um "G" monocromático só é permitido no
 * botão branco, que não usamos. Com texto ("Pay") no botão; sem texto na lista
 * de métodos, onde o rótulo ao lado já diz "Google Pay".
 */
export const GooglePayMark = ({
  size = 22,
  color = "#FFFFFF",
  comTexto = true,
}: {
  size?: number;
  color?: string;
  comTexto?: boolean;
}) => (
  <View className="flex-row items-center">
    {/* O glifo do "G" assenta centrado, ao contrário da maçã -- não precisa do
        deslocamento que o ApplePayMark faz. */}
    <FontAwesome name="google" size={size} color={color} />
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

export default function GooglePayButton({ onPress, disabled, loading, label }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel="Pagar com Google Pay"
      style={{
        // Preto, como o do Apple Pay: a Google permite preto ou branco, e o
        // preto e o unico que fica legivel sobre o fundo claro do checkout.
        backgroundColor: "#000000",
        borderRadius: 999,
        height: GOOGLE_PAY_BUTTON_HEIGHT,
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
          <GooglePayMark />
        </>
      )}
    </TouchableOpacity>
  );
}
