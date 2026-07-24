import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, TextInput, TouchableOpacity, View } from "react-native";
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
 */
const TICKETS_ENDPOINT = "https://piquet-dashboard.vercel.app/api/tickets";
// Histórico local: a app só conhece os tickets que ela própria criou.
const TICKETS_KEY = "piquet_support_tickets_v1";

interface LocalTicket {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  status_label?: string;
  has_reply?: boolean;
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
      const ids = list.map((tk) => tk.id).join(",");
      const res = await fetch(`${TICKETS_ENDPOINT}?ids=${encodeURIComponent(ids)}`);
      const json = await res.json().catch(() => null);
      if (json?.ok && Array.isArray(json.tickets)) {
        const byId: Record<string, { status_label?: string; has_reply?: boolean }> = {};
        json.tickets.forEach((tk: any) => {
          byId[tk.id] = { status_label: tk.status_label, has_reply: tk.has_reply };
        });
        const merged = list.map((tk) => ({ ...tk, ...(byId[tk.id] ?? {}) }));
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

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch(TICKETS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userData?.name ?? "",
          email: userData?.email ?? "",
          phone: userData?.phone_number ?? guestSession?.guest_phone ?? "",
          subject: subject.trim(),
          message: message.trim(),
          service_id: serviceId,
          channel: "app_cliente",
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "erro");

      track("support_ticket_created", { ticket_id: json.ticket_id, has_service: !!serviceId });
      // Guarda no histórico local e mostra na lista — sem sair do ecrã.
      const localTicket: LocalTicket = {
        id: json.ticket_id,
        subject: subject.trim() || message.trim().slice(0, 60),
        message: message.trim(),
        created_at: new Date().toISOString(),
        status_label: t("support_ticket.awaiting_reply"),
        has_reply: false,
      };
      await persist([localTicket, ...tickets]);
      setSubject(serviceId ? t("support_ticket.subject_service", { id: serviceId }) : "");
      setMessage("");
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
        <View className="flex-row items-center mt-2">
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <CustomText color="success" size="extraSmall" boldness="semiBold" classes="ml-1.5">
            {t("support_ticket.reply_via_contact")}
          </CustomText>
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

        {/* Formulário */}
        {tickets.length > 0 && (
          <CustomText color="secondary" boldness="bold" size="medium" classes="mt-5 mb-2">
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
            placeholderTextColor={Colors.gray_light}
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
