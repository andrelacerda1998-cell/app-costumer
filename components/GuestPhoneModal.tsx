import React, { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { CustomText } from "@/components/CustomText";
import { ThemedText } from "@/components/ThemedText";
import BackHeader from "@/components/app/BackHeader";
import IconBadge from "@/components/IconBadge";

/**
 * Pedir o telemóvel a um convidado antes de validar o código.
 *
 * O checkout de convidado dizia "Valida o teu número de telemóvel para
 * continuar" e não tinha um único sítio onde o escrever: o envio do código
 * (`handleSendOtp`) só era chamado pelo "Reenviar" da caixa do código — que
 * nunca chegava a abrir. Esta caixa é o passo que faltava, com a mesma
 * moldura da caixa do código (`ValidatePhoneModal`) para se lerem como dois
 * passos da mesma coisa.
 */
export type GuestPhoneModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Número completo em E.164 (ex.: +351912345678) para pré-preencher. */
  initialPhone?: string;
  sending?: boolean;
  /** Recebe o número completo em E.164. */
  onSend: (phone: string) => Promise<void> | void;
};

/**
 * Indicativos oferecidos. Portugal primeiro porque é o mercado; os outros
 * são os de quem cá vive ou tem casa cá. O SMS segue para qualquer um — o
 * backend recebe E.164 e não valida o país.
 */
const COUNTRIES = [
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Espanha" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "França" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "Reino Unido" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Alemanha" },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Suíça" },
  { code: "LU", dial: "+352", flag: "🇱🇺", name: "Luxemburgo" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brasil" },
  { code: "AO", dial: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "EUA" },
];

const splitInitial = (raw: string) => {
  const digitsAll = raw.replace(/\D/g, "");
  // Indicativo mais longo primeiro (+351 antes de +35…), senão +1 apanhava tudo.
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => raw.startsWith("+") && digitsAll.startsWith(c.dial.slice(1)));
  if (match) return { dial: match.dial, digits: digitsAll.slice(match.dial.length - 1) };
  return { dial: "+351", digits: digitsAll };
};

const GuestPhoneModal = ({ visible, onClose, initialPhone, sending = false, onSend }: GuestPhoneModalProps) => {
  const { t } = useTranslation();
  const [dial, setDial] = useState("+351");
  const [digits, setDigits] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const parsed = splitInitial(initialPhone ?? "");
    setDial(parsed.dial);
    setDigits(parsed.digits);
  }, [visible, initialPhone]);

  const country = COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0];
  // PT: móvel de 9 dígitos a começar por 9. Outros: entre 6 e 12 dígitos.
  const isValid = dial === "+351" ? /^9\d{8}$/.test(digits) : /^\d{6,12}$/.test(digits);
  const pretty = digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  const canSend = isValid && !sending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-primary">
        <StatusBar style="dark" backgroundColor={Colors.primary} animated />
        <SafeAreaView edges={["top"]}>
          <View className="px-5 py-3">
            <BackHeader
              backButtonColor="secondary"
              middleItem={() => (
                <ThemedText type="defaultBold" color={Colors.secondary} numberOfLines={1}>
                  {t("guest_phone.title")}
                </ThemedText>
              )}
              onBack={onClose}
            />
          </View>
        </SafeAreaView>

        <View className="flex-1 bg-support_secondary overflow-hidden" style={{ borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
          <SafeAreaView edges={["bottom"]} className="flex-1">
            {/* Tudo centrado e a começar no terço de cima, não a meio: com o
                teclado aberto o campo e o botão têm de ficar à vista. */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 px-6" style={{ paddingTop: 40 }}>
              <View className="items-center">
                <IconBadge bgColor="primary" size="large" classes="mb-5">
                  <Ionicons name="phone-portrait-outline" size={34} color={Colors.secondary} />
                </IconBadge>
                <CustomText color="secondary" size="subtitle" boldness="bold" classes="text-center">
                  {t("guest_phone.title")}
                </CustomText>
                <CustomText color="gray_medium" size="medium" classes="text-center mt-2 px-2">
                  {t("guest_phone.subtitle")}
                </CustomText>
              </View>

              <View className="flex-row items-center mt-8">
                {/* Indicativo: toca para escolher outro país. */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`${country.name} ${country.dial}`}
                  className="flex-row items-center justify-center rounded-2xl mr-2"
                  style={{ height: 58, paddingHorizontal: 12, borderWidth: 1.5, borderColor: Colors.support_primary }}
                >
                  <CustomText color="secondary" size="medium">{country.flag}</CustomText>
                  <CustomText color="secondary" size="medium" boldness="bold" classes="ml-1">{country.dial}</CustomText>
                  <Ionicons name="chevron-down" size={14} color={Colors.gray_medium} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <View
                  className="flex-1 rounded-2xl justify-center"
                  style={{ height: 58, paddingHorizontal: 16, borderWidth: 1.5, borderColor: isValid ? Colors.primary : Colors.support_primary }}
                >
                  <TextInput
                    value={pretty}
                    onChangeText={(v) => setDigits(v.replace(/\D/g, "").slice(0, 12))}
                    keyboardType="number-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    autoFocus
                    placeholder={dial === "+351" ? t("guest_phone.placeholder") : t("guest_phone.placeholder_other")}
                    placeholderTextColor={Colors.gray_light}
                    maxLength={15}
                    style={{ fontSize: 20, fontFamily: "Poppins_600SemiBold", color: Colors.secondary, letterSpacing: 1 }}
                  />
                </View>
              </View>

              <CustomText color="gray_medium" size="extraSmall" classes="text-center mt-3">
                {t("guest_phone.hint")}
              </CustomText>

              {/* Botão explícito, não o CustomTouchableOpacity: desativado, este
                  ficava só texto solto, sem ar de botão. */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onSend(`${dial}${digits}`)}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSend }}
                className="items-center justify-center mt-6"
                style={{ backgroundColor: canSend ? Colors.primary : "rgba(250,187,91,0.35)", borderRadius: 999, paddingVertical: 18 }}
              >
                <CustomText color="secondary" size="large" boldness="bold" style={{ opacity: canSend ? 1 : 0.5 }}>
                  {sending ? t("guest_phone.sending") : t("guest_phone.send")}
                </CustomText>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>

        {/* Lista de indicativos: folha por cima, fecha ao escolher ou ao tocar fora. */}
        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setPickerOpen(false)}>
            <Pressable onPress={() => {}} className="bg-support_secondary px-5 pt-4 pb-8" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "60%" }}>
              <CustomText color="secondary" size="medium" boldness="bold" classes="text-center mb-2">
                {t("guest_phone.pick_country")}
              </CustomText>
              <FlatList
                data={COUNTRIES}
                keyExtractor={(c) => c.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { setDial(item.dial); setPickerOpen(false); }}
                    className="flex-row items-center py-3"
                    style={{ borderBottomWidth: 1, borderBottomColor: Colors.support_primary }}
                  >
                    <CustomText color="secondary" size="large">{item.flag}</CustomText>
                    <CustomText color="secondary" size="medium" boldness={item.dial === dial ? "bold" : "regular"} classes="flex-1 ml-3">{item.name}</CustomText>
                    <CustomText color="gray_medium" size="medium" boldness="semiBold">{item.dial}</CustomText>
                    {item.dial === dial && <Ionicons name="checkmark" size={18} color={Colors.primary} style={{ marginLeft: 8 }} />}
                  </TouchableOpacity>
                )}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
};

export default GuestPhoneModal;
