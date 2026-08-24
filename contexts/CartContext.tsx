import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ServiceTypeInterface } from "@/types/services";

/**
 * Cesto de serviços: o cliente junta vários tipos de serviço e reserva-os a
 * partir do separador Cesto. O backend só processa um serviço por pedido,
 * por isso cada item entra no fluxo normal (técnico → checkout) à vez; o
 * cesto coordena a sequência e limpa o item quando o pedido é criado.
 */

const STORAGE_KEY = "piquet_cart_v1";

export type CartMode = "immediate" | "scheduled";

export interface CartBooking {
  serviceType: ServiceTypeInterface;
  vendor: any;
}

interface CartContextProps {
  items: ServiceTypeInterface[];
  /** false enquanto o cesto ainda está a ser lido do AsyncStorage (items é [] nesse intervalo). */
  hydrated: boolean;
  count: number;
  addItem: (serviceType: ServiceTypeInterface) => boolean;
  removeItem: (serviceTypeId: number) => void;
  hasItem: (serviceTypeId: number) => boolean;
  clear: () => void;
  /** Fila de reservas em curso (em memória): cada entrada é um serviço + técnico escolhido. */
  queue: CartBooking[];
  mode: CartMode | null;
  /**
   * Quantos serviços a fila tinha quando arrancou. A `queue` encolhe a cada
   * reserva concluída (removeItem filtra-a), por isso sozinha não chega para
   * dizer "serviço 2 de 3" — sem o total, o cliente nunca sabe onde está.
   */
  queueTotal: number;
  startQueue: (bookings: CartBooking[], mode: CartMode) => void;
  clearQueue: () => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ServiceTypeInterface[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [queue, setQueue] = useState<CartBooking[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [mode, setMode] = useState<CartMode | null>(null);

  /**
   * Falha ao LER o cesto não pode apagá-lo.
   *
   * A leitura engolia o erro e marcava `hydrated`; o efeito de escrita disparava
   * logo a seguir e gravava `[]` por cima do que estava guardado. Ou seja, uma
   * falha passageira (JSON corrompido, I/O ocupado no arranque a frio) apagava
   * o cesto de vez, e em silêncio — o cliente perdia os serviços que tinha
   * juntado sem nada lho dizer.
   *
   * Enquanto a leitura tiver falhado e o cesto continuar vazio, não se escreve:
   * o que está no disco fica intacto e pode ser lido no arranque seguinte. Assim
   * que o cliente adicionar alguma coisa, volta-se a gravar normalmente.
   */
  const readFailedRef = React.useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
        else readFailedRef.current = true; // conteúdo inesperado: não sobrepor
      })
      .catch(() => {
        readFailedRef.current = true;
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (readFailedRef.current && items.length === 0) return;
    // Houve alteração real do cliente: a partir daqui gravar é seguro outra vez.
    readFailedRef.current = false;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  }, [items, hydrated]);

  const addItem = (serviceType: ServiceTypeInterface): boolean => {
    if (!serviceType?.id) return false;
    let added = false;
    setItems((prev) => {
      if (prev.some((i) => i.id === serviceType.id)) return prev;
      added = true;
      return [...prev, serviceType];
    });
    return added;
  };

  const removeItem = (serviceTypeId: number) => {
    setItems((prev) => prev.filter((i) => i.id !== serviceTypeId));
    // Reserva concluída (ou item apagado): sai também da fila.
    setQueue((prev) => prev.filter((b) => b.serviceType.id !== serviceTypeId));
  };

  const hasItem = (serviceTypeId: number) => items.some((i) => i.id === serviceTypeId);

  const clear = () => {
    setItems([]);
    setQueue([]);
    setMode(null);
  };

  const startQueue = (bookings: CartBooking[], nextMode: CartMode) => {
    setQueue(bookings);
    setQueueTotal(bookings.length);
    setMode(nextMode);
  };

  const clearQueue = () => {
    setQueue([]);
    setQueueTotal(0);
    setMode(null);
  };

  return (
    <CartContext.Provider value={{ items, hydrated, count: items.length, addItem, removeItem, hasItem, clear, queue, queueTotal, mode, startQueue, clearQueue }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
};
