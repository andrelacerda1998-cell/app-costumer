import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, TextInput, TouchableOpacity, View } from "react-native";
import Constants from "expo-constants";
import TicketPhotosRow from "@/components/app/Support/TicketPhotosRow";
import { corpoDoPedido, useTicketPhotos } from "@/hooks/useTicketPhotos";
import { TICKETS_SEEN_KEY } from "@/hooks/useSupportUnread";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Feather, Ionicons } from "@expo/vector-icons";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import { Colors } from "@/constants/Colors";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useDialog } from "@/contexts/DialogContext";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { useTranslation } from "react-i18next";
import CheckMark from "@/assets/icons/check-mark";
import XIcon from "@/assets/icons/x";

/**
 * Ticket de suporte → backoffice (dashboard). O endpoint é público no
 * dashboard (mesmo padrão das leads da landing), por isso vai por fetch
 * direto e não pela instância `api` da app.
 *
 * Vem do app.config para se poder apontar a um servidor local em
 * desenvolvimento. Estava fixo no código, e isso queria dizer que qualquer
 * teste deste ecrã criava um ticket a sério na caixa de entrada de quem está
 * a responder a clientes.
 */
const TICKETS_ENDPOINT: string =
  Constants?.expoConfig?.extra?.TICKETS_ENDPOINT || "https://piquet-dashboard.vercel.app/api/tickets";
// Histórico local: a app só conhece os tickets que ela própria criou.
const TICKETS_KEY = "piquet_support_tickets_v1";

interface LocalTicket {
  id: string;
  /** Credencial de leitura deste ticket, devolvida uma só vez na criação.
   *  Sem ela o servidor não devolve o estado (o id sozinho não autoriza nada). */
  access_token?: string;
  subject: string;
  message: string;
  created_at: string;
  status_label?: string;
  /** Já houve alguma resposta do suporte. Decide em que secção o pedido vive. */
  has_reply?: boolean;
  /** Há resposta que o cliente ainda não leu. Decide o ponto verde. São coisas
   *  diferentes: um pedido respondido continua respondido depois de lido. */
  unread?: boolean;
  /** O que o suporte respondeu. Vem do servidor e mostra-se aqui: mandar o
   *  cliente procurar no email uma resposta que a app já tem em mãos era
   *  trabalho a mais para ele e uma conversa partida ao meio. */
  reply_preview?: string | null;
}

