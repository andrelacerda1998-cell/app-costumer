import { Colors } from '@/constants/Colors';
import React from 'react'
import { TouchableWithoutFeedback, TouchableOpacity } from 'react-native'

const TouchOpacity = ({
  children,
  bgColor = null,
  otherClasses,
  itemsCenter = false,
  rounded = "sm",
  onPress = undefined,
  border = false,
  borderColor,
  ...props
}: {
  children?: React.ReactNode;
  bgColor?: keyof typeof Colors | null;
  otherClasses?: string;
  itemsCenter?: boolean;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  onPress?: () => void;
  border?: boolean;
  borderColor?: keyof typeof Colors;
  [key: string]: any;
}) => {
  return (
    <TouchableOpacity
      className={`
        ${rounded && `rounded-${rounded}`}
        ${itemsCenter && "flex items-center justify-center"}
        ${otherClasses}
      `}
      onPress={onPress}
      style={{
        backgroundColor: bgColor ? Colors[bgColor] : "transparent",
        borderWidth: border ? 1 : 0,
        borderColor: borderColor ? Colors[borderColor] : undefined,
      }}
      {...props}
    >
      {children}
    </TouchableOpacity>
  )
}

export default TouchOpacity
