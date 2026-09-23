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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Os recortes sao todos 1320x860, por isso a moldura segue a proporcao da
// imagem em vez de uma altura fixa: assim nada e cortado nem esticado, seja
// qual for a largura do telefone.
const IMAGE_RATIO = 1320 / 860;
const IMAGE_MARGIN = 24;
const IMAGE_WIDTH = SCREEN_WIDTH - IMAGE_MARGIN * 2;
const IMAGE_HEIGHT = Math.round(IMAGE_WIDTH / IMAGE_RATIO);
// Chega para um titulo de duas linhas mais um subtitulo de duas.
const TEXT_BLOCK_MIN_HEIGHT = 180;

type Page = {
  key: string;
  image: ImageSourcePropType;
  titleKey: string;
  subtitleKey: string;
};

// Recortes de ecras reais da app, um por afirmacao: a grelha de categorias da
// Home, o ecra de um servico com o preco e as duas vias (agendar / pedir
// agora), e o acompanhamento com o tecnico a caminho. Sao capturas, nao
// ilustracoes — o que se promete aqui e literalmente o que se ve a seguir.
//
// Ficam como recurso local: o onboarding e o primeiro ecra depois da
// instalacao e nao pode depender de rede.
const PAGES: Page[] = [
  {
    key: 'areas',
    image: require('@/assets/images/onboarding/ecra-categorias.webp'),
    titleKey: 'onboarding.page1.title',
    subtitleKey: 'onboarding.page1.subtitle',
  },
  {
    key: 'preco',
    image: require('@/assets/images/onboarding/ecra-preco.webp'),
    titleKey: 'onboarding.page2.title',
    subtitleKey: 'onboarding.page2.subtitle',
  },
  {
    key: 'acompanhamento',
    image: require('@/assets/images/onboarding/ecra-acompanhar.webp'),
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
          <View style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center">
            <View
              style={{
                height: IMAGE_HEIGHT,
                marginHorizontal: IMAGE_MARGIN,
                borderRadius: 24,
                overflow: 'hidden',
                // O fundo do onboarding e branco e os ecras da app tambem: sem
                // esta borda a captura nao tem limite visivel e fica a flutuar.
                borderWidth: 1,
                borderColor: Colors.support_primary,
                backgroundColor: Colors.support_secondary,
              }}
            >
              <Image
                source={item.image}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                // Sem transicao: a primeira pagina ja esta em memoria quando o
                // ecra monta e um fade faria a app parecer mais lenta do que e.
                transition={0}
                accessibilityIgnoresInvertColors
              />
            </View>

            {/*
              Altura minima fixa no bloco de texto. Sem ela, a pagina do preco —
              unica com titulo de duas linhas — ficava mais alta e a captura
              saltava de sitio ao deslizar entre paginas.
            */}
            <View className="px-8" style={{ minHeight: TEXT_BLOCK_MIN_HEIGHT }}>
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
