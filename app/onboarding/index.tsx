import React, { useRef, useState } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import CustomTouchableOpacity from '@/components/CustomTouchableOpacity';
import { Colors } from '@/constants/Colors';

export const ONBOARDING_SEEN_KEY = 'onboarding_seen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Page = {
  icon: keyof typeof Feather.glyphMap;
  titleKey: string;
  subtitleKey: string;
};

const PAGES: Page[] = [
  {
    icon: 'home',
    titleKey: 'onboarding.page1.title',
    subtitleKey: 'onboarding.page1.subtitle',
  },
  {
    icon: 'zap',
    titleKey: 'onboarding.page2.title',
    subtitleKey: 'onboarding.page2.subtitle',
  },
  {
    icon: 'shield',
    titleKey: 'onboarding.page3.title',
    subtitleKey: 'onboarding.page3.subtitle',
  },
];

const Onboarding = () => {
  const { t } = useTranslation();
  const listRef = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } finally {
      router.replace('/(app)/(tabs)/home');
    }
  };

  const next = () => {
    if (index >= PAGES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToOffset({
      offset: (index + 1) * SCREEN_WIDTH,
      animated: true,
    });
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(page);
  };

  const isLast = index === PAGES.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-support_secondary">
      {/* Saltar */}
      <View className="flex-row justify-end px-5 pt-2">
        <CustomTouchableOpacity
          type="transparent"
          size="medium"
          textColor="gray_strong"
          textBoldness="medium"
          text={t('onboarding.skip')}
          onPress={finish}
        />
      </View>

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(item) => item.icon}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View
            style={{ width: SCREEN_WIDTH }}
            className="px-8 items-center justify-center flex-1"
          >
            <View
              className="items-center justify-center rounded-3xl mb-8"
              style={{
                width: 120,
                height: 120,
                backgroundColor: 'rgba(250,187,91,0.18)',
              }}
            >
              <Feather name={item.icon} size={52} color={Colors.secondary} />
            </View>
            <CustomText
              color="secondary"
              size="subtitle"
              boldness="bold"
              classes="text-center"
            >
              {t(item.titleKey)}
            </CustomText>
            <CustomText
              color="gray_strong"
              size="medium"
              boldness="regular"
              classes="text-center mt-3"
            >
              {t(item.subtitleKey)}
            </CustomText>
          </View>
        )}
      />

      {/* Pontos + botão */}
      <View className="px-8 pb-6">
        <View className="flex-row justify-center mb-5">
          {PAGES.map((p, i) => (
            <View
              key={`dot-${p.icon}`}
              className="h-2 rounded-full mx-1"
              style={{
                width: i === index ? 22 : 8,
                backgroundColor: i === index ? Colors.primary : Colors.gray_light,
              }}
            />
          ))}
        </View>
        <CustomTouchableOpacity
          type="primary"
          size="large"
          textColor="secondary"
          textBoldness="semiBold"
          text={isLast ? t('onboarding.start') : t('onboarding.next')}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
};

export default Onboarding;
