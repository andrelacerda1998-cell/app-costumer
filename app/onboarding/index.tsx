import React, { useRef, useState } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import CustomTouchableOpacity from '@/components/CustomTouchableOpacity';
import { Colors } from '@/constants/Colors';

export const ONBOARDING_SEEN_KEY = 'onboarding_seen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// A imagem ocupa uma fatia da altura, nao uma altura fixa: num iPhone SE
// sobrava texto por baixo da dobra, num Pro Max sobrava ecra vazio. O teto
// impede que cresca demais nos tamanhos grandes.
const IMAGE_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.46), 420);
const IMAGE_MARGIN = 24;

type Page = {
  key: string;
  image: ImageSourcePropType;
  titleKey: string;
  subtitleKey: string;
};

// As fotografias sao as mesmas que a API serve para as categorias na Home —
// tecnicos com o equipamento da Piquet, em casas reais. Ficam aqui como
// recurso local de proposito: o onboarding e o primeiro ecra depois da
// instalacao e nao pode depender de rede nem de URLs assinadas, que expiram.
const PAGES: Page[] = [
  {
    key: 'areas',
    image: require('@/assets/images/onboarding/tecnico-canalizacao.webp'),
    titleKey: 'onboarding.page1.title',
    subtitleKey: 'onboarding.page1.subtitle',
  },
  {
    key: 'preco',
    image: require('@/assets/images/onboarding/tecnica-limpezas.webp'),
    titleKey: 'onboarding.page2.title',
    subtitleKey: 'onboarding.page2.subtitle',
  },
  {
    key: 'acompanhamento',
    image: require('@/assets/images/onboarding/tecnico-eletricidade.webp'),
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
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          // A imagem fica ancorada ao topo, nao centrada: com o bloco centrado,
          // a pagina 2 — que tem titulo de duas linhas — empurrava a fotografia
          // para baixo e a imagem saltava de sitio ao deslizar entre paginas.
          <View style={{ width: SCREEN_WIDTH, paddingTop: 8 }} className="flex-1">
            <View
              style={{
                height: IMAGE_HEIGHT,
                marginHorizontal: IMAGE_MARGIN,
                borderRadius: 28,
                overflow: 'hidden',
                backgroundColor: Colors.gray_light,
              }}
            >
              <Image
                source={item.image}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                // Sem transicao: a primeira pagina ja esta em memoria quando o
                // ecra monta e um fade faria a app parecer mais lenta do que e.
                transition={0}
                accessibilityIgnoresInvertColors
              />
            </View>

            <View className="px-8">
              <CustomText
                color="secondary"
                size="subtitle"
                boldness="bold"
                classes="text-center mt-7"
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
          </View>
        )}
      />

      {/* Pontos + botão */}
      <View className="px-8 pb-6">
        <View className="flex-row justify-center mb-5">
          {PAGES.map((p, i) => (
            <View
              key={`dot-${p.key}`}
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
