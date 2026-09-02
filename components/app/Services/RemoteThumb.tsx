import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { proxiedImage } from "@/utils/imageProxy";

/**
 * Miniatura de uma imagem vinda do backoffice.
 *
 * O backoffice aceita fotografia, ilustração e PNG com transparência, e as
 * dimensões variam. Este componente impõe o mesmo enquadramento a todas:
 * proporção fixa, `contain` para não deformar nada, fundo neutro por baixo (que
 * resolve a transparência) e cantos arredondados.
 *
 * Três estados: a carregar (fundo neutro), carregada, e sem imagem ou com erro
 * — nesse caso um ícone genérico, nunca uma imagem partida.
 *
 * O redimensionamento é feito pelo proxy que a app já usa (`proxiedImage`), com
 * a largura pedida em pixels: evita descarregar o original de vários MB para um
 * quadrado de 52px. `expo-image` trata do cache em memória e disco.
 */

type Props = {
  uri?: string | null;
  /** Largura em pontos. A imagem é pedida ao dobro, para retina. */
  size: number;
  /** Altura, quando o enquadramento não é quadrado. */
  height?: number;
  radius: number;
  /** Ícone quando não há imagem. */
  fallbackIcon?: React.ComponentProps<typeof Feather>["name"];
  /**
   * `cover` para fotografia (enche o quadrado, corta o excesso), `contain` para
   * ilustração ou PNG transparente (mostra tudo, sem deformar). O backoffice
   * aceita as duas coisas, por isso quem usa é que sabe qual pedir.
   */
  fit?: "cover" | "contain";
  backgroundColor?: string;
};

const RemoteThumb = ({
  uri,
  size,
  height,
  radius,
  fallbackIcon = "grid",
  fit = "cover",
  backgroundColor = "#F4F2EE",
}: Props) => {
  const [failed, setFailed] = useState(false);

  const clean = typeof uri === "string" ? uri.trim() : "";
  const showImage = clean.length > 0 && !failed;

  return (
    <View
      style={{
        width: size,
        height: height ?? size,
        borderRadius: radius,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {showImage ? (
        <Image
          source={{ uri: proxiedImage(clean, Math.round(size * 2)) }}
          style={{ width: "100%", height: "100%" }}
          contentFit={fit}
          cachePolicy="memory-disk"
          transition={160}
          recyclingKey={clean}
          onError={() => setFailed(true)}
        />
      ) : (
        <Feather name={fallbackIcon} size={Math.min(Math.round(size * 0.42), 30)} color={Colors.gray_medium} />
      )}
    </View>
  );
};

export default RemoteThumb;
