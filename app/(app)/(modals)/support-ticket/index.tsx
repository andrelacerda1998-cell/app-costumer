import React, { useState } from "react";
import { ActivityIndicator, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

  const canSend = message.trim().length >= 10 && !sending;

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
      openDialog({
        icon: <CheckMark color={Colors.secondary} />,
        title: t("support_ticket.success_title"),
        subtitle: t("support_ticket.success_subtitle", { id: json.ticket_id }),
        closeAfterMSeconds: 3500,
        closeOnClickOutside: true,
      });
      handleGoBack();
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

        {/* Formulário */}
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
              borderColor: "#E4E3E3",
              borderRadius: 12,
              padding: 12,
              fontFamily: "Poppins_400Regular",
              fontSize: 14,
              color: Colors.secondary,
            }}
          />
          <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-2">
            {t("support_ticket.reply_hint")}
          </CustomText>
        </View>
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
