import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { Entypo, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native'
import TouchOpacity from '@/components/TouchOpacity'
import BackHeader from '@/components/app/BackHeader'
import { CustomText } from "@/components/CustomText"

const Start = () => {
  return (
    <SafeAreaView className="flex-1 bg-primary p-5">
      {/* <StatusBar backgroundColor={Colors.primary} animated /> */}

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            Urgent Service
          </CustomText>
        )}
        // onBack={onClose}
      />

      <ScrollView contentContainerStyle={{
        flexGrow: 1,
        width: "100%",
        justifyContent: "center",
        borderTopStartRadius: 30,
        borderTopEndRadius: 30,
      }}>
        <View className="flex-1 gap-10">
          <View>
            <ThemedText type="title" color={Colors.secondary}>
              What Qualifies as an Urgent Service?
            </ThemedText>
            <ThemedText type="default" color={Colors.secondary} className="mt-2">
              Urgent services are immediate interventions needed to resolve problems.
            </ThemedText>
          </View>
          <View>
            <View className="flex flex-row gap-3 items-center">
              <View className="w-8 flex items-center justify-center">
                <Ionicons size={32} name='heart-outline' color={Colors.secondary} />
              </View>
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" color={Colors.secondary}>
                  Urgent service
                </ThemedText>
                <ThemedText type="small" color={Colors.secondary}>
                  Choose the type of urgent service
                </ThemedText>
              </View>
            </View>
            <View className="flex flex-row gap-3 items-center mt-4">
              <View className="w-8 flex items-center justify-center">
                <Octicons size={28} name='bell' color={Colors.secondary} />
              </View>
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" color={Colors.secondary}>
                  Professional
                </ThemedText>
                <ThemedText type="small" color={Colors.secondary}>
                  Professional receive a notification with a countdown.
                </ThemedText>
              </View>
            </View>
            <View className="flex flex-row gap-3 items-center mt-4">
              <View className="w-8 flex items-center justify-center">
                <MaterialCommunityIcons name="clock-time-eight-outline" size={32} color={Colors.secondary} />
              </View>
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" color={Colors.secondary}>
                  Countdown
                </ThemedText>
                <ThemedText type="small" color={Colors.secondary}>
                  The professional will have 20 seconds to accept your request
                </ThemedText>
              </View>
            </View>
            <View className="flex flex-row gap-3 items-center mt-4">
              <View className="w-8 flex items-center justify-center">
                <FontAwesome6 name="check" size={24} color={Colors.secondary} />
              </View>
              <View className="flex-1">
                <ThemedText type="defaultSemiBold" color={Colors.secondary}>
                  A supplier accepts the job
                </ThemedText>
                <ThemedText type="small" color={Colors.secondary}>
                  Congratulations, now you can solve your problem in a short time
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
        <TouchOpacity
            bgColor="secondary"
            itemsCenter
            rounded="lg"
            otherClasses="py-4 mt-6"
            onPress={() => {
                // router.canGoBack() && router.back();
                // onClose();
                router.navigate('/(app)/(urgent-service)/service-selection');
            }}
        >
          <ThemedText type="defaultBold" color={Colors.primary}>
            Start
          </ThemedText>
        </TouchOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Start;