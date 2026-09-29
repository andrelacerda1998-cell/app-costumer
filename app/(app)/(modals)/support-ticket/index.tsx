import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import Constants from "expo-constants";
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

/** Fotos por pedido. O peso é garantido pela conversão, não por um teste. */
const MAX_PHOTOS = 3;

/**
 * Largura a que a foto é reduzida antes de subir. 1600 px chega para se ver a
 * chapa de um esquentador ou a marca de água numa parede; o original de 12 MP
 * só serve para encher o pedido.
 */
const PHOTO_WIDTH = 1600;

type TicketPhoto = { uri: string; name: string; type: string };

interface LocalTicket {
  id: string;
  /** Credencial de leitura deste ticket, devolvida uma só vez na criação.
   *  Sem ela o servidor não devolve o estado (o id sozinho não autoriza nada). */
  access_token?: string;
  subject: string;
  message: string;
  created_at: string;
  status_label?: string;
  has_reply?: boolean;
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
  const [photos, setPhotos] = useState<TicketPhoto[]>([]);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);

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
        const byToken: Record<string, { status_label?: string; has_reply?: boolean; reply_preview?: string | null }> = {};
        json.tickets.forEach((tk: any) => {
          if (tk.access_token) {
            byToken[tk.access_token] = {
              status_label: tk.status_label,
              has_reply: tk.has_reply,
              reply_preview: tk.reply_preview ?? null,
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

  const handleGoBack = () => {
    if (router.canGoBack()) return router.back();
    return router.push("/(app)/(tabs)/home");
  };

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0 || sending) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      // Uma foto de suporte serve para SE VER o problema, não para o ampliar.
      // Comprimir aqui é o que mantém o pedido abaixo do limite de corpo da
      // função no servidor com três fotos de um iPhone.
      quality: 0.5,
    });
    if (result.canceled) return;

    const escolhidas: TicketPhoto[] = [];
    let falhou = false;

    for (const asset of result.assets) {
      try {
        // Reduzir e reconverter para JPEG resolve três coisas de uma vez, e
        // todas elas apareceram no primeiro teste a sério:
        //
        // 1. O iPhone guarda em HEIC, que NENHUM browser mostra numa <img>.
        //    Sem isto a foto chegava ao backoffice e via-se um ícone partido.
        // 2. Uma foto de 12 MP são ~2,8 MB. Três dessas passam o limite de
        //    corpo da função no servidor e o pedido morre antes de lá chegar,
        //    com um erro que não diz nada a ninguém.
        // 3. Reconverter deita fora o EXIF — incluindo as coordenadas de GPS
        //    da casa do cliente, que não têm nada que ir para um bucket.
        const tratada = await manipulateAsync(
          asset.uri,
          [{ resize: { width: PHOTO_WIDTH } }],
          { compress: 0.6, format: SaveFormat.JPEG },
        );
        escolhidas.push({
          uri: tratada.uri,
          name: `foto_${Date.now()}_${escolhidas.length}.jpg`,
          type: "image/jpeg",
        });
      } catch {
        // A conversão falhou: em vez de mandar um original de formato
        // desconhecido, não se manda nada e diz-se. Uma foto perdida é melhor
        // do que um ticket que rebenta no envio.
        falhou = true;
      }
    }


    if (escolhidas.length > 0) setPhotos((prev) => [...prev, ...escolhidas].slice(0, MAX_PHOTOS));
    if (falhou) {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: t("support_ticket.photos_failed"),
        closeAfterMSeconds: 3000,
        closeOnClickOutside: true,
      });
    }
  };

  const removePhoto = (uri: string) => setPhotos((prev) => prev.filter((p) => p.uri !== uri));

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

      // Sem fotos, continua a ir JSON — é o corpo mais pequeno e é o que o
      // servidor já recebia. Com fotos passa a multipart, que evita o imposto
      // de 33% do base64 sobre ficheiros que já são pesados.
      let res: Response;
      if (photos.length > 0) {
        const form = new FormData();
        Object.entries(campos).forEach(([k, v]) => form.append(k, v));
        photos.forEach((photo) => {
          form.append("images", { uri: photo.uri, name: photo.name, type: photo.type } as any);
        });
        // Sem Content-Type à mão: é o fetch que tem de o pôr, com o boundary.
        res = await fetch(TICKETS_ENDPOINT, { method: "POST", body: form });
      } else {
        res = await fetch(TICKETS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campos),
        });
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "erro");

      track("support_ticket_created", { ticket_id: json.ticket_id, has_service: !!serviceId, photos: photos.length });
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
      setPhotos([]);
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

  const renderTicket = (tk: LocalTicket) => (
    <View
      key={tk.id}
      className="bg-support_secondary rounded-2xl p-4 mb-2.5"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <CustomText color="secondary" size="small" boldness="bold" numberOfLines={2}>
            {tk.subject || tk.message}
          </CustomText>
          <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-0.5">
            {tk.id} · {t("support_ticket.sent_on", { date: formatDate(tk.created_at) })}
          </CustomText>
        </View>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: tk.has_reply ? "rgba(5,150,105,0.14)" : "rgba(250,187,91,0.2)" }}
        >
          <CustomText
            size="extraSmall"
            boldness="bold"
            numberOfLines={1}
            color="secondary"
            style={{ color: tk.has_reply ? Colors.success : Colors.secondary }}
          >
            {tk.status_label || t("support_ticket.awaiting_reply")}
          </CustomText>
        </View>
      </View>
      {tk.has_reply && (
        <View className="mt-3">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <CustomText color="success" size="extraSmall" boldness="semiBold" classes="ml-1.5">
              {t("support_ticket.replied_label")}
            </CustomText>
          </View>
          {/* A resposta, e não um aviso de que existe uma. Vinha do servidor
              desde sempre — a app é que a deitava fora e mandava o cliente ao
              email ver o que já tinha no ecrã. */}
          {!!tk.reply_preview && (
            <View
              className="rounded-xl px-3 py-2.5 mt-2"
              style={{ backgroundColor: "rgba(5,150,105,0.08)" }}
            >
              <CustomText color="secondary" size="small" boldness="regular">
                {tk.reply_preview}
              </CustomText>
            </View>
          )}
        </View>
      )}
    </View>
  );

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

        {/* Respondidos: sobem para o topo porque há uma resposta para ver */}
        {answered.length > 0 && (
          <View className="mt-5">
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <CustomText color="secondary" boldness="bold" size="medium" classes="ml-1.5">
                {t("support_ticket.answered_title")}
              </CustomText>
            </View>
            {answered.map(renderTicket)}
          </View>
        )}

        {/* Formulário. O título precisa de folga por cima: com a lista de
            pedidos a rolar por baixo do cabeçalho, com mt-5 ele chegava ao
            topo colado ao "Ajuda e suporte" e liam-se os dois como um só. */}
        {tickets.length > 0 && (
          <CustomText color="secondary" boldness="bold" size="medium" classes="mt-9 mb-3">
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
          <View className="flex-row flex-wrap items-center">
            {photos.map((photo) => (
              <View key={photo.uri} className="mr-2 mb-2">
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: 68, height: 68, borderRadius: 12, backgroundColor: Colors.support_primary }}
                />
                {/* O X sobrepõe-se ao canto da miniatura: com ele por baixo,
                    três fotos empurravam o botão de enviar para fora do ecrã. */}
                <TouchableOpacity
                  onPress={() => removePhoto(photo.uri)}
                  disabled={sending}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="absolute -top-1.5 -right-1.5 rounded-full items-center justify-center"
                  style={{ width: 22, height: 22, backgroundColor: Colors.secondary }}
                >
                  <Feather name="x" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                onPress={pickPhotos}
                disabled={sending}
                className="mr-2 mb-2 items-center justify-center rounded-xl"
                style={{
                  width: 68,
                  height: 68,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: Colors.support_primary,
                  opacity: sending ? 0.5 : 1,
                }}
              >
                <Feather name="camera" size={18} color={Colors.gray_medium} />
                <CustomText color="gray_medium" size="specExtraSmall" boldness="regular" classes="mt-0.5">
                  {t("support_ticket.photos_add")}
                </CustomText>
              </TouchableOpacity>
            )}
          </View>

          <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-2">
            {t("support_ticket.reply_hint")}
          </CustomText>
        </View>

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
