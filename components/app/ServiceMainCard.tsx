import TouchOpacity from '@/components/TouchOpacity';
import React from 'react';
import { View } from 'react-native';
import { CustomText } from "../CustomText";
import CustomTouchableOpacity from "../CustomTouchableOpacity";

type ServiceMainCardProps = {
  Icon: () => React.JSX.Element;
  label: string;
  onPress: () => void;
  otherClasses?: string;
  isHome?: boolean;
};

const ServiceMainCard = ({
  Icon,
  label,
  onPress,
  otherClasses = '',
  isHome = false,
  ...rest
}: ServiceMainCardProps) => {
  return (
    <CustomTouchableOpacity
      className="bg-secondary rounded-2xl"
      onPress={onPress}
      type="secondary"
      size="large"
      {...rest}
    >
      <View className="w-full flex-row items-center justify-between">
        <View className="w-14 h-14 items-center justify-center">
          <Icon />
        </View>
        <View className="flex-1 pr-3">
          <CustomText
            boldness="medium"
            color="support_secondary"
            numberOfLines={2}
          >
            {label}
          </CustomText>
        </View>
      </View>
    </CustomTouchableOpacity>
  )
};

export default ServiceMainCard;
