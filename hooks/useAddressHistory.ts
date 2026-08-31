import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  StoredAddress,
  addToHistory,
  removeFromHistory,
} from '@/utils/addressHistory';

/**
 * Histórico de moradas usadas — guardado só no dispositivo.
 *
 * Vale sobretudo para o convidado, que não tem conta onde guardar moradas e
 * hoje reescreve tudo a cada pedido. Quem tem sessão tem a lista do servidor
 * (`(address)/list`); isto não a substitui.
 *
 * Local de propósito: não sincroniza entre dispositivos nem sobrevive a uma
 * reinstalação. Quando o registo por telemóvel estiver ligado, quase todos
 * passam a ter conta e isto torna-se um extra em vez do único sítio.
 *
 * A lógica pura está em utils/addressHistory.ts, com testes.
 */
const STORAGE_KEY = 'piquet.address_history.v1';

let cache: StoredAddress[] | null = null;
const listeners = new Set<(list: StoredAddress[]) => void>();

const broadcast = (list: StoredAddress[]) => {
  cache = list;
  listeners.forEach((l) => l(list));
};

const persist = async (list: StoredAddress[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Falhar a gravar não pode partir o pedido em curso: o estado em memória
    // continua correto até a app fechar.
  }
};

export function useAddressHistory() {
  const [history, setHistory] = useState<StoredAddress[]>(cache ?? []);

  useEffect(() => {
    const listener = (list: StoredAddress[]) => setHistory(list);
    listeners.add(listener);

    if (cache === null) {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((raw) => {
          const parsed = raw ? JSON.parse(raw) : [];
          broadcast(Array.isArray(parsed) ? parsed : []);
        })
        .catch(() => broadcast([]));
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const remember = useCallback((address: StoredAddress) => {
    const next = addToHistory(cache ?? [], address);
    broadcast(next);
    persist(next);
  }, []);

  const forget = useCallback((address: StoredAddress) => {
    const next = removeFromHistory(cache ?? [], address);
    broadcast(next);
    persist(next);
  }, []);

  return { history, remember, forget };
}

export default useAddressHistory;
