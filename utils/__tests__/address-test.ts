import { formatAddressFull } from "../address";

describe("formatAddressFull", () => {
  it("junta rua, número e cidade", () => {
    expect(
      formatAddressFull({ street_name: "Rua da Horta Nova", street_number: "2", city: "Odivelas" }),
    ).toBe("Rua da Horta Nova 2, Odivelas");
  });

  it("sem número, fica a rua e a cidade", () => {
    expect(formatAddressFull({ street_name: "Campo Grande", city: "Lisboa" })).toBe("Campo Grande, Lisboa");
  });

  it("morada em texto corrido também recebe a cidade", () => {
    expect(formatAddressFull({ name: "Campo Grande 30", city: "Lisboa" })).toBe("Campo Grande 30, Lisboa");
  });

  it("não repete a cidade quando já está no texto", () => {
    expect(formatAddressFull({ name: "Campo Grande 30, Lisboa", city: "Lisboa" })).toBe("Campo Grande 30, Lisboa");
    expect(formatAddressFull({ name: "Avenida de Lisboa 5", city: "lisboa" })).toBe("Avenida de Lisboa 5");
  });

  it("sem cidade devolve o que há", () => {
    expect(formatAddressFull({ street_name: "Rua A", street_number: "7" })).toBe("Rua A 7");
  });

  it("só com cidade e país, usa-os", () => {
    expect(formatAddressFull({ city: "Porto", country: "Portugal" })).toBe("Porto Portugal");
  });

  it("sem morada devolve vazio", () => {
    expect(formatAddressFull(null)).toBe("");
    expect(formatAddressFull({})).toBe("");
  });
});
