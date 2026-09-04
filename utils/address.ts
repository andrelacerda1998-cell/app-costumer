/**
 * Morada por extenso: rua, número da porta e cidade.
 *
 * O rótulo curto (hooks/useAddressLabel) serve os cabeçalhos, onde a cidade é
 * ruído — quem usa a app sabe em que cidade mora. No checkout é o contrário: é
 * a última vez que o cliente vê PARA ONDE o técnico vai, e "Campo Grande 30"
 * sem cidade é uma morada pela metade.
 *
 * Vive num util e não no hook porque o hook arrasta os contextos da app, e uma
 * regra de formatação deve poder ser testada sem levantar meia aplicação.
 */

export type AddressLike = {
  street_name?: string | null;
  street_number?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
} | null | undefined;

const join = (...parts: Array<string | undefined | null>) =>
  parts.filter((part) => typeof part === "string" && part.trim().length > 0).join(" ").trim();

export const formatAddressFull = (addr: AddressLike): string => {
  if (!addr) return "";

  const city = typeof addr.city === "string" ? addr.city.trim() : "";
  const base = join(addr.street_name, addr.street_number) || join(addr.name);

  if (!base) return join(addr.city, addr.country);
  if (!city) return base;

  // Sem esta verificação, uma morada em texto corrido que já traga a cidade
  // ficava "Campo Grande 30, Lisboa, Lisboa".
  const alreadyHasCity = base.toLocaleLowerCase("pt-PT").includes(city.toLocaleLowerCase("pt-PT"));
  return alreadyHasCity ? base : `${base}, ${city}`;
};
