import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { OtpInput } from "react-native-otp-entry";
import { useTranslation } from "react-i18next";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { CustomText } from "@/components/CustomText";
import { ThemedText } from "@/components/ThemedText";
import BackHeader from "@/components/app/BackHeader";
import IconBadge from "@/components/IconBadge";

/**
 * Confirmar o telemóvel: UM ecrã, dois estados.
 *
 *   number → o cliente escreve (ou vê) o número e pede o código
 *   code   → escreve o código que recebeu por SMS
 *
 * Substitui três ecrãs que faziam partes disto com visuais e registos
 * diferentes: a folha do número do convidado, a folha do código, e o ecrã
 * "Verificação de Telefone" do Perfil. Um só ecrã tem outra vantagem além
 * da consistência: não há troca de folhas entre os dois passos, e no iOS
 * duas folhas trocadas no mesmo instante perdiam a segunda.
 *
 * Quem tem conta abre já no estado `code` — o número vem do perfil — com
 * "Alterar" a levar ao perfil. O convidado começa no `number`, e "Alterar"
 * volta a esse estado com o número preenchido.
 */
export type PhoneVerifyStep = "number" | "code";

export type PhoneVerifyModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Onde começa quando abre. Conta: `code`; convidado: `number`. */
  initialStep?: PhoneVerifyStep;
  /** Número em E.164 (ex.: +351912345678), quando já se conhece. */
  phoneNumber?: string | null;
  /** O cliente pode escrever/mudar o número aqui (convidado). */
  numberEditable?: boolean;
  /** Conta: "Alterar" leva a outro sítio (perfil) em vez de editar aqui. */
  onChangeNumber?: () => void;
  /** Pede o código para o número (E.164). true = enviado, passa ao código. */
  onSendCode?: (phone: string) => Promise<boolean>;
  /** Valida o código. true = confirmado. */
  onValidate: (code: string) => Promise<boolean>;
  /** Reenvio no estado `code`. */
  onResend?: () => Promise<void> | void;
  onVerified?: () => void;
  /** Segundos que ainda faltam para poder reenviar (quando já houve envio). */
  resendRemainingSeconds?: number;
  resendCooldownSeconds?: number;
  codeLength?: number;
  /** Só em __DEV__: o backend devolve o código para preencher sozinho. */
  mockCode?: string;
};

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

const splitPhone = (raw: string) => {
  const digitsAll = raw.replace(/\D/g, "");
  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => raw.trim().startsWith("+") && digitsAll.startsWith(c.dial.slice(1)));
  if (match) return { dial: match.dial, digits: digitsAll.slice(match.dial.length - 1) };
  return { dial: "+351", digits: digitsAll };
};

/** "+351 913 333 666" — o número lê-se por grupos, não em bloco. */
export const prettyPhone = (raw?: string | null) => {
  if (!raw) return "";
  const { dial, digits } = splitPhone(raw);
  return `${dial} ${digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim()}`.trim();
};

