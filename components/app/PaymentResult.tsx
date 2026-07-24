import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { CustomText } from "@/components/CustomText";

type PaymentResultVariant = "success" | "error";

// Padrão visual partilhado dos ecrãs terminais de pagamento, alinhado ao
// checkout/mb-way/waiting.tsx: fundo escuro, badge circular centrado (esmeralda
// para sucesso, error para recusa) e tipografia CustomText. Componente puramente
// visual — não contém navegação nem lógica de pagamento.
const VARIANTS: Record<
  PaymentResultVariant,
  { accent: string; outerTint: string; innerTint: string; icon: keyof typeof Feather.glyphMap }
> = {
  success: {
    accent: Colors.success,
    outerTint: "rgba(5,150,105,0.12)",
    innerTint: "rgba(5,150,105,0.18)",
    icon: "check",
  },
  error: {
    accent: Colors.error,
    outerTint: "rgba(237,73,73,0.12)",
    innerTint: "rgba(237,73,73,0.18)",
    icon: "x",
  },
};

interface PaymentResultProps {
  variant: PaymentResultVariant;
  title: string;
  descriptions?: (string | undefined)[];
  footer?: React.ReactNode;
}

const PaymentResult = ({ variant, title, descriptions, footer }: PaymentResultProps) => {
  const v = VARIANTS[variant];
  const lines = (descriptions ?? []).filter(Boolean) as string[];

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <StatusBar animated style="light" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View className="items-center">
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 140, height: 140, backgroundColor: v.outerTint }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 96, height: 96, backgroundColor: v.innerTint }}
            >
              <Feather name={v.icon} size={48} color={v.accent} />
            </View>
          </View>

          <CustomText
            size="title"
            color="support_secondary"
            boldness="bold"
            classes="text-center mt-8"
          >
            {title}
          </CustomText>

          {lines.length > 0 && (
            <View className="mt-4 space-y-1">
              {lines.map((line, index) => (
                <CustomText
                  key={index}
                  color="gray_light"
                  boldness="regular"
                  classes="text-center"
                >
                  {line}
                </CustomText>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {footer && <View className="p-5 space-y-3">{footer}</View>}
    </SafeAreaView>
  );
};

export default PaymentResult;
