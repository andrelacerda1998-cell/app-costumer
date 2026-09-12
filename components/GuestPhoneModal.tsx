import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, TextInput, TouchableOpacity, View } from "react-native";
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
  initialPhone?: string;
  sending?: boolean;
  /** Recebe o número já com +351. */
  onSend: (phone: string) => Promise<void> | void;
};

const onlyLocalDigits = (raw: string) => raw.replace(/^\+351/, "").replace(/\D/g, "").slice(0, 9);

const GuestPhoneModal = ({ visible, onClose, initialPhone, sending = false, onSend }: GuestPhoneModalProps) => {
  const { t } = useTranslation();
  const [digits, setDigits] = useState(onlyLocalDigits(initialPhone ?? ""));

  useEffect(() => {
    if (visible) setDigits(onlyLocalDigits(initialPhone ?? ""));
  }, [visible, initialPhone]);

  // Móvel português: 9 dígitos a começar por 9.
  const isValid = /^9\d{8}$/.test(digits);
  const pretty = digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();

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
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-center px-5">
              <View className="items-center">
                <IconBadge bgColor="support_primary" size="large" classes="mb-4">
                  <Ionicons name="phone-portrait-outline" size={34} color={Colors.secondary} />
                </IconBadge>
                <CustomText color="secondary" size="subtitle" boldness="bold" classes="text-center">
                  {t("guest_phone.title")}
                </CustomText>
                <CustomText color="gray_medium" size="medium" classes="text-center mt-2">
                  {t("guest_phone.subtitle")}
                </CustomText>
              </View>

              <View className="flex-row items-center mt-8">
                <View
                  className="items-center justify-center rounded-2xl mr-2"
                  style={{ height: 58, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.support_primary }}
                >
                  <CustomText color="secondary" size="medium" boldness="bold">+351</CustomText>
                </View>
                <View
                  className="flex-1 rounded-2xl justify-center"
                  style={{ height: 58, paddingHorizontal: 16, borderWidth: 1.5, borderColor: isValid ? Colors.primary : Colors.support_primary }}
                >
                  <TextInput
                    value={pretty}
                    onChangeText={(v) => setDigits(onlyLocalDigits(v))}
                    keyboardType="number-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    autoFocus
                    placeholder={t("guest_phone.placeholder")}
                    placeholderTextColor={Colors.gray_light}
                    maxLength={11}
                    style={{ fontSize: 20, fontFamily: "Poppins_600SemiBold", color: Colors.secondary, letterSpacing: 1 }}
                  />
                </View>
              </View>

              <CustomText color="gray_medium" size="extraSmall" classes="mt-3">
                {t("guest_phone.hint")}
              </CustomText>

              {/* Botão explícito, não o CustomTouchableOpacity: desativado, este
                  ficava só texto solto, sem ar de botão. */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onSend(`+351${digits}`)}
                disabled={!isValid || sending}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isValid || sending }}
                className="items-center justify-center mt-6"
                style={{
                  backgroundColor: isValid && !sending ? Colors.primary : "rgba(250,187,91,0.35)",
                  borderRadius: 999,
                  paddingVertical: 18,
                }}
              >
                <CustomText color="secondary" size="large" boldness="bold" style={{ opacity: isValid && !sending ? 1 : 0.5 }}>
                  {sending ? t("guest_phone.sending") : t("guest_phone.send")}
                </CustomText>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

export default GuestPhoneModal;
