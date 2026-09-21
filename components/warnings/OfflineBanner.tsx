import React, { type PropsWithChildren } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useNetwork } from "@/contexts/NetworkContext";

/**
 * Aviso persistente de "sem ligação". Não bloqueia a app — o cliente continua a
 * ver o que está em cache — mas deixa de o enganar: antes a Home apresentava-se
 * exatamente igual ao normal sem rede nenhuma.
 *
 * A faixa esteve em `position: absolute` por cima do conteúdo, e tapava o
 * cabeçalho: em Pagamentos o título ficava por baixo dela, ilegível. Um aviso
 * que esconde aquilo de que avisa troca um problema por outro.
 *
 * Agora ocupa espaço a sério e empurra o conteúdo para baixo.
 *
 * O custo assumido: como a faixa consome a área segura do topo e os ecrãs
 * abaixo voltam a somar a sua, ficam ~60pt de folga a mais enquanto não há
 * rede. Não dá para evitar daqui — o `SafeAreaView` da v5 é um componente
 * NATIVO e ignora qualquer override do contexto JS, por isso a única alternativa
 * seria mexer no topo de cada ecrã. Folga a mais num estado excecional é melhor
 * troca do que um cabeçalho ilegível.
 *
 * A árvore tem a mesma forma com e sem rede, de propósito: alternar entre
 * `<Slot/>` e `<View><Slot/></View>` remontava o navegador a cada oscilação de
 * rede, e o cliente perdia o ecrã onde estava.
 */
const OfflineFrame = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation();
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      {!isConnected && (
        <View
          accessibilityRole="alert"
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 8,
            paddingHorizontal: 16,
            backgroundColor: Colors.secondary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="wifi-off" size={14} color={Colors.primary} />
          <CustomText
            color="support_secondary"
            size="extraSmall"
            boldness="semiBold"
            numberOfLines={2}
            classes="ml-2 flex-1"
          >
            {t("errors.offline_banner")}
          </CustomText>
        </View>
      )}

      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
};

export default OfflineFrame;
