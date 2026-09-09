import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from "react-i18next";
import { proxiedImage } from "@/utils/imageProxy";
import { renderMoney } from "@/utils/money";

const NEUTRAL_PLACEHOLDER = require("@/assets/pictures/placeholder.png");


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


const handleSrc2 = (image?: any) => {

  if (!image) return NEUTRAL_PLACEHOLDER; // sem imagem → placeholder neutro

  if (
    typeof image === "string" &&
    (image.startsWith("http") ||
      image.startsWith("file://") ||
      image.startsWith("data:"))
  ) {
    return { uri: proxiedImage(image, 150) };
  }

  return undefined;
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
                style={{ width: "100%", height: "100%", borderRadius: 6 }}
                source={handleSrc2(item?.image)}
                contentFit="contain"
                cachePolicy="memory-disk"
                placeholder={NEUTRAL_PLACEHOLDER}
                transition={150}
                recyclingKey={typeof item?.image === "string" ? item.image : label}
              />
        </View>
    </View>
      {/* Só o nome: a duração aparece na ficha do serviço, ao tocar, e aqui
          empurrava o título para cima da linha. Centrado na vertical, o nome
          alinha com a imagem e com o preço. */}
      <View className="flex-1 pr-4 justify-center">
        <CustomText
          boldness="bold"
          color="secondary"
          numberOfLines={2}
          size="small"
          classes='ml-3'
        >
          {label}
        </CustomText>

      </View>

      {/* Preço à direita, alinhado: ocupa o espaço que sobrava e fica na mesma
          coluna em toda a lista, fácil de percorrer com os olhos. Em preto e
          não em âmbar — sobre o cartão claro, o âmbar mal se lia. */}
      {typeof item?.starts_from === "number" && item.starts_from > 0 && (
        <View className="flex-row items-baseline pr-1">
          <CustomText
            boldness="regular"
            color={diffBackground ? "secondary" : "gray_strong"}
            numberOfLines={1}
            size="extraSmall"
          >
            {t('services.service.starting_from_label')}
          </CustomText>
          <CustomText
            boldness="bold"
            color="secondary"
            numberOfLines={1}
            size="small"
            classes="ml-1"
          >
            {renderMoney((item.starts_from as number) * 100)}
          </CustomText>
        </View>
      )}
    </CustomTouchableOpacity>
  )
}

export default UrgentServiceSelector;
