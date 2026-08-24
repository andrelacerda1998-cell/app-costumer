import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Técnicos favoritos — guardados só no dispositivo.
 *
 * O backend não tem hoje nenhum conceito de favorito (não há tabela nem endpoint),
 * por isso isto é deliberadamente local: não sincroniza entre dispositivos nem
 * sobrevive a uma reinstalação, e não influencia quem o backend devolve — apenas
 * reordena e assinala, na app, os que já vieram na resposta. Quando existir suporte
 * no servidor, este hook é o único sítio a trocar.
 */
const STORAGE_KEY = 'piquet.favorite_vendors.v1';

/** Estado partilhado no processo: dois ecrãs abertos veem a mesma lista. */
let cache: number[] | null = null;
const listeners = new Set<(ids: number[]) => void>();

const broadcast = (ids: number[]) => {
  cache = ids;
  listeners.forEach((listener) => listener(ids));
};

const persist = async (ids: number[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Falhar a gravar um favorito não pode partir o ecrã de escolha de técnico:
    // o estado em memória continua correto até a app fechar.
  }
};

/**
 * Favoritos primeiro, preservando a ordem original dentro de cada grupo.
 * Fora do componente para poder ser testado sem montar o ecrã.
 */
export const rankFavoritesFirst = <T extends { id?: number | string | null }>(
  list: T[],
  isFavorite: (id?: number | string | null) => boolean,
): T[] =>
  [...list].sort((a, b) => (isFavorite(a?.id) ? 0 : 1) - (isFavorite(b?.id) ? 0 : 1));

export const useFavoriteVendors = () => {
  const [favorites, setFavorites] = useState<number[]>(cache ?? []);
  const [ready, setReady] = useState(cache !== null);

  useEffect(() => {
    listeners.add(setFavorites);

    if (cache === null) {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((raw) => {
          const parsed = raw ? JSON.parse(raw) : [];
          broadcast(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : []);
        })
        .catch(() => broadcast([]))
        .finally(() => setReady(true));
    }

    return () => {
      listeners.delete(setFavorites);
    };
  }, []);

  const isFavorite = useCallback(
    (vendorId?: number | string | null) =>
      vendorId !== null && vendorId !== undefined && favorites.includes(Number(vendorId)),
    [favorites],
  );

  const toggleFavorite = useCallback((vendorId?: number | string | null) => {
    if (vendorId === null || vendorId === undefined) return;
    const id = Number(vendorId);
    if (Number.isNaN(id)) return;

    const current = cache ?? [];
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];

    broadcast(next);
    persist(next);
  }, []);

  return { favorites, isFavorite, toggleFavorite, ready };
};

export default useFavoriteVendors;
