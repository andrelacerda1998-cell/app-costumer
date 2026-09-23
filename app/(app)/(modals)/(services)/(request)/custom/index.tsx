import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import BackHeader from "@/components/app/BackHeader";
import ServicePhotosPicker, { ServicePhoto } from "@/components/app/Services/ServicePhotosPicker";
import PhoneVerifyModal from "@/components/PhoneVerifyModal";
import { useApi } from "@/contexts/ApiContext";
import { useDialog } from "@/contexts/DialogContext";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { formatAddressLabel } from "@/hooks/useAddressLabel";
import { API_ROUTES } from "@/constants/ApiRoutes";
import XIcon from "@/assets/icons/x";

/**
 * Pedido personalizado: para o que nao esta no catalogo.
 *
 * O cliente descreve (e fotografa) o que precisa, diz ONDE e para quando. Nao ha
 * preco aqui, de proposito: sem tipo de servico ninguem sabe quanto tempo leva.
 * E o backoffice que o define e escolhe as categorias de tecnico; so ai os
 * convites saem, e o cliente e avisado quando houver propostas. Daqui em diante
 * o caminho e o mesmo de um pedido normal: escolhe 1 dos que aceitaram e paga.
 *
 * Quem nao tem sessao valida o telemovel aqui. Nao e burocracia: o pedido tem
 * de pertencer a alguem (o `startCustom` exige `auth:api`) e as propostas
 * chegam por notificacao — sem numero confirmado nao ha a quem responder. O
 * `auth/guest/register` cria ou encontra a conta pelo numero e devolve o token,
 * usando a morada escolhida aqui como morada principal.
 */
const MIN_DESCRIPTION = 10;

const pad = (n: number) => String(n).padStart(2, "0");

type AddressOption = {
  id: number;
  name?: string | null;
  street_name?: string | null;
  street_number?: string | null;
  city?: string | null;
  country?: string | null;
  main_address?: boolean;
};

