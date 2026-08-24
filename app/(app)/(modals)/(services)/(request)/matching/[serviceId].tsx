import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import { Colors } from '@/constants/Colors';
import BackHeader from '@/components/app/BackHeader';
import VendorCard from '@/components/app/Services/vendor-card-selector';
import CustomTouchableOpacity from '@/components/CustomTouchableOpacity';
import { useApi } from '@/contexts/ApiContext';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { useDialog } from '@/contexts/DialogContext';
import useMatchingCandidates, { MatchingCandidate } from '@/hooks/useMatchingCandidates';

/**
 * Escolha do profissional, com os candidatos a chegar ao vivo.
 *
 * O ecrã NÃO espera que a janela de resposta feche para mostrar alguma coisa.
 * Cada profissional aparece no momento em que aceita, e o cliente pode escolher
 * o primeiro que surge ou aguardar por mais. Uma espera em que se vê progresso
 * é outra coisa em relação a um ecrã parado — e num pedido urgente é a
 * diferença entre ficar e desistir.
 *
 * Se só dois se disponibilizarem, mostram-se dois. Se nenhum, diz-se para
 * tentar outra vez em vez de deixar o cliente a olhar para o vazio.
 */
const MatchingSelection = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const params = useLocalSearchParams();
  const serviceId = params.serviceId as string;

  const { service, candidates, expected, loading, failed, refresh } = useMatchingCandidates(serviceId);
  const [choosing, setChoosing] = useState<number | null>(null);

  const failedMatching = service?.status === 'MatchingFailed';
  const waitingForMore = candidates.length > 0 && candidates.length < expected && !failedMatching;

  const cheapest = useMemo(
    () => candidates.reduce<number | null>((min, c) => (min === null || c.amount < min ? c.amount : min), null),
    [candidates],
  );

  const onChoose = useCallback(async (candidate: MatchingCandidate) => {
    if (choosing) return;
    setChoosing(candidate.id);

    try {
      const { data } = await api.post(API_ROUTES.MATCHING_SELECT(serviceId, candidate.id));

      // Fluxo imediato: ninguém tinha sido chamado ainda. A escolha do cliente
      // é o que chama o profissional — e é a única chamada que se faz.
      if (data?.data?.awaiting_vendor) {
        router.replace(`/(app)/(modals)/(services)/(request)/wait-accept/${serviceId}`);
        return;
      }

      router.push(`/(app)/(modals)/(services)/(request)/checkout/${serviceId}`);
    } catch (error: any) {
      openDialog({
        title: t('matching.selection.unavailable_title'),
        subtitle: error?.response?.data?.message ?? t('matching.selection.unavailable_subtitle'),
      });
      refresh();
    } finally {
      setChoosing(null);
    }
  }, [api, choosing, openDialog, refresh, serviceId, t]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.secondary }}>
      <BackHeader
        backButtonColor="support_secondary"
        middleItem={() => (
          <CustomText color="support_secondary" boldness="medium" numberOfLines={1}>
            {t('matching.selection.title')}
          </CustomText>
        )}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {loading && candidates.length === 0 ? (
          <View className="items-center py-16">
            <ActivityIndicator color={Colors.support_primary} />
            <CustomText color="primary" classes="mt-4 text-center">
              {t('matching.selection.searching')}
            </CustomText>
          </View>
        ) : failedMatching || (failed && candidates.length === 0) ? (
          <View className="items-center py-16">
            <CustomText color="primary" boldness="bolder" size="large" classes="text-center">
              {t('matching.selection.none_title')}
            </CustomText>
            <CustomText color="primary" classes="mt-2 text-center opacity-70">
              {t('matching.selection.none_subtitle')}
            </CustomText>
            <View className="mt-6 w-full">
              <CustomTouchableOpacity
                size="large"
                type="primary"
                textColor="secondary"
                textBoldness="bold"
                text={t('matching.selection.try_again')}
                onPress={() => router.back()}
              />
            </View>
          </View>
        ) : (
          <>
            <CustomText color="primary" classes="mb-4 opacity-70">
              {candidates.length === 1
                ? t('matching.selection.subtitle_one')
                : t('matching.selection.subtitle_other', { count: candidates.length })}
            </CustomText>

            {candidates.map((candidate) => (
              <View key={candidate.id} className="mb-3">
                <VendorCard
                  imgSrc={candidate.vendor.avatar?.small ?? candidate.vendor.avatar?.src ?? null}
                  name={candidate.vendor.name ?? ''}
                  rating={candidate.rating}
                  ratingsCount={candidate.rating_count}
                  distance={candidate.distance}
                  price={candidate.amount}
                  badge={candidate.amount === cheapest ? 'cheapest' : null}
                  hero={candidate.rank === 1}
                  onPress={() => onChoose(candidate)}
                />
              </View>
            ))}

            {/* Mostrar que ainda pode chegar mais é o que transforma a espera
                em progresso. Sem isto, o cliente com uma só opção pensa que é
                tudo o que existe e sente-se encurralado. */}
            {waitingForMore && (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color={Colors.support_primary} />
                <CustomText color="primary" classes="ml-2 opacity-70">
                  {t('matching.selection.waiting_more')}
                </CustomText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MatchingSelection;
