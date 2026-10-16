/**
 * O que pode ir para o perfil do Mixpanel.
 *
 * Decisão do André (16/10/2026): a analítica continua ligada de origem, mas o
 * Mixpanel deixa de receber dados pessoais. Identifica-se o cliente só pelo id
 * interno (o `identify`), e o perfil leva apenas sinais sem identidade
 * (tem morada? telemóvel verificado? quando criou a conta?).
 *
 * Até aqui seguiam nome, email, telemóvel, NIF, data de nascimento e género.
 * Esta lista é a última barreira: mesmo que um ecrã volte a mandar um destes
 * campos, não sai do telemóvel.
 */
const DADOS_PESSOAIS = new Set([
  "$name",
  "$first_name",
  "$last_name",
  "$email",
  "$phone",
  "name",
  "email",
  "phone",
  "phone_number",
  "nif",
  "vat",
  "date_birthday",
  "birthday",
  "gender",
  "gender_id",
  "address",
  "morada",
  "iban",
]);

export const semDadosPessoais = (propriedades: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(propriedades).filter(([chave]) => !DADOS_PESSOAIS.has(chave.toLowerCase())),
  );
