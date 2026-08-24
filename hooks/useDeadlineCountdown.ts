import { useEffect, useRef, useState } from 'react';
import type { AppStateStatus } from 'react-native';

/**
 * Contagem decrescente ancorada num INSTANTE, não decrementada a cada segundo.
 *
 * O ecrã de espera do MB Way fazia `setSecondsLeft(prev => prev - 1)` dentro de
 * um `setInterval`. O iOS estrangula temporizadores quando a app vai para
 * segundo plano — e ir para segundo plano é exatamente o que o cliente faz para
 * abrir a app do banco e autorizar o pagamento. Ao voltar, o contador tinha
 * perdido os segundos que passaram e mostrava tempo que já não existia.
 *
 * Aqui guarda-se o instante-limite uma vez e o valor é sempre `limite - agora`.
 * Passar por segundo plano deixa de ter efeito: o relógio do sistema não pára.
 *
 * LIMITAÇÃO CONHECIDA: o limite continua a ser calculado no telemóvel. O prazo
 * verdadeiro é do servidor (MbwayPaymentCheckJob, 24 tentativas de 10s a contar
 * de quando o job arrancou) e o backend não o expõe hoje. Enquanto não devolver
 * um `expires_at`, os dois relógios podem divergir pelo tempo de rede e pelo
 * desvio do relógio do telemóvel. Para o novo fluxo de 5 minutos, o servidor
 * tem de mandar o instante — passar aqui `deadlineAt` resolve, sem mais nada.
 */
export const secondsUntil = (deadlineAt: number, now: number): number =>
  Math.max(0, Math.ceil((deadlineAt - now) / 1000));

/** "4:07" — sem horas, porque estas janelas são sempre de minutos. */
export const formatCountdown = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export const useDeadlineCountdown = (
  windowSeconds: number,
  appStateStatus?: AppStateStatus,
  /** Instante-limite absoluto (ms). Quando o servidor o passar a enviar, usa-se este. */
  deadlineAt?: number,
) => {
  // Fixado uma só vez: se fosse recalculado a cada render, o prazo andava para a frente.
  const deadlineRef = useRef<number>(deadlineAt ?? Date.now() + windowSeconds * 1000);
  if (deadlineAt && deadlineRef.current !== deadlineAt) deadlineRef.current = deadlineAt;

  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntil(deadlineRef.current, Date.now()),
  );

  useEffect(() => {
    const tick = () => setSecondsLeft(secondsUntil(deadlineRef.current, Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Voltar ao primeiro plano recalcula já, sem esperar pelo próximo segundo.
  useEffect(() => {
    if (appStateStatus === 'active') {
      setSecondsLeft(secondsUntil(deadlineRef.current, Date.now()));
    }
  }, [appStateStatus]);

  return { secondsLeft, label: formatCountdown(secondsLeft), expired: secondsLeft === 0 };
};

export default useDeadlineCountdown;
