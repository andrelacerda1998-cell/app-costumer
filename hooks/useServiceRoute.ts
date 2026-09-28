import { useEffect, useState } from 'react';

import { API_ROUTES } from '@/constants/ApiRoutes';
import { useApi } from '@/contexts/ApiContext';
import { decodePolyline } from '@/utils/map/decodePolyline';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

const isValidCoordinate = (coord?: number) =>
  coord !== undefined && coord !== null && !isNaN(coord);

/**
 * Trajeto do técnico até à morada, tal como o backend o calcula.
 *
 * Devolve `null` enquanto não houver resposta — e também quando não houver
 * resposta nenhuma. Quem desenha decide o que fazer com isso: hoje o
 * `<Polyline>` cai numa curva entre os dois pontos, que dá a direção sem
 * fingir que conhece as ruas.
 *
 * O endpoint responde 400 quando o serviço de direções não está configurado
 * (é o caso de qualquer base local sem GOOGLE_MAPS_GEOCODING_API_KEY), por
 * isso a falha aqui é esperada e silenciosa: não há nada a dizer ao cliente
 * sobre um traço que ele nem sabe que podia existir.
 */
export const useServiceRoute = (serviceId?: number | string | null) => {
  const { api } = useApi();
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[] | null>(null);

  useEffect(() => {
    if (!serviceId) return;

    let cancelado = false;

    api.get(API_ROUTES.GET_SERVICE_ROUTE(String(serviceId)))
      .then((response) => {
        if (cancelado) return;

        const route = response?.data?.data?.route ?? response?.data?.route;
        const coordenadas = route?.coordinates;

        if (Array.isArray(coordenadas) && coordenadas.length > 0) {
          const normalizadas = coordenadas
            .map((point: { latitude?: number; longitude?: number }) => ({
              latitude: Number(point.latitude),
              longitude: Number(point.longitude),
            }))
            .filter((p: RouteCoordinate) => isValidCoordinate(p.latitude) && isValidCoordinate(p.longitude));

          if (normalizadas.length > 0) {
            setRouteCoordinates(normalizadas);
            return;
          }
        }

        if (route?.polyline) setRouteCoordinates(decodePolyline(route.polyline));
      })
      .catch(() => {
        if (__DEV__) console.log('Route API unavailable, using fallback');
      });

    return () => {
      cancelado = true;
    };
  }, [serviceId]);

  return routeCoordinates;
};

export default useServiceRoute;
