import { Colors } from '@/constants/Colors'
import { AntDesign, Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Alert, FlatList, Image, ImageSourcePropType, Pressable, ScrollView, TouchableOpacity, View,Text } from 'react-native'
import TechnicianTrustFooter from "@/components/app/Services/technician-trust-footer";
import SearchingPulse from "@/components/app/Services/SearchingPulse";
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import { useSession } from '@/contexts/SessionContext'
import { useGuestSession } from '@/contexts/GuestSessionContext'
import { useAddressLabel } from '@/hooks/useAddressLabel'
import { rankFavoritesFirst, useFavoriteVendors } from '@/hooks/useFavoriteVendors'
import { resolveVendorBadges } from '@/utils/vendorBadges'
import VendorCard from '@/components/app/Services/vendor-card-selector'
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { CustomText } from "@/components/CustomText"
import { useService } from "@/contexts/ServiceContext"
import { useSchedule } from "@/contexts/ScheduleContext"
import { useTranslation } from "react-i18next"
import XIcon from "@/assets/icons/x";
import { useDialog } from "@/contexts/DialogContext";
import { useMixpanel } from '@/contexts/MixpanelContext';

interface VendorsInterface {
  distance: number,
  id: number,
  name: string,
  rate: number,
  // O backend passou a devolver a nota real (null enquanto não houver
  // avaliações) em vez de assumir 5, e a acompanhar com a contagem.
  rating: number | null,
  ratings_count?: number,
  avatar: {
    small: string,
    src: string,
  },
}

