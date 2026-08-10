import { Colors } from '@/constants/Colors'
import { AntDesign, Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, FlatList, Image, ImageSourcePropType, Pressable, ScrollView, TouchableOpacity, View,Text } from 'react-native'
import TechnicianTrustFooter from "@/components/app/Services/technician-trust-footer";
import BackHeader from '@/components/app/BackHeader'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import { useSession } from '@/contexts/SessionContext'
import { useGuestSession } from '@/contexts/GuestSessionContext'
import { useAddressLabel } from '@/hooks/useAddressLabel'
import { rankFavoritesFirst, useFavoriteVendors } from '@/hooks/useFavoriteVendors'
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
  rating: number,
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

  const { serviceToRequest, setServiceToRequest, operationAreas, setScheduledService, scheduledService, setSelectedProfessional} = useService();
  const { dataToMakeSchedule, setDataToMakeSchedule } = useSchedule();
  // Lista completa como veio do backend. A lista mostrada é derivada daqui em
  // useMemo — os favoritos carregam de forma assíncrona e, se ordenássemos dentro
  // do .then() do fetch, quem chegasse primeiro ganhava a corrida.
  const [allVendors, setAllVendors] = useState<VendorsInterface[]>([]);
  const { isFavorite, toggleFavorite } = useFavoriteVendors();

  /**
   * Favoritos primeiro, mantendo a ordem do backend dentro de cada grupo.
   * A ordenação acontece antes do corte aos 3, para um favorito em 5.º lugar
   * chegar a aparecer — é esse o objetivo de o marcar.
   */
  const vendors = React.useMemo(
    () => rankFavoritesFirst(allVendors, isFavorite).slice(0, 3),
    [allVendors, isFavorite],
  );

  // "Recomendado" continua a ser a escolha do backend, não o topo depois de
  // reordenar: senão o selo passava a dizer que a Piquet recomenda o favorito
  // do próprio cliente, o que não é verdade.
  const recommendedVendorId = allVendors.length > 1 ? allVendors[0]?.id : undefined;
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [selectedVendor, setLocalSelectedVendor] = useState<VendorsInterface | null>(null);
  const [openServiceError, setOpenServiceError] = useState<string | null>(null);
  const [serviceTypeID, setServiceTypeID] = useState<number | undefined>();
  const [hoursOfService, setHoursOfService] = useState<number>(0);

  const convertDataIntoArray = (vendorsObj: Record<string, VendorsInterface>): VendorsInterface[] => {
    return Object.entries(vendorsObj)
      .sort(([keyA], [keyB]) => Number(keyA) - Number(keyB))
      .map(([_, value]) => value);
  };

  const getVendorsOfService = async () => {
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
      ? { service_type: serviceToRequest?.service_type?.id || serviceId }
      : {
          service_type_id: serviceToRequest?.service_type?.id || serviceId,
          latitude: guestSession?.guest_address?.latitude,
          longitude: guestSession?.guest_address?.longitude,
        };

    api.post(endpoint, payload)
      .then(response => {
        const { vendors } = response?.data?.data || {};
        const _vendors = convertDataIntoArray(vendors) || [];

        setServiceTypeID(serviceToRequest?.service_type?.id);

        if(_vendors?.length === 0){
           return setOpenServiceError(t('services.select_vendor.no_vendors_found'));
        }

        setAllVendors(_vendors);
        track('technician_list_viewed', {
          service_name: serviceToRequest?.service_type?.name,
          technicians_count: Math.min(_vendors.length, 3)
        });
      })
      .catch(error => {
        setOpenServiceError(error.response?.data.message);
      })
      .finally(() => {
        setLoadingVendors(false);
      })
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

    setLocalSelectedVendor(item);

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

  const isObj = (item: any) => {
    if (typeof item === "object" && !Array.isArray(item) && item !== null) {
      return true;
    } else return false;
  };

  const isStrictNumber = (value: any) => {
    return typeof value === "number" && Number.isFinite(value);
  };

  const getOperationAreas = () => {
    api
      .post(API_ROUTES.POST_SEARCH_OPERATION_AREAS, {})
      .then((response) => {
        const { data } = response?.data || {};

        if (data?.services_types && Array.isArray(data?.services_types)) {
          let filtered: any = data?.services_types?.filter(
            (elem: any) => elem?.id === serviceTypeID
          );

          if (Array.isArray(filtered) && filtered.length > 0) {
            if (isObj(filtered[0]) && filtered[0]?.hasOwnProperty("time")) {
              if (isStrictNumber(filtered[0]?.time)) {
                let hours: number = filtered[0]?.time / 60;

                if (Number.isFinite(Math.round(hours))) {
                  setHoursOfService(Math.round(hours));
                }
              }
            }
          }
        }
      })
      .catch((error) => {
        if (error.response.status !== 401) {
          openDialog({
            icon: <XIcon color={Colors.secondary} />,
            title: t("errors.title"),
            subtitle: t("errors.occurred_an_error"),
            closeAfterMSeconds: 2000,
            closeOnClickOutside: true,
          });
        }
      })
      .finally(() => {});
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

  useEffect(() => {
    if (serviceTypeID && operationAreas) {
      getOperationAreas();
    }
  }, [serviceTypeID, operationAreas]);

  // Pré-seleção segue o topo da lista mostrada. Antes era fixada no fetch, o que
  // deixava de bater certo assim que os favoritos reordenavam a lista.
  useEffect(() => {
    if (vendors.length === 0) return;
    if (selectedVendor && vendors.some((vendor) => vendor.id === selectedVendor.id)) return;
    setLocalSelectedVendor(vendors[0]);
  }, [vendors, selectedVendor]);

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
        <View className="mt-4 pl-4 pr-4">
          <CustomText color="secondary" boldness="bold" size="extraLarge" classes="text-center">
            {t('services.select_vendor.title')}
          </CustomText>
          <CustomText color="gray_medium" boldness="regular" size="small" classes="text-center mt-1">
            {t('services.select_vendor.subtitle_one_pro')}
          </CustomText>
        </View>

        {loadingVendors ? (
          <View className="flex-1" style={{ gap: 14 }}>
            {Array.from({length: 3}).map((_, index) => (
              <View
                key={`loading-vendors-${index}`}
                className="w-full flex-1 p-5 rounded-3xl bg-support_secondary flex-row items-center"
                style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
              >
                <View className="h-16 w-16 rounded-2xl bg-[#EFEAE2]" />
                <View className="flex-1 ml-3">
                  <View className="h-4 w-[55%] rounded-full bg-[#EFEAE2]" />
                  <View className="h-3 w-[35%] rounded-full bg-[#EFEAE2] mt-2" />
                  <View className="h-3 w-[45%] rounded-full bg-[#EFEAE2] mt-2" />
                </View>
                <View className="h-9 w-20 rounded-xl bg-[#EFEAE2] ml-2" />
              </View>
            ))}
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
            /* No máximo 3 técnicos: cartões esticam para preencher o ecrã */
            <View className="flex-1" style={{ gap: 14 }}>
              {vendors.map((item) => (
                <VendorCard
                  key={item?.id?.toString()}
                  recommended={!!recommendedVendorId && item?.id === recommendedVendorId}
                  favorite={isFavorite(item?.id)}
                  onToggleFavorite={() => toggleFavorite(item?.id)}
                  imgSrc={item?.avatar?.small ? item?.avatar?.small : null}
                  name={item.name}
                  rating={item.rating}
                  ratingCount={(item as any).rating_count ?? (item as any).ratings_count ?? (item as any).reviews_count ?? null}
                  distance={item.distance || null}
                  price={item.rate}
                  onPress={() => {
                    selectVendorAndProceed(item);
                  }}
                  selected={selectedVendor?.id === item.id}
                  serviceTypeID={serviceTypeID}
                  hoursOfService={hoursOfService}
                />
              ))}
            </View>
          )
        )}

        <TechnicianTrustFooter />
      </View>
    </SafeAreaView>
  )
}

export default SelectVendor;
