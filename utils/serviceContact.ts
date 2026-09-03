/**
 * Morada e telefone do serviço em curso, a partir do payload que o backend
 * envia ao cliente.
 *
 * Existe porque os ecrãs assumiam UMA forma da morada (street_name +
 * street_number + postal_code + city) e o payload do serviço aberto envia
 * outra: `{ name: "Avenida dos Aliados 88, Porto" }`. Resultado: a linha da
 * morada era sempre nula e desaparecia do ecrã — num ecrã de serviço em curso.
 * O mesmo com o telefone do técnico, que chega como `phone_number` enquanto o
 * tipo declara `phone`.
 *
 * Em vez de escolher uma das formas e partir a outra, aceitam-se as duas.
 */

type AddressLike = {
  name?: string | null;
  address_name?: string | null;
  street_name?: string | null;
  street_number?: string | null;
  postal_code?: string | null;
  city?: string | null;
  additional_info?: string | null;
} | null | undefined;

const clean = (value?: string | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Etiqueta da morada para leitura humana, ou null se não há nada de útil.
 * Prefere-se a forma composta (rua + número, código postal + cidade) quando
 * existe; `name` é o que vem no payload do serviço aberto.
 */
export const formatServiceAddress = (address: AddressLike): string | null => {
  if (!address) return null;

  const street = [clean(address.street_name), clean(address.street_number)]
    .filter(Boolean)
    .join(" ");
  const locality = [clean(address.postal_code), clean(address.city)]
    .filter(Boolean)
    .join(" ");
  const composed = [street, locality].filter(Boolean).join(", ");

  return clean(composed) ?? clean(address.name) ?? clean(address.address_name);
};

/**
 * A mesma morada sem o código postal.
 *
 * Numa linha de resumo o "2675-407" não ajuda a reconhecer o sítio e é o que
 * empurra a cidade para a segunda linha. Cobre as duas formas: a composta
 * (onde o campo existe) e a de texto corrido, onde o código aparece no meio.
 */
export const formatServiceAddressShort = (address: AddressLike): string | null => {
  const full = formatServiceAddress(address);
  if (!full) return null;

  const withoutPostal = full
    .replace(/\b\d{4}-\d{3}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s]+|[,\s]+$/g, "");

  return clean(withoutPostal) ?? full;
};

/** Complemento da morada (andar, porta, referências), se existir. */
export const serviceAddressExtra = (address: AddressLike): string | null =>
  clean(address?.additional_info);

type VendorUserLike = {
  phone_number?: string | null;
  phone?: string | null;
} | null | undefined;

/**
 * Telefone do técnico em formato marcável, ou null.
 * Descarta tudo o que não é dígito ou `+` — um número com espaços ou
 * parênteses funciona no `tel:` de alguns sistemas e falha noutros.
 */
export const technicianPhoneNumber = (user: VendorUserLike): string | null => {
  const raw = clean(user?.phone_number) ?? clean(user?.phone);
  if (!raw) return null;

  const normalized = raw.replace(/[^\d+]/g, "");
  // Um "+" isolado, ou menos de 6 dígitos, não é um número que valha a pena
  // oferecer para ligar.
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 6) return null;

  return normalized;
};
