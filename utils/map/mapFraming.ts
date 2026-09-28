/**
 * Enquadramento do mapa de acompanhamento.
 *
 * O cálculo anterior era `|casa - técnico| * 1.5` em cada eixo, sem mínimo nem
 * máximo. Isso dá dois extremos maus:
 *  - técnico à porta → delta quase zero → zoom exagerado, sem contexto nenhum;
 *  - coordenadas disparatadas (técnico noutro continente, como acontece com
 *    dados de seed) → o mapa abre o planeta e traça uma rota que não existe.
 *
 * Aqui há um zoom mínimo, e acima de uma distância que nenhum serviço ao
 * domicílio tem deixa de se fingir que há trajeto: mostra-se o destino.
 */

export type Coordinate = { latitude: number; longitude: number };

export type MapRegion = Coordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

/** ~1,1 km de lado. Abaixo disto o mapa deixa de dar contexto. */
export const MIN_DELTA = 0.01;

/**
 * Acima disto assume-se que a posição do técnico não é de confiança.
 * Um serviço ao domicílio não tem o técnico a 150 km do cliente; quando isso
 * aparece, é dado errado — e traçar a rota só ampliaria o erro.
 */
export const MAX_ROUTE_DISTANCE_KM = 150;

export const isValidCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isValidPoint = (point?: Coordinate | null): point is Coordinate =>
  !!point && isValidCoordinate(point.latitude) && isValidCoordinate(point.longitude);

/** Vale a pena desenhar o trajeto entre os dois pontos? */
export const shouldShowRoute = (distanceKm: number | null | undefined): boolean => {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) return false;
  return distanceKm >= 0 && distanceKm <= MAX_ROUTE_DISTANCE_KM;
};

/**
 * Região a mostrar.
 *
 * Com trajeto, enquadra os dois pontos (com a folga pedida — 1,5 por omissão —
 * mas nunca abaixo do zoom mínimo). Sem trajeto — longe demais, ou sem posição do técnico
 * — centra no destino, que é o ponto de que temos a certeza.
 */
export const regionFor = (
  destination: Coordinate | null | undefined,
  vendor: Coordinate | null | undefined,
  withRoute: boolean,
  /**
   * Folga à volta dos dois pontos. 1,5 é o valor do ecrã de acompanhamento,
   * onde o mapa é alto e a folga dá contexto. Numa pré-visualização baixa e
   * larga a mesma folga afasta a câmara: o sistema estica o lado maior para
   * respeitar a proporção da vista, e o trajeto fica um risco no meio de
   * quilómetros de nada. Aí pede-se menos.
   */
  slack: number = 1.5,
): MapRegion | null => {
  if (!isValidPoint(destination)) return null;

  if (!withRoute || !isValidPoint(vendor)) {
    return {
      latitude: destination.latitude,
      longitude: destination.longitude,
      latitudeDelta: MIN_DELTA,
      longitudeDelta: MIN_DELTA,
    };
  }

  return {
    latitude: (destination.latitude + vendor.latitude) / 2,
    longitude: (destination.longitude + vendor.longitude) / 2,
    latitudeDelta: Math.max(MIN_DELTA, Math.abs(destination.latitude - vendor.latitude) * slack),
    longitudeDelta: Math.max(MIN_DELTA, Math.abs(destination.longitude - vendor.longitude) * slack),
  };
};
