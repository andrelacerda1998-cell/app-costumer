import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { AntDesign, Entypo, Feather, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const service: ServiceInterface = JSON.parse(serviceFromParams as string);
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
    if (service.rating_by_customer !== null) {
      setRate(Number(service.rating_by_customer));
    }
  }, [])

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
        backgroundColor: Colors.secondary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{
        backgroundColor: Colors.support_primary,
      }}
      backgroundStyle={{
        backgroundColor: Colors.secondary,
      }}
      backdropComponent={() => <View style={{ flex: 1, backgroundColor: 'black', opacity: 0.6 }} />}
      enablePanDownToClose
      onClose={onClose}
    >
      {/* <StatusBar animated barStyle="light-content" backgroundColor="rgba(134, 134, 134, 0.1)" translucent /> */}
      <View className="p-5 bg-secondary">
        <View className="flex-row mx-auto">
          <View className="h-12 w-12 relative -right-1 z-[1]">
            {service?.vendor?.user?.avatar?.small ? (
              <Image
                src={service?.vendor?.user?.avatar?.small}
                source={{ uri: service?.vendor?.user?.avatar?.small }}
                className="w-full h-full object-cover object-center rounded-full"
              />
            ) : (
              <UserAvatarIcon />
            )}
          </View>
          <View className="h-12 w-12 rounded-full flex items-center justify-center bg-primary relative -left-1">
            <Feather name="tool" size={22} color={Colors.secondary} />
          </View>
        </View>

        <View className="justify-center flex-1 mt-8">
          <View className="mx-auto">
            <CustomText
              size="title"
              boldness="semiBold"
              color="support_secondary"
              className="text-center"
              numberOfLines={1}
            >
              {service?.vendor?.user?.name}
            </CustomText>
            <CustomText
              size="medium"
              boldness="semiBold"
              color="gray_medium"
              className="text-center mt-2 px-5"
              numberOfLines={1}
            >
              {t('services.rate.subtitle')}
            </CustomText>
          </View>

          <View className="items-center flex-row space-x-2 justify-center mt-8">
            <TouchOpacity
              onPress={() => handleRate(1)}
              disabled={loadingSubmit || service.rating_by_customer !== null}
            >
              <AntDesign name="star" size={40} color={rate >= 1 ? Colors.primary : Colors.gray_medium} />
            </TouchOpacity>
            <TouchOpacity
              onPress={() => handleRate(2)}
              disabled={loadingSubmit || service.rating_by_customer !== null}
            >
              <AntDesign name="star" size={40} color={rate >= 2 ? Colors.primary : Colors.gray_medium} />
            </TouchOpacity>
            <TouchOpacity
              onPress={() => handleRate(3)}
              disabled={loadingSubmit || service.rating_by_customer !== null}
            >
              <AntDesign name="star" size={40} color={rate >= 3 ? Colors.primary : Colors.gray_medium} />
            </TouchOpacity>
            <TouchOpacity
              onPress={() => handleRate(4)}
              disabled={loadingSubmit || service.rating_by_customer !== null}
            >
              <AntDesign name="star" size={40} color={rate >= 4 ? Colors.primary : Colors.gray_medium} />
            </TouchOpacity>
            <TouchOpacity
              onPress={() => handleRate(5)}
              disabled={loadingSubmit || service.rating_by_customer !== null}
            >
              <AntDesign name="star" size={40} color={rate >= 5 ? Colors.primary : Colors.gray_medium} />
            </TouchOpacity>
          </View>
        </View>
      </View>
      {service.rating_by_customer === null && (
        <View className="px-5 pt-5 bg-secondary">
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
              borderColor: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: 12,
              fontFamily: "Poppins_400Regular",
              fontSize: 14,
              color: Colors.support_secondary,
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
