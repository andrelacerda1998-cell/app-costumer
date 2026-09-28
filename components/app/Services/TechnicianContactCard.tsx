import React from 'react';
import { Image, Linking, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CustomText } from '@/components/CustomText';
import { Colors } from '@/constants/Colors';
import { useService } from '@/contexts/ServiceContext';
import { technicianPhoneNumber } from '@/utils/serviceContact';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Quem é o técnico e como se fala com ele.
 *
 * Identidade em cima, ações em baixo. Na mesma linha, o "Técnico Verificado"
 * ficava colado ao botão de chamada.
 *
 * Aparece na vista geral do serviço e no acompanhamento: em ambos é a
 * resposta à mesma pergunta, e ter de mudar de ecrã para mandar uma mensagem
 * ao técnico que já está a caminho era um passo a mais no pior momento
 * possível.
 */
const TechnicianContactCard = () => {
  const { t } = useTranslation();
  const { openService } = useService();

  const vendorName = openService?.vendor?.user?.name ?? '';
  const technicianPhone = technicianPhoneNumber(openService?.vendor?.user);

  if (!vendorName) return null;

  const callTechnician = () => {
    if (!technicianPhone) return;
    Linking.openURL(`tel:${technicianPhone}`).catch(() => {});
  };

  return (
    <View className="bg-support_secondary rounded-2xl p-4 mb-4" style={CARD_SHADOW}>
      <View className="flex-row items-center">
        <View className="h-12 w-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
          {openService?.vendor?.user?.avatar?.small ? (
            <Image source={{ uri: openService.vendor.user.avatar.small }} className="w-full h-full" />
          ) : (
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: 'rgba(250,187,91,0.25)' }}
            >
              <Feather name="user" size={22} color={Colors.secondary} />
            </View>
          )}
        </View>
        <View className="flex-1">
          <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1}>
            {vendorName}
          </CustomText>
          {/* O selo era texto fixo: aparecia sempre, sem consultar campo
              nenhum — e não podia consultar, porque o payload não trazia
              nenhum. Passa a vir do `is_verified`, que é o mesmo
              `can_accept_service` que decide quem é convidado. Se um dia
              deixar de ser verdade, o selo desaparece em vez de mentir. */}
          {openService?.vendor?.is_verified && (
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="shield-checkmark" size={13} color={Colors.success} />
              <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1" numberOfLines={1}>
                {t('services.select_vendor.verified_badge')}
              </CustomText>
            </View>
          )}
        </View>
      </View>

      <View className="flex-row mt-4">
        {!!technicianPhone && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={callTechnician}
            className="flex-1 rounded-full items-center justify-center flex-row mr-2"
            style={{ paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.secondary }}
          >
            <Ionicons name="call" size={17} color={Colors.secondary} />
            <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2" numberOfLines={1}>
              {t('services.service_overview.call')}
            </CustomText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/(app)/(pages)/(services)/(open)/(chat)/service/${openService?.id}`)}
          className={`flex-1 rounded-full items-center justify-center flex-row ${technicianPhone ? 'ml-2' : ''}`}
          style={{ paddingVertical: 12, backgroundColor: Colors.secondary }}
        >
          <Ionicons name="chatbubble-ellipses" size={17} color={Colors.primary} />
          <CustomText color="primary" size="medium" boldness="bold" classes="ml-2" numberOfLines={1}>
            {t('services.service_overview.chat_action')}
          </CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TechnicianContactCard;
