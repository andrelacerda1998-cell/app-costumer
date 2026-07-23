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
  count: number;
  addItem: (serviceType: ServiceTypeInterface) => boolean;
  removeItem: (serviceTypeId: number) => void;
  hasItem: (serviceTypeId: number) => boolean;
  clear: () => void;
  /** Fila de reservas em curso (em memória): cada entrada é um serviço + técnico escolhido. */
  queue: CartBooking[];
  mode: CartMode | null;
  startQueue: (bookings: CartBooking[], mode: CartMode) => void;
  clearQueue: () => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ServiceTypeInterface[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [queue, setQueue] = useState<CartBooking[]>([]);
  const [mode, setMode] = useState<CartMode | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
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
    setMode(nextMode);
  };

  const clearQueue = () => {
    setQueue([]);
    setMode(null);
  };

  return (
    <CartContext.Provider value={{ items, count: items.length, addItem, removeItem, hasItem, clear, queue, mode, startQueue, clearQueue }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
};
