import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet"
import React from 'react'
import { Image, Text, View } from "react-native"
import { CustomText } from "../CustomText"
import { Colors } from "@/constants/Colors"
import { Entypo, Feather } from "@expo/vector-icons"
import ArrowIcon from "@/assets/icons/arrow"
import CustomTouchableOpacity from "../CustomTouchableOpacity"

const ServiceHistory = () => {
  const services = [
    {
      user_name: 'Jhonny Rivers',
      user_comment: 'Adjusting cables and circuit break...',
    },
    {
      user_name: 'Alice Johnson',
      user_comment: 'Replaced the air filter and checked the oil level.',
    },
    {
      user_name: 'Bob Smith',
      user_comment: 'Fixed the brake pads and tested the brakes.',
    },
    {
      user_name: 'Carol White',
      user_comment: 'Cleaned the engine and replaced the spark plugs.',
    },
    {
      user_name: 'David Brown',
      user_comment: 'Checked the tire pressure and aligned the wheels.',
    },
    {
      user_name: 'Eve Davis',
      user_comment: 'Repaired the exhaust system and tested emissions.',
    },
    {
      user_name: 'Frank Wilson',
      user_comment: 'Replaced the battery and checked the electrical system.',
    },
    {
      user_name: 'Grace Lee',
      user_comment: 'Serviced the transmission and replaced the fluid.',
    },
    {
      user_name: 'Hank Miller',
      user_comment: 'Inspected the suspension and replaced worn parts.',
    },
    {
      user_name: 'Ivy Martinez',
      user_comment: 'Checked the cooling system and replaced the coolant.',
    },
    {
      user_name: 'Jack Taylor',
      user_comment: 'Performed a full diagnostic and fixed minor issues.',
    },
    {
      user_name: 'David Brown',
      user_comment: 'Checked the tire pressure and aligned the wheels.',
    },
    {
      user_name: 'Eve Davis',
      user_comment: 'Repaired the exhaust system and tested emissions.',
    },
    {
      user_name: 'Frank Wilson',
      user_comment: 'Replaced the battery and checked the electrical system.',
    },
    {
      user_name: 'Grace Lee',
      user_comment: 'Serviced the transmission and replaced the fluid.',
    },
    {
      user_name: 'Hank Miller',
      user_comment: 'Inspected the suspension and replaced worn parts.',
    },
    {
      user_name: 'Ivy Martinez',
      user_comment: 'Checked the cooling system and replaced the coolant.',
    },
    {
      user_name: 'Jack Taylor',
      user_comment: 'Performed a full diagnostic and fixed minor issues.',
    }
  ]

  return (
    <BottomSheet
      // ref={bottomSheetRef}
      snapPoints={["30%", '50%', '70%']}
      // onChange={handleSheetChanges}
      style={{
        flex: 1,
        backgroundColor: Colors.support_secondary,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      enableDynamicSizing={false}
    >
      <BottomSheetFlatList
        data={services}
        keyExtractor={(_, index) => index.toString()}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (<View className="h-[1px] mx-auto w-[90%] bg-gray_light" />)}
        renderItem={({ item }) => (
          <CustomTouchableOpacity className="p-0 h-20" size="large" type="transparent">
            <View className="flex-row w-[90%] mx-auto justify-between items-center space-x-4">
              <View className="flex-row w-20 items-center">
                <View className="h-12 w-12 z-[1] border-2 border-secondary rounded-full">
                  <Image
                    src="https://r2.erweima.ai/imgcompressed/img/compressed_c5b0073e2f4244f269ef19b63b36acaa.webp"
                    source={{ uri: 'https://r2.erweima.ai/imgcompressed/img/compressed_c5b0073e2f4244f269ef19b63b36acaa.webp' }}
                    className="w-full h-full object-cover object-center rounded-full"
                  />
                </View>
                <View className="h-12 w-12 rounded-full flex items-center justify-center bg-secondary relative -left-5">
                  <Feather name="tool" size={22} color={Colors.primary} />
                </View>
              </View>
              <View className="flex-1">
                <CustomText size="medium" color="secondary" boldness="semiBold" numberOfLines={1}>
                  {item.user_name}
                </CustomText>
                <CustomText size="small" color="gray_medium" boldness="semiBold" numberOfLines={1}>
                  {item.user_comment}
                </CustomText>
              </View>
              <View className="w-4 h-4">
                <ArrowIcon color={Colors.secondary} position="right" />
              </View>
            </View>
          </CustomTouchableOpacity>
        )}
      />
    </BottomSheet>
  )
}

export default ServiceHistory