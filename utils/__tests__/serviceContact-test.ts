import {
  formatServiceAddress,
  serviceAddressExtra,
  technicianPhoneNumber,
} from "../serviceContact";

describe("formatServiceAddress", () => {
  it("usa o `name` do payload do serviço aberto — o caso que estava a falhar", () => {
    expect(
      formatServiceAddress({ name: "Avenida dos Aliados 88, Porto", additional_info: null }),
    ).toBe("Avenida dos Aliados 88, Porto");
  });

  it("prefere a forma composta quando o payload a traz", () => {
    expect(
      formatServiceAddress({
        name: "ignorar isto",
        street_name: "Rua Augusta",
        street_number: "12",
        postal_code: "1100-053",
        city: "Lisboa",
      }),
    ).toBe("Rua Augusta 12, 1100-053 Lisboa");
  });

  it("aguenta formas parciais sem deixar vírgulas soltas", () => {
    expect(formatServiceAddress({ street_name: "Rua Augusta" })).toBe("Rua Augusta");
    expect(formatServiceAddress({ city: "Lisboa" })).toBe("Lisboa");
    expect(formatServiceAddress({ street_name: "Rua Augusta", city: "Lisboa" })).toBe(
      "Rua Augusta, Lisboa",
    );
  });

  it("devolve null quando não há nada de útil", () => {
    expect(formatServiceAddress(null)).toBeNull();
    expect(formatServiceAddress(undefined)).toBeNull();
    expect(formatServiceAddress({})).toBeNull();
    expect(formatServiceAddress({ name: "   ", street_name: "" })).toBeNull();
  });

  it("cai para address_name quando é o único campo preenchido", () => {
    expect(formatServiceAddress({ address_name: "Casa" })).toBe("Casa");
  });
});

describe("serviceAddressExtra", () => {
  it("devolve o complemento e ignora vazios", () => {
    expect(serviceAddressExtra({ additional_info: "2.º esquerdo" })).toBe("2.º esquerdo");
    expect(serviceAddressExtra({ additional_info: "  " })).toBeNull();
    expect(serviceAddressExtra(null)).toBeNull();
  });
});

describe("technicianPhoneNumber", () => {
  it("lê phone_number, que é o campo que o backend envia", () => {
    expect(technicianPhoneNumber({ phone_number: "+351912345679" })).toBe("+351912345679");
  });

  it("aceita o `phone` do tipo antigo como alternativa", () => {
    expect(technicianPhoneNumber({ phone: "912345679" })).toBe("912345679");
  });

  it("limpa espaços, parênteses e hífens para o tel: funcionar", () => {
    expect(technicianPhoneNumber({ phone_number: "(848) 346-1919" })).toBe("8483461919");
    expect(technicianPhoneNumber({ phone_number: "+351 912 345 679" })).toBe("+351912345679");
  });

  it("recusa o que não é um número marcável", () => {
    expect(technicianPhoneNumber(null)).toBeNull();
    expect(technicianPhoneNumber({})).toBeNull();
    expect(technicianPhoneNumber({ phone_number: "" })).toBeNull();
    expect(technicianPhoneNumber({ phone_number: "+" })).toBeNull();
    expect(technicianPhoneNumber({ phone_number: "12345" })).toBeNull();
  });
});
