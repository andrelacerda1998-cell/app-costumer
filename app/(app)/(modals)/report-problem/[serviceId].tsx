import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useApi } from "@/contexts/ApiContext";
import { useDialog } from "@/contexts/DialogContext";
import { useService } from "@/contexts/ServiceContext";
import XIcon from "@/assets/icons/x";

/** Os mesmos motivos que o servidor aceita (ReportProblemController::MOTIVOS). */
const MOTIVOS = ["not_done", "poor_quality", "damage", "price", "no_show", "other"] as const;
type Motivo = (typeof MOTIVOS)[number];

/**
 * "Reportar um problema", ligado ao serviço.
 *
 * Antes só havia o ticket de suporte genérico: chegava sem contexto e não
 * mudava nada no serviço. Este fica agarrado ao serviço, avisa a equipa, e —
 * num serviço concluído — impede que feche e seja cobrado sozinho enquanto
 * ninguém olhar para o caso.
 */
const ReportProblem = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { getOpenService } = useService();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const enviar = async () => {
    if (!motivo || aEnviar || !serviceId) return;
    setAEnviar(true);
    try {
      await api.post(API_ROUTES.POST_REPORT_PROBLEM(String(serviceId)), {
        reason: motivo,
        message: mensagem.trim() || undefined,
      });
      getOpenService();
      openDialog({
        title: t("report_problem.sent_title"),
        subtitle: t("report_problem.sent_subtitle"),
        closeOnClickOutside: true,
        onClose: () => {
          if (router.canGoBack()) router.back();
          else router.replace("/(app)/(tabs)/home");
        },
      });
    } catch {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: t("errors.occurred_an_error"),
        closeOnClickOutside: true,
        closeAfterMSeconds: 4000,
      });
    } finally {
      setAEnviar(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <BackHeader
        backButtonColor="secondary"
        otherClasses="p-5"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t("report_problem.title")}
          </CustomText>
        )}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-1 rounded-t-3xl overflow-hidden" style={{ backgroundColor: "#FAF7F2" }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <CustomText color="gray_strong" size="small" classes="mb-4">
              {t("report_problem.intro")}
            </CustomText>

            <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: Colors.support_secondary }}>
              {MOTIVOS.map((m, i) => {
                const escolhido = motivo === m;
                return (
                  <TouchableOpacity
                    key={m}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: escolhido }}
                    onPress={() => setMotivo(m)}
                    className="flex-row items-center px-4 py-3.5"
                    style={i > 0 ? { borderTopWidth: 1, borderTopColor: Colors.support_primary } : undefined}
                  >
                    <View
                      className="items-center justify-center rounded-full mr-3"
                      style={{
                        width: 22, height: 22, borderWidth: 2,
                        borderColor: escolhido ? Colors.primary : Colors.gray_light,
                      }}
                    >
                      {escolhido && <View className="rounded-full" style={{ width: 10, height: 10, backgroundColor: Colors.primary }} />}
                    </View>
                    <CustomText color="secondary" size="medium" boldness={escolhido ? "bold" : "regular"} classes="flex-1">
                      {t(`report_problem.reasons.${m}`)}
                    </CustomText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <CustomText color="secondary" size="small" boldness="bold" classes="mt-5 mb-2">
              {t("report_problem.message_label")}
            </CustomText>
            <TextInput
              value={mensagem}
              onChangeText={setMensagem}
              placeholder={t("report_problem.message_placeholder")}
              placeholderTextColor={Colors.gray_medium}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              style={{
                minHeight: 110, borderWidth: 1, borderColor: Colors.support_primary, borderRadius: 12,
                padding: 12, fontFamily: "Poppins_400Regular", fontSize: 14, color: Colors.secondary,
                backgroundColor: Colors.support_secondary,
              }}
            />

            <View className="flex-row items-start mt-4">
              <Feather name="shield" size={14} color={Colors.gray_strong} style={{ marginTop: 3 }} />
              <CustomText color="gray_strong" size="small" classes="ml-2 flex-1">
                {t("report_problem.what_happens")}
              </CustomText>
            </View>
          </ScrollView>

          <View className="px-5 pt-3 pb-6" style={{ borderTopWidth: 1, borderTopColor: Colors.support_primary }}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={enviar}
              disabled={!motivo || aEnviar}
              className="rounded-full items-center justify-center"
              style={{ paddingVertical: 16, backgroundColor: Colors.primary, opacity: !motivo || aEnviar ? 0.5 : 1 }}
            >
              {aEnviar ? (
                <ActivityIndicator color={Colors.secondary} />
              ) : (
                <CustomText color="secondary" size="large" boldness="bold">
                  {t("report_problem.send")}
                </CustomText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ReportProblem;
