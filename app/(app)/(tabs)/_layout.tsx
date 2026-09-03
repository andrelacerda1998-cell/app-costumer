import { KeyboardAvoidingView, Platform, Text, View, Modal, Image } from 'react-native';
import { router, SplashScreen, Stack, Tabs, useNavigation } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { Colors } from '@/constants/Colors';
import { CART_ENABLED } from '@/constants/Features';
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
      <View className="w-16 h-7 items-center justify-center relative"
      // style={{ backgroundColor: 'pink' }}
      >
        <HomeIcon color={focused ? Colors.secondary : Colors.gray_strong} filled={focused} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          style={{ color: focused ? Colors.secondary : Colors.gray_strong, fontSize: 12.5, marginTop: 2 }}
        >
          {t('tabs.home')}
        </Text>
      </View>
    ),
  }}
/>
  <Tabs.Screen
    name="list/index"
    options={{
      title: t('tabs.explore'),
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <View className="w-20 h-7 items-center justify-center">
          {/* Lupa: o separador é para procurar o serviço, não para ler uma lista. */}
          <View style={{ width: 24, height: 24 }}>
            <SearchIcon color={focused ? Colors.secondary : Colors.gray_strong} />
          </View>
          <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          style={{ color: focused ? Colors.secondary : Colors.gray_strong, fontSize: 12.5, marginTop: 2 }}
        >
          {t('tabs.explore')}
        </Text>
        </View>
      ),
    }}
  />
  <Tabs.Screen
    name="cart/index"
    options={{
      title: t('tabs.cart'),
      // O ícone real é desenhado pelo TabBar (botão central elevado);
      // isto só garante que a rota não é saltada.
      tabBarIcon: () => null,
      // href: null tira o separador da barra MAS mantem a rota viva — quem lá
      // chegar por link direto continua a ver o cesto e o que tinha guardado.
      // Ver constants/Features.ts para a razão de estar desligado.
      href: CART_ENABLED ? undefined : null,
    }}
  />
  <Tabs.Screen
    name="history/index"
    options={{
      title: t('tabs.history'),
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <View className="w-20 h-8 items-center justify-center">
          {focused ? (
            <AntDesign name="clockcircle" size={26} color={Colors.secondary} />
          ) : (
            <AntDesign name="clockcircleo" size={26} color={Colors.gray_strong} />
          )}

          <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          style={{ color: focused ? Colors.secondary : Colors.gray_strong, fontSize: 12.5, marginTop: 2 }}
        >
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
          <View className="rounded-full overflow-hidden w-8 h-8 bg-gray_light" />
        ) : (
          <View
            className={`h-8 w-8 rounded-full overflow-hidden ${focused ? 'border-2 border-primary' : ''}`}
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
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          style={{ color: focused ? Colors.secondary : Colors.gray_strong, fontSize: 12.5, marginTop: 0}}
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