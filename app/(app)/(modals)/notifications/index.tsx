import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import {SectionList, View} from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import { useTranslation } from "react-i18next"
import {CustomText} from "@/components/CustomText";
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

  // Hora relativa por item, ex.: "agora", "há 5 min", "há 2 h", "há 3 d".
  const formatRelative = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (min < 1) return t('session.notifications.time.now');
    if (min < 60) return t('session.notifications.time.minutes', { count: min });
    const hours = Math.round(min / 60);
    if (hours < 24) return t('session.notifications.time.hours', { count: hours });
    const days = Math.round(hours / 24);
    return t('session.notifications.time.days', { count: days });
  };
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(API_ROUTES.COMMON_GET_NOTIFICATIONS)
        .then(res=>{
          setNotifications(res.data.data.notifications);
          if (userData?.notifications !== undefined) {
            const newNotificationsUnread = (res.data.data.notifications as Notification[])
              .filter((n) => n.read_at == null).length;
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

  // Agrupa as notificações por dia: Hoje / Ontem / Anteriores.
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const buildSections = () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const today: Notification[] = [];
    const yesterdayList: Notification[] = [];
    const earlier: Notification[] = [];
    notifications.forEach((n) => {
      const d = new Date(n.date);
      if (isNaN(d.getTime())) {
        earlier.push(n);
      } else if (isSameDay(d, now)) {
        today.push(n);
      } else if (isSameDay(d, yesterday)) {
        yesterdayList.push(n);
      } else {
        earlier.push(n);
      }
    });
    return [
      { title: t('session.notifications.today'), data: today },
      { title: t('session.notifications.yesterday'), data: yesterdayList },
      { title: t('session.notifications.earlier'), data: earlier },
    ].filter((s) => s.data.length > 0);
  };

  const sections = buildSections();

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
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => (
              <View className="h-[1px] bg-support_primary" />
            )}
            renderSectionHeader={({section}) => (
              <View className="px-5 pt-4 pb-2 bg-support_secondary">
                <CustomText
                    boldness="bold"
                    color="gray_strong"
                    size="small"
                >
                  {section.title}
                </CustomText>
              </View>
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
                <View className="py-4 px-5">
                  <View className="flex-row items-center">
                    {item.read_at == null && (
                      <View className="h-2 w-2 rounded-full bg-primary mr-2" />
                    )}
                    <CustomText
                        boldness="semiBold"
                        color="secondary"
                        size="medium"
                        numberOfLines={1}
                        classes="flex-1"
                    >
                      {item.title}
                    </CustomText>
                    <CustomText
                        color="gray_medium"
                        size="extraSmall"
                        classes="ml-2"
                    >
                      {formatRelative(item.date)}
                    </CustomText>
                  </View>
                  <CustomText
                      color="secondary"
                      numberOfLines={2}
                      size="small"
                  >
                    {item.body}
                  </CustomText>
                </View>
              )
            }}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

export default Notifications;
