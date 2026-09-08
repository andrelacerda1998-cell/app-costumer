import { formatDurationLong } from "../duration";

// Espelho das traduções pt-PT, para o teste falhar se o formato mudar.
const t = (key: string, options?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    "duration.minutes": `${options?.minutes} minutos`,
    "duration.hour_one": "1 hora",
    "duration.hours": `${options?.hours} horas`,
    "duration.and_minutes": `e ${options?.minutes} min`,
  };
  return map[key] ?? key;
};

describe("formatDurationLong", () => {
  it("abaixo da hora fica em minutos", () => {
    expect(formatDurationLong(30, t)).toBe("30 minutos");
    expect(formatDurationLong(59, t)).toBe("59 minutos");
  });

  it("uma hora certa é singular", () => {
    expect(formatDurationLong(60, t)).toBe("1 hora");
  });

  it("horas e minutos juntos", () => {
    expect(formatDurationLong(90, t)).toBe("1 hora e 30 min");
    expect(formatDurationLong(150, t)).toBe("2 horas e 30 min");
  });

  it("várias horas certas ficam no plural, sem minutos pendurados", () => {
    expect(formatDurationLong(120, t)).toBe("2 horas");
    expect(formatDurationLong(180, t)).toBe("3 horas");
  });

  it("sem duração utilizável devolve null", () => {
    expect(formatDurationLong(0, t)).toBeNull();
    expect(formatDurationLong(-10, t)).toBeNull();
    expect(formatDurationLong(null, t)).toBeNull();
    expect(formatDurationLong(undefined, t)).toBeNull();
    expect(formatDurationLong(NaN, t)).toBeNull();
  });
});
