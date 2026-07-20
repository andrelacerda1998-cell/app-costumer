import { Text, type TextProps } from 'react-native';
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

  return (
    <Text
      style={[
        {
          color: Colors[color],
          fontFamily: textFontFamily(),
          fontSize: textFontSize(),
          lineHeight: textLineHeight(),
        },
        style,
      ]}
      className={classes}
      numberOfLines={numberOfLines}
      {...props}
    >
      {children}
    </Text>
  );
}
