import { Colors } from '@/constants/Colors';
import React, { forwardRef } from 'react'
import { TouchableOpacity } from 'react-native'
import { View } from 'react-native';
import { CustomFontSize, CustomText, type CustomTextBoldness, type CustomTextColor } from '@/components/CustomText';

type CustomTouchableOpacityType =
  "primary" |
  "secondary" |
  "support_secondary" |
  "primary_outline" |
  "secondary_outline" |
  "support_primary_outline" |
  "support_secondary_outline" |
  "danger_outline" |
  "transparent" |
  "danger";
type CustomTouchableOpacitySize = "large" | "medium" | "small" | "medium-spec";

interface CustomTouchableOpacityProps {
  children?: React.ReactNode;
  type: CustomTouchableOpacityType;
  size: CustomTouchableOpacitySize;
  onPress?: () => void;
  className?: string;
  itemsCenter?: boolean;
  Icon?: React.ComponentType | null;
  text?: string;
  textSize?: CustomFontSize;
  textColor?: CustomTextColor;
  textBoldness?: CustomTextBoldness;
  textNumberOfLines?: number;
  disabled?: boolean;
  smallText?: boolean;
  textSizeSM?: CustomFontSize;
  textBoldnessSM?: CustomTextBoldness;
  textNumberOfLinesSM?: number;
  smallTextStr?: string;
  btnIcon?: any;
  diffColor?: CustomTextColor;
  [key: string]: any;
}

const CustomTouchableOpacity = ({
  children,
  type = "primary",
  size = "medium",
  onPress = undefined,
  className,
  itemsCenter = true,
  Icon = null,
  text,
  textSize,
  textColor,
  textBoldness,
  textNumberOfLines = 1,
  disabled,
  smallText,
  textSizeSM,
  textBoldnessSM,
  textNumberOfLinesSM,
  smallTextStr,
  btnIcon,
  diffColor,
  ...props
}: CustomTouchableOpacityProps) => {
  const backgroundColor = () => {
    switch (type) {
      case "primary":
        return Colors.primary;
      case "secondary":
        return Colors.secondary;
      case "support_secondary":
        return Colors.support_secondary;
      case "danger":
        return Colors.error;
      case "primary_outline":
      case "secondary_outline":
      case "support_primary_outline":
      case "support_secondary_outline":
      case "danger_outline":
      case "transparent":
        return "transparent";
      default:
        return Colors.primary;
    }
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

  const borderColor = () => {
    switch (type) {
      case "primary":
        return Colors.primary;
      case "secondary":
        return Colors.secondary;
      case "support_secondary":
        return Colors.support_secondary;
      case "primary_outline":
        return Colors.primary;
      case "secondary_outline":
        return Colors.secondary;
      case "support_primary_outline":
        return Colors.support_primary;
      case "support_secondary_outline":
        return Colors.support_secondary;
      case "danger_outline":
        return Colors.error;
      default:
        return "transparent";
    }
  };

  const padding = () => {
    switch (size) {
      case "large":
        return 18;
      case "medium":
        return 12;
       case "medium-spec":
        return 4;
      case "small":
        return 8;
      default:
        return 12;
    }
  }

  return (
    <TouchableOpacity
      // ref={ref}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: backgroundColor(),
          borderRadius: borderRadius(),
          borderColor: borderColor(),
          borderWidth: 1,
          paddingHorizontal: padding(),
          paddingVertical: padding(),
          alignItems: itemsCenter ? 'center' : 'flex-start',
          justifyContent: itemsCenter ? 'center' : 'flex-start',
          // flexDirection: 'row',
          flexDirection: smallText ? 'column' : 'row',
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      className={className}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...props}
    >
      {children && children} 
      {!children && text && textColor && (
        <View className={`flex-row items-center ${Icon && 'space-x-2'}`}>
          {Icon && <View className="mr-2"><Icon /></View>}

          {!smallText ? (
            <CustomText size={textSize} color={textColor} boldness={textBoldness} numberOfLines={textNumberOfLines}>
              {text}
            </CustomText>
          ) : (
            <View className="flex-col">
                {/* <View>
                <CustomText
                  size={textSize}
                  color={textColor}
                  boldness={textBoldness}
                  numberOfLines={textNumberOfLines}
                >
                  {btnIcon ? btnIcon : null} {text}
                </CustomText>
              </View> */}
              <View className="flex-row items-center space-x-1">
                  {btnIcon && <View>{btnIcon}</View>}
                  <CustomText
                    size={textSize}
                    color={textColor}
                    boldness={textBoldness}
                    numberOfLines={textNumberOfLines}
                  >
                    {text}
                  </CustomText>
              </View>

            {/* <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              > */}


                <View style={{ 
                  justifyContent: "center", 
                  alignItems: "center",
                  marginTop: 2 
                }}>

                <CustomText
                  size={textSizeSM}
                  color={diffColor? diffColor : textColor}                  
                  boldness={textBoldnessSM}
                  numberOfLines={textNumberOfLinesSM}>
                  {smallTextStr}
                </CustomText>
              </View>
            </View>
          )}          
        </View>
      )}
    </TouchableOpacity>
  )
}

export default CustomTouchableOpacity