const formatCountdown = (total: number) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const PhoneVerifyModal = ({
  visible,
  onClose,
  initialStep = "number",
  phoneNumber,
  numberEditable = true,
  onChangeNumber,
  onSendCode,
  onValidate,
  onResend,
  onVerified,
  resendRemainingSeconds,
  resendCooldownSeconds = 300,
  codeLength = 6,
  mockCode,
}: PhoneVerifyModalProps) => {
  const { t } = useTranslation();

  const [step, setStep] = useState<PhoneVerifyStep>(initialStep);
  const [dial, setDial] = useState("+351");
  const [digits, setDigits] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRef = useRef<any>(null);
  const validatingRef = useRef(false);

  const startTimer = (from: number) => {
    setResendTimer(from);
    if (timerRef.current) clearInterval(timerRef.current);
    if (from <= 0) return;
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Ao abrir: repõe tudo e arranca no estado pedido, com o número conhecido.
  useEffect(() => {
    if (!visible) return;
    const parsed = splitPhone(phoneNumber ?? "");
    setDial(parsed.dial);
    setDigits(parsed.digits);
    setStep(initialStep);
    setCode("");
    setCodeError(null);
    setVerified(false);
    setValidating(false);
    setSending(false);
    if (initialStep === "code") startTimer(resendRemainingSeconds ?? resendCooldownSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Só em desenvolvimento: um mock_code que escape do backend em release nunca
  // preenche nada sozinho.
  useEffect(() => {
    if (__DEV__ && visible && step === "code" && mockCode) {
      setCode(mockCode);
      const id = setTimeout(() => otpRef.current?.setValue(mockCode), 300);
      return () => clearTimeout(id);
    }
  }, [visible, step, mockCode]);

  const country = COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0];
  const fullPhone = `${dial}${digits}`;
  const isValidNumber = dial === "+351" ? /^9\d{8}$/.test(digits) : /^\d{6,12}$/.test(digits);
  const prettyDigits = digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();

  const handleSend = async () => {
    if (!onSendCode || !isValidNumber || sending) return;
    setSending(true);
    try {
      const ok = await onSendCode(fullPhone);
      if (ok) {
        setCode("");
        setCodeError(null);
        setStep("code");
        startTimer(resendCooldownSeconds);
      }
    } finally {
      setSending(false);
    }
  };

  const handleValidate = async () => {
    if (validatingRef.current || code.length < codeLength) return;
    validatingRef.current = true;
    setValidating(true);
    setCodeError(null);
    try {
      const ok = await onValidate(code);
      if (ok) {
        setVerified(true);
        onVerified?.();
      } else {
        setCodeError(t("phone_verify.invalid_code"));
      }
    } finally {
      setValidating(false);
      validatingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || validating) return;
    setCode("");
    setCodeError(null);
    otpRef.current?.clear?.();
    startTimer(resendCooldownSeconds);
    await onResend?.();
  };

  const handleChangeNumber = () => {
    if (numberEditable) {
      setStep("number");
      return;
    }
    onChangeNumber?.();
  };

  const canSend = isValidNumber && !sending;
  const canValidate = code.length === codeLength && !validating;

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
                  {t("phone_verify.header")}
                </ThemedText>
              )}
              onBack={step === "code" && numberEditable && !verified ? handleChangeNumber : onClose}
            />
          </View>
        </SafeAreaView>

        <View className="flex-1 bg-support_secondary overflow-hidden" style={{ borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
          <SafeAreaView edges={["bottom"]} className="flex-1">
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 px-6" style={{ paddingTop: 40 }}>
              {verified ? (
                <View className="items-center">
                  <IconBadge bgColor="secondary" size="large" classes="mb-5">
                    <FontAwesome6 name="check" size={28} color={Colors.primary} />
                  </IconBadge>
                  <CustomText color="secondary" size="subtitle" boldness="bold" classes="text-center">
                    {t("phone_verify.success_title")}
                  </CustomText>
                  <CustomText color="gray_medium" size="medium" classes="text-center mt-2">
                    {t("phone_verify.success_subtitle")}
                  </CustomText>
                </View>
              ) : (
                <>
                  {/* Cabeça igual nos dois estados: é o mesmo ecrã a avançar. */}
                  <View className="items-center">
                    <IconBadge bgColor="primary" size="large" classes="mb-5">
                      <Ionicons name="phone-portrait-outline" size={34} color={Colors.secondary} />
                    </IconBadge>
                    <CustomText color="secondary" size="subtitle" boldness="bold" classes="text-center">
                      {t("phone_verify.title")}
                    </CustomText>
                    {step === "number" ? (
                      <CustomText color="gray_medium" size="medium" classes="text-center mt-2 px-2">
                        {t("phone_verify.number_subtitle")}
                      </CustomText>
                    ) : (
                      <View className="items-center mt-2">
                        <CustomText color="gray_medium" size="medium" classes="text-center">
                          {t("phone_verify.code_subtitle")}
                        </CustomText>
                        <View className="flex-row items-center mt-1">
                          <CustomText color="secondary" size="large" boldness="bold">
                            {prettyPhone(fullPhone)}
                          </CustomText>
                          {(numberEditable || onChangeNumber) && (
                            <TouchableOpacity onPress={handleChangeNumber} className="ml-3" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <CustomText color="secondary" size="small" boldness="bold" style={{ textDecorationLine: "underline" }}>
                                {t("phone_verify.change")}
                              </CustomText>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  {step === "number" ? (
                    <>
                      <View className="flex-row items-center mt-8">
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => numberEditable && setPickerOpen(true)}
                          disabled={!numberEditable}
                          accessibilityRole="button"
                          accessibilityLabel={`${country.name} ${country.dial}`}
                          className="flex-row items-center justify-center rounded-2xl mr-2"
                          style={{ height: 58, paddingHorizontal: 12, borderWidth: 1.5, borderColor: Colors.support_primary }}
                        >
                          <CustomText color="secondary" size="medium">{country.flag}</CustomText>
                          <CustomText color="secondary" size="medium" boldness="bold" classes="ml-1">{country.dial}</CustomText>
                          {numberEditable && <Ionicons name="chevron-down" size={14} color={Colors.gray_medium} style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                        <View
                          className="flex-1 rounded-2xl justify-center"
                          style={{ height: 58, paddingHorizontal: 16, borderWidth: 1.5, borderColor: isValidNumber ? Colors.primary : Colors.support_primary }}
                        >
                          <TextInput
                            value={prettyDigits}
                            editable={numberEditable}
                            onChangeText={(v) => setDigits(v.replace(/\D/g, "").slice(0, 12))}
                            keyboardType="number-pad"
                            textContentType="telephoneNumber"
                            autoComplete="tel"
                            autoFocus={numberEditable}
                            placeholder={dial === "+351" ? "9XX XXX XXX" : t("phone_verify.number_placeholder")}
                            placeholderTextColor={Colors.gray_light}
                            maxLength={15}
                            style={{ fontSize: 20, fontFamily: "Poppins_600SemiBold", color: Colors.secondary, letterSpacing: 1 }}
                          />
                        </View>
                      </View>

                      <View className="flex-row items-center justify-center mt-3">
                        <CustomText color="gray_medium" size="extraSmall" classes="text-center">
                          {t("phone_verify.number_hint")}
                        </CustomText>
                        {!numberEditable && onChangeNumber && (
                          <TouchableOpacity onPress={onChangeNumber} className="ml-2" hitSlop={{ top: 8, bottom: 8 }}>
                            <CustomText color="secondary" size="extraSmall" boldness="bold" style={{ textDecorationLine: "underline" }}>
                              {t("phone_verify.change")}
                            </CustomText>
                          </TouchableOpacity>
                        )}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleSend}
                        disabled={!canSend}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canSend }}
                        className="items-center justify-center mt-6"
                        style={{ backgroundColor: canSend ? Colors.primary : "rgba(250,187,91,0.35)", borderRadius: 999, paddingVertical: 18 }}
                      >
                        <CustomText color="secondary" size="large" boldness="bold" style={{ opacity: canSend ? 1 : 0.5 }}>
                          {sending ? t("phone_verify.sending") : t("phone_verify.send")}
                        </CustomText>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View className="w-full mt-8">
                        <OtpInput
                          ref={otpRef}
                          numberOfDigits={codeLength}
                          autoFocus
                          hideStick
                          blurOnFilled
                          type="numeric"
                          focusStickBlinkingDuration={500}
                          onTextChange={(text) => {
                            setCode(text);
                            if (codeError) setCodeError(null);
                          }}
                          textInputProps={{ accessibilityLabel: t("phone_verify.header") }}
                          theme={{
                            pinCodeContainerStyle: styles.pin,
                            pinCodeTextStyle: styles.pinText,
                            focusedPinCodeContainerStyle: styles.pinActive,
                            filledPinCodeContainerStyle: styles.pinFilled,
                          }}
                        />
                        {codeError ? (
                          <CustomText color="error" size="small" classes="text-center mt-3">
                            {codeError}
                          </CustomText>
                        ) : null}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleValidate}
                        disabled={!canValidate}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canValidate }}
                        className="items-center justify-center mt-6"
                        style={{ backgroundColor: canValidate ? Colors.primary : "rgba(250,187,91,0.35)", borderRadius: 999, paddingVertical: 18 }}
                      >
                        <CustomText color="secondary" size="large" boldness="bold" style={{ opacity: canValidate ? 1 : 0.5 }}>
                          {validating ? t("phone_verify.validating") : t("phone_verify.confirm")}
                        </CustomText>
                      </TouchableOpacity>

                      <View className="items-center mt-5">
                        <CustomText color="gray_medium" size="small">
                          {t("phone_verify.not_received")}
                        </CustomText>
                        <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0 || validating} className="py-1 mt-0.5" hitSlop={{ top: 6, bottom: 6 }}>
                          <CustomText
                            color={resendTimer > 0 ? "gray_medium" : "secondary"}
                            size="small"
                            boldness="bold"
                            style={resendTimer > 0 ? undefined : { textDecorationLine: "underline" }}
                          >
                            {resendTimer > 0
                              ? t("phone_verify.resend_in", { time: formatCountdown(resendTimer) })
                              : t("phone_verify.resend")}
                          </CustomText>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>

        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setPickerOpen(false)}>
            <Pressable onPress={() => {}} className="bg-support_secondary px-5 pt-4 pb-8" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "60%" }}>
              <CustomText color="secondary" size="medium" boldness="bold" classes="text-center mb-2">
                {t("phone_verify.pick_country")}
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

const styles = StyleSheet.create({
  pin: { borderRadius: 14, borderWidth: 1.5, borderColor: Colors.support_primary, backgroundColor: Colors.support_secondary, width: 50, height: 58 },
  pinText: { color: Colors.secondary, fontSize: 24, fontFamily: "Poppins_600SemiBold" },
  pinActive: { borderColor: Colors.primary },
  pinFilled: { borderColor: Colors.secondary },
});

export default PhoneVerifyModal;
