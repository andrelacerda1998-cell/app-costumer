import { Text, type TextProps, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  // lightColor?: string;
  // darkColor?: string;
  color: string;
  type?:
    'small' |
    'smallSemiBold' |
    'smallBold' |
    'default' |
    'title' |
    'defaultSemiBold' |
    'subtitle' |
    'link' |
    'defaultBold';
};

export function ThemedText({
  style,
  color,
  // lightColor,
  // darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  // const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'small' ? styles.small : undefined,
        type === 'smallSemiBold' ? styles.smallSemiBold : undefined,
        type === 'smallBold' ? styles.smallBold : undefined,
        type === 'default' ? styles.default : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'defaultBold' ? styles.defaultBold : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  smallSemiBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins_600SemiBold',
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins_700Bold',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#0a7ea4',
  },
});
