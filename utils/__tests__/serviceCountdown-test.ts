import {
  buildCountdownInfo,
  formatMinutesLeft,
  clockSkewMs,
  estimatedEndAtMs,
  secondsRemaining,
} from "../serviceCountdown";
import { ServiceStatus } from "@/types/services";

const iso = (ms: number) => new Date(ms).toISOString();

describe("estimatedEndAtMs", () => {
  it("fim = chegada + duração (em minutos)", () => {
    const arrived = Date.parse("2026-08-19T10:00:00Z");
    expect(estimatedEndAtMs(iso(arrived), 90)).toBe(arrived + 90 * 60_000);
  });

  it("sem chegada não há fim (ainda a caminho)", () => {
    expect(estimatedEndAtMs(null, 90)).toBeNull();
    expect(estimatedEndAtMs(undefined, 90)).toBeNull();
  });

  it("sem duração válida não há fim", () => {
    expect(estimatedEndAtMs(iso(Date.now()), 0)).toBeNull();
    expect(estimatedEndAtMs(iso(Date.now()), undefined)).toBeNull();
    expect(estimatedEndAtMs(iso(Date.now()), -30)).toBeNull();
  });

  it("data inválida devolve null em vez de NaN", () => {
    expect(estimatedEndAtMs("não é data", 90)).toBeNull();
  });
});

describe("secondsRemaining", () => {
  it("conta o que falta, arredondando para cima", () => {
    expect(secondsRemaining(10_000, 4_500)).toBe(6);
  });

  it("nunca passa a negativo — passou do fim conta zero", () => {
    expect(secondsRemaining(1_000, 9_999)).toBe(0);
  });

  it("sem fim é zero", () => {
    expect(secondsRemaining(null, 123)).toBe(0);
  });
});

describe("clockSkewMs", () => {
  it("mede o desvio servidor − telemóvel", () => {
    const serverNow = Date.parse("2026-08-19T12:00:05Z"); // servidor 5s à frente
    const deviceNow = Date.parse("2026-08-19T12:00:00Z");
    expect(clockSkewMs(iso(serverNow), deviceNow)).toBe(5_000);
  });

  it("sem server_time assume desvio zero", () => {
    expect(clockSkewMs(null, Date.now())).toBe(0);
  });
});

describe("buildCountdownInfo", () => {
  const base = (over: any = {}) => ({
    status: ServiceStatus.ARRIVED,
    arrived_at: "2026-08-19T10:00:00Z",
    server_time: "2026-08-19T10:30:00Z",
    service_type: { name: "Desentupimento de Cano", time: 90 },
    vendor: { user: { name: "Afonso Neto" } },
    ...over,
  }) as any;

  it("com o técnico no local, reúne nome, serviço e o que falta", () => {
    // chegou 10:00, dura 90min -> fim 11:30; agora (server) 10:30 -> faltam 60min
    const info = buildCountdownInfo(base(), Date.parse("2026-08-19T10:30:00Z"));
    expect(info.active).toBe(true);
    expect(info.technicianName).toBe("Afonso Neto");
    expect(info.serviceType).toBe("Desentupimento de Cano");
    expect(info.secondsRemaining).toBe(60 * 60);
  });

  it("conta contra o relógio dado — o fim é ancorado no servidor", () => {
    // fim 11:30; agora 11:00 -> faltam 30min, independentemente do server_time
    const info = buildCountdownInfo(base(), Date.parse("2026-08-19T11:00:00Z"));
    expect(info.secondsRemaining).toBe(30 * 60);
  });

  it("a caminho (ACCEPTED) ainda não conta", () => {
    expect(buildCountdownInfo(base({ status: ServiceStatus.ACCEPTED }), Date.now()).active).toBe(false);
  });

  it("terminado não conta", () => {
    expect(buildCountdownInfo(base({ status: ServiceStatus.FINISHED }), Date.now()).active).toBe(false);
  });

  it("sem serviço devolve inativo, não rebenta", () => {
    expect(buildCountdownInfo(null).active).toBe(false);
    expect(buildCountdownInfo(undefined).active).toBe(false);
  });

  it("passou da estimativa: continua ativo mas a zero (não finge que acabou)", () => {
    const info = buildCountdownInfo(base(), Date.parse("2026-08-19T13:00:00Z"));
    expect(info.active).toBe(true);
    expect(info.secondsRemaining).toBe(0);
  });
});

describe("formatMinutesLeft", () => {
  it("abaixo da hora fica em minutos", () => {
    expect(formatMinutesLeft(1)).toBe("1 min");
    expect(formatMinutesLeft(45)).toBe("45 min");
    expect(formatMinutesLeft(59)).toBe("59 min");
  });

  it("acima da hora escreve horas e minutos", () => {
    expect(formatMinutesLeft(60)).toBe("1h");
    expect(formatMinutesLeft(75)).toBe("1h e 15min");
    expect(formatMinutesLeft(78)).toBe("1h e 18min");
    expect(formatMinutesLeft(120)).toBe("2h");
    expect(formatMinutesLeft(145)).toBe("2h e 25min");
  });

  it("arredonda para cima e aguenta valores inválidos", () => {
    expect(formatMinutesLeft(74.2)).toBe("1h e 15min");
    expect(formatMinutesLeft(0)).toBe("0 min");
    expect(formatMinutesLeft(-5)).toBe("0 min");
    expect(formatMinutesLeft(NaN)).toBe("0 min");
  });
});
