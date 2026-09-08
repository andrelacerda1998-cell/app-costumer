import { KeyboardAvoidingView, Platform, Text, View, Modal, Image } from 'react-native';
import { router, SplashScreen, Stack, Tabs, useNavigation } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { useService } from '@/contexts/ServiceContext';
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
  const { scheduledServices } = useService();
  // Quantos serviços estão marcados. No ícone, poupa ao cliente abrir a agenda
  // só para saber se tem alguma coisa — e é onde ele vai reparar que tem.
  const schedulesCount = Array.isArray(scheduledServices) ? scheduledServices.length : 0;

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
  {/* Serviços: o que está marcado e o que já passou, no mesmo separador. Para
      o cliente é a mesma pergunta — "os meus serviços" —, e a resposta não deve
      mudar de sítio consoante a data. */}
  <Tabs.Screen
    name="services/index"
    options={{
      title: t('tabs.services'),
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <View className="w-20 h-8 items-center justify-center">
          <View>
            <AntDesign
              name="calendar"
              size={26}
              color={focused ? Colors.secondary : Colors.gray_strong}
            />
            {schedulesCount > 0 && (
              /* Bolha vermelha, como as de notificação que toda a gente
                 reconhece. Contorno da cor da barra para o número se destacar
                 do calendário por baixo, em vez de se confundir com os traços
                 dele. */
              <View
                className="absolute items-center justify-center rounded-full"
                style={{
                  top: -6,
                  right: -9,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  backgroundColor: Colors.error,
                  borderWidth: 2,
                  borderColor: Colors.primary,
                }}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.1}
                  style={{ color: Colors.support_secondary, fontSize: 10, fontFamily: "Poppins_600SemiBold" }}
                >
                  {schedulesCount > 9 ? "9+" : schedulesCount}
                </Text>
              </View>
            )}
          </View>

          <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          style={{ color: focused ? Colors.secondary : Colors.gray_strong, fontSize: 12.5, marginTop: 2 }}
        >
          {t('tabs.services')}
        </Text>
        </View>
      ),
    }}
  />
  {/* O histórico vive dentro do separador Serviços; a rota fica, sem entrada
      própria na barra. */}
  <Tabs.Screen name="history/index" options={{ href: null }} />
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