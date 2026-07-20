import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { OtpInput } from "react-native-otp-entry";
import { useTranslation } from "react-i18next";
import { FontAwesome6 } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { ThemedText } from "@/components/ThemedText";
import BackHeader from "@/components/app/BackHeader";
import IconBadge from "@/components/IconBadge";

const MOCK_PHONE_NUMBER = "+351 9XX XXX XXX";
const MOCK_VALID_CODE = "123456";
const MOCK_VERIFY_DELAY_MS = 800;

const formatCountdown = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0 && seconds > 0) return `${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

export type ValidatePhoneModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  phoneNumber?: string;
  mockCode?: string;
  codeLength?: number;
  resendCooldownSeconds?: number;
  resendRemainingSeconds?: number;
  onValidate?: (code: string) => Promise<any> | boolean;
  onVerified?: () => void;
  onResend?: () => Promise<void> | void;
};

const ValidatePhoneModal = ({
  visible,
  onClose,
  title,
  phoneNumber = MOCK_PHONE_NUMBER,
  codeLength = 6,
  resendCooldownSeconds = 300,
  resendRemainingSeconds,
  onValidate,
  onVerified,
  onResend,
  mockCode,
}: ValidatePhoneModalProps) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<any>(null);
  const validatingRef = useRef(false);
  const startOtpTimer = (from = resendCooldownSeconds) => {
    setOtpResendTimer(from);
    if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    if (from <= 0) return; // nada a contar → botão de reenvio já liberado
    otpTimerRef.current = setInterval(() => {
      setOtpResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(otpTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (visible) {
      setCode("");
      setCodeError(null);
      setLoading(false);
      setVerified(false);
      startOtpTimer(resendRemainingSeconds ?? resendCooldownSeconds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Auto-preenchimento do OTP só em builds de desenvolvimento. Em release (__DEV__ === false)
    // um mock_code vazado pelo backend nunca preenche o código automaticamente.
    if (__DEV__ && visible && mockCode) {
      setCode(mockCode);
      const id = setTimeout(() => otpInputRef.current?.setValue(mockCode), 300);
      return () => clearTimeout(id);
    }
  }, [visible, mockCode]);

  const mockValidate = (value: string) =>
    new Promise<boolean>((resolve) => {
      setTimeout(
        () => resolve(value === MOCK_VALID_CODE),
        MOCK_VERIFY_DELAY_MS,
      );
    });

  const handleValidate = async () => {
    // Evita duplo-envio: fecha a janela de corrida do duplo-clique antes de o
    // estado loading atualizar (batching do React), que consumiria o limite de
    // throttle e provocaria um 429 falso.
    if (validatingRef.current) return;
    validatingRef.current = true;
    setLoading(true);
    setCodeError(null);
    try {
      const isValid = await (onValidate
        ? onValidate(code)
        : mockValidate(code));
      if (isValid) {
        setVerified(true);
        onVerified?.();
      } else {
        setCodeError(t("otp_verification.invalid_code"));
      }
    } finally {
      setLoading(false);
      validatingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (otpResendTimer > 0 || loading) return;
    setCode("");
    setCodeError(null);
    startOtpTimer();
    await onResend?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-primary">
        <StatusBar style="dark" backgroundColor={Colors.primary} animated />

        <SafeAreaView edges={["top"]}>
          <View className="px-5 py-3">
            <BackHeader
              backButtonColor="secondary"
              middleItem={() => (
                <ThemedText
                  type="defaultBold"
                  color={Colors.secondary}
                  numberOfLines={1}
                >
                  {title ?? t("otp_verification.title")}
                </ThemedText>
              )}
              onBack={onClose}
            />
          </View>
        </SafeAreaView>

        <View
          className="flex-1 bg-support_secondary overflow-hidden"
          style={{ borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
        >
          <SafeAreaView edges={["bottom"]} className="flex-1">
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                padding: 20,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {verified ? (
                <View className="items-center justify-center">
                  <IconBadge bgColor="secondary" size="large" classes="mb-4">
                    <FontAwesome6
                      name="check"
                      size={28}
                      color={Colors.primary}
                    />
                  </IconBadge>
                  <CustomText
                    color="secondary"
                    size="subtitle"
                    boldness="semiBold"
                    classes="text-center"
                  >
                    {t("otp_verification.success.title")}
                  </CustomText>
                  <CustomText
                    color="gray_strong"
                    size="small"
                    boldness="medium"
                    classes="text-center mt-1"
                  >
                    {t("otp_verification.success.subtitle")}
                  </CustomText>
                </View>
              ) : (
                <View className="w-full">
                  <IconBadge
                    bgColor="support_primary"
                    size="xlarge"
                    classes="self-center mb-6"
                  >
                    <FontAwesome6
                      name="comment-sms"
                      size={40}
                      color={Colors.secondary}
                    />
                  </IconBadge>

                  <CustomText
                    color="secondary"
                    size="subtitle"
                    boldness="semiBold"
                    classes="text-center"
                  >
                    {t("otp_verification.title")}
                  </CustomText>
                  <CustomText
                    color="gray_strong"
                    size="small"
                    boldness="medium"
                    classes="text-center mt-2"
                  >
                    {t("otp_verification.subtitle")}
                  </CustomText>
                  <CustomText
                    color="secondary"
                    size="large"
                    boldness="semiBold"
                    classes="text-center mt-1"
                  >
                    {phoneNumber}
                  </CustomText>

                  <View className="w-full mt-8">
                    <KeyboardAvoidingView
                      behavior={Platform.OS === "ios" ? "padding" : "height"}
                    >
                      <OtpInput
                        ref={otpInputRef}
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
                        textInputProps={{
                          accessibilityLabel: t("otp_verification.title"),
                        }}
                        theme={{
                          pinCodeContainerStyle: styles.pinCodeContainer,
                          pinCodeTextStyle: styles.pinCodeText,
                          focusedPinCodeContainerStyle:
                            styles.activePinCodeContainer,
                          filledPinCodeContainerStyle:
                            styles.filledPinCodeContainer,
                        }}
                      />
                    </KeyboardAvoidingView>

                    {codeError ? (
                      <CustomText
                        color="error"
                        size="small"
                        classes="text-center mt-3"
                      >
                        {codeError}
                      </CustomText>
                    ) : null}
                  </View>

                  {/* Botão validar */}
                  <View className="w-full mt-8">
                    <CustomTouchableOpacity
                      type="primary"
                      size="large"
                      text={t("otp_verification.validate")}
                      textSize="medium"
                      textColor="secondary"
                      textBoldness="semiBold"
                      onPress={handleValidate}
                      disabled={loading || code.length < codeLength}
                    />
                  </View>

                  <View className="items-center mt-5">
                    <CustomText
                      color="gray_strong"
                      size="small"
                      boldness="medium"
                    >
                      {t("otp_verification.not_received")}
                    </CustomText>
                    <CustomTouchableOpacity
                      type="transparent"
                      size="small"
                      text={
                        otpResendTimer > 0
                          ? t("otp_verification.resend_in", {
                              time: formatCountdown(otpResendTimer),
                            })
                          : t("otp_verification.resend")
                      }
                      textSize="medium"
                      textColor={otpResendTimer > 0 ? "gray_medium" : "primary"}
                      textBoldness="semiBold"
                      className="p-0 mt-1"
                      onPress={handleResend}
                      disabled={loading || otpResendTimer > 0}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pinCodeContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "15%",
    height: 60,
    borderWidth: 2,
    borderColor: Colors.support_primary,
    borderRadius: 12,
  },
  pinCodeText: {
    fontSize: 20,
    color: Colors.secondary,
  },
  activePinCodeContainer: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  filledPinCodeContainer: {
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
});

export default ValidatePhoneModal;
