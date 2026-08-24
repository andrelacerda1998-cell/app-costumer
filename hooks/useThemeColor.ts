/**
 * Resto do template Expo (atualmente só referenciado em código comentado).
 * Adaptado à paleta plana de `constants/Colors` — a app não tem tema
 * light/dark separado; o parâmetro `props` permite override manual.
 */

import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return Colors[colorName];
}
