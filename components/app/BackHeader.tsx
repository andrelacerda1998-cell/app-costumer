import { Entypo } from '@expo/vector-icons'
import { router } from 'expo-router';
import React from 'react'
import { TouchableOpacity, View } from 'react-native'
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import ArrowIcon from "@/assets/icons/arrow";

const BackHeader = ({
  backButtonColor,
  middleItem = undefined,
  rigthItem = undefined,
  rightItem = undefined,
  onBack,
  otherClasses,
  disabled = false,
  hideBack = false,
}: {
  backButtonColor: keyof typeof Colors,
  middleItem?: (() => React.JSX.Element) | undefined,
  // 'rigthItem' mantido por compatibilidade com chamadores existentes (typo);
  // 'rightItem' é o alias correto. Usa-se o que estiver definido.
  rigthItem?: (() => React.JSX.Element) | undefined,
  rightItem?: (() => React.JSX.Element) | undefined,
  onBack?: () => void,
  otherClasses?: string,
  disabled?: boolean,
  /**
   * Separadores são destinos de topo — não têm "para trás". Sem isto, Lista e
   * Histórico mostravam uma seta que levava o utilizador para fora do separador
   * sem ele o ter pedido. O espaço mantém-se para o título ficar centrado.
   */
  hideBack?: boolean
}) => {
  const item = rightItem ?? rigthItem;
  return (
    <View className={`flex-row items-center ${otherClasses}`}>
      {hideBack ? (
        <View className="w-10" />
      ) : (
        <TouchableOpacity
          activeOpacity={0.5}
          // A área tocável era o tamanho do desenho: 40 x 20. Menos de metade
          // do mínimo da Apple (44 x 44), e sem feedback nenhum — um toque
          // ligeiramente fora não fazia nada e não se percebia porquê. O
          // hitSlop alarga o alvo sem mexer no desenho, que é o que mantém o
          // título centrado nos ecrãs todos que usam este cabeçalho.
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityLabel="Voltar"
          onPress={() => {
            if (onBack) {
              return onBack();
            }
            if (router.canGoBack()) {
              return router.back();
            }
            router.dismissAll();
            return router.replace("/(app)/(tabs)/home");
          }}
          disabled={disabled}
          accessibilityRole="button"
        >
          <View className="w-10">
            <View className="w-5 h-5">
              <ArrowIcon color={Colors[backButtonColor]} position="left" />
            </View>
          </View>
        </TouchableOpacity>
      )}
      <View className="flex-1 items-center">
        {middleItem && middleItem()}
      </View>
      <View className="w-10">
        {item && item()}
      </View>
    </View>
  )
}

export default BackHeader;
