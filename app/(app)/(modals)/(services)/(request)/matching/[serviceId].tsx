import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CustomText } from '@/components/CustomText';
import { Colors } from '@/constants/Colors';
import BackHeader from '@/components/app/BackHeader';
import VendorCard from '@/components/app/Services/vendor-card-selector';
import SearchingCountdown from '@/components/app/Services/SearchingCountdown';
import NoVendorOutcome from '@/components/app/Services/NoVendorOutcome';
import { useApi } from '@/contexts/ApiContext';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { useDialog } from '@/contexts/DialogContext';
import useMatchingCandidates, { MatchingCandidate } from '@/hooks/useMatchingCandidates';
import { useService } from '@/contexts/ServiceContext';

/**
 * Escolha do profissional, com os candidatos a chegar ao vivo.
 *
 * O ecrã NÃO espera que a janela de resposta feche para mostrar alguma coisa.
 * Cada profissional aparece no momento em que aceita, e o cliente pode escolher
 * o primeiro que surge ou aguardar por mais. Uma espera em que se vê progresso
 * é outra coisa em relação a um ecrã parado — e num pedido urgente é a
 * diferença entre ficar e desistir.
 *
 * Se só dois se disponibilizarem, mostram-se dois. Se nenhum, o ecrã dá as
 * duas saídas reais — repetir ou agendar — em vez de deixar o cliente a olhar
 * para o vazio.
 *
 * Veste-se como o resto do fluxo de pedido: cabeçalho âmbar e folha clara,
 * igual ao `select-vendor` e ao `wait-accept`. Esteve escuro enquanto era
 * inalcançável; assim que passou a ser visto por toda a gente, era o único
 * ecrã preto da app do cliente.
 *
 * Reutiliza o `SearchingCountdown` e o `NoVendorOutcome` do fluxo antigo, em
 * vez de ter os seus. São os mesmos dois momentos — à procura, e sem ninguém —
 * e duplicá-los era garantir que divergiam à primeira alteração.
 */