const SelectVendor = () => {
  const { t } = useTranslation();
  const { track } = useMixpanel();
  const { api } = useApi();
  const { userData, session } = useSession();
  const { guestSession, setSelectedVendor: setGuestSessionSelectedVendor } = useGuestSession();
  const addressLabel = useAddressLabel();
  const { openDialog } = useDialog();
  const params = useLocalSearchParams();
  const serviceId = params.serviceId;

  const { serviceToRequest, setServiceToRequest, operationAreas, setScheduledService, scheduledService, setSelectedProfessional, serviceQuantity} = useService();
  const { dataToMakeSchedule, setDataToMakeSchedule } = useSchedule();
  // Lista completa como veio do backend. A lista mostrada é derivada daqui em
  // useMemo — os favoritos carregam de forma assíncrona e, se ordenássemos dentro
  // do .then() do fetch, quem chegasse primeiro ganhava a corrida.
  const [allVendors, setAllVendors] = useState<VendorsInterface[]>([]);
  const { isFavorite, toggleFavorite } = useFavoriteVendors();

  /**
   * Favoritos primeiro, mantendo a ordem do backend dentro de cada grupo.
   * ATENÇÃO: hoje isto só reordena os 3 que o backend já escolheu. O servidor
   * faz `take(3)` antes de responder (RequestServiceController), por isso um
   * favorito em 4.º ou 5.º lugar nunca chega cá — o coração só produz efeito
   * quando o favorito calha, por acaso, nos 3 devolvidos. Para funcionar a
   * sério o backend teria de devolver mais e a app promover o favorito para
   * dentro dos 3; decisão adiada, o ecrã mantém-se com 3 opções.
   */
  const vendors = React.useMemo(
    () => rankFavoritesFirst(allVendors, isFavorite).slice(0, 3),
    [allVendors, isFavorite],
  );

  // O selo segue a resposta do backend e não o topo depois de reordenar: o
  // primeiro que o servidor devolve é o mais próximo (VendorSearchService ordena
  // por _geoPoint asc e só depois por nota), e continua a sê-lo mesmo que um
  // favorito do cliente lhe passe à frente na lista.
  const { badges, heroId } = React.useMemo(() => resolveVendorBadges(allVendors), [allVendors]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [openServiceError, setOpenServiceError] = useState<string | null>(null);
  // Espera pelos técnicos: em vez de desistir à primeira pesquisa vazia, o ecrã
  // continua à procura durante uns segundos — os técnicos precisam de tempo para
  // dizer que estão disponíveis. Só depois de N tentativas mostra "sem técnicos".
  const [waitingForTechnicians, setWaitingForTechnicians] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_WAIT_ATTEMPTS = 4;
  const WAIT_DELAY_MS = 3000;

  // Limpa o temporizador de re-tentativa se o ecrã sair a meio da espera.
  useEffect(() => () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); }, []);

  const convertDataIntoArray = (vendorsObj: Record<string, VendorsInterface>): VendorsInterface[] => {
    return Object.entries(vendorsObj)
      .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
      .map(([_, value]) => value);
  };

  const getVendorsOfService = async (attempt = 0) => {
    if (serviceToRequest?.service_type?.id === null || !serviceToRequest?.service_type?.id) {
      setServiceToRequest(prev => ({
        ...prev,
        service_type: {
          id: Number(serviceId),
        }
      }))
    }
    if (openServiceError) {
      setOpenServiceError(null);
    }
    setLoadingVendors(true);

    const endpoint = session ? API_ROUTES.CUSTOMER_REQUEST_SERVICE : API_ROUTES.GUEST_SEARCH_VENDORS;
    const payload = session
      ? { service_type: serviceToRequest?.service_type?.id || serviceId, quantity: serviceQuantity }
      : {
          service_type_id: serviceToRequest?.service_type?.id || serviceId,
          quantity: serviceQuantity,
          latitude: guestSession?.guest_address?.latitude,
          longitude: guestSession?.guest_address?.longitude,
        };

    // Ainda sem técnicos: continuar à espera (re-tentar) até MAX_WAIT_ATTEMPTS,
    // mantendo os esqueletos + a legenda "à procura de técnicos". Só depois disso
    // é que se mostra o vazio. Vale para vazio (200 sem técnicos) e para erro
    // transitório — do ponto de vista do cliente é o mesmo "ainda a chegar".
    const keepWaitingOrGiveUp = (message?: string) => {
      if (attempt + 1 < MAX_WAIT_ATTEMPTS) {
        setWaitingForTechnicians(true);
        setLoadingVendors(true);
        retryTimerRef.current = setTimeout(() => getVendorsOfService(attempt + 1), WAIT_DELAY_MS);
        return;
      }
      setWaitingForTechnicians(false);
      setLoadingVendors(false);
      setOpenServiceError(message || t('services.select_vendor.no_vendors_found'));
    };

    api.post(endpoint, payload)
      .then(response => {
        const { vendors } = response?.data?.data || {};
        const _vendors = convertDataIntoArray(vendors) || [];

        if(_vendors?.length === 0){
           return keepWaitingOrGiveUp();
        }

        setWaitingForTechnicians(false);
        setLoadingVendors(false);
        setAllVendors(_vendors);
        track('technician_list_viewed', {
          service_name: serviceToRequest?.service_type?.name,
          technicians_count: Math.min(_vendors.length, 3)
        });
      })
      .catch(error => {
        keepWaitingOrGiveUp(error.response?.data?.message);
      });
  }

  const openService = (item: any) => {
    if (item === null) return;
    if (openServiceError) {
      setOpenServiceError(null);
    }

    track("vendor_selected", {
      vendor_id: item.id,
      vendor_name: item.name,
      vendor_rating: item.rating,
      service_name: serviceToRequest?.service_type?.name,
    });

    setSelectedProfessional(item);

    setServiceToRequest(prev => ({
      ...prev,
      vendor: item
    }))

    if (scheduledService) {
      setGuestSessionSelectedVendor(item.id, item);
      router.navigate(
        `/(app)/(modals)/(services)/(schedule)/schedule/schedule-service`
      );
    } else {
      setGuestSessionSelectedVendor(item.id, item);
      router.navigate(
        `/(app)/(modals)/(services)/(request)/checkout/${serviceToRequest?.service_type?.id}`
      );
    }
  };

  const selectVendorAndProceed = (item: any) => {
    const positionInList = vendors.findIndex(v => v.id === item.id) + 1;
    track('technician_selected', {
      technician_id: item.id,
      price: item.rate,
      rating: item.rating,
      position_in_list: positionInList
    });
    openService(item);
  };

  useEffect(() => {
    if (!session && (!guestSession?.guest_address?.latitude || !guestSession?.guest_address?.longitude)) {
      router.replace(`/(app)/(modals)/(services)/(request)/address/guest`);
      return;
    }
    if (dataToMakeSchedule) {
      setScheduledService(true);
    } else {
      setScheduledService(false);
    }
    getVendorsOfService();
  }, [dataToMakeSchedule]);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {addressLabel}
            </CustomText>
        )}
        rigthItem={() => (
          <TouchableOpacity
            className="flex items-end"
            onPress={() => {
              router.push('/(app)/(bottom-sheets)/(services)/service-details');
            }}
          >
            <Feather name="help-circle" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        )}
        otherClasses="p-5"
      />

      <View className="p-5 flex-1 rounded-t-3xl space-y-4" style={{ backgroundColor: "#FAF7F2" }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
        {/* "Escolhe" e não "Selecione": o resto da app trata por tu ("Do que
            precisas?"), este ecrã era o único a tratar por você. */}
        <View className="mt-4 pl-4 pr-4">
          <CustomText color="secondary" boldness="bold" size="extraLarge" classes="text-center">
            {t('services.select_vendor.title_choose')}
          </CustomText>
          <CustomText color="gray_medium" boldness="regular" size="small" classes="text-center mt-1">
            {t('services.select_vendor.subtitle_all_verified')}
          </CustomText>
        </View>

        {loadingVendors ? (
          /* Espera com DESTAQUE: um pulso de radar (anéis âmbar a expandir) em vez
             de um spinner pequeno. Comunica "à procura à tua volta" e prende a
             atenção enquanto os técnicos respondem. */
          <View className="items-center justify-center" style={{ paddingTop: 64, paddingBottom: 32 }}>
            <SearchingPulse size={160} />
            <CustomText color="secondary" boldness="bolder" size="extraLarge" classes="text-center mt-9">
              {t('services.select_vendor.searching_technicians')}
            </CustomText>
            <CustomText color="gray_medium" boldness="regular" size="medium" classes="text-center mt-2 px-6">
              {t('services.select_vendor.searching_technicians_hint')}
            </CustomText>
          </View>
        ) : (
          vendors.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <View
                className="items-center justify-center rounded-full mb-5"
                style={{ width: 110, height: 110, backgroundColor: "rgba(250,187,91,0.15)" }}
              >
                <Feather name="users" size={44} color={Colors.primary} />
              </View>
              <CustomText color="secondary" boldness="bold" size="large" classes="text-center mb-2">
                {t('services.select_vendor.no_vendors_found')}
              </CustomText>
              <CustomText color="gray_medium" boldness="regular" size="small" classes="text-center mb-6">
                {t('services.select_vendor.no_vendors_subtitle')}
              </CustomText>
              <TouchableOpacity
                onPress={() => getVendorsOfService()}
                className="rounded-full flex-row items-center px-6 py-3.5"
                style={{
                  backgroundColor: Colors.primary,
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 6,
                }}
              >
                <Feather name="refresh-cw" size={16} color={Colors.secondary} />
                <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1} classes="ml-2">
                  {t('services.select_vendor.retry')}
                </CustomText>
              </TouchableOpacity>
            </View>
          ) : (
            /* Cartões com a altura do seu conteúdo. Antes eram flex-1 e
               esticavam para encher o ecrã: com um só técnico ficava um cartão
               gigante meio vazio, com três ficavam apertados. */
            <View style={{ gap: 12 }}>
              {vendors.map((item) => (
                <VendorCard
                  quantity={serviceQuantity}
                  key={item?.id?.toString()}
                  badge={badges[Number(item?.id)] ?? null}
                  hero={!!heroId && Number(item?.id) === heroId}
                  favorite={isFavorite(item?.id)}
                  onToggleFavorite={() => toggleFavorite(item?.id)}
                  imgSrc={item?.avatar?.small ? item?.avatar?.small : null}
                  name={item.name}
                  rating={item.rating ?? null}
                  ratingsCount={item.ratings_count ?? null}
                  distance={item.distance ?? null}
                  price={item.rate}
                  onPress={() => {
                    selectVendorAndProceed(item);
                  }}
                />
              ))}
            </View>
          )
        )}

        </ScrollView>

        {/* Banner fixo, fora do scroll. Com mt-auto só encostava quando sobrava
            espaço — e como nenhum destes ecrãs tinha ScrollView, num telemóvel
            mais pequeno os cartões cortavam e a garantia saía de vista
            exatamente no momento em que o cliente decide. */}
        <View className="pt-3">
          <TechnicianTrustFooter compact />
        </View>
      </View>
    </SafeAreaView>
  )
}

export default SelectVendor;
