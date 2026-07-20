import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import { Colors } from '@/constants/Colors';

/**
 * Pílula de confiança da Home: três provas separadas por divisórias finas
 * (técnicos verificados · nota média · serviços executados).
 */
const Divider = () => (
  <View
    className="w-[1px] h-3 mx-3"
    style={{ backgroundColor: 'rgba(27,27,27,0.18)' }}
  />
);

const TrustBadge = () => {
  const { t } = useTranslation();

  return (
    <View className="items-center">
      <View
        className="flex-row items-center rounded-full px-4 py-2"
        style={{ backgroundColor: 'rgba(250,187,91,0.14)' }}
      >
        <View className="flex-row items-center">
          <Feather name="shield" size={14} color={Colors.success} />
          <CustomText
            size="small"
            boldness="semiBold"
            color="secondary"
            classes="ml-1.5"
          >
            {t('general.trust_verified_technicians')}
          </CustomText>
        </View>

        <Divider />

        <View className="flex-row items-center">
          <Feather name="star" size={14} color={Colors.primary} />
          <CustomText
            size="small"
            boldness="semiBold"
            color="secondary"
            classes="ml-1"
          >
            4.8
          </CustomText>
        </View>

        <Divider />

        <CustomText size="small" boldness="semiBold" color="secondary">
          {t('general.trust_services_done')}
        </CustomText>
      </View>
    </View>
  );
};

export default TrustBadge;
