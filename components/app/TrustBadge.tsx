import React from 'react';
import { Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';

/**
 * Linha de confiança da Home: nota média · serviços executados.
 *
 * Era um cartão de largura total — primeiro creme, depois preto — e pesava como
 * um botão. É informação de fundo, não uma ação: passa a uma linha de texto
 * sobre o fundo do ecrã, com o âmbar só na estrela.
 *

 * O Text pai usa adjustsFontSizeToFit, por isso em ecrãs
 * estreitos o conjunto encolhe uniformemente em vez de quebrar ou cortar.
 * (Os ícones de @expo/vector-icons são subclasses de Text, podem viver aninhados.)
 */
const TrustBadge = () => {
  const { t } = useTranslation();

  const sep = <Text style={{ color: Colors.gray_light }}>{'  ·  '}</Text>;

  return (
    <View className="w-full flex-row items-center justify-center py-1">
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          fontFamily: 'Poppins_400Regular',
          fontSize: 12.5,
          color: Colors.gray_strong,
          textAlign: 'center',
        }}
      >
        <AntDesign name="star" size={12} color={Colors.primary} />
        <Text style={{ fontFamily: 'Poppins_600SemiBold', color: Colors.secondary }}> 4,8</Text>
        <Text> {t('general.trust_rating_label')}</Text>
        {sep}
        <Text style={{ fontFamily: 'Poppins_600SemiBold', color: Colors.secondary }}>{t('general.trust_services_done')}</Text>
      </Text>
    </View>
  );
};

export default TrustBadge;
