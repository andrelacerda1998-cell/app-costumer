import {
  MAX_HISTORY,
  addToHistory,
  addressKey,
  formatAddressDetail,
  formatAddressLine,
  isUsable,
  removeFromHistory,
} from "../addressHistory";

const morada = (over: any = {}) => ({
  street_name: "Rua da Mata",
  street_number: "1",
  postal_code: "2565-775",
  city: "Mugideira",
  country: "Portugal",
  latitude: 39.1,
  longitude: -9.2,
  ...over,
});

describe("addressKey", () => {
  it("ignora maiúsculas e espaços a mais", () => {
    expect(addressKey(morada())).toBe(addressKey(morada({ street_name: "  rua da   mata " })));
  });

  it("distingue moradas diferentes", () => {
    expect(addressKey(morada())).not.toBe(addressKey(morada({ street_number: "2" })));
  });

  it("não usa coordenadas — o mesmo sítio geocodificado 2x não duplica", () => {
    expect(addressKey(morada())).toBe(addressKey(morada({ latitude: 39.100001, longitude: -9.200001 })));
  });
});

describe("isUsable", () => {
  it("precisa de rua e coordenadas", () => {
    expect(isUsable(morada())).toBe(true);
    expect(isUsable(morada({ street_name: "" }))).toBe(false);
    expect(isUsable(morada({ latitude: null }))).toBe(false);
    expect(isUsable(null)).toBe(false);
  });
});

describe("addToHistory", () => {
  it("a mais recente fica em primeiro", () => {
    const h = addToHistory(addToHistory([], morada()), morada({ street_number: "2" }));
    expect(h[0].street_number).toBe("2");
    expect(h).toHaveLength(2);
  });

  it("reusar uma morada promove-a em vez de duplicar", () => {
    let h = addToHistory([], morada());
    h = addToHistory(h, morada({ street_number: "2" }));
    h = addToHistory(h, morada()); // volta à primeira
    expect(h).toHaveLength(2);
    expect(h[0].street_number).toBe("1");
  });

  it("não guarda moradas incompletas", () => {
    expect(addToHistory([], morada({ street_name: "" }))).toHaveLength(0);
  });

  it("corta no máximo", () => {
    let h: any[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) h = addToHistory(h, morada({ street_number: String(i) }));
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h[0].street_number).toBe(String(MAX_HISTORY + 4));
  });

  it("guarda quando foi usada", () => {
    const h = addToHistory([], morada(), 1_700_000_000_000);
    expect(h[0].used_at).toBe(1_700_000_000_000);
  });
});

describe("removeFromHistory", () => {
  it("remove a morada indicada e deixa as outras", () => {
    let h = addToHistory([], morada());
    h = addToHistory(h, morada({ street_number: "2" }));
    const depois = removeFromHistory(h, morada());
    expect(depois).toHaveLength(1);
    expect(depois[0].street_number).toBe("2");
  });
});

describe("formatação", () => {
  it("linha principal junta rua e número", () => {
    expect(formatAddressLine(morada())).toBe("Rua da Mata 1");
  });

  it("linha secundária junta código postal, cidade e país", () => {
    expect(formatAddressDetail(morada())).toBe("2565-775 Mugideira, Portugal");
  });

  it("aguenta campos em falta sem deixar vírgulas soltas", () => {
    expect(formatAddressDetail(morada({ city: null, postal_code: null }))).toBe("Portugal");
    expect(formatAddressLine(morada({ street_number: null }))).toBe("Rua da Mata");
  });
});