const MatchingSelection = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { setServiceToRequest, setScheduledService } = useService();
  const params = useLocalSearchParams();
  const serviceId = params.serviceId as string;

  const { service, candidates, expected, loading, failed, refresh } = useMatchingCandidates(serviceId);
  const [choosing, setChoosing] = useState<number | null>(null);

  const failedMatching = service?.status === 'MatchingFailed';
  const waitingForMore = candidates.length > 0 && candidates.length < expected && !failedMatching;

  // Zero respostas com o pedido ainda aberto NAO e a lista vazia — e a
  // espera. Sem isto o ecra dizia "0 profissionais disponibilizaram-se,
  // escolhe o que preferires", com nada para escolher. Apanhado a percorrer
  // o fluxo com um tecnico aprovado: o convite ja tinha saido, e o cliente
  // via uma lista de zero em vez de saber que estava a acontecer alguma
  // coisa.
  const stillWaiting = candidates.length === 0 && !failedMatching;

  const cheapest = useMemo(
    () => candidates.reduce<number | null>((min, c) => (min === null || c.amount < min ? c.amount : min), null),
    [candidates],
  );

  // "Melhor avaliação" só entre quem já foi avaliado, e só se houver mais do
  // que um técnico: sozinho, ser o melhor não diz nada. Em empate, a nota
  // com mais avaliações vale mais — 4,7 em 23 pesa mais do que 4,7 em 2.
  const bestRatedId = useMemo(() => {
    if (candidates.length < 2) return null;
    const rated = candidates.filter((c) => typeof c.rating === "number" && c.rating > 0);
    if (rated.length === 0) return null;
    return rated.reduce((best, c) =>
      c.rating! > best.rating! || (c.rating === best.rating && (c.rating_count ?? 0) > (best.rating_count ?? 0)) ? c : best,
    ).id;
  }, [candidates]);

  const onChoose = useCallback(async (candidate: MatchingCandidate) => {
    if (choosing) return;
    setChoosing(candidate.id);

    try {
      const { data } = await api.post(API_ROUTES.MATCHING_SELECT(serviceId, candidate.id));

      // Ramo mantido por compatibilidade: hoje o servidor devolve sempre falso,
      // porque o profissional já aceitou antes de ser escolhido. Fica para o
      // caso de voltar a existir um caminho em que a escolha é o que o chama.
      if (data?.data?.awaiting_vendor) {
        router.replace(`/(app)/(modals)/(services)/(request)/wait-accept/${serviceId}`);
        return;
      }

      // O checkout lê o técnico daqui para conseguir desenhar o ecrã (nome,
      // avaliação, distância). O VALOR não vem por aqui: vai no parâmetro
      // `amount`, congelado no momento da escolha — recalculá-lo no checkout
      // daria outro número, porque a comissão muda com a hora do dia.
      setServiceToRequest((prev: any) => ({
        ...(prev ?? {}),
        vendor: {
          id: candidate.vendor.id,
          name: candidate.vendor.name,
          rate: candidate.amount,
          distance: candidate.distance,
          rating: candidate.rating,
        },
      }));

      router.push({
        pathname: '/(app)/(modals)/(services)/(request)/checkout/[serviceId]',
        // `matching=1` é obrigatório e explícito: no fluxo antigo o [serviceId]
        // do checkout é o id do TIPO de serviço, aqui é o id do serviço real.
        // Não há forma de os distinguir pelo valor.
        params: { serviceId, matching: '1', amount: String(candidate.amount) },
      });
    } catch (error: any) {
      openDialog({
        title: t('matching.selection.unavailable_title'),
        subtitle: error?.response?.data?.message ?? t('matching.selection.unavailable_subtitle'),
      });
      refresh();
    } finally {
      setChoosing(null);
    }
  }, [api, choosing, openDialog, refresh, serviceId, setServiceToRequest, t]);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <BackHeader
        // O mesmo `p-5` de todos os outros ecrãs do pedido (select-vendor,
        // wait-accept, checkout). O BackHeader não traz espaçamento próprio:
        // sem isto a seta ficava colada à margem e o título encostado à ilha
        // dinâmica — era o único ecrã do fluxo sem respiro no topo.
        otherClasses="p-5"
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t('matching.selection.title')}
          </CustomText>
        )}
      />

      {/* Folha clara sobre o âmbar — a mesma moldura dos outros ecrãs do
          pedido, para o cliente não sentir que mudou de aplicação a meio. */}
      <View className="flex-1 rounded-t-3xl overflow-hidden" style={{ backgroundColor: '#FAF7F2' }}>
        {(loading || stillWaiting) && candidates.length === 0 && !failedMatching ? (
          <View className="flex-1 items-center justify-center px-8" style={{ paddingBottom: 32 }}>
            <SearchingCountdown size={190} />
            <CustomText color="secondary" boldness="bolder" size="extraLarge" classes="text-center mt-8">
              {t('matching.selection.searching')}
            </CustomText>
            <CustomText color="gray_medium" size="medium" classes="text-center mt-2">
              {/* No agendado ninguém tem de ficar a olhar: os profissionais têm
                  meia hora para responder e o cliente é avisado por notificação
                  quando o primeiro aceitar. Repetir aqui o texto do imediato
                  seria pedir-lhe uma espera que não tem de fazer. */}
              {service?.scheduled
                ? t('matching.selection.searching_hint_scheduled')
                : t('matching.selection.searching_hint')}
            </CustomText>
          </View>
        ) : failedMatching || (failed && candidates.length === 0) ? (
          <NoVendorOutcome
            title={t('matching.selection.none_title')}
            subtitle={t('matching.selection.none_subtitle')}
            retryLabel={t('matching.selection.try_again')}
            onRetry={() => router.back()}
            scheduleLabel={t('services.select_vendor.schedule_instead')}
            onSchedule={() => {
              // Agendar não é desistir: é o mesmo pedido noutra hora, e nas
              // horas marcadas há sempre mais gente livre. Sem esta saída, o
              // "tentar outra vez" repete a pergunta que acabou de falhar.
              setScheduledService(true);
              router.replace('/(app)/(modals)/(services)/(schedule)/schedule/schedule-service');
            }}
          />
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
            {/* Duas linhas com papéis diferentes: o facto (quantos responderam)
                a negrito e a instrução centrada por baixo. Numa frase só, a
                instrução ficava presa ao fim da linha anterior. */}
            <CustomText color="secondary" boldness="bold" size="medium" classes="text-center">
              {candidates.length === 1
                ? t('matching.selection.subtitle_one')
                : t('matching.selection.subtitle_other', { count: candidates.length })}
            </CustomText>
            <CustomText color="gray_medium" boldness="medium" size="small" classes="text-center mt-1">
              {candidates.length === 1
                ? t('matching.selection.hint_one')
                : t('matching.selection.hint_other')}
            </CustomText>

            {/* Quantos já responderam, dos que se esperam. Uma barra que anda é
                o que distingue "está a acontecer" de "isto encravou" — e o
                cliente com uma só opção deixa de pensar que é tudo o que há. */}
            {waitingForMore && (
              <View className="mt-4">
                <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(27,27,27,0.08)' }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (candidates.length / Math.max(expected, 1)) * 100)}%`,
                      backgroundColor: Colors.primary,
                    }}
                  />
                </View>
                <View className="flex-row items-center mt-2">
                  <ActivityIndicator size="small" color={Colors.gray_medium} />
                  <CustomText color="gray_medium" size="small" classes="ml-2">
                    {t('matching.selection.waiting_more')}
                  </CustomText>
                </View>
              </View>
            )}

            <View className="mt-4">
              {candidates.map((candidate) => (
                <View key={candidate.id} className="mb-3">
                  <VendorCard
                    imgSrc={candidate.vendor.avatar?.small ?? candidate.vendor.avatar?.src ?? null}
                    name={candidate.vendor.name ?? ''}
                    rating={candidate.rating}
                    ratingsCount={candidate.rating_count}
                    distance={candidate.distance}
                    price={candidate.amount}
                    // Um selo por cartão: a avaliação ganha ao preço, porque é
                    // o que o cliente tem para julgar quem lhe entra em casa.
                    badge={
                      candidate.id === bestRatedId
                        ? 'best_rated'
                        : candidate.amount === cheapest
                        ? 'cheapest'
                        : null
                    }
                    hero={candidate.rank === 1}
                    onPress={() => onChoose(candidate)}
                  />
                </View>
              ))}
            </View>

            {/* Escolher não cobra: dizê-lo aqui evita a hesitação de quem pensa
                que tocar no cartão é pagar. */}
            <CustomText color="gray_medium" size="small" classes="text-center mt-2">
              {t('matching.selection.choose_hint')}
            </CustomText>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default MatchingSelection;
