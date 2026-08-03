import { Text, useWindowDimensions, type TextProps } from 'react-native';
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

  // O React Native escala o fontSize com a definição de tamanho de texto do
  // sistema, mas NÃO escala o lineHeight. Com um lineHeight fixo, o texto grande
  // ficava cortado e sobreposto (auditoria 2026-08-03: com o tamanho no máximo a
  // Home era ilegível). Escalar aqui corrige a app inteira de uma vez.
  //
  // A escala é limitada a 1,6×: acima disso o texto continua a crescer (o
  // sistema trata do fontSize) mas o espaçamento entre linhas deixa de crescer
  // proporcionalmente — sem este teto, um cartão de duas linhas passava a ocupar
  // o ecrã inteiro e empurrava o conteúdo principal para fora.
  const { fontScale } = useWindowDimensions();
  const cappedScale = Math.min(fontScale, 1.6);
  const scaledLineHeight = Math.round(textLineHeight() * cappedScale);

  // Com texto muito grande, um `numberOfLines={1}` corta rótulos essenciais
  // ("O meu p…", "Pagam…"). Dar mais linhas é preferível a esconder informação.
  const effectiveLines =
    numberOfLines && fontScale > 1.3 ? numberOfLines * 2 : numberOfLines;

  return (
    <Text
      style={[
        {
          color: Colors[color],
          fontFamily: textFontFamily(),
          fontSize: textFontSize(),
          lineHeight: scaledLineHeight,
        },
        style,
      ]}
      className={classes}
      numberOfLines={effectiveLines}
      // Teto de ampliação: o texto continua a crescer com a definição do sistema
      // (até 1,8×, bem acima do tamanho normal), mas deixa de crescer ao ponto de
      // expulsar o conteúdo principal do ecrã. Pode ser aumentado caso a caso
      // passando `maxFontSizeMultiplier` — ex.: num ecrã só de leitura.
      maxFontSizeMultiplier={1.8}
      {...props}
    >
      {children}
    </Text>
  );
}
