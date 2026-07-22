import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import { Colors } from '@/constants/Colors';

/**
 * Pílula de confiança da Home: três provas separadas por divisórias finas
 * (técnicos verificados · nota média · serviços executados).
 * Fica fixa por cima da barra de tabs; em ecrãs estreitos as provas
 * quebram de linha em vez de cortar o texto.
 */
const Divider = () => (
  <View
    className="w-[1px] h-3 mx-2.5"
    style={{ backgroundColor: 'rgba(27,27,27,0.18)' }}
  />
);

const TrustBadge = () => {
  const { t } = useTranslation();

  return (
    <View className="items-center">
      <View
        className="flex-row flex-wrap items-center justify-center rounded-full px-4 py-2"
        style={{ backgroundColor: 'rgba(250,187,91,0.16)' }}
      >
        <View className="flex-row items-center">
          <Feather name="shield" size={13} color={Colors.success} />
          <CustomText
            size="extraSmall"
            boldness="semiBold"
            color="secondary"
            classes="ml-1"
          >
            {t('general.trust_verified_technicians')}
          </CustomText>
        </View>

        <Divider />

        <View className="flex-row items-center">
          <Feather name="star" size={13} color={Colors.primary} />
          <CustomText
            size="extraSmall"
            boldness="semiBold"
            color="secondary"
            classes="ml-1"
          >
            4.8
          </CustomText>
        </View>

        <Divider />

        <CustomText size="extraSmall" boldness="semiBold" color="secondary">
          {t('general.trust_services_done')}
        </CustomText>
      </View>
    </View>
  );
};

export default TrustBadge;