const CustomRequestScreen = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { session, setSession } = useSession();
  const { guestSession, setGuestPhone } = useGuestSession();

  const isGuest = !session;

  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [asap, setAsap] = useState(true);
  const [when, setWhen] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [sending, setSending] = useState(false);

  const [addresses, setAddresses] = useState<AddressOption[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [phoneVisible, setPhoneVisible] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  // O numero vive aqui enquanto nao ha conta: o `guest_phone` da sessao de
  // convidado so e escrito depois do registo, e o codigo tem de ser validado
  // contra o numero que a pessoa acabou de escrever no modal.
  const [phone, setPhone] = useState("");

  const guestAddress = guestSession?.guest_address ?? null;

  /**
   * Moradas da conta. Recarrega ao voltar ao ecra porque a escolha de morada
   * acontece noutro ecra: sem isto, quem acabou de criar uma morada voltava
   * para aqui sem a ver.
   */
  const loadAddresses = useCallback(() => {
    if (isGuest) return;
    setLoadingAddresses(true);
    api.get(API_ROUTES.CUSTOMER_ADDRESSES)
      .then(({ data }) => {
        const list: AddressOption[] = data?.data?.addresses ?? [];
        setAddresses(list);
        setAddressId((atual) => {
          if (atual && list.some((a) => Number(a.id) === atual)) return atual;
          const principal = list.find((a) => a.main_address) ?? list[0];
          return principal ? Number(principal.id) : null;
        });
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
  }, [api, isGuest]);

  useFocusEffect(useCallback(() => { loadAddresses(); }, [loadAddresses]));

  // Assim que a sessao existe (o convidado acabou de validar o numero), as
  // moradas da conta passam a estar disponiveis.
  useEffect(() => { loadAddresses(); }, [session, loadAddresses]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => Number(a.id) === addressId) ?? null,
    [addresses, addressId],
  );

  const addressLabel = isGuest
    ? formatAddressLabel(guestAddress)
    : formatAddressLabel(selectedAddress);

  const hasAddress = isGuest ? !!guestAddress : !!selectedAddress;
  const identified = !isGuest || phoneVerified;

  const uploading = photos.some((p) => p.status === "uploading");
  const canSend =
    description.trim().length >= MIN_DESCRIPTION
    && !uploading
    && !sending
    && (asap || when !== null)
    && hasAddress
    && identified;

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

  const pickAddress = () => {
    if (isGuest) {
      router.push("/(app)/(modals)/(services)/(request)/address/guest");
      return;
    }
    router.push("/(app)/(modals)/(address)/list");
  };

  /** E.164 portugues, como no checkout: o backend so aceita assim. */
  const formatPhone = (raw: string) => {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (raw.trim().startsWith("+")) return `+${digits}`;
    return digits.startsWith("351") ? `+${digits}` : `+351${digits}`;
  };

  const handleSendOtp = async (numero: string) => {
    try {
      await api.post(API_ROUTES.GUEST_SEND_OTP, { phone_number: formatPhone(numero) });
      setPhone(numero);
      return true;
    } catch (error: any) {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: error?.response?.data?.message ?? t("errors.occurred_an_error"),
        closeOnClickOutside: true,
        closeAfterMSeconds: 6000,
      });
      return false;
    }
  };

  /**
   * Validar o codigo e, com ele, criar/recuperar a conta. O `guest/register`
   * exige morada — e por isso que a morada vem antes do numero neste ecra.
   */
  const handleVerifyOtp = async (code: string) => {
    const formatted = formatPhone(phone);
    try {
      const verify = await api.post(API_ROUTES.GUEST_VERIFY_OTP, { phone_number: formatted, code });
      const verificationToken = verify?.data?.data?.verification_token;

      const registo = await api.post(API_ROUTES.GUEST_REGISTER, {
        phone_number: formatted,
        verification_token: verificationToken,
        address: {
          latitude: guestAddress?.latitude,
          longitude: guestAddress?.longitude,
          street_name: guestAddress?.street_name,
          street_number: guestAddress?.street_number,
          additional_info: guestAddress?.additional_info,
          postal_code: guestAddress?.postal_code,
          city: guestAddress?.city,
          state: guestAddress?.state,
          country: guestAddress?.country,
        },
      });

      setSession(registo?.data?.data?.access_token);
      setGuestPhone(formatted);
      setPhoneVerified(true);
      return true;
    } catch (error: any) {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: error?.response?.data?.message ?? t("errors.occurred_an_error"),
        closeOnClickOutside: true,
        closeAfterMSeconds: 6000,
      });
      return false;
    }
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
      // Sem isto o backend caia na morada principal — que pode nao ser aquela
      // onde o trabalho e para acontecer.
      if (addressId) payload.address_id = addressId;
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

  const linha = {
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#FAF7F2",
  } as const;

  return (
    <SafeAreaView className="flex-1 bg-support_secondary">
      <BackHeader backButtonColor="secondary" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <CustomText color="secondary" boldness="bolder" size="title" classes="mb-6">
            {t("services.custom_request.title")}
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
          {description.trim().length > 0 && description.trim().length < MIN_DESCRIPTION && (
            <CustomText color="gray_medium" size="extraSmall" classes="mt-1">
              {t("services.custom_request.what_min", { min: MIN_DESCRIPTION })}
            </CustomText>
          )}

          {/* FOTOS — o picker ja traz o seu proprio titulo e dica; por um
              segundo por cima ficavam dois "Fotografias" seguidos. */}
          <View className="mt-6">
            <ServicePhotosPicker photos={photos} onChange={setPhotos} />
          </View>

          {/* ONDE. Deixou de ser uma nota fixa a dizer "na tua morada
              principal": o trabalho pode ser noutra casa, e quem chega sem
              conta nao tem morada nenhuma para assumir. */}
          <CustomText color="secondary" boldness="bold" size="small" classes="mt-6 mb-2">
            {t("services.custom_request.address_label")}
          </CustomText>
          <TouchableOpacity
            onPress={pickAddress}
            accessibilityRole="button"
            accessibilityLabel={t("services.custom_request.address_label")}
            className="flex-row items-center rounded-2xl px-4"
            style={linha}
          >
            <Feather name="map-pin" size={16} color={Colors.primary} />
            {loadingAddresses && !hasAddress ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 10 }} />
            ) : (
              <CustomText
                color={hasAddress ? "secondary" : "gray_medium"}
                size="small"
                classes="ml-2 flex-1"
                numberOfLines={1}
              >
                {hasAddress ? addressLabel : t("services.custom_request.address_pick")}
              </CustomText>
            )}
            <Feather name="chevron-right" size={16} color={Colors.gray_medium} />
          </TouchableOpacity>

          {/* QUEM. So para quem nao tem sessao. */}
          {isGuest && (
            <>
              <CustomText color="secondary" boldness="bold" size="small" classes="mt-6 mb-2">
                {t("services.custom_request.phone_label")}
              </CustomText>
              <TouchableOpacity
                onPress={() => {
                  // Sem morada o `guest/register` rebenta; mais vale mandar
                  // resolver a morada do que deixar o cliente escrever o
                  // numero, receber o SMS e so depois falhar.
                  if (!guestAddress) {
                    pickAddress();
                    return;
                  }
                  setPhoneVisible(true);
                }}
                accessibilityRole="button"
                disabled={phoneVerified}
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  ...linha,
                  borderColor: phoneVerified ? Colors.primary : "rgba(0,0,0,0.08)",
                  backgroundColor: phoneVerified ? "rgba(250,187,91,0.14)" : "#FAF7F2",
                }}
              >
                <Feather
                  name={phoneVerified ? "check-circle" : "smartphone"}
                  size={16}
                  color={phoneVerified ? Colors.primary : Colors.gray_medium}
                />
                <CustomText
                  color={phoneVerified ? "secondary" : "gray_medium"}
                  size="small"
                  classes="ml-2 flex-1"
                  numberOfLines={1}
                >
                  {phoneVerified
                    ? t("services.custom_request.phone_verified", { phone: guestSession?.guest_phone ?? "" })
                    : t("services.custom_request.phone_verify")}
                </CustomText>
                {!phoneVerified && <Feather name="chevron-right" size={16} color={Colors.gray_medium} />}
              </TouchableOpacity>
              {!phoneVerified && (
                <CustomText color="gray_medium" size="extraSmall" classes="mt-1.5">
                  {t("services.custom_request.phone_hint")}
                </CustomText>
              )}
            </>
          )}

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
              style={linha}
            >
              <Feather name="calendar" size={16} color={Colors.primary} />
              <CustomText color={when ? "secondary" : "gray_medium"} size="small" classes="ml-2 flex-1" numberOfLines={1}>
                {whenLabel}
              </CustomText>
              <Feather name="chevron-right" size={16} color={Colors.gray_medium} />
            </TouchableOpacity>
          )}

          {/* O que acontece a seguir, dito antes de carregar e nao depois: este
              fluxo nao mostra preco, e sem isto o botao pedia um salto as cegas. */}
          <View className="rounded-2xl mt-6 p-4" style={{ backgroundColor: "rgba(250,187,91,0.14)" }}>
            <CustomText color="secondary" size="small" style={{ lineHeight: 20 }}>
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

      {/* Mesmo ecra de confirmacao do checkout: comeca no numero, valida o
          codigo e, no fim, ja ha sessao. */}
      <PhoneVerifyModal
        visible={phoneVisible}
        onClose={() => setPhoneVisible(false)}
        initialStep="number"
        phoneNumber={phone || guestSession?.guest_phone || null}
        numberEditable
        onSendCode={handleSendOtp}
        onValidate={handleVerifyOtp}
        onResend={() => { handleSendOtp(phone); }}
        onVerified={() => setPhoneVisible(false)}
      />
    </SafeAreaView>
  );
};

export default CustomRequestScreen;
