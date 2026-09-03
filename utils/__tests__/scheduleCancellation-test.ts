import {
  cancellationPenaltyAmount,
  cancellationPenaltyRatio,
  hoursUntilSchedule,
  isLateCancellation,
} from "../scheduleCancellation";

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

describe("cancellationPenaltyRatio", () => {
  it("não cobra com mais de 24 horas de antecedência", () => {
    expect(cancellationPenaltyRatio(24.1)).toBe(0);
    expect(cancellationPenaltyRatio(72)).toBe(0);
  });

  it("cobra metade dentro das 24 horas", () => {
    expect(cancellationPenaltyRatio(24)).toBe(0.5);
    expect(cancellationPenaltyRatio(10)).toBe(0.5);
    expect(cancellationPenaltyRatio(6.5)).toBe(0.5);
  });

  it("cobra três quartos dentro das 6 horas", () => {
    expect(cancellationPenaltyRatio(6)).toBe(0.75);
    expect(cancellationPenaltyRatio(2)).toBe(0.75);
    expect(cancellationPenaltyRatio(1.5)).toBe(0.75);
  });

  it("cobra tudo na última hora", () => {
    expect(cancellationPenaltyRatio(1)).toBe(1);
    expect(cancellationPenaltyRatio(0.25)).toBe(1);
  });

  it("um serviço cuja hora já passou fica no escalão máximo", () => {
    expect(cancellationPenaltyRatio(0)).toBe(1);
    expect(cancellationPenaltyRatio(-3)).toBe(1);
  });

  it("sem data não se cobra — não se inventa uma conta", () => {
    expect(cancellationPenaltyRatio(null)).toBe(0);
    expect(cancellationPenaltyRatio(NaN)).toBe(0);
  });
});

describe("cancellationPenaltyAmount", () => {
  it("aplica a percentagem ao valor do serviço", () => {
    expect(cancellationPenaltyAmount(6000, 10)).toBe(3000);
    expect(cancellationPenaltyAmount(6000, 3)).toBe(4500);
    expect(cancellationPenaltyAmount(6000, 0.5)).toBe(6000);
  });

  it("arredonda ao cêntimo", () => {
    expect(cancellationPenaltyAmount(2525, 10)).toBe(1263);
  });

  it("normaliza valores negativos, como o backend faz", () => {
    expect(cancellationPenaltyAmount(-4000, 3)).toBe(3000);
  });

  it("devolve null quando é livre ou o valor não é fiável", () => {
    expect(cancellationPenaltyAmount(6000, 48)).toBeNull();
    expect(cancellationPenaltyAmount(null, 3)).toBeNull();
    expect(cancellationPenaltyAmount(0, 3)).toBeNull();
  });
});

describe("isLateCancellation", () => {
  it("é tarde a partir do momento em que passa a haver custo", () => {
    expect(isLateCancellation(23)).toBe(true);
    expect(isLateCancellation(0.5)).toBe(true);
    expect(isLateCancellation(48)).toBe(false);
    expect(isLateCancellation(null)).toBe(false);
  });
});
