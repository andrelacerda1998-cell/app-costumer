import ServiceMainCard from '@/components/app/ServiceMainCard';
import UserHeader from '@/components/app/UserHeader';
import TrustBadge from '@/components/app/TrustBadge';
import PiquetLogo from '@/components/PiquetLogo';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Alert, ScrollView, Animated, Modal, FlatList, Text, TouchableOpacity, NativeModules, Platform, Button, TextInput, Linking, AppState , Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomText } from "@/components/CustomText";
import { useAddressLabel } from '@/hooks/useAddressLabel';
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { useService } from "@/contexts/ServiceContext";
import { OperationAreaInterface } from "@/types/services";
import OpenService from "@/components/services/OpenService";
import ServiceWaitingAcceptance from "@/components/services/ServiceWaitingAcceptance";
import { useTranslation } from "react-i18next";
import { useSession } from "@/contexts/SessionContext";
import PhoneNeedsToVerify from "@/components/warnings/PhoneNeedsToVerify";
import EmailNeedsToVerify from "@/components/warnings/EmailNeedsToVerify";
import BlockedByZone from "@/components/warnings/BlockedByZone";
import CompleteYourProfile from "@/components/warnings/CompleteYourProfile";
import GeolocationPermissionBanner from "@/components/warnings/GeolocationPermissionBanner";
import { styles } from './_styles';
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import CategoryGrid from "@/components/app/Services/CategoryGrid";
import PopularServices from "@/components/app/Services/PopularServices";
import AutocompleteInput from "@/components/Autocomplete";
import { ServiceTypeInterface } from "@/types/services";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useDialog } from "@/contexts/DialogContext";
import { orderByAlphaOrder } from "@/utils";
import XIcon from "@/assets/icons/x";
import LocationIcon from "@/assets/icons/location";
import Schedules from './schedules';
import { useMixpanel } from "@/contexts/MixpanelContext";
import ConsentBannerWrapper from "@/components/ConsentBannerWrapper";
import { useGeolocationPermissionStatus } from "@/hooks/useGeolocationPermissionStatus";
import { useLocationFill } from "@/hooks/useLocationFill";
import { Image as ExpoImage } from "expo-image";
import { proxiedImage } from "@/utils/imageProxy";

