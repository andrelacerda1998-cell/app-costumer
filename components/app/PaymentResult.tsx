import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { CustomText } from "@/components/CustomText";
import { t } from "i18next";

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
  /**
   * Resumo do que foi pago. Um ecrã de pagamento confirmado sem o montante não
   * confirma nada — era só um visto verde e duas linhas de texto. Opcional
   * porque os ecrãs de recusa não têm nada para resumir.
   */
  summary?: { amount?: string | false | null; vendorName?: string | null; serviceName?: string | null };
  footer?: React.ReactNode;
}

const PaymentResult = ({ variant, title, descriptions, summary, footer }: PaymentResultProps) => {
  const v = VARIANTS[variant];
  const lines = (descriptions ?? []).filter(Boolean) as string[];
  const rows = [
    summary?.serviceName ? { label: t("services.checkout.receipt.service"), value: summary.serviceName } : null,
    summary?.vendorName ? { label: t("services.checkout.receipt.professional"), value: summary.vendorName } : null,
    summary?.amount ? { label: t("services.checkout.receipt.amount"), value: summary.amount, strong: true } : null,
  ].filter(Boolean) as { label: string; value: string; strong?: boolean }[];

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

          {rows.length > 0 && (
            <View
              className="w-full rounded-2xl px-4 py-2 mt-7"
              style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
            >
              {rows.map((row, index) => (
                <View
                  key={row.label}
                  className="flex-row items-center justify-between py-2.5"
                  style={{
                    borderBottomWidth: index < rows.length - 1 ? 1 : 0,
                    borderBottomColor: "rgba(255,255,255,0.10)",
                  }}
                >
                  <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                    {row.label}
                  </CustomText>
                  <CustomText
                    color="support_secondary"
                    size={row.strong ? "large" : "small"}
                    boldness={row.strong ? "bold" : "semiBold"}
                    numberOfLines={1}
                    classes="ml-3 flex-1 text-right"
                  >
                    {row.value}
                  </CustomText>
                </View>
              ))}
            </View>
          )}

          {lines.length > 0 && (
            <View className="mt-4 space-y-1">
              {lines.map((line, index) => (
                <CustomText
                  key={index}
                  color="gray_medium"
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
