import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';

/**
 * Pílula de confiança da Home (fixa por cima da barra de tabs):
 * técnicos verificados · nota média · serviços executados.
 *
 * Uma única linha: o Text pai usa adjustsFontSizeToFit, por isso em ecrãs
 * estreitos o conjunto encolhe uniformemente em vez de quebrar ou cortar.
 * (Os ícones Feather são subclasses de Text, podem viver aninhados.)
 */
const TrustBadge = () => {
  const { t } = useTranslation();

  const sep = (
    <Text style={{ color: 'rgba(27,27,27,0.3)' }}>{'   |   '}</Text>
  );

  return (
    <View className="items-center">
      <View
        className="rounded-full px-4 py-2 max-w-full"
        style={{ backgroundColor: 'rgba(250,187,91,0.16)' }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 12.5,
            color: Colors.secondary,
            textAlign: 'center',
          }}
        >
          <Feather name="shield" size={12} color={Colors.success} />
          <Text> {t('general.trust_verified_technicians')}</Text>
          {sep}
          <Feather name="star" size={12} color={Colors.primary} />
          <Text> 4.8</Text>
          {sep}
          <Text>{t('general.trust_services_done')}</Text>
        </Text>
      </View>
    </View>
  );
};

export default TrustBadge;
