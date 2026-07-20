import { View, type ViewProps } from 'react-native';
import { Colors } from '@/constants/Colors';

export type IconBadgeSize = 'small' | 'medium' | 'large' | 'xlarge';
export type IconBadgeColor = keyof typeof Colors;

export type IconBadgeProps = ViewProps & {
  /** O ícone a ser exibido dentro do círculo (já com a cor desejada). */
  children: React.ReactNode;
  /** Cor de fundo do círculo. Default: 'secondary'. */
  bgColor?: IconBadgeColor;
  /** Tamanho do círculo. Default: 'large'. */
  size?: IconBadgeSize;
  /** Classes extras para overrides (ex.: 'self-center mb-4'). */
  classes?: string;
};

const sizeClasses: Record<IconBadgeSize, string> = {
  small: 'w-10 h-10 p-3', // Dialog
  medium: 'w-16 h-16 p-4', // tela de update
  large: 'w-20 h-20 p-5', // telas sms/email/zona (padrão)
  xlarge: 'w-24 h-24 p-6', // hero (ex.: validar telemóvel)
};

/**
 * Círculo reutilizável com um ícone centralizado.
 * Substitui o padrão repetido `<View className="bg-... h-20 w-20 ... rounded-full">`
 * usado em diálogos, telas de verificação e estados de sucesso/erro.
 */
export function IconBadge({
  children,
  bgColor = 'secondary',
  size = 'large',
  classes,
  style,
  ...props
}: IconBadgeProps) {
  return (
    <View
      className={`items-center justify-center rounded-full ${sizeClasses[size]} ${classes ?? ''}`}
      style={[{ backgroundColor: Colors[bgColor] }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export default IconBadge;
