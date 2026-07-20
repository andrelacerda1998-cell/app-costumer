import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import {FlatList, ScrollView, Text, View} from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import { useTranslation } from "react-i18next"
import {CustomText} from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { useSession } from "@/contexts/SessionContext";

interface Notification {
  title: string,
  body: string,
  date: string,
  id: string,
  read_at: string|null,
}

const Notifications = () => {
  const { api } = useApi();
  const { t } = useTranslation();
  const { userData, setUserData } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(API_ROUTES.COMMON_GET_NOTIFICATIONS)
        .then(res=>{
          setNotifications(res.data.data.notifications);
          if (userData?.notifications !== undefined) {
            const newNotificationsUnread = userData?.notifications <= res.data.data.notifications.length
              ? 0
              : userData?.notifications - res.data.data.notifications.length; 
            setUserData({
              ...userData,
              notifications: newNotificationsUnread,
            })
          }
        })
        .finally(() => {
          setLoading(false);
        })
  }, []);

  const onClose = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/home");
  };

  return (
    <SafeAreaView className="flex-1 bg-support_secondary py-5">
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <ThemedText type="defaultBold" color={Colors.secondary} numberOfLines={1}>
            {t('session.notifications.header')}
          </ThemedText>
        )}
        onBack={onClose}
        otherClasses="px-5"
      />

      <View className="h-full py-5 rounded-t-3xl overflow-hidden">
        {loading ? (
          <View className="flex-1">
            {Array.from({length: 14}).map((_, index) => (
              <View key={`loading-notifications-${index}`} className="">
                <View className="px-5 w-full">
                  <View className="rounded-md overflow-hidden w-[35%] relative">
                    <View className="w-full h-5 bg-gray_light"></View>
                  </View>
                  <View>
                    <View className="rounded-md overflow-hidden w-full h-4 mt-2">
                      <View className="w-full h-full bg-gray_light"></View>
                    </View>
                    <View className="rounded-md overflow-hidden w-[75%] h-4 mt-1">
                      <View className="w-full h-full bg-gray_light"></View>
                    </View>
                  </View>
                </View>
                <View className="rounded-md overflow-hidden w-full h-[2px] my-4">
                  <View className="w-full h-full bg-gray_light"></View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => (
              <View className="h-[2px] bg-gray_medium rounded-full" />
            )}
            ListEmptyComponent={() => (
              <View className="flex-1 items-center justify-center">
                <CustomText
                    color="secondary"
                    size="medium"
                    className="mt-2"
                >
                  {t('session.notifications.empty')}
                </CustomText>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            renderItem={({item}) => {
              return (
                <CustomTouchableOpacity
                    // onPress={() => handleOpenService(item)}
                    type="transparent"
                    size="large"
                    className="py-4 px-5"
                    //onPress={() => handleSelectOperationArea(item) }
                    //disabled={loadingSearchedServiceTypes}
                >
                  <View>
                    <CustomText
                        boldness="semiBold"
                        color="secondary"
                        size="medium"
                        numberOfLines={1}
                    >
                      {item.title}
                    </CustomText>
                    <CustomText
                        color="secondary"
                        numberOfLines={2}
                        size="small"
                    >
                      {item.body}
                    </CustomText>
                  </View>

                </CustomTouchableOpacity>
              )
            }}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

export default Notifications;
