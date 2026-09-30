import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import TicketPhotosRow from "@/components/app/Support/TicketPhotosRow";
import { corpoDoPedido, useTicketPhotos } from "@/hooks/useTicketPhotos";
import { marcarConversaLida } from "@/hooks/useSupportUnread";

/**
 * A conversa de um pedido de ajuda.
 *
 * Um ticket é uma troca, não um formulário. O suporte pergunta "de que andar é
 * a canalização?" e, sem este ecrã, o cliente não tinha por onde responder:
 * abria outro pedido e a conversa ficava partida em dois, com quem responde a
 * ler metade de cada lado.
 *
 * O `access_token` NÃO viaja nos parâmetros da rota — vem do armazenamento
 * local, procurado pelo id. É uma credencial: o id do pedido pode aparecer num
 * ecrã ou num log, o token não pode.
 */

const TICKETS_ENDPOINT: string =
  Constants?.expoConfig?.extra?.TICKETS_ENDPOINT || "https://piquet-dashboard.vercel.app/api/tickets";
const TICKETS_KEY = "piquet_support_tickets_v1";

interface Mensagem {
  id: string;
  from: "requester" | "agente";
  authorName?: string;
  body: string;
  at: string;
  images?: string[];
}

export default function TicketThread() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const ticketId = typeof params.ticketId === "string" ? params.ticketId : "";

  const [token, setToken] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [estado, setEstado] = useState<string | null>(null);
  const [podeResponder, setPodeResponder] = useState(true);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState(false);
  const [resposta, setResposta] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const photos = useTicketPhotos();
  const scrollRef = useRef<ScrollView>(null);
  // Lock síncrono: o duplo-toque fecha-se antes de o estado re-renderizar o
  // botão. Mesmo padrão do checkout.
  const enviandoRef = useRef(false);

  const carregar = useCallback(async () => {
    setErro(false);
    let tk: string | null = null;
    try {
      const raw = await AsyncStorage.getItem(TICKETS_KEY);
      const lista = raw ? JSON.parse(raw) : [];
      tk = Array.isArray(lista)
        ? lista.find((item: any) => item?.id === ticketId)?.access_token ?? null
        : null;
    } catch {
      tk = null;
    }
    setToken(tk);

    // Sem token não há como pedir a conversa ao servidor — nem se deve. Foi o
    // caso dos pedidos criados antes de o token existir.
    if (!tk) {
      setACarregar(false);
      setErro(true);
      return;
    }

    try {
      const res = await fetch(`${TICKETS_ENDPOINT}?tokens=${encodeURIComponent(tk)}`);
      const json = await res.json().catch(() => null);
      const ticket = json?.ok && Array.isArray(json.tickets) ? json.tickets[0] : null;
      if (!ticket) throw new Error("sem ticket");

      const msgs: Mensagem[] = Array.isArray(ticket.messages) ? ticket.messages : [];
      setMensagens(msgs);
      setEstado(ticket.status_label ?? null);
      // Abrir a conversa é lê-la: o ponto vermelho da Home apaga-se aqui, e
      // não na próxima ida à rede. Um aviso que fica aceso depois de se ter
      // lido a resposta ensina o cliente a ignorá-lo.
      marcarConversaLida(ticketId, msgs[msgs.length - 1]?.at);
      // Versões do servidor anteriores a isto não mandam o campo; nesse caso
      // deixa-se responder e é o servidor que recusa, com o motivo.
      setPodeResponder(ticket.can_reply !== false);
    } catch {
      setErro(true);
    } finally {
      setACarregar(false);
    }
  }, [ticketId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const enviar = async () => {
    const texto = resposta.trim();
    if (!texto || !token || enviandoRef.current) return;
    enviandoRef.current = true;
    setAEnviar(true);

    try {
      const { headers, body } = corpoDoPedido(
        { access_token: token, message: texto },
        photos.photos,
      );
      const res = await fetch(`${TICKETS_ENDPOINT}/reply`, { method: "POST", headers, body });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "erro");

      // A mensagem do servidor, não a nossa: traz o id, a hora e os URLs das
      // fotos já assinados. Reconstruí-la aqui era inventar metade.
      const minha = json.message as Mensagem;
      setMensagens((prev) => [...prev, minha]);
      marcarConversaLida(ticketId, minha.at);
      setResposta("");
      photos.clear();
      setPodeResponder(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (e: any) {
      setErro(true);
    } finally {
      enviandoRef.current = false;
      setAEnviar(false);
    }
  };

  const formatarData = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderMensagem = (m: Mensagem) => {
    const minha = m.from === "requester";
    return (
      <View key={m.id} className={`mb-3 ${minha ? "items-end" : "items-start"}`}>
        <CustomText color="gray_medium" size="specExtraSmall" boldness="regular" classes="mb-1 px-1">
          {minha ? t("support_ticket.thread_you") : m.authorName || t("support_ticket.thread_support")}
          {"  ·  "}
          {formatarData(m.at)}
        </CustomText>
        <View
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            maxWidth: "88%",
            backgroundColor: minha ? "rgba(250,187,91,0.22)" : Colors.support_secondary,
          }}
        >
          <CustomText color="secondary" size="small" boldness="regular">
            {m.body}
          </CustomText>
          {Array.isArray(m.images) && m.images.length > 0 && (
            <View className="flex-row flex-wrap mt-2">
              {m.images.map((src) => (
                <Image
                  key={src}
                  source={{ uri: src }}
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 10,
                    marginRight: 6,
                    marginTop: 6,
                    backgroundColor: Colors.support_primary,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 p-5" style={{ backgroundColor: "#FAF7F2" }}>
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t("support_ticket.thread_title", { id: ticketId })}
          </CustomText>
        )}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/home"))}
      />

      {!!estado && (
        <View className="items-center mt-2">
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
            <CustomText color="secondary" size="extraSmall" boldness="bold" numberOfLines={1}>
              {estado}
            </CustomText>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 mt-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          refreshControl={<RefreshControl refreshing={aCarregar} onRefresh={carregar} tintColor={Colors.primary} />}
        >
          {aCarregar && mensagens.length === 0 ? (
            <View className="items-center py-10">
              <ActivityIndicator color={Colors.primary} />
              <CustomText color="gray_medium" size="small" classes="mt-2">
                {t("support_ticket.thread_loading")}
              </CustomText>
            </View>
          ) : erro && mensagens.length === 0 ? (
            <CustomText color="gray_medium" size="small" classes="text-center py-10">
              {t("support_ticket.thread_error")}
            </CustomText>
          ) : (
            mensagens.map(renderMensagem)
          )}
        </ScrollView>

        {podeResponder ? (
          <View className="pt-3" style={{ borderTopWidth: 1, borderTopColor: Colors.support_primary }}>
            {photos.photos.length > 0 && (
              <TicketPhotosRow
                photos={photos.photos}
                onAdd={photos.pick}
                onRemove={photos.remove}
                disabled={aEnviar}
                compact
              />
            )}
            <View className="flex-row items-end">
              <TouchableOpacity
                onPress={photos.pick}
                disabled={aEnviar}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t("support_ticket.photos_add")}
                className="items-center justify-center rounded-full mr-2 mb-1"
                style={{ width: 40, height: 40, backgroundColor: Colors.support_secondary }}
              >
                <Feather name="camera" size={18} color={Colors.secondary} />
              </TouchableOpacity>

              <TextInput
                value={resposta}
                onChangeText={setResposta}
                placeholder={t("support_ticket.thread_reply_placeholder")}
                placeholderTextColor={Colors.gray_medium}
                multiline
                editable={!aEnviar}
                maxLength={4000}
                className="flex-1"
                style={{
                  maxHeight: 120,
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: Colors.support_primary,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingTop: 12,
                  paddingBottom: 12,
                  fontFamily: "Poppins_400Regular",
                  fontSize: 14,
                  color: Colors.secondary,
                  backgroundColor: "#FFFFFF",
                }}
              />

              <TouchableOpacity
                onPress={enviar}
                disabled={aEnviar || resposta.trim().length === 0}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={t("support_ticket.thread_send")}
                className="items-center justify-center rounded-full ml-2 mb-1"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: resposta.trim().length > 0 ? Colors.primary : "rgba(250,187,91,0.35)",
                }}
              >
                {aEnviar ? (
                  <ActivityIndicator size="small" color={Colors.secondary} />
                ) : (
                  <Feather name="send" size={18} color={Colors.secondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="pt-3" style={{ borderTopWidth: 1, borderTopColor: Colors.support_primary }}>
            <CustomText color="gray_medium" size="small" classes="text-center py-2">
              {t("support_ticket.thread_closed")}
            </CustomText>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
