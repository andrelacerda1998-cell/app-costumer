import { ServiceStatus } from "@/types/services";

/**
 * Vai ser cobrado ao cancelar AGORA?
 *
 * Espelha CancellationPolicy::isChargeable do backend (app/Services/Common/
 * Services/CancellationPolicy.php), que é quem decide de facto — isto serve só
 * para o cliente saber ao que vai antes de tocar em "Cancelar". Se as duas
 * divergirem, manda o backend, e a app estaria a mentir: por isso a regra é
 * copiada à letra e testada, em vez de aproximada.
 *
 * Cobra 100% quando o técnico já se pôs a caminho (on_the_way_at) ou já está no
 * local (ARRIVED). Aceite mas ainda parado não cobra — ninguém se deslocou.
 */

type CancellableService = {
  status?: string | null;
  on_the_way_at?: string | null;
  amount?: number | null;
} | null | undefined;

export const isCancellationChargeable = (service: CancellableService): boolean => {
  if (!service) return false;

  if (service.status === ServiceStatus.ARRIVED) return true;

  if (service.status === ServiceStatus.ACCEPTED && !!service.on_the_way_at) return true;

  return false;
};

/**
 * Valor a cobrar, em cêntimos — 100% do valor do serviço — ou null quando o
 * cancelamento é livre ou o valor não é conhecido. Nunca devolve um valor
 * inventado: sem `amount` fiável, o ecrã avisa sem prometer um número.
 */
export const cancellationChargeAmount = (service: CancellableService): number | null => {
  if (!isCancellationChargeable(service)) return null;

  const amount = service?.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;

  // Normalizar o sinal ANTES de validar, como o backend faz (abs() em
  // CancelService::cancelWithCharge): alguns payloads trazem o valor negativo,
  // e rejeitá-lo esconderia a cobrança de quem ia mesmo ser cobrado.
  const normalized = Math.abs(amount);

  return normalized > 0 ? normalized : null;
};
