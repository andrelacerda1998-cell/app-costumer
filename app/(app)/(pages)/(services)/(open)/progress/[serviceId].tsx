import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, {useEffect, useRef, useState} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHandler, Image, Platform, ScrollView, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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
import { ServiceInterface } from "@/types/services";
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
  const serviceAddress = [openService?.address?.street_name, openService?.address?.street_number].filter(Boolean).join(' ');

  const houseLat = parseFloat(String(openService?.address?.latitude));
  const houseLng = parseFloat(String(openService?.address?.longitude));

  const vendorLat = parseFloat(String(openService?.vendor?.location?.latitude));
  const vendorLng = parseFloat(String(openService?.vendor?.location?.longitude));

  const validDestination = isValidCoordinate(houseLng) && isValidCoordinate(houseLat);
  const validUserLocation = isValidCoordinate(vendorLng) && isValidCoordinate(vendorLat);
  const distanceLabel = validDestination && validUserLocation
    ? `${haversineDistance(houseLat, houseLng, vendorLat, vendorLng).toFixed(2)} Km`
    : t('services.service.open.no_distance');

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
        console.log('Route API unavailable, using fallback');
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

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="bg-support_primary z-10">
        <View className="px-5 pt-8 pb-6 bg-primary rounded-b-3xl absolute top-0 left-0 right-0 flex-row items-center">
          <TouchableWithoutFeedback
            onPress={() => {
              if (router.canGoBack()) {
                return router.back();
              }
              router.dismissAll();
              return router.replace("/(app)/(tabs)/home");
            }}
          >
            <View className="w-10 justify-center">
              <View className="w-5 h-5">
                <ArrowIcon color={Colors.secondary} position="left" />
              </View>
            </View>
          </TouchableWithoutFeedback>

          <View className="flex-1 px-2">
            <CustomText color="secondary" boldness="semiBold" size="large" numberOfLines={1}>
              {t('services.service.open.in_progress')}
            </CustomText>
          </View>

          <View className="bg-secondary/10 border border-secondary/20 px-4 h-9 rounded-full justify-center items-center">
            <CustomText color="secondary" boldness="semiBold" size="extraSmall" numberOfLines={1}>
              {distanceLabel}
            </CustomText>
          </View>
        </View>
      </View>
        <MapView
            provider={PROVIDER_GOOGLE}
            ref={mapRef}
            mapPadding={{
                top: 50,
                right: 10,
                bottom: contentHeight ? contentHeight + (Platform.OS === 'ios' ? 10 : 80) : 400,
                left: 10,
            }}
            style={{ height: '100%', width: '100%', marginTop: 50}}
            customMapStyle={lightMapStyle}
            onPanDrag={() => { if (isFollowing) setIsFollowing(false); }}
        >
            {validDestination && (
                <Marker coordinate={{ latitude: houseLat, longitude: houseLng }} title="Destino" >
                    <FontAwesome6 name="location-dot" size={30} color={Colors.secondary}   />
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
                    strokeColor={'#FABB5B'}
                    strokeWidth={4}
                    coordinates={routeCoordinates ?? getPoints([
                        { latitude: houseLat, longitude: houseLng },
                        { latitude: vendorLat, longitude: vendorLng },
                    ])}
                />
            )}
        </MapView>
      {serviceAddress && (
        <View className="absolute top-28 left-5 right-5 z-10">
          <View className="bg-secondary/95 rounded-2xl px-4 py-3 flex-row items-center shadow-sm">
            <FontAwesome6 name="location-dot" size={16} color={Colors.primary} />
            <View className="flex-1 ml-3">
              <CustomText color="gray_medium" size="extraSmall" boldness="medium" numberOfLines={1}>
                {t('services.service.open.destination_label')}
              </CustomText>
              <CustomText color="support_secondary" size="small" boldness="semiBold" numberOfLines={1}>
                {serviceAddress}
              </CustomText>
            </View>
          </View>
        </View>
      )}
      {!isFollowing && validUserLocation && validDestination && (
        <TouchableOpacity
          onPress={recenterMap}
          style={{ position: 'absolute', right: 20, bottom: (contentHeight || 0) + 24, zIndex: 30 }}
          className="w-12 h-12 rounded-full bg-primary items-center justify-center shadow-lg"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={26} color={Colors.secondary} />
        </TouchableOpacity>
      )}
      <ServiceInProgress onContentHeightChange={setContentHeight} />
    </SafeAreaView>
  )
}

export default Progress;
