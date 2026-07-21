import { Colors } from '@/constants/Colors';
import React, { forwardRef } from 'react'
import { TextInput, TouchableOpacity } from 'react-native'
import { View } from 'react-native';
import { CustomFontSize, CustomText, type CustomTextBoldness, type CustomTextColor } from '@/components/CustomText';
import XIcon from '@/assets/icons/x';
import CheckMark from '@/assets/icons/check-mark';

type CustomTextInputSize = "large" | "medium" | "small";

interface CustomTextInputProps {
  children?: React.ReactNode;
  size: CustomTextInputSize;
  classes?: string;
  Icon?: React.ComponentType;
  text: string;
  fontSize: CustomFontSize;
  textBoldness: CustomTextBoldness;
  textColor: CustomTextColor;
  disabled?: boolean;
  [key: string]: any;

  onChangeText?: ((text: string) => void) | undefined
  placeholder: string;
  focused?: boolean;
  error?: boolean;
  displayErrorIcon?: boolean;
  success?: boolean;
  displaySuccessIcon?: boolean;
}

const CustomTextInput = forwardRef<TextInput, CustomTextInputProps>(({
  children,
  size = "medium",
  classes,
  Icon = null,
  text,
  fontSize = "medium",
  textColor = "secondary",
  textBoldness = "semiBold",
  disabled,

  onChangeText,
  placeholder,
  focused,
  error,
  displayErrorIcon,
  success,
  displaySuccessIcon,

  ...props
}, ref) => {
  const backgroundColor = () => {
    return "transparent";
  };

  const borderRadius = () => {
    switch (size) {
      case "large":
      case "medium":
        return 10;
      case "small":
        return 999;
      default:
        return 8;
    }
  };

  const padding = () => {
    switch (size) {
      case "large":
        return 16;
      case "medium":
        return 12;
      case "small":
        return 8;
      default:
        return 12;
    }
  }

  const paddingRight = () => {
    if (Icon) {
      switch(size) {
        case "large":
          return 64;
        case "medium":
          return 30;
        case "small":
          return 26;
        default:
          return 30;
      }
    } else if ((error || success) && (displayErrorIcon || displaySuccessIcon)) {
      switch(size) {
        case "large":
          return 48;
        case "medium":
          return 20;
        case "small":
          return 16;
        default:
          return 20;
      }
    }
  }

  const getFontSize = () => {
    switch (fontSize) {
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

  const getTextBoldness = () => {
    switch (textBoldness) {
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

  return (
    <View className="justify-center">
      <TextInput
        ref={ref}
        style={[
          {
            backgroundColor: backgroundColor(),
            borderRadius: borderRadius(),
            borderWidth: 1,
            paddingHorizontal: padding(),
            paddingVertical: padding(),
            paddingRight: paddingRight(),
            flexDirection: 'row',
            opacity: disabled ? 0.6 : 1,
            fontSize: getFontSize(),
            color: Colors[textColor as CustomTextColor],
            fontFamily: getTextBoldness(),
          },
        ]}
        editable={!disabled}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray_light}
        className={`
          border-support_primary focus:border-primary
          ${classes}
        `}
        {...props}
      >
      </TextInput>
      {error && displayErrorIcon && (
        <View className="absolute right-5 w-3 h-3">
          <XIcon color={Colors.secondary} />
        </View>
      )}
      {success && displaySuccessIcon && (
        <View className="absolute right-4 w-4 h-4">
          <CheckMark color={Colors.success} />
        </View>
      )}
      {Icon && <View className="absolute right-2 h-full"><Icon /></View>}
    </View>
  )
})

export default CustomTextInput
