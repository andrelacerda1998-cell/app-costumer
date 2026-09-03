import { hoursUntilSchedule, isLateCancellation, LATE_CANCEL_HOURS } from "../scheduleCancellation";

const NOW = new Date("2026-09-03T12:00:00").getTime();

describe("hoursUntilSchedule", () => {
  it("conta as horas até ao início", () => {
    expect(hoursUntilSchedule("2026-09-03", "18:00:00", NOW)).toBeCloseTo(6, 5);
    expect(hoursUntilSchedule("2026-09-05", "12:00:00", NOW)).toBeCloseTo(48, 5);
  });

  it("aceita a hora sem segundos, como vem da listagem", () => {
    expect(hoursUntilSchedule("2026-09-03", "15:00", NOW)).toBeCloseTo(3, 5);
  });

  it("sem hora assume o início do dia", () => {
    expect(hoursUntilSchedule("2026-09-04", null, NOW)).toBeCloseTo(12, 5);
  });

  it("devolve negativo para o que já passou", () => {
    expect(hoursUntilSchedule("2026-09-03", "09:00:00", NOW)).toBeCloseTo(-3, 5);
  });

  it("devolve null sem data utilizável", () => {
    expect(hoursUntilSchedule(null, "10:00:00", NOW)).toBeNull();
    expect(hoursUntilSchedule("amanhã", "10:00:00", NOW)).toBeNull();
    expect(hoursUntilSchedule("2026-13-45", "10:00:00", NOW)).toBeNull();
  });
});

describe("isLateCancellation", () => {
  it("é tarde dentro das 24 horas", () => {
    expect(isLateCancellation(1)).toBe(true);
    expect(isLateCancellation(LATE_CANCEL_HOURS)).toBe(true);
  });

  it("não é tarde com mais de um dia de antecedência", () => {
    expect(isLateCancellation(25)).toBe(false);
    expect(isLateCancellation(72)).toBe(false);
  });

  it("um serviço que já devia ter começado não é 'em cima da hora'", () => {
    expect(isLateCancellation(0)).toBe(false);
    expect(isLateCancellation(-2)).toBe(false);
    expect(isLateCancellation(null)).toBe(false);
  });
});
