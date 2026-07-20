import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler, ScrollView, View } from 'react-native';
import TouchOpacity from '@/components/TouchOpacity';
import BackHeader from '@/components/app/BackHeader';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import useEcho from '@/hooks/echo';
import { useApi } from '@/contexts/ApiContext';
import { jwtDecode } from 'jwt-decode';
import { useSession } from '@/contexts/SessionContext';
import { useAddressLabel } from '@/hooks/useAddressLabel';
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import { API_ROUTES } from "@/constants/ApiRoutes";
import Timer, { R, TIME_TO_WAIT_FOR_VENDOR } from "@/components/Timer";
import { ServiceInterface, ServiceStatus } from "@/types/services";
import { useService } from "@/contexts/ServiceContext";
import { useSchedule } from "@/contexts/ScheduleContext";
import { useDialog } from "@/contexts/DialogContext";
import { useTranslation } from "react-i18next";
import { useAppStateStatus } from "@/contexts/AppStateStatusContext";
import { useMixpanel } from '@/contexts/MixpanelContext';

const WaitAccept = () => {
  const { t } = useTranslation();
  const { track } = useMixpanel();
  const {
    openService,
    setOpenService,
    serviceToRequest,
    setServiceToRequest,
    setServicePendingAcceptance,
    subscribeToServicesChannel,
    setIsWaitAcceptScreenActive,
    scheduledService
  } = useService();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const echo = useEcho();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'pending' | 'timeout' | 'success' | 'closed' | 'refused' | 'scheduled'>('pending');
  const { session, userData } = useSession();
  const addressLabel = useAddressLabel();
  const serviceId = params.serviceId;
  const [service, setService] = useState<ServiceInterface | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const hasNavigatedToProgressRef = useRef(false);
  const { appStateStatus } = useAppStateStatus();
  const { dataToMakeSchedule } = useSchedule();
  const isScheduledRequest = scheduledService || !!dataToMakeSchedule;
  const normalizeStatus = (value?: string | null) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized.includes("schedule")) return ServiceStatus.SCHEDULED.toLowerCase();
    if (normalized === "cancelled") return ServiceStatus.CANCELED.toLowerCase();
    return normalized;
  };
  const isScheduledAcceptance = (value?: string | null) => {
    const normalizedStatus = normalizeStatus(value);
    return normalizedStatus === ServiceStatus.SCHEDULED.toLowerCase();
  };
  const handleScheduleAccepted = (data: any) => {
    setStatus("scheduled");
    setServicePendingAcceptance(null);
    setServiceToRequest(null);
    const nextServiceId = data?.schedule_details?.service_id || data?.service?.id;
    if (nextServiceId) {
      echo?.leaveChannel(`common.services.${nextServiceId}`);
      subscribeToServicesChannel(nextServiceId);
    }
  };

  const backHandler = () => {
    onClose();
    return true;
  };

  // Mark screen as active to prevent ServiceContext from showing duplicate dialogs
  useEffect(() => {
    setIsWaitAcceptScreenActive(true);
    return () => {
      setIsWaitAcceptScreenActive(false);
    };
  }, []);

  useEffect(() => {
    if (appStateStatus === "active") {
      getServiceDetails();
    }

    const backHandlerListener = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      backHandlerListener.remove();
    };
  }, [appStateStatus])

  useEffect(() => {
    if (status === "success" && openService?.id && !hasNavigatedToProgressRef.current) {
      hasNavigatedToProgressRef.current = true;
      track('service_confirmed', {
        price: openService?.price,
        is_new_user: !userData?.phone_number_verified_at
      });
      const timeoutId = setTimeout(() => {
        router.dismissAll();
        router.replace(`/(app)/(pages)/(services)/(open)/progress/${openService?.id}`);
      }, 3000);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [status, openService?.id]);

  useEffect(() => {
    subscribeToServicesCustomerChannel();

    return () => {
      console.log('left the component')
      if (echo) {
        echo.leaveChannel(`common.services.${serviceId}`);
        if (userData?.id) {
          echo.leaveChannel(`service.customer.${userData.id}`);
        }
        subscribeToServicesChannel(serviceId as string);
      }
    }
  }, [echo, userData?.id]);

  const subscribeToServicesCustomerChannel = () => {
    if (echo) {
      // console.log('subscribing to services channel on wait accept', serviceId);
      const channel = echo.private(`common.services.${serviceId}`);
      const customerChannel = userData?.id ? echo.private(`service.customer.${userData.id}`) : null;

      const listenScheduleAccepted = (data: any) => {
        console.log("Service schedule was accepted, logged data on wait accept: ", data);
        handleScheduleAccepted(data);
      };

      if (channel) {
        channel.subscribed((test: any) => {
          console.log(test, 'test on subscribed');
          channel.error(function (error: any){
              console.log(error);
          })
          channel.listen(".ServiceAcceptedEvent", (data: any) => {
            // console.log("Service was accepted, logged data on wait accept: ", data);
            if (isScheduledAcceptance(data?.service?.status)) {
              setStatus("scheduled");
            } else {
              setOpenService(data.service);
              setStatus("success");
            }
            setServicePendingAcceptance(null);
            setServiceToRequest(null);
            echo.leaveChannel(`common.services.${data.service.id}`);
            subscribeToServicesChannel(data.service.id);
          });
          channel.listen(".AcceptScheduleEvent", listenScheduleAccepted);
          channel.listen(".App\\Events\\Customer\\Schedule\\AcceptScheduleEvent", listenScheduleAccepted);
          // channel.listen(".ServiceClosedEvent", (data: any) => {
          //   console.log(" Service was closed, logged data on wait accept: ", data);
          //   setStatus("closed");
          //   setServicePendingAcceptance(null);
          // });
          channel.listen(".ServiceTimeoutEvent", (data: any) => {
            // console.log("Service was timeout, logged data on wait accept: ", data);
            // console.log('data on timeout: ', data); //debug on counter expiring after 60 seconds instead of 20 mins
            setStatus("timeout"); //test, comment to check if the clock continues
            echo.leaveChannel(`common.services.${data.service.id}`); //test
            setServicePendingAcceptance(null);
          });
          channel.listen(".ServiceRefusedEvent", (data: any) => {
            // console.log("Service was refused, logged data on wait accept: ", data);
            setStatus("refused");
            echo.leaveChannel(`common.services.${data.service.id}`);
            setServicePendingAcceptance(null);
          });
          channel.listen(".ServiceCanceledEvent", (data: any) => {
            // console.log("Service was canceled, logged data on wait accept: ", data);
            setStatus("refused");
            echo.leaveChannel(`common.services.${data.service.id}`);
            setServicePendingAcceptance(null);
          });
        })
      }

      if (customerChannel) {
        customerChannel.subscribed((test: any) => {
          console.log(test, 'test on customer channel subscribed');
          customerChannel.error(function (error: any){
            console.log(error);
          })
          customerChannel.listen(".AcceptScheduleEvent", listenScheduleAccepted);
          customerChannel.listen(".App\\Events\\Customer\\Schedule\\AcceptScheduleEvent", listenScheduleAccepted);
        });
      }
    }
  }

  const onClose = () => {
    // console.log({service}, 'consoling log service here on close')
    switch(status) {
      case "success":
      case "scheduled":
      case "closed":
      case "pending":
        router.dismissAll();
        return router.replace('/(app)/(tabs)/home');
      case "timeout":
      case "refused": {
        console.log('[wait-accept] onClose refused/timeout', { scheduledService, hasScheduleData: !!dataToMakeSchedule, isScheduledRequest, serviceTypeId: serviceToRequest?.service_type?.id });
        router.dismissAll();
        const stId = serviceToRequest?.service_type?.id ?? service?.service_type?.id;
        if (!stId) {
          return router.replace('/(app)/(tabs)/home');
        }
        if (isScheduledRequest) {
          return router.replace(`/(app)/(modals)/(services)/(schedule)/select-technician/${stId}`);
        }
        return router.replace(`/(app)/(modals)/(services)/(request)/select-vendor/${stId}`);
      }
      default:
        if (router.canGoBack()) {
          return router.back();
        }
        router.dismissAll();
        return router.replace('/(app)/(tabs)/home');
    }
  };

  const handleCancelService = () => {
    openDialog({
      title: t('services.cancel.title'),
      subtitle: t('services.cancel.subtitle'),
      successButtonText: t('services.cancel.confirm'),
      cancelButtonText: t('services.cancel.cancel'),
      onSuccess() {
        setIsLoading(true);
        api.post(API_ROUTES.POST_CANCEL_SERVICE(serviceId as string))
          .then(() => {
            openDialog({
              title: t('services.wait_accept.canceled.title'),
              subtitle: t('services.wait_accept.canceled.subtitle'),
              closeAfterMSeconds: 3000,
              closeOnClickOutside: false,
              onClose: () => {
                setServicePendingAcceptance(null);
                setServiceToRequest(null);
                router.dismissAll();
                return router.replace('/(app)/(tabs)/home');
              }
            })
          })
          .catch((error: any) => {
            openDialog({
              title: t('errors.title'),
              subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
              closeAfterMSeconds: 2000,
              closeOnClickOutside: true,
            });
            getServiceDetails();
          })
          .finally(() => {
            setIsLoading(false);
          })
      }
    })
  }

  const getServiceDetails = () => {
    setIsLoading(true);
    api.get(API_ROUTES.GET_SERVICE_DETAILS(serviceId as string))
      .then((response) => {
        const data = response.data.data;
        const responseService = data?.service;
        if (!responseService) {
          setService(null);
          setServicePendingAcceptance(null);
          setStatus("timeout");
          return;
        }
        setService(responseService);
        const normalizedStatus = normalizeStatus(responseService.status);
        if (normalizedStatus === ServiceStatus.PENDING.toLowerCase()) {
          setServicePendingAcceptance(responseService);
        } else if (normalizedStatus === ServiceStatus.SCHEDULED.toLowerCase()) {
          setStatus("scheduled");
          setServicePendingAcceptance(null);
        } else if (normalizedStatus === ServiceStatus.ACCEPTED.toLowerCase()) {
          if (isScheduledAcceptance(normalizedStatus)) {
            setStatus("scheduled");
          } else {
            setOpenService(responseService);
            setStatus("success");
          }
          setServicePendingAcceptance(null);
        } else if (normalizedStatus === ServiceStatus.REFUSED.toLowerCase()) {
          setStatus("refused");
          setServicePendingAcceptance(null);
        } else if (normalizedStatus === ServiceStatus.CANCELED.toLowerCase()) {
          setStatus("timeout");
          setServicePendingAcceptance(null);
        } else {
          setServicePendingAcceptance(null);
          setStatus("pending");
        }
      })
      .catch((error) => {
        console.error(error);
        const statusCode = error?.response?.status;
        if (statusCode === 404 || statusCode === 410) {
          setService(null);
          setServicePendingAcceptance(null);
          setStatus("timeout");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <BackHeader
        onBack={onClose}
        backButtonColor="secondary"
        middleItem={() => (
          <View className="flex flex-row items-center">
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {addressLabel}
            </CustomText>
            {/* <Entypo name="chevron-down" size={20} color={Colors.secondary} /> */}
          </View>
        )}
        // rigthItem={() => (
        //   <View className="flex items-end">
        //     <Feather name="help-circle" size={30} color={Colors.secondary} />
        //   </View>
        // )}
        otherClasses="p-5"
      />

      {
        status === "pending" && (
          <ScrollView contentContainerStyle={{
            flexGrow: 1,
            width: "100%",
            justifyContent: "center",
            // backgroundColor: Colors.secondary,
            backgroundColor: Colors.support_secondary, //light mode
            borderTopStartRadius: 30,
            borderTopEndRadius: 30,
            padding: 20,
          }}>
            {service ? (
              <Timer
                service={service}
                refreshService={getServiceDetails}
                onTimeout={() => setDisableButton(true)}
                isScheduledOverride={scheduledService ? true : undefined}
              />
            ) : (
              <View className="flex-1">
                <View className="items-center flex-1">
                  <View className="rounded-full overflow-hidden w-[80%] h-8">
                    <View className="w-full h-full bg-[#111215]"></View>
                  </View>
                  <View className="rounded-full overflow-hidden w-[65%] h-6 mt-2">
                    <View className="w-full h-full bg-[#111215]"></View>
                  </View>
                  <View className="flex-1 justify-center items-center">
                    <View className="rounded-full overflow-hidden w-32 h-32 mt-2">
                      <View className="w-full h-full bg-[#111215]"></View>
                    </View>
                  </View>
                  <View className="items-center">
                    <View className="rounded-full overflow-hidden w-[60%] h-7">
                      <View className="w-full h-full bg-[#111215]"></View>
                    </View>
                    <View className="rounded-full overflow-hidden w-[92%] h-5 mt-2">
                      <View className="w-full h-full bg-[#111215]"></View>
                    </View>
                    <View className="flex-row justify-between items-center mt-4 w-full">
                      <View className="rounded-full overflow-hidden w-[30%] h-7">
                        <View className="w-full h-full bg-[#111215]"></View>
                      </View>
                      <View className="rounded-full overflow-hidden w-[45%] h-7">
                        <View className="w-full h-full bg-[#111215]"></View>
                      </View>
                    </View>
                    <View className="flex-row justify-between items-center my-4 w-full">
                      <View className="rounded-full overflow-hidden w-[40%] h-7">
                        <View className="w-full h-full bg-[#111215]"></View>
                      </View>
                      <View className="rounded-full overflow-hidden w-[50%] h-7">
                        <View className="w-full h-full bg-[#111215]"></View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
            <CustomTouchableOpacity
              size="large"
              // type="support_secondary"
              type="primary"
              textColor="secondary"
              textBoldness="semiBold"
              text={t('services.wait_accept.pending.cancel')}
              onPress={handleCancelService}
              disabled={isLoading || disableButton}
            />
          </ScrollView>
        )
      }
      {
        status === "refused" && (
          <ScrollView contentContainerStyle={{
            flexGrow: 1,
            width: "100%",
            justifyContent: "center",
            // backgroundColor: Colors.secondary,
            backgroundColor: Colors.support_secondary, //light mode
            borderTopStartRadius: 30,
            borderTopEndRadius: 30,
            padding: 20,
          }}>
            <View className="flex-1">
              <View className="flex-1 justify-center items-center">
                <Svg width={200} height={200} viewBox="0 0 200 200">
                  {/* Background Circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r={R}
                    stroke={Colors.error}
                    strokeWidth={10}
                    fill="none"
                  />
                </Svg>
                <View className="absolute">
                  <MaterialCommunityIcons
                    name="window-close"
                    size={40}
                    color={Colors.gray_medium}
                  />
                </View>
              </View>

              <View>
                <ThemedText type="default" //color={Colors.support_secondary}
                color={Colors.secondary}
                className="font-poppins-medium text-center">
                  {t('services.wait_accept.refused.title')}
                </ThemedText>
                <ThemedText type="default" color={Colors.gray_medium} className="text-center my-2 px-5">
                  {t('services.wait_accept.refused.subtitle')}
                </ThemedText>
              </View>
            </View>
            <TouchOpacity
                bgColor="support_secondary"
                itemsCenter
                rounded="lg"
                otherClasses="py-4 mt-6"
                onPress={() => {
                  onClose();
                }}
                // disabled={selectedService === null}
            >
              <ThemedText type="defaultBold" //color={Colors.secondary}
              color={Colors.secondary}
              numberOfLines={1}>
                {t('services.wait_accept.refused.try_again')}
              </ThemedText>
            </TouchOpacity>
          </ScrollView>
        )
      }
      {
        status === "timeout" && (
          <ScrollView contentContainerStyle={{
            flexGrow: 1,
            width: "100%",
            justifyContent: "center",
            // backgroundColor: Colors.secondary,
            backgroundColor: Colors.support_secondary,
            borderTopStartRadius: 30,
            borderTopEndRadius: 30,
            padding: 20,
          }}>
            <View className="flex-1">
              <View className="flex-1 justify-center items-center">
                <Svg width={200} height={200} viewBox="0 0 200 200">
                  {/* Background Circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r={R}
                    stroke={Colors.error}
                    strokeWidth={10}
                    fill="none"
                  />
                </Svg>
                <View className="absolute">
                  <MaterialCommunityIcons
                    name="window-close"
                    size={40}
                    color={Colors.gray_medium}
                  />
                </View>
              </View>

              <View>
                <ThemedText type="default" //color={Colors.support_secondary}
                color={Colors.secondary}
                className="font-poppins-medium text-center">
                  {t('services.wait_accept.timeout.title')}
                </ThemedText>
                <ThemedText type="default" color={Colors.gray_medium} className="text-center my-2 px-5">
                  {t('services.wait_accept.timeout.subtitle')}
                </ThemedText>
              </View>
            </View>
            <TouchOpacity
                // bgColor="support_secondary"
                bgColor="secondary"
                itemsCenter
                rounded="lg"
                otherClasses="py-4 mt-6"
                onPress={onClose}
                // disabled={selectedService === null}
            >
              <ThemedText type="defaultBold"
              // color={Colors.secondary}
              color={Colors.support_secondary}
              numberOfLines={1}>
                {t('services.wait_accept.timeout.try_again')}
              </ThemedText>
            </TouchOpacity>
          </ScrollView>
        )
      }
      {
        status === "success" && (
          <ScrollView contentContainerStyle={{
            flexGrow: 1,
            width: "100%",
            justifyContent: "center",
            // backgroundColor: Colors.secondary,
            backgroundColor: Colors.support_secondary,
            borderTopStartRadius: 30,
            borderTopEndRadius: 30,
            padding: 20,
          }}>
            <View className="flex-1">
              <View className="flex-1 justify-center items-center">
                <Svg width={200} height={200} viewBox="0 0 200 200">
                  {/* Background Circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r={R}
                    stroke="#FABB5B"
                    strokeWidth={10}
                    fill="none"
                  />
                </Svg>
                <View className="absolute">
                  <FontAwesome6
                    size={40}
                    name='check'
                    color={Colors.gray_medium}
                  />
                </View>
              </View>

              <View>
                <ThemedText type="default"
                color={Colors.secondary}
                className="font-poppins-medium text-center">
                  {t('services.wait_accept.success.title')}
                </ThemedText>
                <ThemedText type="default" color={Colors.gray_medium} className="text-center my-2 px-5">
                  {t('services.wait_accept.success.subtitle')}
                </ThemedText>
              </View>
            </View>
            <TouchOpacity
                // bgColor="support_secondary"
                bgColor="secondary"
                itemsCenter
                rounded="lg"
                otherClasses="py-4 mt-6"
                onPress={onClose}
                // disabled={selectedService === null}
            >
              <ThemedText type="defaultBold" color={Colors.support_secondary} numberOfLines={1}>
                {t('services.wait_accept.success.close')}
              </ThemedText>
            </TouchOpacity>
          </ScrollView>
        )
      }
      {
        status === "scheduled" && (
          <ScrollView contentContainerStyle={{
            flexGrow: 1,
            width: "100%",
            justifyContent: "center",
            // backgroundColor: Colors.secondary,
            backgroundColor: Colors.support_secondary,
            borderTopStartRadius: 30,
            borderTopEndRadius: 30,
            padding: 20,
          }}>
            <View className="flex-1">
              <View className="flex-1 justify-center items-center">
                <Svg width={200} height={200} viewBox="0 0 200 200">
                  {/* Background Circle */}
                  <Circle
                    cx="100"
                    cy="100"
                    r={R}
                    stroke="#FABB5B"
                    strokeWidth={10}
                    fill="none"
                  />
                </Svg>
                <View className="absolute">
                  <FontAwesome6
                    size={40}
                    name='check'
                    color={Colors.gray_medium}
                  />
                </View>
              </View>

              <View>
                <ThemedText type="default" //color={Colors.support_secondary}
                color={Colors.secondary}
                className="font-poppins-medium text-center">
                  {t('services.wait_accept.scheduled.title')}
                </ThemedText>
                <ThemedText type="default" color={Colors.gray_medium} className="text-center my-2 px-5">
                  {t('services.wait_accept.scheduled.subtitle')}
                </ThemedText>
              </View>
            </View>
            <TouchOpacity
                bgColor="secondary"
                itemsCenter
                rounded="lg"
                otherClasses="py-4 mt-6"
                onPress={onClose}
                // disabled={selectedService === null}
            >
              <ThemedText type="defaultBold" //color={Colors.secondary}
              color={Colors.support_secondary}
              numberOfLines={1}>
                {t('services.wait_accept.scheduled.close')}
              </ThemedText>
            </TouchOpacity>
          </ScrollView>
        )
      }
    </SafeAreaView>
  )
}

export default WaitAccept;
