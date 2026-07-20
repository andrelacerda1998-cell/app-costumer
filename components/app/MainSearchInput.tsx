import SearchIcon from "@/assets/icons/search"
import { API_ROUTES } from "@/constants/ApiRoutes"
import { Colors } from '@/constants/Colors'
import { useApi } from "@/contexts/ApiContext"
import { Ionicons } from '@expo/vector-icons'
import axios from "axios"
import { useLocalSearchParams } from "expo-router"
import React, { useEffect, useRef } from 'react'
import { TouchableOpacity } from 'react-native'
import { TextInput, View } from 'react-native'
import { useClickOutside } from "react-native-click-outside"

const MainSearchInput = ({
  value,
  onChangeText,
  ...field
}: {
  value?: string
  onChangeText?: (text: string) => void,
}) => {
  const { api } = useApi();

  const textInputRef = useRef<TextInput>(null);

  const containerRef = useClickOutside<View>(() => {
    // if (content?.onCancel) content?.onCancel();
    // closeDialog();
    if (textInputRef.current) {
      textInputRef.current.blur();
    }
  });

  // const params = useLocalSearchParams();
  // const shouldFocus = params.focus;

  // useEffect(() => {
  //   console.log(shouldFocus, 'over here')
  //   if (shouldFocus) {
  //     textInputRef?.current?.focus();
  //   }
  // }, [])

  return (
    <View ref={containerRef} className="relative flex justify-center">
      <TouchableOpacity
        className="absolute right-2 bg-secondary h-10 w-10 p-2 rounded-full flex items-center justify-center z-[1]"
        onPress={() => {
          if (value && onChangeText) {
            onChangeText("");
          } else {
            textInputRef.current?.focus();
          }
        }}
      >
        {value ? (
          <Ionicons
            name="close"
            size={20}
            color={Colors.primary}
          />
        ) : (
          <SearchIcon
            // size={20}
            // name="search-outline"
            color={Colors.primary}
          />
        )}
      </TouchableOpacity>
      <TextInput
        {...field}
        ref={textInputRef}
        value={value}
        keyboardType="web-search"
        onChangeText={onChangeText}
        placeholder="what do you need?"
        placeholderTextColor={Colors.gray_medium}
        maxLength={80}
        className="rounded-full bg-support_secondary py-3 px-5 text-secondary placeholder:text-secondary text-sm font-poppins-regular pr-14"
      />
    </View>
  )
}

export default MainSearchInput
