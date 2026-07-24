import { Colors } from '@/constants/Colors'
import { FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, TouchableOpacity, View } from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import { CustomText } from "@/components/CustomText"
import { useTranslation } from "react-i18next"

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const Start = () => {
  const { t } = useTranslation();

  const StepRow = ({
    icon,
    title,
    desc,
    first = false,
  }: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    first?: boolean;
  }) => (
    <View className={`flex-row items-start ${first ? "" : "mt-4"}`}>
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
          {title}
        </CustomText>
        <CustomText color="gray_medium" size="small" boldness="regular" classes="mt-0.5">
          {desc}
        </CustomText>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t('services.urgent_intro.header')}
            </CustomText>
          )}
          // onBack={onClose}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Cabeçalho */}
          <View className="items-center mb-6">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
            >
              <Ionicons name="flash" size={30} color={Colors.secondary} />
            </View>
            <CustomText color="secondary" size="title" boldness="bold" classes="text-center">
              {t('services.urgent_intro.title')}
            </CustomText>
            <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mt-2">
              {t('services.urgent_intro.subtitle')}
            </CustomText>
          </View>

          {/* Passos */}
          <View className="bg-support_secondary rounded-2xl p-4" style={CARD_SHADOW}>
            <StepRow
              first
              icon={<Ionicons size={20} name="flash-outline" color={Colors.secondary} />}
              title={t('services.urgent_intro.step_service_title')}
              desc={t('services.urgent_intro.step_service_desc')}
            />
            <StepRow
              icon={<Octicons size={18} name="bell" color={Colors.secondary} />}
              title={t('services.urgent_intro.step_professional_title')}
              desc={t('services.urgent_intro.step_professional_desc')}
            />
            <StepRow
              icon={<MaterialCommunityIcons name="clock-time-eight-outline" size={20} color={Colors.secondary} />}
              title={t('services.urgent_intro.step_countdown_title')}
              desc={t('services.urgent_intro.step_countdown_desc')}
            />
            <StepRow
              icon={<FontAwesome6 name="check" size={16} color={Colors.secondary} />}
              title={t('services.urgent_intro.step_accept_title')}
              desc={t('services.urgent_intro.step_accept_desc')}
            />
          </View>

          <View className="flex-1" />

          {/* Começar */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              // router.canGoBack() && router.back();
              // onClose();
              router.navigate('/(app)/(urgent-service)/service-selection');
            }}
            className="rounded-full items-center justify-center flex-row mt-8"
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 18,
              shadowColor: Colors.primary,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 5 },
              elevation: 6,
            }}
          >
            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1}>
              {t('services.urgent_intro.start')}
            </CustomText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

export default Start;
