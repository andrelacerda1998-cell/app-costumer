import ServiceMainCard from '@/components/app/ServiceMainCard';
import UserHeader from '@/components/app/UserHeader';
import TrustBadge from '@/components/app/TrustBadge';
import PiquetLogo from '@/components/PiquetLogo';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Alert, ScrollView, Animated, Modal, FlatList, Text, TouchableOpacity, NativeModules, Platform, Button, TextInput, Linking, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomText } from "@/components/CustomText";
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
import ServiceCard from "@/components/app/ServiceCard";
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

const Home = () => {
  const { t } = useTranslation();
  const { track, hasConsent, isInitialized } = useMixpanel();
  const appOpenedTracked = useRef(false);
  const { userData, isLoadingUserData, session } = useSession();
  const { hasPermission, requestPermission, refetchStatus } = useGeolocationPermissionStatus();
  const { locationLoading, requestLocation } = useLocationFill();
  // const [scrollY, setScrollY] = useState(new Animated.Value(0));
  const { operationAreas, getOperationAreas, setOperationAreas, openService, servicePendingAcceptance, setServiceToRequest, setScheduledServices, getScheduledServices, scheduledServices, setPendingSearchTerm } = useService();
  const [loadingOperationAreas, setLoadingOperationAreas] = useState(false);
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
                           subtitle: t('errors.occurred_an_error'),
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

            {session && !isLoadingUserData && (
              (
                shouldShowCompleteProfile ||
                hasBlockedAddress
              ) && (
                <View className="py-4 px-5">
                  {hasBlockedAddress && (
                    <View className="mb-2">
                      <BlockedByZone />
                    </View>
                  )}

                  {shouldShowCompleteProfile && (
                    <View>
                      <CompleteYourProfile />
                    </View>
                  )}

                  {/* {userData?.phone_number_verified_at === null && (
                    <View className="mb-2">
                      <PhoneNeedsToVerify />
                    </View>
                  )}
                  {userData?.email_verified_at === null && (
                    <View>
                      <EmailNeedsToVerify />
                    </View>
                  )} */}

                </View>
              )
            )}

            {openService && <OpenService />}
            {servicePendingAcceptance && <ServiceWaitingAcceptance />}

          </View>

          <View style={styles.container}>
            <View style={styles.inputContainer}>
              <AutocompleteInput
                openSeviceFlatlist={(item: any) => selectAutoCompleteOption(item)}
                onTextChange={setSearchTerm}
                style={styles.input}
                className="
                  h-[50px]
                  border
                  border-[#fbfbfaff]
                  rounded-[30px]
                  pl-5
                  pr-[60px]
                  text-sm

                  font-['Poppins_600SemiBold']
                  bg-[#fbfbfaff]

                "
                placeholder={t('services.search.placeholder')}
                placeholderTextColor="#000000"
                data={searchedServiceTypes && Array.isArray(searchedServiceTypes) && searchedServiceTypes.length === 0 ? [] : retrieveSuitableList(searchedServiceTypes)}
                />
              <TouchableOpacity
                style={styles.roundButton}
                onPress={() => {
                  const trimmed = searchTerm.trim();
                  if (!trimmed) return;
                  setPendingSearchTerm(trimmed);
                  router.navigate('/(app)/(tabs)/list');
                }}
              >
                <FontAwesome6 name="magnifying-glass" size={20} color="black" />
              </TouchableOpacity>
            </View>
          </View>

          <Schedules/>

          <View className="space-y-4 px-5">
            <View className="flex flex-row items-center justify-between">
              <CustomText size="large" color="secondary" boldness="semiBold" numberOfLines={1}>
                {t('services.title_plural')}
              </CustomText>
              {/*<CustomTouchableOpacity
                onPress={() => router.navigate('/(app)/(tabs)/home/services')}
                className="p-0"
                size="small"
                type="transparent"
              >
                <CustomText size="extraSmall" color="secondary" boldness="bold" numberOfLines={1}>
                  {t('services.view_all')}
                </CustomText>
              </CustomTouchableOpacity>*/}
            </View>

            {loadingOperationAreas && !operationAreas?.length ? (
              <View className="space-y-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <View className="flex flex-row" key={index}>
                      <View
                        className="
                          flex flex-col
                          w-1/2
                          mr-1
                          bg-[#eae4e4ff]
                          rounded-xl
                          h-[100px]
                          justify-center
                          items-start
                          pl-2.5
                          pb-1.5
                        "
                      />

                      <View
                        className="
                          flex flex-col
                          w-1/2
                          mr-1
                          bg-[#eae4e4ff]
                          rounded-xl
                          h-[100px]
                          justify-center
                          items-start
                          pl-2.5
                          pb-1.5
                        "
                      />
                    </View>

                ))}
              </View>
            ) : (
              <View className="flex flex-row">
                <View className="flex flex-col w-1/2 mr-1">
                  {
                  operationAreas && Array.isArray(operationAreas) &&
                  orderByAlphaOrder(operationAreas, 'name')
                    ?.filter((_, i) => i % 2 === 0)
                    .map((service: OperationAreaInterface) => (
                      <View key={service.id} className="mb-4">
                        <ServiceCard
                          Icon={() => (
                            <Feather name="tool" size={26} color={Colors.primary} />
                          )}
                          label={service?.name}
                          image={service.image}
                          onPress={() => handleOpenService(service)}
                          isHome
                        />
                      </View>
                    ))}
                </View>

                <View className="flex flex-col w-1/2 ml-1">
                  {
                  operationAreas && Array.isArray(operationAreas) &&
                  orderByAlphaOrder(operationAreas, 'name')
                    ?.filter((_, i) => i % 2 === 1)
                    .map((service: OperationAreaInterface) => (
                      <View key={service.id} className="mb-4">
                        <ServiceCard
                          Icon={() => (
                            <Feather name="tool" size={26} color={Colors.primary} />
                          )}
                          label={service.name}
                          image={service.image}
                          onPress={() => handleOpenService(service)}
                          isHome
                        />
                      </View>
                    ))}
                </View>
              </View>
            )}
          </View>
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

      {/* Pílula de confiança fixa, encostada à barra de tabs. */}
      <View className="px-4 pt-2">
        <TrustBadge />
      </View>

      {/* <View className="h-20"></View> */}
      {/* <ServiceHistory /> */}
      {/* {openService && <ServiceInProgress isHome />} */}
    </SafeAreaView>
  )
}

export default Home
