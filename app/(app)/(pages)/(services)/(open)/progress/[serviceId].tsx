import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, {useEffect, useRef, useState} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler, Dimensions, Image, Linking, Platform, ScrollView, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import TouchOpacity from '@/components/TouchOpacity';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import useEcho from '@/hooks/echo';
import { useApi } from '@/contexts/ApiContext';
import { jwtDecode } from 'jwt-decode';
import { useSession } from '@/contexts/SessionContext';
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import { API_ROUTES } from "@/constants/ApiRoutes";
import Timer, { R, TIME_TO_WAIT_FOR_VENDOR } from "@/components/Timer";
import { ServiceInterface, ServiceStatus } from "@/types/services";
import { buildCountdownInfo } from "@/utils/serviceCountdown";
import { formatServiceAddress, serviceAddressExtra, technicianPhoneNumber } from "@/utils/serviceContact";
import ServiceInProgress from "@/components/modals/services/ServiceInProgress";
import { useService } from "@/contexts/ServiceContext";
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from "react-native-maps";
import {getPoints} from "@/utils/map/getPoints";
import {decodePolyline} from "@/utils/map/decodePolyline";
import UserAvatarIcon from "@/assets/icons/user-avatar";
import { useTranslation } from "react-i18next";
import ArrowIcon from "@/assets/icons/arrow";
import haversineDistance from "@/utils/map/distanceCoords";

const isValidCoordinate = (coord?: number) =>
    coord !== undefined && coord !== null && !isNaN(coord);

// Deslocamento mínimo (~5,5 m) para a câmara reenquadrar quando o vendor se move.
const MIN_RECENTER_DEGREES = 0.00005;

const lightMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f9f9f9' }]
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#555555' }]
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#e0e0e0' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0b0' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#d4d4d4' }]
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#eaeaea' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a0a0a0' }]
  }
];

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

