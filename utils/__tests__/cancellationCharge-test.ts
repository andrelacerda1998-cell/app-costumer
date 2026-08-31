import { isCancellationChargeable, cancellationChargeAmount } from "../cancellationCharge";
import { ServiceStatus } from "@/types/services";

describe("isCancellationChargeable", () => {
  it("cobra com o serviço em execução", () => {
    expect(isCancellationChargeable({ status: ServiceStatus.ARRIVED })).toBe(true);
  });

  it("cobra assim que o técnico se põe a caminho", () => {
    expect(
      isCancellationChargeable({
        status: ServiceStatus.ACCEPTED,
        on_the_way_at: "2026-08-31T19:00:00+00:00",
      }),
    ).toBe(true);
  });

  it("não cobra aceite mas ainda parado — ninguém se deslocou", () => {
    expect(isCancellationChargeable({ status: ServiceStatus.ACCEPTED })).toBe(false);
    expect(
      isCancellationChargeable({ status: ServiceStatus.ACCEPTED, on_the_way_at: null }),
    ).toBe(false);
  });

  it("não cobra antes de haver técnico atribuído", () => {
    expect(isCancellationChargeable({ status: ServiceStatus.PENDING })).toBe(false);
    expect(isCancellationChargeable({ status: ServiceStatus.SCHEDULED })).toBe(false);
    expect(isCancellationChargeable(null)).toBe(false);
    expect(isCancellationChargeable(undefined)).toBe(false);
  });
});

describe("cancellationChargeAmount", () => {
  it("é 100% do valor do serviço", () => {
    expect(cancellationChargeAmount({ status: ServiceStatus.ARRIVED, amount: 4800 })).toBe(4800);
  });

  it("é null quando o cancelamento não é cobrado", () => {
    expect(cancellationChargeAmount({ status: ServiceStatus.ACCEPTED, amount: 4800 })).toBeNull();
  });

  it("não inventa um valor quando o amount não é fiável", () => {
    expect(cancellationChargeAmount({ status: ServiceStatus.ARRIVED })).toBeNull();
    expect(cancellationChargeAmount({ status: ServiceStatus.ARRIVED, amount: 0 })).toBeNull();
    expect(cancellationChargeAmount({ status: ServiceStatus.ARRIVED, amount: null })).toBeNull();
    expect(cancellationChargeAmount({ status: ServiceStatus.ARRIVED, amount: NaN })).toBeNull();
  });

  it("normaliza um amount negativo (vem assim de alguns payloads)", () => {
    expect(cancellationChargeAmount({ status: ServiceStatus.ARRIVED, amount: -4800 })).toBe(4800);
  });
});
