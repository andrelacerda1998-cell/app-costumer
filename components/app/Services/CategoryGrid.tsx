import React, { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Radius, Spacing, TOUCH_TARGET } from "@/constants/Layout";
import { serviceIcon } from "./operationAreaIcon";
import RemoteThumb from "./RemoteThumb";
import type { OperationAreaInterface } from "@/types/services";
import { tamanhoQueCabe, useEscala } from "@/utils/escala";

/**
 * Categorias em grelha de ícones, 4 por linha.
 *
 * Substitui os cartões grandes com fotografia: ocupavam 100px cada e mostravam
 * seis categorias em dois ecrãs de scroll. Em ícones cabem todas na primeira
 * dobra, que é o que interessa num ecrã cujo trabalho é levar a um pedido.
 *
 * A imagem de cada categoria vem do backoffice (media collection `image`), tal
 * como a ordem e o estado activo — o frontend não decide nenhuma das três. Sem
 * imagem configurada mostra-se um ícone, nunca um espaço vazio.
 *
 * Com mais categorias do que lugares, a última célula abre a lista completa em
 * vez de esconder o que sobra.
 */

const COLUMNS = 4;
const VISIBLE = 7; // a oitava célula é o "ver todas"

type Props = {
  areas: OperationAreaInterface[];
  onSelect: (area: OperationAreaInterface) => void;
  onSeeAll: () => void;
  loading?: boolean;
};

const Cell = ({
  children,
  label,
  onPress,
  accessibilityLabel,
  tamanhoEtiqueta = 11,
}: {
  children: React.ReactNode;
  label: string;
  tamanhoEtiqueta?: number;
  onPress: () => void;
  accessibilityLabel?: string;
}) => {
  // Feedback de toque por estado, nao por `style` em funcao. O runtime JSX do
  // NativeWind v4 descarta um `style` que seja funcao — e com ele ia o
  // `width: 25%` que faz a grelha, ficando as celulas do tamanho do conteudo.
  const [pressed, setPressed] = useState(false);
  return (
  <Pressable
    onPress={onPress}
    onPressIn={() => setPressed(true)}
    onPressOut={() => setPressed(false)}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    style={{
      width: `${100 / COLUMNS}%`,
      alignItems: "center",
      paddingVertical: Spacing.sm,
      minHeight: TOUCH_TARGET + 28,
      opacity: pressed ? 0.6 : 1,
      transform: [{ scale: pressed ? 0.96 : 1 }],
    }}
  >
    {children}
    <CustomText
      color="secondary"
      size="specExtraSmall"
      boldness="semiBold"
      // Uma palavra só ("ELETRODOMÉSTICOS") fica numa linha e ENCOLHE: com duas
      // linhas permitidas, o iOS preferia parti-la a meio ("ELETRODOMÉSTI-COS")
      // a encolher — e num ecrã pequeno partia sempre. Nomes com espaço
      // continuam a poder ir para duas linhas.
      numberOfLines={/\s/.test(label.trim()) ? 2 : 1}
      classes="text-center mt-1.5"
      // Um só tamanho para a grelha toda (calculado no CategoryGrid): o da
      // etiqueta que mais precisa de encolher. Por etiqueta ficava desigual.
      style={{ fontSize: tamanhoEtiqueta, lineHeight: 13.5 }}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
    >
      {label}
    </CustomText>
  </Pressable>
  );
};

const Bubble = ({ children, muted = false, lado = 62 }: { children: React.ReactNode; muted?: boolean; lado?: number }) => (
  <View
    style={{
      width: lado,
      height: lado,
      borderRadius: Radius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: muted ? Colors.support_primary : "rgba(250,187,91,0.22)",
    }}
  >
    {children}
  </View>
);

const CategoryGrid = ({ areas, onSelect, onSeeAll, loading = false }: Props) => {
  const { t } = useTranslation();
  // As imagens encolhem com o ecrã (ver utils/escala): 62 pt num ecrã de 375
  // deixavam pouco espaço ao nome por baixo.
  const { s, fator, textoSistema } = useEscala();
  const { width: largura } = useWindowDimensions();
  const lado = s(62);
  // A letra das etiquetas: a palavra mais comprida de TODAS tem de caber na
  // coluna (também com a letra do sistema aumentada). Um tamanho para todas.
  const tamanhoEtiqueta = Math.min(
    ...[...areas.slice(0, VISIBLE).map((a) => a.name), t("home.categories_see_all")].map((nome) =>
      tamanhoQueCabe(nome, largura / COLUMNS - 6, 11, 7.5, fator, textoSistema),
    ),
  );

  if (loading) {
    return (
      <View className="flex-row flex-wrap" style={{ paddingHorizontal: Spacing.md }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={`skeleton-${i}`}
            style={{ width: `${100 / COLUMNS}%`, alignItems: "center", paddingVertical: Spacing.sm }}
          >
            <View
              style={{
                width: lado,
                height: lado,
                borderRadius: Radius.lg,
                backgroundColor: "#EFEAE2",
              }}
            />
            <View
              style={{
                width: 46,
                height: 9,
                borderRadius: 4,
                backgroundColor: "#EFEAE2",
                marginTop: 8,
              }}
            />
          </View>
        ))}
      </View>
    );
  }

  const shown = areas.slice(0, VISIBLE);
  // A oitava célula existe sempre: mesmo sem categorias escondidas, é a entrada
  // para o catálogo completo — e mantém a grelha com duas filas certas.
  const hiddenCount = Math.max(0, areas.length - VISIBLE);

  return (
    <View className="flex-row flex-wrap" style={{ paddingHorizontal: Spacing.md }}>
      {shown.map((area) => (
        <Cell key={area.id} label={area.name} onPress={() => onSelect(area)} tamanhoEtiqueta={tamanhoEtiqueta}>
          {/* A imagem vem do backoffice; sem ela fica o ícone da categoria. */}
          <RemoteThumb
            uri={area.image}
            size={lado}
            radius={Radius.lg}
            fit="cover"
            fallbackIcon={serviceIcon(area.name)}
          />
        </Cell>
      ))}

      {areas.length > 0 && (
        <Cell
          label={t("home.categories_see_all")}
          onPress={onSeeAll}
          tamanhoEtiqueta={tamanhoEtiqueta}
          accessibilityLabel={t("home.categories_see_all_a11y", { count: hiddenCount })}
        >
          <Bubble muted lado={lado}>
            <Feather name="grid" size={24} color={Colors.gray_strong} />
          </Bubble>
        </Cell>
      )}
    </View>
  );
};

export default CategoryGrid;
