import {View} from "react-native";
import {CustomText} from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import React, { FC, memo } from "react";

interface HomeSectionProps {
  title: string;
  actionButton?: () => void;
  actionButtonText?: string;
  children?: React.ReactNode;
}

const HomeSection: FC<HomeSectionProps> = ({
  title,
  actionButton,
  actionButtonText,
  children
}) => {
  return (
    <View className="py-4 flex-1">
      <View className="flex-row items-center justify-between px-5">
        <CustomText size="large" color="secondary" boldness="bold" numberOfLines={1} classes="text-lg w-[60%]">
          { title }
        </CustomText>
        <CustomTouchableOpacity
          type="transparent"
          size="small"
          classes="p-0"
          onPress={ actionButton }
        >
          <CustomText size="extraSmall" color="gray_light" boldness="medium" numberOfLines={1}>
            { actionButtonText }
          </CustomText>
        </CustomTouchableOpacity>
      </View>

      { children }
    </View>
  );
}

export default memo(HomeSection);