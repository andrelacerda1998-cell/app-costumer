import {
  shouldShowRoute,
  regionFor,
  MIN_DELTA,
  MAX_ROUTE_DISTANCE_KM,
} from "../map/mapFraming";

const LISBOA = { latitude: 38.7223, longitude: -9.1393 };
const PORTO = { latitude: 41.1496, longitude: -8.6109 };
const SAO_FRANCISCO = { latitude: 37.7858, longitude: -122.4064 };

describe("shouldShowRoute", () => {
  it("desenha o trajeto nas distâncias normais de um serviço ao domicílio", () => {
    expect(shouldShowRoute(0)).toBe(true);
    expect(shouldShowRoute(3.4)).toBe(true);
    expect(shouldShowRoute(MAX_ROUTE_DISTANCE_KM)).toBe(true);
  });

  it("desiste acima do limite — é dado errado, não uma viagem", () => {
    expect(shouldShowRoute(MAX_ROUTE_DISTANCE_KM + 1)).toBe(false);
    expect(shouldShowRoute(9000)).toBe(false);
  });

  it("desiste sem distância utilizável", () => {
    expect(shouldShowRoute(null)).toBe(false);
    expect(shouldShowRoute(undefined)).toBe(false);
    expect(shouldShowRoute(NaN)).toBe(false);
    expect(shouldShowRoute(-1)).toBe(false);
  });
});

describe("regionFor", () => {
  it("enquadra os dois pontos quando há trajeto", () => {
    const region = regionFor(PORTO, LISBOA, true)!;
    expect(region.latitude).toBeCloseTo((PORTO.latitude + LISBOA.latitude) / 2, 4);
    expect(region.longitude).toBeCloseTo((PORTO.longitude + LISBOA.longitude) / 2, 4);
    expect(region.latitudeDelta).toBeGreaterThan(MIN_DELTA);
  });

  it("nunca passa do zoom mínimo com o técnico à porta", () => {
    const quaseIgual = { latitude: PORTO.latitude + 0.00001, longitude: PORTO.longitude };
    const region = regionFor(PORTO, quaseIgual, true)!;
    expect(region.latitudeDelta).toBe(MIN_DELTA);
    expect(region.longitudeDelta).toBe(MIN_DELTA);
  });

  it("centra no destino quando não há trajeto a mostrar", () => {
    const region = regionFor(PORTO, SAO_FRANCISCO, false)!;
    expect(region.latitude).toBe(PORTO.latitude);
    expect(region.longitude).toBe(PORTO.longitude);
    expect(region.latitudeDelta).toBe(MIN_DELTA);
  });

  it("centra no destino quando a posição do técnico não presta", () => {
    expect(regionFor(PORTO, null, true)).toEqual({
      latitude: PORTO.latitude,
      longitude: PORTO.longitude,
      latitudeDelta: MIN_DELTA,
      longitudeDelta: MIN_DELTA,
    });
    expect(regionFor(PORTO, { latitude: NaN, longitude: 0 }, true)?.latitude).toBe(PORTO.latitude);
  });

  it("devolve null sem destino — não há nada de fiável para mostrar", () => {
    expect(regionFor(null, LISBOA, true)).toBeNull();
    expect(regionFor(undefined, LISBOA, true)).toBeNull();
    expect(regionFor({ latitude: NaN, longitude: 1 }, LISBOA, true)).toBeNull();
  });
});
