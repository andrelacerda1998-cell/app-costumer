import { StyleSheet, Text, type TextProps } from 'react-native';
import { TEXTO_MAXIMO, useEscala } from '@/utils/escala';
import { Colors } from '@/constants/Colors';

export type CustomFontSize = "extraSmall" | "small" | "medium" | "large" | "extraLarge" | "subtitle" | "title" | "headline" | "specExtraSmall";
export type CustomTextBoldness = "light" | "regular" | "medium" | "semiBold" | "bold" | "bolder";
export type CustomTextColor = keyof typeof Colors;
export type CustomTextProps = TextProps & {
  // lightColor?: string;
  // darkColor?: string;
  color: CustomTextColor;
  size?: CustomFontSize;
  boldness?: CustomTextBoldness;
  numberOfLines?: number;
  classes?: string;
  children: React.ReactNode;
};

export function CustomText({
  style,
  color,
  size = "medium",
  boldness = "regular",
  numberOfLines,
  classes,
  children,
  // lightColor,
  // darkColor,
  // type = 'default',
  ...props
}: CustomTextProps) {
  // const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const textFontFamily = () => {
    switch (boldness) {
      case "light":
        return 'Poppins_300Light';
      case "regular":
        return 'Poppins_400Regular';
      case "medium":
        return 'Poppins_500Medium';
      case "semiBold":
        return 'Poppins_600SemiBold';
      case "bold":
        return 'Poppins_700Bold';
      case "bolder":
        return 'Poppins_800ExtraBold';
      default:
        return 'Poppins_400Regular';
    }
  }

  const textFontSize = () => {
    switch (size) {
      case "specExtraSmall":
        return 10;
      case "extraSmall":
        return 12;
      case "small":
        return 14;
      case "medium":
        return 16;
      case "large":
        return 18;
      case "extraLarge":
        return 20;
      case "subtitle":
        return 24;
      case "title":
        return 28;
      case "headline":
        return 42;
      default:
        return 16;
    }
  }

  const textLineHeight = () => {
    switch (size) {
      case "extraSmall":
        return 16;
      case "small":
        return 20;
      case "specExtraSmall":
        return 22;
      case "medium":
        return 24;
      case "large":
        return 28;
      case "extraLarge":
        return 32;
      case "subtitle":
        return 30;
      case "title":
        return 34;
      case "headline":
        return 48;
      default:
        return 24;
    }
  }

  // Dois ajustes, nesta ordem:
  //
  // 1. LARGURA DO ECRÃ (utils/escala): o tamanho base encolhe nos ecrãs
  //    pequenos. Os ecrãs foram afinados num Pro Max; sem isto, num iPhone SE ou
  //    num Android de 360 dp a mesma letra ocupava o ecrã (08/10/2026). Vale
  //    também para um `fontSize`/`lineHeight` passado em `style`.
  //
  // 2. TEXTO DO SISTEMA: o React Native escala o fontSize com a definição de
  //    tamanho de texto, mas NÃO o lineHeight. Com um lineHeight fixo, o texto
  //    grande ficava cortado e sobreposto (auditoria 2026-08-03). Escala-se aqui,
  //    com o mesmo teto do fontSize (TEXTO_MAXIMO, 1,35×). Era 1,8×, e quem
  //    tinha a letra aumentada via os ecrãs desfeitos.
  const { fontScale, s, textoSistema } = useEscala();
  const proprio = StyleSheet.flatten(style) || {};
  const tamanhoBase = typeof proprio.fontSize === 'number' ? proprio.fontSize : textFontSize();
  const linhaBase = typeof proprio.lineHeight === 'number' ? proprio.lineHeight : textLineHeight();
  const fontSize = s(tamanhoBase);
  const lineHeight = Math.round(s(linhaBase) * textoSistema);

  // Com texto muito grande, um `numberOfLines={1}` corta rótulos essenciais
  // ("O meu p…", "Pagam…"). Dar mais linhas é preferível a esconder informação.
  // Exceto quando o texto é para ENCOLHER (`adjustsFontSizeToFit`): aí uma
  // linha a mais deixava o sistema partir a palavra a meio em vez de encolher.
  const effectiveLines =
    numberOfLines && fontScale > 1.3 && !props.adjustsFontSizeToFit ? numberOfLines * 2 : numberOfLines;

  return (
    <Text
      style={[
        {
          color: Colors[color],
          fontFamily: textFontFamily(),
        },
        style,
        // Por último: o tamanho já ajustado ganha ao que vinha em `style`.
        { fontSize, lineHeight },
      ]}
      className={classes}
      numberOfLines={effectiveLines}
      // Teto de ampliação: o texto cresce com a definição do sistema até 1,35×
      // e pára aí, para não expulsar o conteúdo do ecrã. Pode ser aumentado caso
      // a caso passando `maxFontSizeMultiplier` — ex.: num ecrã só de leitura.
      maxFontSizeMultiplier={TEXTO_MAXIMO}
      {...props}
    >
      {children}
    </Text>
  );
}