const SupportTicket = () => {
  const { t } = useTranslation();
  const { userData } = useSession();
  const { guestSession } = useGuestSession();
  const { openDialog } = useDialog();
  const { track } = useMixpanel();
  const params = useLocalSearchParams();
  const serviceId = typeof params.serviceId === "string" ? params.serviceId : "";

  const [subject, setSubject] = useState<string>(
    serviceId ? t("support_ticket.subject_service", { id: serviceId }) : ""
  );
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  // Mesmo seletor de fotos do ecrã da conversa: duas cópias divergiam à
  // primeira alteração e o cliente passava a ter dois comportamentos.
  const fotos = useTicketPhotos();

  const canSend = message.trim().length >= 10 && !sending;

  const persist = useCallback(async (list: LocalTicket[]) => {
    setTickets(list);
    AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(list)).catch(() => {});
  }, []);

  // Carrega o histórico local e vai buscar o estado atual ao dashboard.
  const loadTickets = useCallback(async () => {
    let list: LocalTicket[] = [];
    try {
      const raw = await AsyncStorage.getItem(TICKETS_KEY);
      if (raw) list = JSON.parse(raw);
    } catch {
      list = [];
    }
    if (!Array.isArray(list) || list.length === 0) {
      setTickets([]);
      return;
    }
    setTickets(list);
    try {
      // O estado é pedido por access_token, não por id: o id é sequencial e não
      // serve como credencial. Tickets criados antes desta versão não têm token
      // guardado — ficam com o estado local, sem consultar o servidor.
      const tokens = list.map((tk) => tk.access_token).filter(Boolean).join(",");
      if (!tokens) return;
      const res = await fetch(`${TICKETS_ENDPOINT}?tokens=${encodeURIComponent(tokens)}`);
      const json = await res.json().catch(() => null);
      if (json?.ok && Array.isArray(json.tickets)) {
        // O que já foi lido, para o ponto verde não ficar aceso para sempre a
        // partir da primeira resposta — a mesma regra do aviso na Home.
        let vistos: Record<string, string> = {};
        try {
          const rawVistos = await AsyncStorage.getItem(TICKETS_SEEN_KEY);
          if (rawVistos) vistos = JSON.parse(rawVistos);
        } catch {
          vistos = {};
        }

        const byToken: Record<string, { status_label?: string; has_reply?: boolean; unread?: boolean; reply_preview?: string | null }> = {};
        json.tickets.forEach((tk: any) => {
          if (tk.access_token) {
            const msgs: any[] = Array.isArray(tk.messages) ? tk.messages : [];
            const ultimaDoSuporte = [...msgs].reverse().find((m) => m?.from === "agente");
            const visto = vistos[tk.id];
            const porLer = ultimaDoSuporte
              ? !visto || new Date(ultimaDoSuporte.at).getTime() > new Date(visto).getTime()
              : !!tk.has_reply && !visto;

            byToken[tk.access_token] = {
              status_label: tk.status_label,
              has_reply: !!ultimaDoSuporte || !!tk.has_reply,
              unread: porLer,
              reply_preview: (msgs[msgs.length - 1]?.body as string | undefined) ?? tk.reply_preview ?? null,
            };
          }
        });
        const merged = list.map((tk) =>
          tk.access_token && byToken[tk.access_token] ? { ...tk, ...byToken[tk.access_token] } : tk
        );
        setTickets(merged);
        AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(merged)).catch(() => {});
      }
    } catch {
      // sem rede: fica o histórico local
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // O seletor de fotos sinaliza a falha; quem a mostra é o ecrã. O hook não
  // conhece diálogos, e é isso que o deixa servir os dois sítios.
  useEffect(() => {
    if (!fotos.falhou) return;
    fotos.limparErro();
    openDialog({
      icon: <XIcon color={Colors.secondary} />,
      title: t("errors.title"),
      subtitle: t("support_ticket.photos_failed"),
      closeAfterMSeconds: 3000,
      closeOnClickOutside: true,
    });
  }, [fotos.falhou]);

  const handleGoBack = () => {
    if (router.canGoBack()) return router.back();
    return router.push("/(app)/(tabs)/home");
  };

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const campos: Record<string, string> = {
        name: userData?.name ?? "",
        email: userData?.email ?? "",
        phone: userData?.phone_number ?? guestSession?.guest_phone ?? "",
        subject: subject.trim(),
        message: message.trim(),
        service_id: serviceId,
        channel: "app_cliente",
      };

      const { headers, body } = corpoDoPedido(campos, fotos.photos);
      const res = await fetch(TICKETS_ENDPOINT, { method: "POST", headers, body });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "erro");

      track("support_ticket_created", { ticket_id: json.ticket_id, has_service: !!serviceId, photos: fotos.photos.length });
      // Guarda no histórico local e mostra na lista — sem sair do ecrã.
      const localTicket: LocalTicket = {
        id: json.ticket_id,
        access_token: json.access_token,
        subject: subject.trim() || message.trim().slice(0, 60),
        message: message.trim(),
        created_at: new Date().toISOString(),
        status_label: t("support_ticket.awaiting_reply"),
        has_reply: false,
      };
      await persist([localTicket, ...tickets]);
      setSubject(serviceId ? t("support_ticket.subject_service", { id: serviceId }) : "");
      setMessage("");
      fotos.clear();
      openDialog({
        icon: <CheckMark color={Colors.secondary} />,
        title: t("support_ticket.success_title"),
        subtitle: t("support_ticket.success_subtitle", { id: json.ticket_id }),
        closeAfterMSeconds: 3000,
        closeOnClickOutside: true,
      });
    } catch {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: t("support_ticket.error_subtitle"),
        closeAfterMSeconds: 3000,
        closeOnClickOutside: true,
      });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "";
    }
  };

  // Já respondidos sobem para o topo (há uma resposta para ver); os que ainda
  // aguardam resposta ficam por baixo do formulário de novo pedido.
  const answered = tickets.filter((tk) => tk.has_reply);
  const pending = tickets.filter((tk) => !tk.has_reply);

  const abrirConversa = (tk: LocalTicket) => {
    // Só o id viaja. O access_token é uma credencial e fica no armazenamento
    // local, onde o ecrã da conversa o vai buscar.
    router.push({
      pathname: "/(app)/(modals)/support-ticket/[ticketId]",
      params: { ticketId: tk.id },
    });
  };

  /**
   * Uma linha, não um cartão com a conversa lá dentro.
   *
   * O cartão mostrava a resposta inteira, e com três pedidos enchia-se o ecrã
   * de texto repetido — o mesmo que se lê ao abrir. Agora diz só o que é
   * preciso para escolher qual abrir: de que era, se há novidade, e a última
   * coisa que foi dita. A conversa vive na conversa.
   */
  const renderTicket = (tk: LocalTicket) => {
    const ultima = tk.reply_preview || tk.message;
    return (
      <TouchableOpacity
        key={tk.id}
        activeOpacity={0.8}
        onPress={() => abrirConversa(tk)}
        accessibilityRole="button"
        accessibilityLabel={t("support_ticket.thread_open")}
        className="bg-support_secondary rounded-2xl px-4 py-3.5 mb-2 flex-row items-center"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      >
        {/* O ponto verde faz o trabalho que a etiqueta "Resposta do suporte"
            fazia com uma linha inteira: dizer que há coisa nova para ler. */}
        {tk.unread && (
          <View
            className="rounded-full mr-2.5"
            style={{ width: 8, height: 8, backgroundColor: Colors.success }}
          />
        )}

        <View className="flex-1 mr-2">
          <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1}>
            {tk.subject || tk.message}
          </CustomText>
          <CustomText color="gray_medium" size="extraSmall" boldness="regular" numberOfLines={1} classes="mt-0.5">
            {ultima}
          </CustomText>
          <CustomText color="gray_medium" size="specExtraSmall" boldness="regular" numberOfLines={1} classes="mt-1">
            {tk.id} · {formatDate(tk.created_at)} · {tk.status_label || t("support_ticket.awaiting_reply")}
          </CustomText>
        </View>

        <Ionicons name="chevron-forward" size={18} color={Colors.gray_medium} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 p-5" style={{ backgroundColor: "#FAF7F2" }}>
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t("support_ticket.header")}
          </CustomText>
        )}
        onBack={handleGoBack}
      />

      <KeyboardAwareScrollView bottomOffset={40} showsVerticalScrollIndicator={false}>
        {/* Contexto: quem responde e como */}
        <View
          className="flex-row items-center rounded-2xl p-4 mt-4"
          style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: "rgba(250,187,91,0.35)" }}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color={Colors.secondary} />
          </View>
          <View className="flex-1">
            <CustomText color="secondary" size="small" boldness="bold">
              {t("support_ticket.intro_title")}
            </CustomText>
            <CustomText color="gray_medium" size="extraSmall" boldness="regular">
              {t("support_ticket.intro_subtitle")}
            </CustomText>
          </View>
        </View>

        {/* O formulário PRIMEIRO. Quem abre este ecrã vem quase sempre
            escrever, não reler o que já foi respondido — e com as conversas
            por cima era preciso passar por todas antes de chegar à caixa onde
            se pede ajuda. As respostas ficam logo a seguir, que é perto o
            suficiente para se verem sem rolar muito. */}
        {tickets.length > 0 && (
          <CustomText color="secondary" boldness="bold" size="medium" classes="mt-6 mb-3">
            {t("support_ticket.new_request_title")}
          </CustomText>
        )}
        <View
          className="bg-support_secondary rounded-2xl p-4 mt-4"
          style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
        >
          <CustomText color="secondary" boldness="semiBold" size="small" classes="mb-2">
            {t("support_ticket.subject_label")}
          </CustomText>
          <CustomTextInput
            size="large"
            value={subject}
            onChangeText={setSubject}
            placeholder={t("support_ticket.subject_placeholder")}
            maxLength={200}
            disabled={sending}
          />

          <CustomText color="secondary" boldness="semiBold" size="small" classes="mb-2 mt-4">
            {t("support_ticket.message_label")}
          </CustomText>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t("support_ticket.message_placeholder")}
            placeholderTextColor={Colors.gray_medium}
            multiline
            textAlignVertical="top"
            editable={!sending}
            maxLength={4000}
            style={{
              minHeight: 140,
              borderWidth: 1,
              borderColor: Colors.support_primary,
              borderRadius: 12,
              padding: 12,
              fontFamily: "Poppins_400Regular",
              fontSize: 14,
              color: Colors.secondary,
            }}
          />
          <View className="flex-row items-center justify-between mt-2">
            {message.trim().length < 10 ? (
              <CustomText color="gray_medium" size="extraSmall" boldness="regular">
                {t("support_ticket.min_chars_hint")}
              </CustomText>
            ) : (
              <View />
            )}
            <CustomText color="gray_medium" size="extraSmall" boldness="regular">
              {t("support_ticket.char_counter", { count: message.length, max: 4000 })}
            </CustomText>
          </View>
          {/* Fotos. Ficam DEPOIS da mensagem e antes do aviso de como
              respondemos: é a ordem por que se preenche o pedido — escrever o
              que se passa, e só depois mostrar. */}
          <CustomText color="secondary" boldness="semiBold" size="small" classes="mt-4">
            {t("support_ticket.photos_label")}
          </CustomText>
          <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-0.5 mb-2">
            {t("support_ticket.photos_hint")}
          </CustomText>
          <TicketPhotosRow
            photos={fotos.photos}
            onAdd={fotos.pick}
            onRemove={fotos.remove}
            disabled={sending}
          />

          <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-2">
            {t("support_ticket.reply_hint")}
          </CustomText>
        </View>

        {/* Respondidos logo a seguir ao formulário: é onde está a novidade. */}
        {answered.length > 0 && (
          <View className="mt-7">
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <CustomText color="secondary" boldness="bold" size="medium" classes="ml-1.5">
                {t("support_ticket.answered_title")}
              </CustomText>
            </View>
            {answered.map(renderTicket)}
          </View>
        )}

        {/* Os meus pedidos: os que ainda aguardam resposta ficam por baixo */}
        {pending.length > 0 && (
          <View className="mt-6">
            <CustomText color="secondary" boldness="bold" size="medium" classes="mb-2">
              {t("support_ticket.my_requests_title")}
            </CustomText>
            {pending.map(renderTicket)}
          </View>
        )}
      </KeyboardAwareScrollView>

      <View className="pt-3">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={submit}
          disabled={!canSend}
          style={{
            backgroundColor: canSend ? Colors.primary : "rgba(250,187,91,0.35)",
            borderRadius: 999,
            paddingVertical: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            ...(canSend
              ? {
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.5,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }
              : {}),
          }}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.secondary} style={{ marginRight: 8 }} />
          ) : (
            <Feather name="send" size={17} color={Colors.secondary} style={{ marginRight: 8 }} />
          )}
          <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1} style={{ opacity: canSend ? 1 : 0.5 }}>
            {sending ? t("support_ticket.sending") : t("support_ticket.send")}
          </CustomText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SupportTicket;
