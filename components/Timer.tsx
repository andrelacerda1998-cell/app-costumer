import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from 'react'
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { CustomText } from "./CustomText";
import { ServiceInterface, ServiceStatus } from "@/types/services";
import { useTranslation } from "react-i18next";
import BackgroundTimer from 'react-native-background-timer';
import { API_ROUTES } from "@/constants/ApiRoutes";
import { renderMoney } from "@/utils/money";
import { useAppStateStatus } from "@/contexts/AppStateStatusContext";

export const CIRCLE_LENGTH = 400; // Circumference of the circle
export const R = CIRCLE_LENGTH / (2 * Math.PI); // Radius of the circle
export const TIME_TO_WAIT_FOR_VENDOR = 60; // Time in seconds
const SCHEDULED_TIME_TO_WAIT_FOR_VENDOR = 20 * 60;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const JobDetail = ({ label, value }: {label: string, value: string}) => (
  <View className="flex-row justify-between">
    <CustomText color="gray_medium" classes="w-[50%]" numberOfLines={1}>
      {label}
    </CustomText>
    <View className="items-end w-[48%]">
      <CustomText color="secondary" //color="support_secondary" 
      numberOfLines={1}>
        {value}
      </CustomText>
    </View>
  </View>
);

const Timer = ({
  service,
  refreshService,
  onTimeout,
  isScheduledOverride
}: {
  service: ServiceInterface | null;
  refreshService: () => void;
  onTimeout: () => void;
  isScheduledOverride?: boolean;
}) => {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const { appStateStatus } = useAppStateStatus();
  const isScheduledService = useMemo(() => {
    if (typeof isScheduledOverride === "boolean") return isScheduledOverride;
    if (!service) return false;
    if (service.status === ServiceStatus.SCHEDULED) return true;

    return Boolean(
      service.scheduled ||
      service.is_scheduled ||
      service.scheduled_day ||
      service.scheduled_time_start ||
      service.scheduled_time_end ||
      service.schedule ||
      service.schedule_details
    );
  }, [service, isScheduledOverride]);

  const timeToWaitForVendor = useMemo(
    () => (isScheduledService ? SCHEDULED_TIME_TO_WAIT_FOR_VENDOR : TIME_TO_WAIT_FOR_VENDOR),
    [isScheduledService]
  );
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCLE_LENGTH * (1 - progress.value),
  }));

  const serverNow = new Date((service?.server_time || service?.updated_at) as string).getTime();
  const deviceNow = Date.now();
  const [clockOffset, setClockOffset] = useState(serverNow - deviceNow);
  const getInitialTime = () => {
    const updatedAt = new Date(service?.updated_at as string).getTime();
    const now = Date.now() + clockOffset;
    return Math.max(
      0,
      Math.min(
        timeToWaitForVendor,
        Math.floor((updatedAt + timeToWaitForVendor * 1000 - now) / 1000)
      )
    );
  };
  const [remainingTime, setRemainingTime] = useState(getInitialTime());

  useEffect(() => {
    const serverNow = new Date((service?.server_time || service?.updated_at) as string).getTime();
    setClockOffset(serverNow - Date.now());
  }, [service?.updated_at]);

  useEffect(() => {
    if (remainingTime <= 0) {
      refreshService();
      onTimeout();
    }
    if (timeToWaitForVendor > 0) {
      progress.value = withTiming(remainingTime / timeToWaitForVendor, { duration: 500 });
    }
  }, [remainingTime, timeToWaitForVendor]);

  useEffect(() => {
    if (appStateStatus === "active") {
      setRemainingTime(getInitialTime());

      BackgroundTimer.runBackgroundTimer(() => {
        setRemainingTime(prev => {
          const next = getInitialTime();
          if (next <= 0) {
            BackgroundTimer.stopBackgroundTimer();
            return 0;
          }
          return next;
        });
      }, 1000);

      return () => {
        BackgroundTimer.stopBackgroundTimer();
      };
    }
  }, [appStateStatus, service?.updated_at, timeToWaitForVendor]);

  const renderRemainingTime = useMemo(() => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  }, [remainingTime])

  return (
    <View className="flex-1">
      <View>
        <CustomText size="subtitle" 
        color="secondary"
        // color="support_secondary"
        classes="text-center px-5">
          {service?.service_type?.name}
        </CustomText>
        <CustomText size="large" color="primary" boldness="medium" numberOfLines={1} classes="text-center mt-2">
          {service?.service_type?.operation_area?.name}
        </CustomText>
      </View>
      <View className="flex-1 justify-center items-center">
        <Svg width={200} height={200} viewBox="0 0 200 200">
          {/* Background Circle */}
          <Circle
            cx="100"
            cy="100"
            r={R}
            stroke="#333"
            strokeWidth={10}
            fill="none"
          />
          {/* Progress Circle */}
          <AnimatedCircle
            cx="100"
            cy="100"
            r={R}
            stroke="#FABB5B" // Orange color
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCLE_LENGTH}
            animatedProps={animatedProps}
            transform={`rotate(-90 100 100)`}
          />
        </Svg>
        <View className="absolute">
          <Ionicons
            size={40}
            name='flash'
            color={Colors.primary}
          />
        </View>
      </View>
      <View className="py-8">
        <CustomText color="secondary" //color="support_secondary" 
        boldness="medium" numberOfLines={1} classes="text-center">
          {t('services.wait_accept.pending.professional_requested')}
        </CustomText>
        <View className="flex-row justify-center items-center flex-wrap pt-2">
          <CustomText color="gray_strong" classes="text-center">
            {t('services.wait_accept.pending.professional_has')}
          </CustomText>
          <View className="w-12 items-center">
            <CustomText color="gray_strong">{renderRemainingTime}</CustomText>
          </View>
          <CustomText color="gray_strong" classes="text-center" numberOfLines={1} ellipsizeMode="tail">
            {t('services.wait_accept.pending.to_accept')}
          </CustomText>
        </View>
      </View>
      <View className="justify-end items-center space-y-2 mb-8">
          {/* <JobDetail label="Time for job" value={`${service?.service_type?.time || ""} minutes`} /> */}
          <JobDetail
            label={t('services.wait_accept.pending.distance')}
            value={`${service?.distance || ""} Km`}
          />
          <JobDetail
            label={t('services.wait_accept.pending.paid_value')}
            value={renderMoney(
              isScheduledService
                ? (service?.schedule?.price ?? service?.schedule_details?.price ?? service?.amount ?? null)
                : (service?.amount ?? null)
            ) || t('wallet.service.no_price_provided')}
          />
        </View>
    </View>
    
  )
}

export default Timer
