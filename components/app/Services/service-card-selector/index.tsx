import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import React from 'react';
import { View, Image } from 'react-native';
import { useTranslation } from "react-i18next";


const UrgentServiceSelector = ({
  selected,
  Icon,
  label,
  onPress,
  diffBackground,
  item
}: {
  selected: boolean,
  Icon: () => JSX.Element,
  label: string,
  onPress?: () => void,
  diffBackground?: boolean;
  item: any
}) => {
  const { t } = useTranslation();


const images: Record<string, any> = {
  unspecified: require("../../../../assets/pictures/operation.jpeg"),
};

const handleSrc2 = (image?: any) => {

  if (!image) return images.unspecified;

  if (
    typeof image === "string" &&
    (image.startsWith("http") ||
      image.startsWith("file://") ||
      image.startsWith("data:"))
  ) {
    return { uri: image };
  }

  if (typeof image === "string" && images[image.toLowerCase()]) {
    return images[image.toLowerCase()];
  }


  return images.unspecified;
};



  return (
    <CustomTouchableOpacity
      size="large"
      type="transparent"
      className={`flex flex-row items-center 
                  justify-between rounded-lg  border-b-[0.5px] border-gray_light pt-1 pb-2.5
                  ${diffBackground ? "bg-[#FABB5B]" : "bg-[#FFFFFF]"}`}
      onPress={onPress}
    >
      <View className="rounded-lg w-14 h-14 items-center justify-center p-3">
          <View className="w-[50px] h-[50px] overflow-hidden bg-gray-200 items-center justify-center rounded-[6px]">
              <Image
                className="w-full h-full rounded-[6px]"
                style={{
                  resizeMode: 'stretchss'
                }}
                // source={handleSrc2(item?.operation_area?.image)}
                source={handleSrc2(item?.image)}
                resizeMode="contain"
              />
        </View>
    </View>
      <View className="flex-1 pr-3">
        <CustomText
          boldness="bold"
          color="secondary"
          numberOfLines={2}
          size="small"
          classes='ml-1'
        >
          {label}
        </CustomText>
        {item?.starts_from && (
          <View className="flex-row items-center">
            <CustomText
              boldness="medium"
              color={diffBackground ? "support_secondary" : "gray_medium"}
              numberOfLines={1}
              size="small"
              classes='ml-1'
            >
              {t('services.service.starting_from_label')}
            </CustomText>
            <CustomText
              boldness="bold"
              color={diffBackground ? "support_secondary" : "primary"}
              numberOfLines={1}
              size="small"
            >
              {item.starts_from}€
            </CustomText>
          </View>
        )}
      </View>
    </CustomTouchableOpacity>
  )
}

export default UrgentServiceSelector;
