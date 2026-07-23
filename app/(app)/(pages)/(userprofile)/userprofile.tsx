import React from "react";
import UserAvatarIcon from "@/assets/icons/user-avatar";
import { View, Text, SafeAreaView, Platform, Image, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import MyProfile from "@/components/app/Profile/MyProfile";
import { CustomText } from "@/components/CustomText";
import BackHeader from "@/components/app/BackHeader";
import { useSession } from "@/contexts/SessionContext";
import { useTranslation } from "react-i18next"

const UserProfile = () => {
  const { userData, isLoadingUserData } = useSession();
  const { t } = useTranslation();

  return (
    <SafeAreaView
      className={`flex-1 ${
        Platform.OS === "ios" && "h-full"
      } p-5 flex-1`}
      style={{ backgroundColor: "#FAF7F2" }}
    >
      <View className="mt-4 p-5">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
             {t('profile.my_profile.title')}
            </CustomText>
          )}
          rigthItem={() => (
            <TouchableOpacity
              onPress={() => router.push("/(app)/(modals)/(profile)/edit-profile")}
            >
              <Feather name="edit-2" size={22} color={Colors.secondary} />
            </TouchableOpacity>
          )}
          otherClasses="pb-5"
        />
      </View>
      <View
        className="justify-center mb-8"
        style={{
          flex: 0.4,
        }}
      >
        <View
          className="relative flex items-center justify-center h-24 w-24 mx-auto rounded-full overflow-hidden"
          style={{ borderWidth: 4, borderColor: Colors.primary }}
        >
          {isLoadingUserData ? (
            <View className="absolute z-10 rounded-full overflow-hidden w-full h-full">
              <View className="w-full h-full bg-gray_light"></View>
            </View>
          ) : (
            <View className="absolute z-10 rounded-full overflow-hidden w-full h-full">
              {userData?.avatar?.src ? (
                <Image
                  src={userData?.avatar?.src}
                  source={{ uri: userData?.avatar?.src }}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <UserAvatarIcon />
              )}
            </View>
          )}
        </View>
        <View className={`${Platform.OS === "ios" ? "mt-3" : "mt-4"} mx-auto`}>
          <CustomText
            size="large"
            boldness="semiBold"
            color="secondary"
            className="text-center"
          >
            {userData?.name}
          </CustomText>
          <CustomText size="small" color="gray_medium" className="text-center">
            {userData?.email}
          </CustomText>
        </View>
      </View>

      <MyProfile userData={userData} />
    </SafeAreaView>
  );
};
export default UserProfile;