const Home = () => {
  const { t } = useTranslation();
  const { track, hasConsent, isInitialized } = useMixpanel();
  const appOpenedTracked = useRef(false);
  const { userData, isLoadingUserData, session } = useSession();
  const { hasPermission, requestPermission, refetchStatus } = useGeolocationPermissionStatus();
  const { locationLoading, requestLocation } = useLocationFill();
  const addressLabel = useAddressLabel();
  // const [scrollY, setScrollY] = useState(new Animated.Value(0));
  const { operationAreas, getOperationAreas, setOperationAreas, openService, servicePendingAcceptance, setServiceToRequest, setScheduledServices, getScheduledServices, scheduledServices, setPendingSearchTerm } = useService();
  const [loadingOperationAreas, setLoadingOperationAreas] = useState(false);
  const [popularServices, setPopularServices] = useState<ServiceTypeInterface[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  // Aquece a cache das fotos das categorias assim que carregam — nas visitas
  // seguintes aparecem instantâneas em vez de descarregar a cada render.
  useEffect(() => {
    if (Array.isArray(operationAreas)) {
      operationAreas.forEach((a: any) => {
        if (a?.image && typeof a.image === "string") {
          ExpoImage.prefetch(proxiedImage(a.image, 400)!, { cachePolicy: "memory-disk" }).catch(() => {});
        }
      });
    }
  }, [operationAreas]);

  const [searchedServiceTypes, setSearchedServiceTypes] = useState<ServiceTypeInterface[] | null>(null);
  const [loadingSearchedServiceTypes, setLoadingSearchedServiceTypes] = useState(false);
  const [selectedOperationAreas, setSelectedOperationAreas] = useState<OperationAreaInterface['id'][]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { api } = useApi();
  const { openDialog } = useDialog();
  const hasAssociatedEmail = !!userData?.email?.trim?.();
  const needsPersonalInformation =
    !userData?.name?.trim?.() ||
    userData?.gender_id === null ||
    !userData?.date_birthday;
  const needsAddress = !userData?.address;
  const needsPhoneVerification = userData?.phone_number_verified_at === null;
  const needsEmailVerification = hasAssociatedEmail && userData?.email_verified_at === null;
  const hasBlockedAddress = !userData?.allowed_by_zone && !!userData?.address;
  const shouldShowCompleteProfile = needsPersonalInformation || needsAddress || needsPhoneVerification || needsEmailVerification;

  // const openUrgentServiceModal = () => {
  //   router.navigate('/(app)/(urgent-service)/start');
  // };

  // const openRateServiceModal = () => {
  //   router.navigate('/(app)/(services)/rate/1');
  // }

  // const handleScroll = Animated.event(
  //   [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  //   { useNativeDriver: false }
  // );

  // // when the user scrolls up the view will have height of 150
  // const onScroll = Animated.event(
  //   [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  //   { useNativeDriver: false }
  // );

  /**
   * Destaques da Home.
   *
   * Tenta primeiro o endpoint de destaques, onde a lista e a ordem são
   * definidas no backoffice. Esse endpoint ainda não está em produção, e por
   * isso há um recurso: os primeiros serviços das duas primeiras categorias.
   * São serviços reais, mas a ordem não é de procura — assim que o endpoint
   * chegar a produção, passa a mandar ele, sem mais alterações aqui.
   */
  useEffect(() => {
    if (!Array.isArray(operationAreas) || operationAreas.length === 0) return;
    if (popularServices.length > 0) return;

    let cancelled = false;
    setLoadingPopular(true);

    const POPULAR_LIMIT = 12;

    /**
     * Recurso enquanto o endpoint de destaques não está em produção.
     *
     * Vai a TODAS as categorias e intercala os resultados — um serviço de cada,
     * à vez — em vez de encher a secção com as primeiras. Assim a grelha mostra
     * a variedade do catálogo, e não só canalização.
     */
    const fromAreas = () =>
      Promise.all(
        operationAreas.map((area: OperationAreaInterface) =>
          api.get(API_ROUTES.GET_SERVICES_BY_OPERATION_AREA(String(area.id)))
            .then(({ data }) => data?.data?.services ?? [])
            .catch(() => []),
        ),
      ).then((lists: ServiceTypeInterface[][]) => {
        const picked: ServiceTypeInterface[] = [];
        const depth = Math.max(0, ...lists.map((l) => l?.length ?? 0));

        for (let round = 0; round < depth && picked.length < POPULAR_LIMIT; round++) {
          for (const list of lists) {
            if (picked.length >= POPULAR_LIMIT) break;
            const item = list?.[round];
            if (item) picked.push(item);
          }
        }

        return picked;
      });

    api.get(API_ROUTES.POPULAR_SERVICE_TYPES)
      .then(({ data }) => {
        const list = data?.data?.services ?? [];
        return list.length > 0 ? list.slice(0, 12) : fromAreas();
      })
      .catch(fromAreas)
      .then((list: ServiceTypeInterface[]) => {
        if (!cancelled) setPopularServices(list ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoadingPopular(false);
      });

    return () => { cancelled = true; };
  }, [operationAreas]);

  const handleOpenService = (operationArea: OperationAreaInterface) => {
    track('category_viewed', { category_name: operationArea.name, category_id: operationArea.id });
    const { id } = operationArea;

    router.navigate(`/(app)/(modals)/(services)/(request)/select-service-type/${id}`);
  };

  const handleRequestGeolocationPermission = async () => {
    track('geolocation_permission_requested');
    const { granted, canAskAgain } = await requestPermission();
    if (granted) {
      refetchStatus();
      track('geolocation_permission_granted');
      requestLocation(() => {
        track('geolocation_filled');
      });
      return;
    }
    if (!canAskAgain) {
      // O sistema já não mostra o pedido nativo: explicar e encaminhar o utilizador para as definições da app.
      openDialog({
        icon: <LocationIcon color={Colors.secondary} />,
        title: t('geolocation.settings_dialog_title'),
        subtitle: t('geolocation.settings_dialog_subtitle'),
        cancelButtonText: t('geolocation.settings_dialog_cancel'),
        successButtonText: t('geolocation.settings_dialog_confirm'),
        onSuccess: () => {
          track('geolocation_permission_settings_opened');
          Linking.openSettings();
        },
      });
    }
  };

  const isObj = (item: any) => {
    if (typeof item === "object" && !Array.isArray(item) && item !== null) {
      return true;
    } else return false;
  };


  const retrieveSuitableList = (list: any) => {
    let validList: any;

    validList = Array.isArray(list) && list.filter((el: any) => isObj(el) && el.hasOwnProperty('name') && typeof el.name === 'string') || [];

    // return Array.isArray(validList) && validList.length > 0 && validList.map((item: any) => isObj(item) && item.hasOwnProperty('name') && typeof item.name === 'string' && item?.name) || []

    //ALTERNATIVE, TO ALSO RETRIEVE THE ID, WHICH WILL BE NEEDED TO SEARCH FOR THE SERVICE:
     return Array.isArray(validList) && validList.length > 0 && validList.map((item: any) => isObj(item) && item.hasOwnProperty('name') && typeof item.name === 'string' && item) || []

  }

  useEffect(() => {
    if (!isInitialized || !hasConsent || appOpenedTracked.current) return;
    appOpenedTracked.current = true;
    Linking.getInitialURL().then((url) => {
      let source = 'organic';
      if (url) {
        const match = url.match(/[?&]source=([^&]+)/);
        if (match) source = decodeURIComponent(match[1]);
      }
      track('app_opened', { source });
    });
  }, [isInitialized, hasConsent]);

  useFocusEffect(
    useCallback(() => {
      setLoadingOperationAreas(true);
      getOperationAreas().then((res) => {
        setLoadingOperationAreas(false);
        setOperationAreas(res);
      });

      getScheduledServices().then((response)=>{
        setScheduledServices(response);
      });
    }, [])
  );




  useEffect(() => {
     handleSelectOperationArea({ id: -1, name: t('services.list.filter_all'), image: '' });
  }, []);

  // Reverifica a permissão de localização quando o utilizador volta das definições do sistema.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetchStatus();
      }
    });
    return () => subscription.remove();
  }, []);

  const handleSelectOperationArea = (operationArea: OperationAreaInterface) => {
    const { id } = operationArea;

      if (id === -1) {
        setSelectedOperationAreas([-1]);
        if (!selectedOperationAreas.includes(-1)) {
          handleSearch([]);
        }
            return;
      }

      const newSelectedOperationAreas = [...selectedOperationAreas].filter(item => item !== -1);
      const isAlreadySelected = newSelectedOperationAreas.includes(id);

      if (isAlreadySelected) {
             const filtered = newSelectedOperationAreas.filter(item => item !== id);

             if (filtered.length === 0) {
                 setSelectedOperationAreas([-1]);
                 handleSearch([]);
             } else {
                 setSelectedOperationAreas(filtered);
                 handleSearch(filtered);
             }
         } else {
             const updated = [...newSelectedOperationAreas, id];
             setSelectedOperationAreas(updated);
             handleSearch(updated);
      }
  }

  const handleSearch = (operationAreas: OperationAreaInterface['id'][]) => {
          setLoadingSearchedServiceTypes(true);
          api.post(API_ROUTES.POST_SEARCH_OPERATION_AREAS, {
              operation_areas: operationAreas,
          })
              .then((response) => {
                  const { data } = response.data;
                  setSearchedServiceTypes(data.services_types);
              })
              .catch((error) => {
                  if (error.response.status !== 401) {
                       openDialog({
                           icon: <XIcon color={Colors.secondary} />,
                           title: t('errors.title'),
                           subtitle: t('errors.search_services_failed'),
                           closeAfterMSeconds: 2000,
                           closeOnClickOutside: true,
                       });
                  }
              })
              .finally(() => {
                  setLoadingSearchedServiceTypes(false);
              })
  }

  const selectAutoCompleteOption = (serviceType: ServiceTypeInterface) => {
    const { id, operation_area } = serviceType || {};

          //check the vendor being added here, sometimes it is the wrong vendor
      setServiceToRequest(prev => ({
          service_type: serviceType,
      }));

      router.navigate('/(app)/(modals)/(services)/(request)/select-service-type/info');
  };

  return (
    <SafeAreaView className={`py-5 flex-1 bg-support_secondary ${Platform.OS === 'android' ? 'pb-[100px]' : 'pb-[50px]'}`}>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* <Animated.View
          // apply onScroll function to the Animated.View
          // onLayout={onScroll}
          className="px-5 pb-5 space-y-6"
        >
          <Animated.View
            className="mt-4"
          >
            <UserHeader />
          </Animated.View>
          {/* <Animated.View className="mt-4">
            <MainSearchInput
              // onFocus={() => {
              //   const routeToGo = '/(app)/(tabs)/search';
              //   router.navigate(routeToGo);
              //   router.setParams({ focus: 1 });
              // }}
            />
          </Animated.View> 
        </Animated.View> */}

        <View className="space-y-4">
          {/* Onde vai ser o serviço, à cabeça. A app nunca dizia em que zona estava a
              operar — o cliente só descobria que não é servido lá à frente, depois de
              já ter escolhido serviço. Tocar leva a mudar a morada. */}
          {/* Cabeçalho: morada à esquerda, atalhos à direita. Os ecrãs de
              notificações e de suporte já existiam mas só se chegava lá pela
              Conta — dois toques a mais para coisas que se procuram com pressa
              (saber do pedido, ou pedir ajuda quando algo corre mal). */}
          <View className="px-5 pt-3 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
          {!!addressLabel && (
            <View>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('home.address_chip_a11y', { address: addressLabel })}
                // returnTo: 'back' — aqui a morada É o objetivo (o cliente tocou
                // no chip para a mudar), não uma interrupção de um pedido. Sem
                // isto, confirmar atirava-o para "Escolher profissional".
                // Com sessão: a lista de moradas da conta (servidor).
                // Sem sessão: o histórico local, que é o equivalente possível —
                // dali chega-se ao formulário. Antes ia direto ao formulário e
                // obrigava a reescrever tudo, mesmo para repetir a morada de ontem.
                onPress={() => router.navigate(
                  session
                    ? '/(app)/(modals)/(address)/list'
                    : '/(app)/(modals)/(services)/(request)/address/history'
                )}
                className="flex-row items-center self-start rounded-full px-3.5 py-2"
                style={{
                  backgroundColor: 'rgba(250,187,91,0.55)',
                  borderWidth: 1,
                  borderColor: Colors.primary,
                }}
              >
                <Feather name="map-pin" size={14} color={Colors.secondary} />
                <CustomText color="secondary" size="extraSmall" boldness="bold" numberOfLines={1} classes="ml-1.5 max-w-[240px]">
                  {addressLabel}
                </CustomText>
                <Feather name="chevron-down" size={14} color={Colors.secondary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          )}
            </View>

            <View className="flex-row items-center" style={{ gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('home.notifications_a11y')}
                onPress={() => router.navigate('/(app)/(modals)/notifications')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(250,187,91,0.55)',
                  borderWidth: 1,
                  borderColor: Colors.primary,
                }}
              >
                <Feather name="bell" size={18} color={Colors.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('home.support_a11y')}
                onPress={() => router.navigate('/(app)/(modals)/support-ticket')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(250,187,91,0.55)',
                  borderWidth: 1,
                  borderColor: Colors.primary,
                }}
              >
                <Feather name="help-circle" size={18} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Pesquisa logo a seguir à morada: é a razão de abrir a app, e
              estava em quarto lugar, depois do serviço em curso e dos avisos. */}
          <View style={styles.container}>
            <View style={styles.inputContainer}>
              <AutocompleteInput
                openSeviceFlatlist={(item: any) => selectAutoCompleteOption(item)}
                onTextChange={setSearchTerm}
                // minHeight em vez de altura fixa: com o texto do sistema aumentado
                // a `h-[50px]` cortava o texto ao meio (auditoria 2026-08-03).
                style={[styles.input, { minHeight: 50, paddingVertical: 8 }]}
                className="
                  rounded-[30px]
                  pl-5
                  pr-[60px]
                  text-sm

                  font-['Poppins_600SemiBold']

                "
                placeholder={t('services.search.placeholder')}
                placeholderTextColor={Colors.gray_medium}
                data={searchedServiceTypes && Array.isArray(searchedServiceTypes) && searchedServiceTypes.length === 0 ? [] : retrieveSuitableList(searchedServiceTypes)}
                />
              <TouchableOpacity
                style={styles.roundButton}
                onPress={() => {
                  const trimmed = searchTerm.trim();
                  if (trimmed) {
                    setPendingSearchTerm(trimmed);
                  }
                  router.navigate('/(app)/(tabs)/list');
                }}
              >
                <FontAwesome6 name="magnifying-glass" size={20} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {(openService || servicePendingAcceptance || (session && !isLoadingUserData && hasPermission === false)) && (
          <View className="space-y-4">
            {session && !isLoadingUserData && hasPermission === false && (
              <View className="pt-4 px-5">
                <GeolocationPermissionBanner
                  onRequestPermission={handleRequestGeolocationPermission}
                  isLoading={locationLoading}
                  hasPermission={hasPermission}
                />
              </View>
            )}

            {/* Um serviço a decorrer vem primeiro: é o mais urgente do ecrã.
                Antes ficava depois dos avisos de perfil e era empurrado para
                fora da primeira dobra. */}
            {openService && <OpenService />}
            {servicePendingAcceptance && <ServiceWaitingAcceptance />}
          </View>
          )}

          {/* Prova social ANTES da decisão, não depois: estava fixa no fundo do ecrã,
              abaixo da dobra, onde quase ninguém a via. Num serviço em que entra um
              desconhecido em casa, é o argumento mais forte que a Home tem. */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
            <TrustBadge />
          </View>

          <Schedules/>

          {/* Categorias em grelha: a fotografia de cada uma vem do backoffice,
              em miniatura, com o nome por baixo. Duas filas de quatro; a última
              célula abre o catálogo completo. */}
          <CategoryGrid
            areas={Array.isArray(operationAreas) ? orderByAlphaOrder(operationAreas, 'name') : []}
            loading={loadingOperationAreas && !operationAreas?.length}
            onSelect={handleOpenService}
            onSeeAll={() => router.navigate('/(app)/(tabs)/list')}
          />

          {/* Atalhos para serviços concretos, com a fotografia do backoffice. */}
          <PopularServices
            services={popularServices}
            loading={loadingPopular && popularServices.length === 0}
            onSelect={(service) => {
              setServiceToRequest({ service_type: service });
              router.navigate('/(app)/(modals)/(services)/(request)/select-service-type/info');
            }}
          />

          {/* <View className="mt-8">
            <View className="flex flex-row items-center justify-between px-5">
              <ThemedText type="defaultBold" color="secondary" className="text-lg">
                The Piquet tops
              </ThemedText>
            </View>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingTop: 16 }}
                data={piquetTops}
                keyExtractor={(item) => item.vendorName}
                renderItem={({ item: piquetTop }) => (
                  <PiquetTopCard
                    Icon={() => <Entypo name="back-in-time" size={22} color={Colors.primary} />}
                    onPressCard={() => {}}
                    imgSrc="https://r2.erweima.ai/imgcompressed/img/compressed_c5b0073e2f4244f269ef19b63b36acaa.webp"
                    imgSource={{ uri: 'https://r2.erweima.ai/imgcompressed/img/compressed_c5b0073e2f4244f269ef19b63b36acaa.webp' }}
                    category={piquetTop.category}
                    vendorStars={piquetTop.vendorStars}
                    favorite={piquetTop.favorite}
                    onPressFavorite={() => {}}
                    onPressToCall={() => {}}
                    vendorName={piquetTop.vendorName}
                    vendorPrice={piquetTop.vendorPrice}
                  />
                )}
              />
          </View> */}
        </View>
      </ScrollView>

      {/* <View className="h-20"></View> */}
      {/* <ServiceHistory /> */}
      {/* {openService && <ServiceInProgress isHome />} */}
    </SafeAreaView>
  )
}

export default Home
