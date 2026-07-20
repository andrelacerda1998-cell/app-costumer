import { KeyboardAvoidingView, Platform, Text, View, Modal, Image } from 'react-native';
import { router, SplashScreen, Stack, Tabs, useNavigation } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { Colors } from '@/constants/Colors';
import TabBar from "@/components/TabBar";
import HomeIcon from "@/assets/icons/home";
import WalletIcon from "@/assets/icons/wallet";
import CalendarIcon from "@/assets/icons/calendar";
import SearchIcon from "@/assets/icons/search";
import FavoriteIcon from "@/assets/icons/favorite";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import Menu from "@/assets/icons/menu";
import UserAvatarIcon from "@/assets/icons/user-avatar";
import {CustomText} from "@/components/CustomText";
import { useTranslation } from "react-i18next";

export default function AppLayout() {
  const { t } = useTranslation();
  const { session, isLoading, signOut, userData, isLoadingUserData } = useSession();

  // useEffect(() => {
  //   setTimeout(() => {
  //     router.navigate('/(app)/confirm-email');
  //   }, 1000);
  // }, [])

  if (isLoading) {
    return SplashScreen.preventAutoHideAsync();
  }

  // No longer redirecting to auth - guest users can browse home
  /**
     We added  the classes flex-1 items-center justify-center in the tabBarIcon,  in the most external Views, to make sure that the space filled is the same to every element.
     VERY IMPORTANT: this requires testing in other screens, to check if the changes are ok
  */

  return (
    <Tabs
  tabBar={(props: any) => {
    return <TabBar {...props} />;
  }}
  screenOptions={{
    header: () => null,
    tabBarHideOnKeyboard: Platform.OS === "ios" ? true : false,
  }}
>
  <Tabs.Screen
  name="home"
  options={{
    title: t('tabs.home'),
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <View className="w-16 h-6 items-center justify-center relative"
      // style={{ backgroundColor: 'pink' }}
      >
        <HomeIcon color={focused ? Colors.secondary : Colors.gray_strong} filled={focused} />
        <Text style={{ color: focused ? Colors.secondary : Colors.gray_strong, marginTop: 2 }}>
          {t('tabs.home')}
        </Text>
      </View>
    ),
  }}
/>
  <Tabs.Screen
    name="list/index"
    options={{
      title: t('tabs.services'),
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <View className="w-20 h-6 items-center justify-center">
          <Menu color={focused ? Colors.secondary : Colors.gray_strong} />
          <Text style={{ color: focused ? Colors.secondary : Colors.gray_strong, marginTop: 2 }}>
          {t('tabs.services')}
        </Text>
        </View>
      ),
    }}
  />
  <Tabs.Screen
    name="history/index"
    options={{
      title: t('tabs.history'),
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <View className="w-20 h-7 items-center justify-center">
          {focused ? (
            <AntDesign name="clockcircle" size={24} color={Colors.secondary} />
          ) : (
            <AntDesign name="clockcircleo" size={24} color={Colors.gray_strong} />
          )}

          <Text style={{ color: focused ? Colors.secondary : Colors.gray_strong, marginTop: 2 }}>
          {t('tabs.history')}
        </Text>
        </View>
      ),
    }}
  />
  <Tabs.Screen
  name="profile"
  options={{
    title: t('tabs.account'),
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <View className="items-center justify-center">
        {isLoadingUserData ? (
          <View className="rounded-full overflow-hidden w-7 h-7 bg-gray_light" />
        ) : (
          <View
            className={`h-7 w-7 rounded-full overflow-hidden ${focused ? 'border-2 border-primary' : ''}`}
          >
            {userData?.avatar?.small ? (
              <Image
                src={userData?.avatar?.small}
                source={{ uri: userData?.avatar?.small }}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <UserAvatarIcon />
            )}
          </View>
        )}
        {/* Texto separado do avatar */}
        <Text
          style={{ color: focused ? Colors.secondary : Colors.gray_strong, marginTop: 0}}
        >
          {t('tabs.account')}
        </Text>
      </View>
    ),
  }}
/>
</Tabs>

  );
}