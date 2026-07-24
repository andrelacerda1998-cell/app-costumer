import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { AntDesign, Entypo, Feather, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, InteractionManager, SafeAreaView, StatusBar, TextInput, View } from 'react-native';
import TouchOpacity from '@/components/TouchOpacity';
import { useApi } from '@/contexts/ApiContext';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import { ServiceInterface } from "@/types/services";
import DynamicSizingSheet from "@/components/sheets/DynamicSizingSheet";
import { useService } from "@/contexts/ServiceContext";
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import UserAvatarIcon from "@/assets/icons/user-avatar";
import { CustomText } from "@/components/CustomText";
import { useSession } from "@/contexts/SessionContext";
import { useMixpanel } from "@/contexts/MixpanelContext";

const RateServiceBottomSheet = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { historyServices, setHistoryServices } = useService();
  const { userData } = useSession();
  const { track } = useMixpanel();
  const { serviceId, service: serviceFromParams } = useLocalSearchParams();
  const service = useMemo<ServiceInterface | null>(() => {
    try {
      if (typeof serviceFromParams !== 'string') return null;
      return JSON.parse(serviceFromParams) as ServiceInterface;
    } catch {
      return null;
    }
  }, [serviceFromParams]);
  const [rate, setRate] = useState(0);
  const [comment, setComment] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const hasAssociatedEmail = !!userData?.email?.trim?.();
  const shouldShowCompleteProfile = !!userData && (
    !userData.name?.trim?.() ||
    userData.gender_id === null ||
    !userData.date_birthday ||
    !userData.address ||
    userData.phone_number_verified_at === null ||
    (hasAssociatedEmail && userData.email_verified_at === null)
  );

  useEffect(() => {
    if (service && service.rating_by_customer !== null) {
      setRate(Number(service.rating_by_customer));
    }
  }, [service])

  // Param em falta ou JSON inválido: sai em segurança em vez de rebentar.
  useEffect(() => {
    if (!service) {
      router.back();
    }
  }, [service])

  const handleRate = (value: number) => {
    setRate(value);
  };

  const onClose = () => {
    console.log('[RateSheet] onClose shouldShowCompleteProfile:', shouldShowCompleteProfile, 'userData:', !!userData);
    router.dismissTo('/(app)/(tabs)/home');
    if (shouldShowCompleteProfile) {
      track('profile_completion_prompted');
      InteractionManager.runAfterInteractions(() => {
        router.navigate('/(app)/(modals)/complete-profile');
      });
    }
  };

  const handleSubmit = () => {
    setLoadingSubmit(true);
    const trimmed = comment.trim();
    // O comentário segue no PUT (o backend guarda-o quando o suportar) e no
    // Mixpanel — assim nunca se perde, mesmo antes do backend o persistir.
    track("service_rated", { rating: rate, has_comment: trimmed.length > 0, comment: trimmed || undefined, service_id: serviceId });
    api.put(API_ROUTES.PUT_RATE_SERVICE(serviceId as string), trimmed ? { rate, comment: trimmed } : { rate })
      .then(() => {
        let historyService = historyServices.find((service: ServiceInterface) => Number(service.id) === Number(serviceId));
        if (historyService) {
          setHistoryServices(prev =>
            prev.map(service =>
              Number(service.id) === Number(serviceId)
                ? { ...service, rating_by_customer: rate }
                : service
            )
          );
        }
        onClose();
      })
      .catch((error) => {
        openDialog({
          icon: <XIcon color={Colors.secondary} />,
          title: t('errors.title'),
          subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
          closeAfterMSeconds: 2000,
          closeOnClickOutside: true,
        })
      })
      .finally(() => {
        setLoadingSubmit(false);
      });
  };

  if (!service) {
    return null;
  }

  return (
    <DynamicSizingSheet
      type="scrollView"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
      }}
      handleStyle={{
        backgroundColor: "#FAF7F2",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{
        backgroundColor: Colors.gray_light,
      }}
      backgroundStyle={{
        backgroundColor: "#FAF7F2",
      }}
      backdropComponent={() => <View style={{ flex: 1, backgroundColor: 'black', opacity: 0.6 }} />}
      enablePanDownToClose
      onClose={onClose}
    >
      {/* <StatusBar animated barStyle="light-content" backgroundColor="rgba(134, 134, 134, 0.1)" translucent /> */}
      <View className="px-5 pt-6 pb-2 items-center" style={{ backgroundColor: "#FAF7F2" }}>
        {/* Avatar único do técnico com anel âmbar */}
        <View
          className="h-20 w-20 rounded-full items-center justify-center overflow-hidden"
          style={{ borderWidth: 3, borderColor: Colors.primary }}
        >
          {service?.vendor?.user?.avatar?.small ? (
            <Image
              src={service?.vendor?.user?.avatar?.small}
              source={{ uri: service?.vendor?.user?.avatar?.small }}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <View className="w-full h-full items-center justify-center" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
              <Feather name="user" size={34} color={Colors.primary} />
            </View>
          )}
        </View>

        <CustomText size="title" boldness="bold" color="secondary" classes="text-center mt-4" numberOfLines={1}>
          {service?.vendor?.user?.name}
        </CustomText>
        {/* Nome do serviço avaliado (contexto real) */}
        {!!service?.service_type?.name && (
          <View className="rounded-full px-3 py-1 mt-2" style={{ backgroundColor: "rgba(250,187,91,0.18)" }}>
            <CustomText size="small" boldness="semiBold" color="secondary" numberOfLines={1}>
              {service.service_type.name}
            </CustomText>
          </View>
        )}

        {/* Estrelas */}
        <View className="flex-row justify-center mt-6" style={{ gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchOpacity
              key={`star-${n}`}
              onPress={() => handleRate(n)}
              disabled={loadingSubmit || service.rating_by_customer !== null}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <AntDesign name="star" size={40} color={rate >= n ? Colors.primary : Colors.gray_light} />
            </TouchOpacity>
          ))}
        </View>

        {/* Etiqueta dinâmica: Mau→Excelente, ou dica quando ainda não avaliou */}
        <View className="mt-3 h-6 justify-center">
          {rate > 0 ? (
            <CustomText size="medium" boldness="bold" color="primary" numberOfLines={1}>
              {t(`services.rate.label_${rate}`)}
            </CustomText>
          ) : (
            <CustomText size="small" boldness="regular" color="gray_medium" numberOfLines={1}>
              {t('services.rate.tap_hint')}
            </CustomText>
          )}
        </View>
      </View>
      {service.rating_by_customer === null && (
        <View className="px-5 pt-5" style={{ backgroundColor: "#FAF7F2" }}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t('services.rate.comment_placeholder')}
            placeholderTextColor={Colors.gray_medium}
            multiline
            textAlignVertical="top"
            editable={!loadingSubmit}
            maxLength={1000}
            style={{
              minHeight: 90,
              borderWidth: 1,
              borderColor: "#E4E3E3",
              borderRadius: 12,
              padding: 12,
              backgroundColor: Colors.support_secondary,
              fontFamily: "Poppins_400Regular",
              fontSize: 14,
              color: "#000000",
            }}
          />
        </View>
      )}
      {service.rating_by_customer === null && (
        <View className="p-5">
          <CustomTouchableOpacity
            size="large"
            type="primary"
            textColor="secondary"
            textBoldness="semiBold"
            text={t('services.rate.send')}
            onPress={handleSubmit}
            disabled={rate === 0 || loadingSubmit}
          />
        </View>
      )}
    </DynamicSizingSheet>
  );
};

export default RateServiceBottomSheet;
