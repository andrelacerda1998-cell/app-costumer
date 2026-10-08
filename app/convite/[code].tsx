import { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/Colors";
import { guardarCodigoPendente } from "@/utils/conviteRecebido";

/**
 * piquet.customer://convite/CODIGO — o "Já tenho a app" da página do convite.
 * Guarda o código (o checkout aplica-o sozinho) e segue para o início.
 */
export default function ConviteRecebido() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    (code ? guardarCodigoPendente(String(code)) : Promise.resolve()).finally(() => setPronto(true));
  }, [code]);

  if (!pronto) return <View style={{ flex: 1, backgroundColor: Colors.primary }} />;

  return <Redirect href="/(app)/(tabs)/home" />;
}
