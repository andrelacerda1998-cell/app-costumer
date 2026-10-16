import { semDadosPessoais } from "../perfilAnalitica";

describe("semDadosPessoais", () => {
  it("tira o que identifica a pessoa", () => {
    expect(
      semDadosPessoais({
        $name: "Ana Marques",
        $email: "ana@exemplo.pt",
        $phone: "+351912000111",
        nif: "123456789",
        date_birthday: "1990-01-01",
        gender_id: 2,
      }),
    ).toEqual({});
  });

  it("deixa passar os sinais sem identidade", () => {
    expect(
      semDadosPessoais({
        has_address: true,
        phone_number_verified_at: "2026-10-01T10:00:00Z",
        email_verified_at: null,
        created_at: "2026-09-01T10:00:00Z",
      }),
    ).toEqual({
      has_address: true,
      phone_number_verified_at: "2026-10-01T10:00:00Z",
      email_verified_at: null,
      created_at: "2026-09-01T10:00:00Z",
    });
  });

  it("não se deixa enganar por maiúsculas", () => {
    expect(semDadosPessoais({ Email: "ana@exemplo.pt", NIF: "123456789" })).toEqual({});
  });
});
