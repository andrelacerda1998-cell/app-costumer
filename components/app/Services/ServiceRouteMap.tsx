import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import UserAvatarIcon from '@/assets/icons/user-avatar';
import { Colors } from '@/constants/Colors';
import { useService } from '@/contexts/ServiceContext';
import { ServiceInterface } from '@/types/services';
import useServiceRoute from '@/hooks/useServiceRoute';
import haversineDistance from '@/utils/map/distanceCoords';
import { getPoints } from '@/utils/map/getPoints';
import lightMapStyle from '@/utils/map/lightMapStyle';
import { regionFor, shouldShowRoute } from '@/utils/map/mapFraming';
import { mapProvider } from '@/utils/map/mapProvider';
import { formatServiceAddress, serviceAddressExtra } from '@/utils/serviceContact';

const isValidCoordinate = (coord?: number) =>
  coord !== undefined && coord !== null && !isNaN(coord);

// Deslocamento mínimo (~5,5 m) para a câmara reenquadrar quando o vendor se move.
const MIN_RECENTER_DEGREES = 0.00005;

// Folga à volta dos dois pontos na pré-visualização. Ver regionFor: a caixa é
// baixa e larga, e com a folga do ecrã grande o trajeto ficava um risco.
const PREVIEW_SLACK = 1.15;

/** Barra "Acompanhar em direto", no fundo da pré-visualização. */
export const PREVIEW_FOOTER_HEIGHT = 44;

/**
 * Há morada com coordenadas para enquadrar?
 *
 * Quem desenha à volta do mapa precisa de saber isto ANTES de montar o cartão:
 * sem morada não há mapa, e um cartão vazio com uma barra por baixo é pior do
 * que um botão.
 */
export const hasMapCoordinates = (service?: ServiceInterface | null) =>
  isValidCoordinate(parseFloat(String(service?.address?.latitude))) &&
  isValidCoordinate(parseFloat(String(service?.address?.longitude)));

interface Props {
  /**
   * Interativo, o mapa segue o técnico e pode ser arrastado e reenquadrado —
   * é o ecrã de acompanhamento. Sem isto é uma pré-visualização: nem arrasta
   * nem segue, e o toque serve para abrir o acompanhamento a sério, senão o
   * cliente fica a lutar com um mapa dentro de uma lista que também rola.
   */
  interactive?: boolean;
  /** Só usado quando não é interativo. */
  onPress?: () => void;
  /** O que mostrar quando não há coordenadas para enquadrar. */
  fallback?: ReactNode;
}

/**
 * O técnico, a morada e o caminho entre os dois.
 *
 * Vive fora dos ecrãs porque aparece em dois: na vista geral do serviço, em
 * pequeno, e no acompanhamento, em grande. Duplicá-lo era garantir que um dos
 * dois ficava para trás — os marcadores, o traço e o enquadramento são a mesma
 * decisão nos dois sítios.
 */
