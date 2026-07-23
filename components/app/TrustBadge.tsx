import React from 'react';
import { Text, View } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';

/**
 * Barra de confiança da Home (largura total, fixa por cima da barra de tabs):
 * nota média · serviços executados.
 *
 * Uma única linha: o Text pai usa adjustsFontSizeToFit, por isso em ecrãs
 * estreitos o conjunto encolhe uniformemente em vez de quebrar ou cortar.
 * (Os ícones de @expo/vector-icons são subclasses de Text, podem viver aninhados.)
 */
const TrustBadge = () => {
  const { t } = useTranslation();

  const sep = (
    <Text style={{ color: 'rgba(27,27,27,0.3)' }}>{'   |   '}</Text>
  );

  return (
    <View
      className="w-full px-4 py-3"
      style={{ backgroundColor: 'rgba(250,187,91,0.16)' }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 14.5,
          color: Colors.secondary,
          textAlign: 'center',
        }}
      >
        <AntDesign name="star" size={14} color={Colors.primary} />
        <Text> 4.8</Text>
        {sep}
        <Ionicons name="flash" size={14} color={Colors.primary} />
        <Text> {t('general.trust_services_done')}</Text>
      </Text>
    </View>
  );
};

export default TrustBadge;
