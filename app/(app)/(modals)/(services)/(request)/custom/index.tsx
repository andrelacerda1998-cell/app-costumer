import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import BackHeader from "@/components/app/BackHeader";
import ServicePhotosPicker, { ServicePhoto } from "@/components/app/Services/ServicePhotosPicker";
import { useApi } from "@/contexts/ApiContext";
import { useDialog } from "@/contexts/DialogContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import XIcon from "@/assets/icons/x";

/**
 * Pedido personalizado: para o que nao esta no catalogo.
 *
 * O cliente descreve (e fotografa) o que precisa e diz para quando. Nao ha
 * preco aqui, de proposito: sem tipo de servico ninguem sabe quanto tempo leva.
 * E o backoffice que o define e escolhe as categorias de tecnico; so ai os
 * convites saem, e o cliente e avisado quando houver propostas. Daqui em diante
 * o caminho e o mesmo de um pedido normal: escolhe 1 dos que aceitaram e paga.
 */
const MIN_DESCRIPTION = 10;

const pad = (n: number) => String(n).padStart(2, "0");

const CustomRequestScreen = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();

  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [asap, setAsap] = useState(true);
  const [when, setWhen] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [sending, setSending] = useState(false);

  const uploading = photos.some((p) => p.status === "uploading");
  const canSend = description.trim().length >= MIN_DESCRIPTION && !uploading && !sending && (asap || when !== null);

  const whenLabel = useMemo(() => {
    if (!when) return t("services.custom_request.when_pick");
    return `${when.toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })} · ${pad(when.getHours())}:${pad(when.getMinutes())}`;
  }, [when, t]);

  /** Primeiro o dia, depois a hora — dois pickers nativos em sequencia. */
  const onPicked = (date: Date) => {
    if (picker === "date") {
      const base = when ?? new Date();
      const next = new Date(date);
      next.setHours(base.getHours() || 9, base.getMinutes() || 0, 0, 0);
      setWhen(next);
      setPicker("time");
      return;
    }
    const next = new Date(when ?? date);
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setWhen(next);
    setPicker(null);
  };

  const submit = async () => {
    if (!canSend) return;
    try {
      setSending(true);
      const payload: Record<string, unknown> = {
        description: description.trim(),
        scheduled: !asap,
        photo_ids: photos.filter((p) => p.status === "done" && p.id).map((p) => p.id),
      };
      if (!asap && when) {
        payload.schedule = {
          scheduled_day: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
          scheduled_time_start: `${pad(when.getHours())}:${pad(when.getMinutes())}:00`,
        };
      }

      const { data } = await api.post(API_ROUTES.MATCHING_START_CUSTOM, payload);
      const serviceId = data?.data?.service?.id;
      if (!serviceId) throw new Error("missing service id");

      // O mesmo ecra da seleccao: ele sabe mostrar "em analise" enquanto o
      // backoffice nao envia, e depois as propostas, sem mudar de sitio.
      router.replace(`/(app)/(modals)/(services)/(request)/matching/${serviceId}`);
    } catch (error: any) {
      const status = error?.response?.status;
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: status === 401 ? t("errors.session_expired_title") : t("errors.title"),
        subtitle: (status === 401 ? t("errors.session_expired") : error?.response?.data?.message) ?? t("errors.server_error"),
        closeOnClickOutside: true,
        closeAfterMSeconds: 6000,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-support_secondary">
      <BackHeader backButtonColor="secondary" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <CustomText color="secondary" boldness="bolder" size="title">
            {t("services.custom_request.title")}
          </CustomText>
          <CustomText color="gray_medium" size="medium" classes="mt-1 mb-6">
            {t("services.custom_request.subtitle")}
          </CustomText>

          {/* O QUE */}
          <CustomText color="secondary" boldness="bold" size="small" classes="mb-2">
            {t("services.custom_request.what_label")}
          </CustomText>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t("services.custom_request.what_placeholder")}
            placeholderTextColor={Colors.gray_medium}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            accessibilityLabel={t("services.custom_request.what_label")}
            style={{
              minHeight: 140,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.08)",
              backgroundColor: "#FAF7F2",
              padding: 14,
              fontSize: 15,
              lineHeight: 22,
              color: Colors.secondary,
              fontFamily: "Poppins_400Regular",
            }}
          />
          <CustomText color="gray_medium" size="extraSmall" classes="mt-1">
            {description.trim().length < MIN_DESCRIPTION
              ? t("services.custom_request.what_min", { min: MIN_DESCRIPTION })
              : t("services.custom_request.what_ok")}
          </CustomText>

          {/* FOTOS — o picker ja traz o seu proprio titulo e dica; por um
              segundo por cima ficavam dois "Fotografias" seguidos. */}
          <View className="mt-6">
            <ServicePhotosPicker photos={photos} onChange={setPhotos} />
          </View>

          {/* QUANDO */}
          <CustomText color="secondary" boldness="bold" size="small" classes="mt-6 mb-2">
            {t("services.custom_request.when_label")}
          </CustomText>
          <View className="flex-row" style={{ gap: 10 }}>
            {[
              { key: "asap", label: t("services.custom_request.when_asap"), active: asap, onPress: () => setAsap(true) },
              { key: "pick", label: t("services.custom_request.when_schedule"), active: !asap, onPress: () => { setAsap(false); if (!when) setPicker("date"); } },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={opt.onPress}
                accessibilityRole="button"
                accessibilityState={{ selected: opt.active }}
                className="flex-1 rounded-2xl items-center justify-center"
                style={{
                  height: 48,
                  borderWidth: 1,
                  borderColor: opt.active ? Colors.primary : "rgba(0,0,0,0.08)",
                  backgroundColor: opt.active ? "rgba(250,187,91,0.22)" : Colors.support_secondary,
                }}
              >
                <CustomText color="secondary" boldness={opt.active ? "bold" : "regular"} size="small">
                  {opt.label}
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>
          {!asap && (
            <TouchableOpacity
              onPress={() => setPicker("date")}
              accessibilityRole="button"
              className="flex-row items-center rounded-2xl mt-3 px-4"
              style={{ height: 52, borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#FAF7F2" }}
            >
              <Feather name="calendar" size={16} color={Colors.primary} />
              <CustomText color={when ? "secondary" : "gray_medium"} size="small" classes="ml-2 flex-1" numberOfLines={1}>
                {whenLabel}
              </CustomText>
              <Feather name="chevron-right" size={16} color={Colors.gray_medium} />
            </TouchableOpacity>
          )}

          <CustomText color="gray_medium" size="extraSmall" classes="mt-6">
            {t("services.custom_request.address_note")}
          </CustomText>

          {/* O QUE ACONTECE A SEGUIR — dito antes de carregar, nao depois. */}
          <View className="rounded-2xl mt-4 p-4" style={{ backgroundColor: "rgba(250,187,91,0.14)" }}>
            <CustomText color="secondary" boldness="bold" size="small">
              {t("services.custom_request.next_title")}
            </CustomText>
            <CustomText color="secondary" size="extraSmall" classes="mt-1" style={{ lineHeight: 18 }}>
              {t("services.custom_request.next_body")}
            </CustomText>
          </View>

          <TouchableOpacity
            onPress={submit}
            disabled={!canSend}
            accessibilityRole="button"
            className="rounded-2xl items-center justify-center mt-6"
            style={{ height: 56, backgroundColor: Colors.primary, opacity: canSend ? 1 : 0.45 }}
          >
            <CustomText color="secondary" boldness="bold" size="medium">
              {sending ? t("services.custom_request.sending") : t("services.custom_request.send")}
            </CustomText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        isVisible={picker !== null}
        mode={picker ?? "date"}
        date={when ?? new Date()}
        minimumDate={new Date()}
        locale="pt-PT"
        onConfirm={onPicked}
        onCancel={() => setPicker(null)}
      />
    </SafeAreaView>
  );
};

export default CustomRequestScreen;