const ServiceRouteMap = ({ interactive = false, onPress, fallback = null }: Props) => {
  const { t } = useTranslation();
  const { openService } = useService();
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);
  const lastCenteredRef = useRef<{ lat: number; lng: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);

  const routeCoordinates = useServiceRoute(openService?.id);

  const houseLat = parseFloat(String(openService?.address?.latitude));
  const houseLng = parseFloat(String(openService?.address?.longitude));
  const vendorLat = parseFloat(String(openService?.vendor?.location?.latitude));
  const vendorLng = parseFloat(String(openService?.vendor?.location?.longitude));

  const validDestination = isValidCoordinate(houseLat) && isValidCoordinate(houseLng);
  const validUserLocation = isValidCoordinate(vendorLat) && isValidCoordinate(vendorLng);

  const distanceKm = validDestination && validUserLocation
    ? haversineDistance(houseLat, houseLng, vendorLat, vendorLng)
    : null;

  // Trajeto só quando a distância é de um serviço ao domicílio. Acima disso a
  // posição do técnico não é de confiança — ver utils/map/mapFraming.
  const withRoute = shouldShowRoute(distanceKm);

  // Enquadramento de arranque. Sem `initialRegion`, o MapView abre onde o
  // sistema quer — vimos o país inteiro com uma rota imaginária — e só corrigia
  // quando o técnico se mexia ou o cliente carregava em recentrar.
  const initialRegion = regionFor(
    validDestination ? { latitude: houseLat, longitude: houseLng } : null,
    validUserLocation ? { latitude: vendorLat, longitude: vendorLng } : null,
    withRoute,
    interactive ? undefined : PREVIEW_SLACK,
  );

  const centerMap = () => {
    if (!mapRef.current || !validDestination) return;

    const region = regionFor(
      { latitude: houseLat, longitude: houseLng },
      validUserLocation ? { latitude: vendorLat, longitude: vendorLng } : null,
      withRoute,
    );
    if (region) mapRef.current.animateToRegion(region, 1000);
  };

  const recenterMap = () => {
    setIsFollowing(true);
    if (mapRef.current && validUserLocation && validDestination) {
      lastCenteredRef.current = { lat: vendorLat, lng: vendorLng };
      centerMap();
    }
  };

  useEffect(() => {
    if (!interactive) return;
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
  }, [interactive, vendorLat, vendorLng, validUserLocation, validDestination, isFollowing]);

  // Sem coordenadas não há nada para enquadrar, e um mapa do mundo com uma rota
  // imaginária informa menos do que não mostrar mapa nenhum.
  if (!initialRegion) return <>{fallback}</>;

  const serviceAddress = formatServiceAddress(openService?.address);
  const serviceAddressDetail = serviceAddressExtra(openService?.address);

  const mapa = (
    <MapView
      provider={mapProvider()}
      ref={mapRef}
      initialRegion={initialRegion}
      // Na pré-visualização a margem de baixo é a da barra "Acompanhar em
      // direto": sem ela, o marcador da casa aparecia por trás da barra.
      mapPadding={interactive ? { top: 20, right: 10, bottom: 90, left: 10 } : { top: 12, right: 12, bottom: PREVIEW_FOOTER_HEIGHT, left: 12 }}
      style={{ height: '100%', width: '100%' }}
      customMapStyle={lightMapStyle}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      // Na pré-visualização o mapa não recebe toques: quem os recebe é o cartão
      // à volta, para o toque abrir o acompanhamento em vez de mover o mapa.
      pointerEvents={interactive ? 'auto' : 'none'}
      onPanDrag={() => { if (interactive && isFollowing) setIsFollowing(false); }}
    >
      {validDestination && (
        <Marker
          coordinate={{ latitude: houseLat, longitude: houseLng }}
          title={t('services.service.open.destination_marker')}
          description={[serviceAddress, serviceAddressDetail].filter(Boolean).join(' · ') || undefined}
        >
          <View
            className="w-9 h-9 rounded-full items-center justify-center border-2 border-white"
            style={{ backgroundColor: Colors.secondary }}
          >
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
                  source={{ uri: openService.vendor.user.avatar.small }}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <UserAvatarIcon />
              )}
            </View>
          </View>
        </Marker>
      )}

      {validUserLocation && validDestination && withRoute && (
        <Polyline
          strokeColor="#FABB5B"
          strokeWidth={4}
          coordinates={routeCoordinates ?? getPoints([
            { latitude: houseLat, longitude: houseLng },
            { latitude: vendorLat, longitude: vendorLng },
          ])}
        />
      )}
    </MapView>
  );

  if (!interactive) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ flex: 1 }}>
        {mapa}
      </TouchableOpacity>
    );
  }

  return (
    <>
      {mapa}
      {!isFollowing && validUserLocation && validDestination && (
        <TouchableOpacity
          onPress={recenterMap}
          style={{ position: 'absolute', right: 16, top: 16, zIndex: 30 }}
          className="w-11 h-11 rounded-full bg-primary items-center justify-center shadow-lg"
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={Colors.secondary} />
        </TouchableOpacity>
      )}
    </>
  );
};

export default ServiceRouteMap;
