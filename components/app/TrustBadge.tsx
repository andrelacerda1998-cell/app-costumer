import React from 'react';
import { Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';

/**
 * Linha de confiança da Home: nota média · serviços executados.
 *
 * Pastilha escura e estreita, centrada: tem presença sem ser um botão nem uma
 * barra de largura total. Ajusta-se ao conteúdo, por isso nunca se lê como algo
 * a tocar. Laranja só na estrela.
 *

 * O Text pai usa adjustsFontSizeToFit, por isso em ecrãs
 * estreitos o conjunto encolhe uniformemente em vez de quebrar ou cortar.
 * (Os ícones de @expo/vector-icons são subclasses de Text, podem viver aninhados.)
 */
const TrustBadge = () => {
  const { t } = useTranslation();

  const sep = <Text style={{ color: '#6B655C' }}>{'  ·  '}</Text>;

  return (
    <View
      accessibilityRole="text"
      className="flex-row items-center justify-center self-center"
      style={{
        backgroundColor: Colors.surface_dark,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
      }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          fontFamily: 'Poppins_400Regular',
          fontSize: 12.5,
          color: '#C9C4BC',
          textAlign: 'center',
        }}
      >
        <AntDesign name="star" size={12} color={Colors.primary_strong} />
        <Text style={{ fontFamily: 'Poppins_600SemiBold', color: Colors.support_secondary }}> 4,8</Text>
        <Text> {t('general.trust_rating_label')}</Text>
        {sep}
        <Text style={{ fontFamily: 'Poppins_600SemiBold', color: Colors.support_secondary }}>{t('general.trust_services_done')}</Text>
      </Text>
    </View>
  );
};

export default TrustBadge;
