import TechnicianTrustFooter from "@/components/app/Services/technician-trust-footer";
import BackHeader from "@/components/app/BackHeader";
import VendorCard from "@/components/app/Services/vendor-card-selector";
import { rankFavoritesFirst, useFavoriteVendors } from "@/hooks/useFavoriteVendors";
import { resolveVendorBadges } from "@/utils/vendorBadges";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useApi } from "@/contexts/ApiContext";
import { useDialog } from "@/contexts/DialogContext";
import { useService } from "@/contexts/ServiceContext";
import { useSession } from "@/contexts/SessionContext";
import { useAddressLabel } from "@/hooks/useAddressLabel";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { ScheduleVendorInterface } from "@/types/schedule/vendors";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import XIcon from "@/assets/icons/x";

const SelectTechnician = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { userData, session } = useSession();
  const { guestSession, setSelectedVendor: setGuestSelectedVendor } = useGuestSession();
  const addressLabel = useAddressLabel();
  const { openDialog } = useDialog();
  const { serviceToRequest, setServiceToRequest, setSelectedProfessional, setScheduledService } = useService();
  const params = useLocalSearchParams();
  const serviceId = Number(params.serviceId);

  const [allVendors, setAllVendors] = useState<ScheduleVendorInterface[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const { isFavorite, toggleFavorite } = useFavoriteVendors();

  // Mesma regra do fluxo imediato: favoritos primeiro, e só depois o corte aos 3,
  // para um favorito que o backend devolva em 5.o lugar chegar a aparecer.
  const vendors = React.useMemo(
    () => rankFavoritesFirst(allVendors, isFavorite).slice(0, 3),
    [allVendors, isFavorite],
  );

  // O mais proximo e o primeiro que o backend devolve (ScheduleVendorSearchService
  // ordena por _geoPoint asc e so depois por nota), independentemente dos favoritos.
  const { badges, heroId } = React.useMemo(() => resolveVendorBadges(allVendors), [allVendors]);

  const normalizeVendors = (data: any): ScheduleVendorInterface[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") return Object.values(data);
    return [];
  };

  const normalizeVendor = (data: any): ScheduleVendorInterface => {
    const rate = data?.rate ?? Number(data?.price_rate) ?? 0;
    const apiOriginalPrice = data?.original_price ?? 0;
    const original_price = apiOriginalPrice > rate && apiOriginalPrice > 0
      ? apiOriginalPrice
      : rate > 0 ? Math.round(rate / 0.75 * 100) / 100 : 0;
    return {
      id: data?.id,
      name: data?.name || data?.user?.name || "",
      rate,
      distance: data?.distance ?? 0,
      rating: data?.rating ?? 0,
      original_price,
      avatar: data?.avatar?.small || data?.avatar || data?.user?.avatar?.small || "",
      is_online: Boolean(data?.is_online ?? data?.online),
      has_auto_accept: Boolean(data?.has_auto_accept ?? data?.auto_accept),
    };
  };

  const getVendorsOfService = async () => {
    if (!serviceId) return;
    setLoadingVendors(true);

    try {
      const endpoint = session ? API_ROUTES.POST_SCHEDULE_VENDORS : API_ROUTES.GUEST_SEARCH_VENDORS;
      const payload = session
        ? { service_type: serviceToRequest?.service_type?.id || serviceId }
        : {
            service_type_id: serviceToRequest?.service_type?.id || serviceId,
            latitude: guestSession?.guest_address?.latitude,
            longitude: guestSession?.guest_address?.longitude,
            scheduled: true,
          };

      const response = await api.post(endpoint, payload);
      const responseData = response?.data?.data;
      const vendorsList = normalizeVendors(responseData?.vendors ?? responseData);
      const normalizedVendors = vendorsList.map(normalizeVendor);
      setAllVendors(normalizedVendors);
    } catch (error: any) {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: error?.response?.data?.message || t("errors.occurred_an_error"),
        closeAfterMSeconds: 2000,
        closeOnClickOutside: true,
      });
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleSelectVendor = (vendor: ScheduleVendorInterface) => {
    setSelectedProfessional({
      id: vendor.id,
      name: vendor.name,
      rate: vendor.rate,
      distance: vendor.distance,
      rating: vendor.rating,
      avatar: {
        small: vendor.avatar,
        src: vendor.avatar,
      },
    });

    setServiceToRequest((prev) => ({
      ...prev,
      vendor: {
        id: vendor.id,
        distance: vendor.distance,
        name: vendor.name,
        rate: vendor.rate,
        rating: vendor.rating,
      },
    }));

    setGuestSelectedVendor(vendor.id, vendor);
    router.navigate("/(app)/(modals)/(services)/(schedule)/schedule/schedule-service");
  };

  useEffect(() => {
    setScheduledService(true);
    if (!session && (!guestSession?.guest_address?.latitude || !guestSession?.guest_address?.longitude)) {
      router.replace(`/(app)/(modals)/(services)/(request)/address/guest`);
      return;
    }
    if (!serviceToRequest?.service_type?.id && serviceId) {
      setServiceToRequest((prev) => ({
        ...prev,
        service_type: {
          id: serviceId,
        },
      }));
    }
    getVendorsOfService();
  }, [serviceId, setScheduledService]);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {addressLabel}
          </CustomText>
        )}
        rigthItem={() => <View />}
        otherClasses="p-5"
      />

      <View className="p-5 flex-1 rounded-t-3xl space-y-4" style={{ backgroundColor: "#FAF7F2" }}>
        <View className="mt-4 pl-4 pr-4">
          <CustomText color="secondary" boldness="bold" size="extraLarge" classes="text-center">
            {t("schedule.select_technician.title")}
          </CustomText>
          <CustomText color="gray_medium" boldness="regular" size="small" classes="text-center mt-1">
            {t("schedule.select_technician.subtitle")}
          </CustomText>
        </View>

        {loadingVendors ? (
          /* Mesma forma do cartao real, senao o ecra salta ao carregar. */
          <View style={{ gap: 12 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <View
                key={`loading-vendors-${index}`}
                className="w-full p-4 rounded-3xl bg-support_secondary"
                style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
              >
                <View className="flex-row items-center">
                  <View className="h-16 w-16 rounded-2xl bg-[#EFEAE2]" />
                  <View className="flex-1 ml-3">
                    <View className="h-4 w-[55%] rounded-full bg-[#EFEAE2]" />
                    <View className="h-3 w-[40%] rounded-full bg-[#EFEAE2] mt-2" />
                  </View>
                </View>
                <View className="h-[1px] w-full bg-support_primary mt-3.5 mb-3" />
                <View className="flex-row items-center justify-between">
                  <View className="h-6 w-20 rounded-full bg-[#EFEAE2]" />
                  <View className="h-9 w-28 rounded-full bg-[#EFEAE2]" />
                </View>
              </View>
            ))}
          </View>
        ) : (
          vendors.length === 0 ? (
            <View className="flex-1 items-center justify-center px-5">
              <View
                className="items-center justify-center rounded-full mb-5"
                style={{ width: 96, height: 96, backgroundColor: "rgba(250,187,91,0.15)" }}
              >
                <Feather name="users" size={36} color={Colors.primary} />
              </View>
              <CustomText color="secondary" boldness="bold" size="medium" classes="text-center">
                {t("schedule.select_technician.no_technicians_found")}
              </CustomText>
            </View>
          ) : (
            /* Mesmo cartao do fluxo imediato, com a altura do conteudo. */
            <View style={{ gap: 12 }}>
              {vendors.map((item) => (
                <VendorCard
                  key={item?.id?.toString()}
                  badge={badges[Number(item?.id)] ?? null}
                  hero={!!heroId && Number(item?.id) === heroId}
                  favorite={isFavorite(item?.id)}
                  onToggleFavorite={() => toggleFavorite(item?.id)}
                  imgSrc={item.avatar || null}
                  name={item.name}
                  rating={item.rating ?? null}
                  ratingsCount={(item as any).ratings_count ?? null}
                  distance={item.distance ?? null}
                  originalPrice={item.original_price}
                  price={item.rate}
                  onPress={() => handleSelectVendor(item)}
                />
              ))}
            </View>
          )
        )}

        <TechnicianTrustFooter compact />
      </View>
    </SafeAreaView>
  );
};

export default SelectTechnician;
