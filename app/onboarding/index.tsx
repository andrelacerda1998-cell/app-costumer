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

// Os recortes sao todos 1320x1562 — a proporcao de um ecra da app com a
// barra de estado e a de navegacao de fora. A moldura segue a proporcao da
// imagem, nunca uma altura fixa: assim nada e cortado nem esticado.
//
// Era 1320x1100 com a captura encolhida la dentro, e sobravam bandas beges
// nos lados — a lista dos tres tecnicos e mais alta do que larga, e a unica
// maneira de a meter numa moldura deitada era encolhe-la.
//
// Agora e ao contrario: a moldura toma a forma da captura. Onde houver
// altura, a imagem ocupa a largura toda e nao ha banda nenhuma.
const IMAGE_RATIO = 1320 / 1562;
const IMAGE_MARGIN = 16;
const IMAGE_MAX_WIDTH = SCREEN_WIDTH - IMAGE_MARGIN * 2;
const IMAGE_MAX_HEIGHT = IMAGE_MAX_WIDTH / IMAGE_RATIO;
// Chega para um titulo de duas linhas mais um subtitulo de duas.
const TEXT_BLOCK_MIN_HEIGHT = 180;

/**
 * Altura e largura da moldura para o espaco que sobra entre o cabecalho e o
 * botao.
 *
 * Num telefone normal a imagem leva a largura toda. Num iPhone SE (375x667)
 * nao ha altura para isso: a pagina nao tem scroll — e paginada na horizontal
 * — e sem limite a imagem empurrava o texto e o botao para fora do ecra. Ai a
 * moldura encolhe, mas encolhe nas DUAS dimensoes, de modo que a captura
 * continua a tocar nas bordas em vez de ficar com bandas ao lado.
 */
const medirMoldura = (alturaDisponivel: number) => {
  const altura = Math.min(IMAGE_MAX_HEIGHT, alturaDisponivel - TEXT_BLOCK_MIN_HEIGHT);
  return {
    altura: Math.round(altura),
    largura: Math.round(Math.min(IMAGE_MAX_WIDTH, altura * IMAGE_RATIO)),
  };
};

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
  // Medido em vez de calculado: o espaco que sobra depende das margens de
  // seguranca do telefone, e adivinha-las era a forma de partir isto num
  // modelo que nao tenho a mao.
  const [alturaDisponivel, setAlturaDisponivel] = useState<number | null>(null);
  const moldura = alturaDisponivel === null ? null : medirMoldura(alturaDisponivel);

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

      <View
        className="flex-1"
        onLayout={(e) => setAlturaDisponivel(e.nativeEvent.layout.height)}
      >
        {/* So depois de medir: desenhar antes daria um salto na primeira
            pagina, com a imagem a mudar de tamanho a vista. */}
        {moldura && (
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
                  height: moldura.altura,
                  width: moldura.largura,
                  alignSelf: 'center',
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
                  classes="text-center mt-10"
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
        )}
      </View>

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
