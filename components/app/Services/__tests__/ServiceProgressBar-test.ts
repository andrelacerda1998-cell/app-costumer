import { resolveProgressStep } from "../ServiceProgressBar";
import { ServiceStatus } from "@/types/services";

describe("resolveProgressStep", () => {
  it("fica em 'Aceite' enquanto o técnico não sai", () => {
    expect(resolveProgressStep({ status: ServiceStatus.ACCEPTED })).toBe(0);
    expect(resolveProgressStep({ status: ServiceStatus.ACCEPTED, on_the_way_at: null })).toBe(0);
  });

  it("avança para 'A caminho' só quando há on_the_way_at", () => {
    expect(
      resolveProgressStep({ status: ServiceStatus.ACCEPTED, on_the_way_at: "2026-08-31T19:00:00+00:00" }),
    ).toBe(1);
  });

  it("marca 'Em execução' quando chegou ao local", () => {
    expect(resolveProgressStep({ status: ServiceStatus.ARRIVED })).toBe(2);
  });

  it("marca 'Concluído' quando terminou ou fechou", () => {
    expect(resolveProgressStep({ status: ServiceStatus.FINISHED })).toBe(3);
    expect(resolveProgressStep({ status: ServiceStatus.CLOSED })).toBe(3);
  });

  it("não rebenta sem serviço nem com estados anteriores à aceitação", () => {
    expect(resolveProgressStep(null)).toBe(0);
    expect(resolveProgressStep(undefined)).toBe(0);
    expect(resolveProgressStep({ status: ServiceStatus.PENDING })).toBe(0);
  });
});
