import BackHeader from "@/components/app/BackHeader";
import ScheduleVendorCard from "@/components/app/Services/schedule-vendor-card";
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
import { Ionicons } from "@expo/vector-icons";
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

  const [vendors, setVendors] = useState<ScheduleVendorInterface[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

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
      setVendors(normalizedVendors);
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

      <View className="bg-support_secondary p-5 flex-1 rounded-t-3xl space-y-4">
        <View className="mt-4 pl-4 pr-4">
          <CustomText color="secondary" boldness="semiBold" size="large" classes="text-center">
            {t("schedule.select_technician.title")}
          </CustomText>
        </View>

        {loadingVendors ? (
          <View className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <View key={`loading-vendors-${index}`} className="w-full h-28 rounded-2xl bg-[#f0f5f5]" />
            ))}
          </View>
        ) : (
          <FlatList
            data={vendors}
            keyExtractor={(item) => item?.id?.toString()}
            renderItem={({ item }) => (
              <ScheduleVendorCard
                avatar={item.avatar || null}
                name={item.name}
                rating={item.rating}
                original_price={item.original_price}
                distance={item.distance ?? null}
                rate={item.rate}
                isOnline={item.is_online}
                hasAutoAccept={item.has_auto_accept}
                onPress={() => handleSelectVendor(item)}
              />
            )}
            contentContainerStyle={{ gap: 16 }}
            ListEmptyComponent={() => (
              <CustomText color="gray_strong" classes="text-center px-5">
                {t("schedule.select_technician.no_technicians_found")}
              </CustomText>
            )}
          />
        )}

        <View style={{ backgroundColor: '#FFF8E7', borderColor: '#FFE082', borderWidth: 1, borderRadius: 12, padding: 12 }}>
          {[
            { key: 'verified_technicians', icon: 'checkmark-circle' as const },
            { key: 'fixed_price', icon: 'checkmark-circle' as const },
            { key: 'real_reviews', icon: 'star' as const },
          ].map((item, i) => (
            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < 2 ? 6 : 4 }}>
              <Ionicons name={item.icon} size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <CustomText size="small" color="secondary" boldness="semiBold">
                {t(`services.select_vendor.trust_banner.${item.key}`)}
              </CustomText>
            </View>
          ))}
          <CustomText size="small" color="gray_medium" classes="mt-1">
            {t('services.select_vendor.trust_banner.subtitle')}
          </CustomText>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SelectTechnician;
