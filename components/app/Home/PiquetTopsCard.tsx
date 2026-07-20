import { ThemedText } from '@/components/ThemedText'
import TouchOpacity from '@/components/TouchOpacity'
import { Colors } from '@/constants/Colors'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Image, ImageSourcePropType, View } from 'react-native'

const PiquetTopCard = ({
  Icon,
  imgSrc,
  imgSource,
  category,
  vendorName,
  vendorStars,
  vendorPrice,
  onPressToCall,
  onPressFavorite,
  onPressCard,
  favorite = false,
  ...rest
}: {
  Icon: () => React.JSX.Element,
  imgSrc: string,
  imgSource?: ImageSourcePropType,
  category: string,
  vendorName: string,
  vendorStars: string,
  vendorPrice: string,
  onPressToCall: () => void,
  onPressFavorite: () => void,
  onPressCard?: () => void,
  favorite: boolean,
}) => {
  return (
    <TouchOpacity
      otherClasses="border border-secondary w-60 overflow-hidden rounded-xl h-56 p-5 flex justify-between"
      onPress={onPressCard}
      {...rest}
    >
      <View className="relative flex flex-row items-center justify-between">
        <View
          className="
            h-8 w-8 rounded-full flex items-center justify-center bg-secondary
            absolute left-6
          "
        >
          <Icon />
        </View> 
        <View className="h-8 w-8 rounded-full overflow-hidden">
          <Image
            src={imgSrc}
            source={imgSource}
            className="w-full h-full object-cover object-center"
          />
        </View>
        <TouchOpacity
          onPress={onPressFavorite}
        >
          <View>
            <Ionicons
              size={24}
              name={favorite ? 'heart' : 'heart-outline'}
              color={favorite ? Colors.error : Colors.secondary}
            />
          </View>
        </TouchOpacity>
      </View>
      <View className="flex flex-row justify-between">
        <ThemedText
          type='small'
          color={Colors.support_secondary}
          className="bg-link px-2 py-1 rounded-lg font-poppins-medium max-w-[60%]"
          numberOfLines={1}
        >
          {category}
        </ThemedText>
        <View className="flex flex-row items-center gap-2">
          <ThemedText
            type="defaultSemiBold"
            color={Colors.secondary}
            className="flex-shrink"
          >
            {vendorStars}
          </ThemedText>
          <AntDesign name="star" size={24} color={Colors.primary} />
        </View>
      </View>
      <View>
        <ThemedText
          type="defaultBold"
          color={Colors.secondary}
          className=""
          numberOfLines={1}
        >
          {vendorName}
        </ThemedText>
        <ThemedText
          type="small"
          color={Colors.secondary}
          className=""
          numberOfLines={1}
        >
          {vendorPrice}
        </ThemedText>
      </View>
      <TouchOpacity
        otherClasses="bg-secondary rounded-md flex items-center justify-center p-2 w-full border border-black"
        bgColor="secondary"
        onPress={onPressToCall}
      >
        <ThemedText
          type="defaultBold"
          color={Colors.primary}
          numberOfLines={1}
        >
          to call
        </ThemedText>
      </TouchOpacity>
    </TouchOpacity>
  )
}

export default PiquetTopCard