const Progress = () => {
  const { t } = useTranslation();
  const { openService } = useService();
  const { api } = useApi();
  const mapRef = useRef<MapView|null>(null);
  const hasCenteredRef = useRef(false);
  const lastCenteredRef = useRef<{ lat: number; lng: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[] | null>(null);
  // Ver utils/serviceContact: o payload do serviço aberto manda a morada como
  // `name`, e esta linha só olhava para street_name — o destino nunca aparecia.
  const serviceAddress = formatServiceAddress(openService?.address);
  const serviceAddressDetail = serviceAddressExtra(openService?.address);
  const technicianPhone = technicianPhoneNumber(openService?.vendor?.user);
  const callTechnician = () => {
    if (!technicianPhone) return;
    Linking.openURL(`tel:${technicianPhone}`).catch(() => {});
  };

  const houseLat = parseFloat(String(openService?.address?.latitude));
  const houseLng = parseFloat(String(openService?.address?.longitude));

  const vendorLat = parseFloat(String(openService?.vendor?.location?.latitude));
  const vendorLng = parseFloat(String(openService?.vendor?.location?.longitude));

  const validDestination = isValidCoordinate(houseLng) && isValidCoordinate(houseLat);
  const validUserLocation = isValidCoordinate(vendorLng) && isValidCoordinate(vendorLat);
  const distanceKm = validDestination && validUserLocation
    ? haversineDistance(houseLat, houseLng, vendorLat, vendorLng)
    : null;
  const distanceLabel = distanceKm !== null
    ? `${distanceKm.toFixed(2)} ${t('services.service.history.labels.km')}`
    : t('services.service.open.no_distance');
  // ETA estimado: velocidade urbana média ~22 km/h. Aproximação — não é um
  // dado do backend; arredondado a 5 min (min. 5) para não fingir precisão.
  const etaMinutes = distanceKm !== null
    ? Math.max(5, Math.round((distanceKm / 22) * 60 / 5) * 5)
    : null;

  // Já chegou ao local: a partir daqui não há "a caminho" nem ETA — o que
  // interessa é quanto falta para acabar. É a mesma conta da Live Activity
  // (buildCountdownInfo), para o ecrã e o ecrã bloqueado não se contradizerem.
  const hasArrived = openService?.status === ServiceStatus.ARRIVED;
  const countdown = buildCountdownInfo(openService);
  const minutesLeft = countdown.active
    ? Math.max(1, Math.ceil(countdown.secondsRemaining / 60))
    : null;

  useEffect(() => {
    const fetchRoute = async () => {
      if (!openService?.id) return;

      try {
        const response = await api.get(API_ROUTES.GET_SERVICE_ROUTE(String(openService.id)));
        const route = response?.data?.data?.route ?? response?.data?.route;
        const routeCoords = route?.coordinates;
        const polyline = route?.polyline;

        if (Array.isArray(routeCoords) && routeCoords.length > 0) {
          const normalized = routeCoords
            .map((point: { latitude?: number; longitude?: number }) => ({
              latitude: Number(point.latitude),
              longitude: Number(point.longitude),
            }))
            .filter((point) => isValidCoordinate(point.latitude) && isValidCoordinate(point.longitude));
          if (normalized.length > 0) {
            setRouteCoordinates(normalized);
            return;
          }
        }

        if (polyline) {
          const decoded = decodePolyline(polyline);
          setRouteCoordinates(decoded);
        }
      } catch (error) {
        // Fallback to curved line (getPoints) - route coordinates stays null
        if (__DEV__) console.log('Route API unavailable, using fallback');
      }
    };

    fetchRoute();
  }, [openService?.id]);

  useEffect(() => {
    if (!mapRef.current || !validUserLocation || !validDestination || !isFollowing) return;

    // Primeira centralização: uma única vez.
    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      lastCenteredRef.current = { lat: vendorLat, lng: vendorLng };
      centerMap();
      return;
    }

    // Depois: só reenquadra se o vendor moveu mais que o deslocamento mínimo.
    const last = lastCenteredRef.current!;
    const movedEnough =
      Math.abs(last.lat - vendorLat) > MIN_RECENTER_DEGREES ||
      Math.abs(last.lng - vendorLng) > MIN_RECENTER_DEGREES;
    if (!movedEnough) return;

    lastCenteredRef.current = { lat: vendorLat, lng: vendorLng };
    centerMap();
  }, [vendorLat, vendorLng, validUserLocation, validDestination, isFollowing]);

  const centerMap = () => {
    if (mapRef.current && validUserLocation && validDestination) {
      mapRef.current.animateToRegion({
        latitude: (houseLat + vendorLat) / 2,
        longitude: (houseLng + vendorLng) / 2,
        latitudeDelta: Math.abs(houseLat - vendorLat) * 1.5,
        longitudeDelta: Math.abs(houseLng - vendorLng) * 1.5,
      }, 1000);
    }
  }

  const recenterMap = () => {
    setIsFollowing(true);
    if (mapRef.current && validUserLocation && validDestination) {
      lastCenteredRef.current = { lat: vendorLat, lng: vendorLng };
      centerMap();
    }
  }

  // console.log({contentHeight})

  const { height: screenH } = Dimensions.get("window");
  const mapHeight = Math.round(screenH * 0.42);
  const includes = openService?.service_type?.includes ?? [];
  const excludes = openService?.service_type?.excludes ?? [];
  const vendorName = openService?.vendor?.user?.name ?? "";
  const durMins = openService?.service_type?.time;
  const durLabel = typeof durMins === "number" && durMins > 0
    ? (durMins < 60 ? `${durMins} min` : `${Math.floor(durMins / 60)}h${durMins % 60 > 0 ? String(durMins % 60).padStart(2, "0") : ""}`)
    : null;
  const cap = (txt: string) => txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={["top", "left", "right"]}>
      <View className="px-5 pt-3 pb-3 bg-primary flex-row items-center">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) return router.back();
            router.dismissAll();
            return router.replace("/(app)/(tabs)/home");
          }}
          className="w-9 justify-center"
        >
          <View className="w-5 h-5">
            <ArrowIcon color={Colors.secondary} position="left" />
          </View>
        </TouchableOpacity>
        <CustomText color="secondary" boldness="bold" size="large" numberOfLines={1}>
          {t("services.service.open.tracking_header")}
        </CustomText>
      </View>

      {/* Mapa */}
      <View style={{ height: mapHeight }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          ref={mapRef}
          mapPadding={{ top: 20, right: 10, bottom: 90, left: 10 }}
          style={{ height: "100%", width: "100%" }}
          customMapStyle={lightMapStyle}
          onPanDrag={() => { if (isFollowing) setIsFollowing(false); }}
        >
          {validDestination && (
            <Marker coordinate={{ latitude: houseLat, longitude: houseLng }} title={t("services.service.open.destination_marker")}>
              <View className="w-9 h-9 rounded-full items-center justify-center border-2 border-white" style={{ backgroundColor: Colors.secondary }}>
                <FontAwesome6 name="house" size={15} color={Colors.support_secondary} />
              </View>
            </Marker>
          )}
          {validUserLocation && (
            <Marker coordinate={{ latitude: vendorLat, longitude: vendorLng }}>
              <View className="border-2 border-[#C3A5FF] rounded-full w-12 h-12 items-center justify-center p-2 bg-[#C3A5FF]/50">
                <View className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary">
                  {openService?.vendor?.user?.avatar?.small ? (
                    <Image
                      src={openService?.vendor?.user?.avatar?.small}
                      source={{ uri: openService?.vendor?.user?.avatar?.small }}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <UserAvatarIcon />
                  )}
                </View>
              </View>
            </Marker>
          )}
          {validUserLocation && validDestination && (
            <Polyline
              strokeColor={"#FABB5B"}
              strokeWidth={4}
              coordinates={routeCoordinates ?? getPoints([
                { latitude: houseLat, longitude: houseLng },
                { latitude: vendorLat, longitude: vendorLng },
              ])}
            />
          )}
        </MapView>

        {!isFollowing && validUserLocation && validDestination && (
          <TouchableOpacity
            onPress={recenterMap}
            style={{ position: "absolute", right: 16, top: 16, zIndex: 30 }}
            className="w-11 h-11 rounded-full bg-primary items-center justify-center shadow-lg"
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        )}

        {/* "está a caminho" */}
        {vendorName ? (
          <View className="absolute left-4 right-4 bottom-3">
            <View className="bg-support_secondary rounded-2xl px-4 py-3 flex-row items-center" style={{ shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
              <View className="w-11 h-11 rounded-full items-center justify-center mr-3" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
                <Ionicons name={hasArrived ? "construct" : "car"} size={20} color={Colors.secondary} />
              </View>
              <View className="flex-1">
                <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                  {hasArrived
                    ? t("services.service.open.working_here", { name: vendorName })
                    : t("services.service.open.on_the_way", { name: vendorName })}
                </CustomText>
                <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                  {hasArrived
                    ? (minutesLeft
                        ? t("services.service.open.time_left", { min: minutesLeft })
                        : t("services.service.open.arrived"))
                    : (etaMinutes
                        ? t("services.service.open.eta", { min: etaMinutes })
                        : t("services.service.open.eta_arriving"))}
                </CustomText>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* Conteúdo */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* Técnico + Chat */}
        <View className="bg-support_secondary rounded-2xl p-4 flex-row items-center mb-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <View className="h-12 w-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
            {openService?.vendor?.user?.avatar?.small ? (
              <Image source={{ uri: openService.vendor.user.avatar.small }} className="w-full h-full" />
            ) : (
              <View className="w-full h-full items-center justify-center" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
                <Feather name="user" size={22} color={Colors.secondary} />
              </View>
            )}
          </View>
          <View className="flex-1">
            <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
              {vendorName}
            </CustomText>
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="shield-checkmark" size={13} color={Colors.success} />
              <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1" numberOfLines={1}>
                {t("services.select_vendor.verified_badge")}
              </CustomText>
            </View>
          </View>
          {!!technicianPhone && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={callTechnician}
              accessibilityLabel={t("services.service_overview.call")}
              className="rounded-full items-center justify-center mr-2"
              style={{ width: 42, height: 42, borderWidth: 1.5, borderColor: Colors.secondary }}
            >
              <Ionicons name="call" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/(app)/(pages)/(services)/(open)/(chat)/service/${openService?.id}`)}
            className="rounded-full px-4 py-2.5 flex-row items-center"
            style={{ backgroundColor: Colors.secondary }}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color={Colors.primary} />
            <CustomText color="support_secondary" size="small" boldness="bold" classes="ml-1.5">
              {t("chat.title")}
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Destino */}
        {serviceAddress ? (
          <View className="rounded-2xl p-4 mb-5 flex-row items-start" style={{ backgroundColor: "rgba(250,187,91,0.15)" }}>
            <Feather name="map-pin" size={18} color={Colors.secondary} style={{ marginTop: 1 }} />
            <View className="flex-1 ml-3">
              <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                {t("services.service.open.destination_label")}
              </CustomText>
              <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={3}>
                {serviceAddress}
              </CustomText>
              {!!serviceAddressDetail && (
                <CustomText color="gray_strong" size="small" boldness="regular" numberOfLines={2}>
                  {serviceAddressDetail}
                </CustomText>
              )}
            </View>
          </View>
        ) : null}

        {/* Estado do serviço */}
        <CustomText color="secondary" size="large" boldness="bold" classes="mb-3">
          {t("services.service.open.service_state")}
        </CustomText>
        <View className="bg-support_secondary rounded-2xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <View className="flex-row items-center mb-3">
            <Ionicons name="flash" size={18} color={Colors.secondary} />
            <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2 flex-1" numberOfLines={2}>
              {openService?.service_type?.name}
            </CustomText>
            {durLabel && (
              <CustomText color="gray_medium" size="small" boldness="regular">
                {durLabel}
              </CustomText>
            )}
          </View>

          {includes.length > 0 && (
            <View className="mb-2">
              <CustomText color="secondary" size="small" boldness="bold" classes="mb-2">
                {t("services.select_service_type.includes")}
              </CustomText>
              {includes.map((item, i) => (
                <View key={`inc-${i}`} className="flex-row items-start mb-1.5">
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={{ marginTop: 1 }} />
                  <CustomText color="secondary" size="small" boldness="regular" classes="ml-2 flex-1">
                    {cap(item)}
                  </CustomText>
                </View>
              ))}
            </View>
          )}

          {excludes.length > 0 && (
            <View className="mt-1">
              <CustomText color="secondary" size="small" boldness="bold" classes="mb-2">
                {t("services.select_service_type.excludes")}
              </CustomText>
              {excludes.map((item, i) => (
                <View key={`exc-${i}`} className="flex-row items-start mb-1.5">
                  <Ionicons name="close-circle" size={16} color={Colors.error} style={{ marginTop: 1 }} />
                  <CustomText color="secondary" size="small" boldness="regular" classes="ml-2 flex-1">
                    {cap(item)}
                  </CustomText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Precisa de ajuda */}
        <TouchableOpacity
          onPress={() => router.navigate({ pathname: "/(app)/(modals)/support-ticket", params: { serviceId: String(openService?.id ?? "") } })}
          className="flex-row items-center justify-center mt-5 py-2"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.gray_medium} />
          <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-2">
            {t("general.need_help")}
          </CustomText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Progress;
