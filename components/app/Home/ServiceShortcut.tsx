import { CustomText } from '@/components/CustomText'
import { ThemedText } from '@/components/ThemedText'
import TouchOpacity from '@/components/TouchOpacity'
import React from 'react'
import { View } from 'react-native'

const ServiceShortcut = ({
  Icon,
  label,
  onPress,
  notifications
}: {
  Icon: () => React.JSX.Element,
  label: string,
  onPress: () => void,
  notifications?: number
}) => {
  return (
    <TouchOpacity
      otherClasses="w-12 items-center justify-start h-full max-h-32"
      onPress={onPress}
    >
      <View className={`${label === "Add" ? "border border-secondary" : "bg-secondary"} rounded-lg h-12 w-12 flex items-center justify-center`}>
        <Icon />
      </View>

      <CustomText
        size="extraSmall"
        boldness="bold"
        color="secondary"
        className="text-center mt-2"
        numberOfLines={2}
      >
        {label}
      </CustomText>

      {
        notifications && (
          <View
            className={`
              bg-error rounded-full h-6 w-6 flex items-center justify-center
              absolute -top-2 right-3
            `}
          >
            <CustomText
              size="small"
              boldness="bold"
              color="secondary"
            >
              {notifications > 9 ? '9+' : notifications}
            </CustomText>
          </View>
        )
      }
    </TouchOpacity>
  )
}

export default ServiceShortcut
