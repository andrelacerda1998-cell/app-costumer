import { Entypo } from '@expo/vector-icons'
import { router } from 'expo-router';
import React from 'react'
import { TouchableWithoutFeedback, View } from 'react-native'
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
}: {
  backButtonColor: keyof typeof Colors,
  middleItem?: (() => React.JSX.Element) | undefined,
  // 'rigthItem' mantido por compatibilidade com chamadores existentes (typo);
  // 'rightItem' é o alias correto. Usa-se o que estiver definido.
  rigthItem?: (() => React.JSX.Element) | undefined,
  rightItem?: (() => React.JSX.Element) | undefined,
  onBack?: () => void,
  otherClasses?: string,
  disabled?: boolean
}) => {
  const item = rightItem ?? rigthItem;
  return (
    <View className={`flex-row items-center ${otherClasses}`}>
      <TouchableWithoutFeedback
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
      >
        <View className="w-10">
          <View className="w-5 h-5">
            <ArrowIcon color={Colors[backButtonColor]} position="left" />
          </View>
        </View>
      </TouchableWithoutFeedback>
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
