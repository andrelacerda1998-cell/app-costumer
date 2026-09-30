import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const TICKETS_ENDPOINT: string =
  Constants?.expoConfig?.extra?.TICKETS_ENDPOINT || "https://piquet-dashboard.vercel.app/api/tickets";

export const TICKETS_KEY = "piquet_support_tickets_v1";
/** O que já foi lido, por ticket: { [id]: instante da última mensagem vista }. */
export const TICKETS_SEEN_KEY = "piquet_support_seen_v1";
/** Última contagem conhecida, para o ponto aparecer antes da rede responder. */
const UNREAD_CACHE_KEY = "piquet_support_unread_v1";

export interface TicketGuardado {
  id: string;
  access_token?: string;
  [k: string]: unknown;
}

const lerJson = async <T,>(chave: string, omissao: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : omissao;
  } catch {
    return omissao;
  }
};

/** Marca a conversa como lida até à mensagem mais recente que ela tem. */
export const marcarConversaLida = async (ticketId: string, ultimaMensagemAt?: string) => {
  if (!ticketId) return;
  const vistos = await lerJson<Record<string, string>>(TICKETS_SEEN_KEY, {});
  vistos[ticketId] = ultimaMensagemAt || new Date().toISOString();
  AsyncStorage.setItem(TICKETS_SEEN_KEY, JSON.stringify(vistos)).catch(() => {});
  // O ponto na Home tem de apagar-se ao voltar, não só na próxima ida à rede.
  AsyncStorage.setItem(UNREAD_CACHE_KEY, "0").catch(() => {});
};

/**
 * Há alguma resposta do suporte por ler?
 *
 * "Por ler" é o suporte ter falado DEPOIS da última vez que o cliente abriu
 * aquela conversa. Sem este segundo termo, o aviso ficava aceso para sempre a
 * partir da primeira resposta — e um aviso que nunca se apaga deixa de ser um
 * aviso.
 *
 * Quem nunca abriu um pedido não gasta uma chamada: a lista local está vazia e
 * a função sai antes da rede.
 */
export const useSupportUnread = () => {
  const [porLer, setPorLer] = useState(0);

  const verificar = useCallback(async () => {
    // O valor da última vez, para o ponto não piscar a cada abertura da Home.
    const cache = await AsyncStorage.getItem(UNREAD_CACHE_KEY).catch(() => null);
    if (cache !== null) setPorLer(Number(cache) || 0);

    const tickets = await lerJson<TicketGuardado[]>(TICKETS_KEY, []);
    const tokens = Array.isArray(tickets)
      ? tickets.map((t) => t?.access_token).filter((t): t is string => !!t)
      : [];
    if (tokens.length === 0) {
      setPorLer(0);
      AsyncStorage.setItem(UNREAD_CACHE_KEY, "0").catch(() => {});
      return;
    }

    try {
      const res = await fetch(`${TICKETS_ENDPOINT}?tokens=${encodeURIComponent(tokens.join(","))}`);
      const json = await res.json().catch(() => null);
      if (!json?.ok || !Array.isArray(json.tickets)) return;

      const vistos = await lerJson<Record<string, string>>(TICKETS_SEEN_KEY, {});
      const total = json.tickets.filter((tk: any) => {
        const msgs = Array.isArray(tk?.messages) ? tk.messages : [];
        const ultimaDoSuporte = [...msgs].reverse().find((m: any) => m?.from === "agente");
        // Versões do servidor que ainda não mandam a conversa: o melhor que se
        // pode dizer é "há resposta", sem saber se já foi vista.
        if (!ultimaDoSuporte) return msgs.length === 0 ? false : !!tk?.has_reply && !vistos[tk.id];
        const visto = vistos[tk.id];
        return !visto || new Date(ultimaDoSuporte.at).getTime() > new Date(visto).getTime();
      }).length;

      setPorLer(total);
      AsyncStorage.setItem(UNREAD_CACHE_KEY, String(total)).catch(() => {});
    } catch {
      // Sem rede fica o que estava: um ponto a mais é melhor do que um aviso
      // que desaparece porque o wi-fi falhou.
    }
  }, []);

  // A CADA FOCO, não só ao montar. O ecrã de suporte abre por cima da Home,
  // que nunca se desmonta: verificado num teste, o cliente lia a resposta,
  // voltava, e o ponto continuava aceso — porque nada tinha mandado a Home
  // olhar outra vez. Um aviso que sobrevive à leitura é um aviso que se
  // aprende a ignorar.
  useFocusEffect(
    useCallback(() => {
      verificar();
    }, [verificar]),
  );

  return { porLer, temPorLer: porLer > 0, verificar };
};
