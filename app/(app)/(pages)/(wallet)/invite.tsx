import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Share, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";

import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { Colors } from "@/constants/Colors";
import { useApi } from "@/contexts/ApiContext";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { renderMoney } from "@/utils/money";
import { eurosCurto, cartao, ReferralSummary } from "@/components/app/Wallet/types";

/**
 * Convida um amigo: dá 5 € e ganha 5 €.
 *
 * O código vem do servidor e as regras também (valor, mínimo do serviço):
 * mudar o programa não obriga a uma build nova.
 *
 * Quem ainda não fez nenhum serviço vê o código mas não o pode partilhar —
 * o servidor recusa códigos de quem nunca pagou (corta contas criadas só para
 * convidar). Dizer porquê é melhor do que deixar partilhar um código que não
 * funciona.
 */
const InvitePage = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { track } = useMixpanel();

  const [resumo, setResumo] = useState<ReferralSummary | null>(null);
  const [erro, setErro] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(() => {
    setErro(false);
    api
      .get(API_ROUTES.CUSTOMER_REFERRAL)
      .then((res) => setResumo(res.data.data))
      .catch(() => setErro(true));
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      track("referral_screen_viewed");
      carregar();
    }, [carregar]),
  );

  const premio = resumo ? eurosCurto(resumo.reward_amount) : "";
  const minimo = resumo ? eurosCurto(resumo.minimum_service_amount) : "";

  const partilhar = () => {
    if (!resumo) return;
    track("referral_shared", { channel: "share_sheet" });
    Share.share({ message: t("profile.invite.share_message", { code: resumo.code, amount: premio }) }).catch(() => {});
  };

  const copiar = async () => {
    if (!resumo) return;
    await Clipboard.setStringAsync(resumo.code);
    track("referral_shared", { channel: "copy" });
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Quatro tempos, numerados: a pergunta que este ecrã tem de responder é
  // "o meu amigo põe o código ONDE?" — o passo 2 diz o caminho exacto na app.
  const passos = [
    t("profile.invite.step1"),
    t("profile.invite.step2"),
    t("profile.invite.step3", { amount: premio, minimum: minimo }),
    t("profile.invite.step4", { amount: premio }),
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={["top", "left", "right"]}>
      <View className="px-5 pt-4">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("profile.invite.title")}
            </CustomText>
          )}
          otherClasses="pb-3"
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {!resumo && !erro && (
          <View className="py-16 items-center">
            <ActivityIndicator color={Colors.secondary} />
          </View>
        )}
        {erro && (
          <TouchableOpacity onPress={carregar} className="py-16 items-center">
            <CustomText color="gray_medium" size="medium">{t("profile.wallet.load_error")}</CustomText>
          </TouchableOpacity>
        )}

        {resumo && (
          <>
            <CustomText color="secondary" size="title" boldness="bold" classes="mt-2">
              {t("profile.invite.headline", { amount: premio })}
            </CustomText>
            <CustomText color="gray_strong" size="medium" classes="mt-1 mb-5" style={{ lineHeight: 24 }}>
              {t("profile.invite.body")}
            </CustomText>

            {/* O código: tocar copia; o botão partilha a mensagem que já
                explica ao amigo onde o pôr. */}
            <View className="bg-support_secondary rounded-2xl p-5 mb-5" style={cartao}>
              <CustomText color="gray_medium" size="small" boldness="semiBold" classes="text-center">
                {t("profile.invite.your_code")}
              </CustomText>
              <TouchableOpacity
                onPress={copiar}
                disabled={!resumo.can_invite}
                activeOpacity={0.7}
                className="rounded-xl py-3 mt-2 flex-row items-center justify-center"
                style={{
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: resumo.can_invite ? Colors.primary : Colors.support_primary,
                  backgroundColor: resumo.can_invite ? "rgba(250,187,91,0.08)" : "transparent",
                }}
              >
                <CustomText
                  color={resumo.can_invite ? "secondary" : "gray_medium"}
                  size="title"
                  boldness="bold"
                  style={{ letterSpacing: 6 }}
                >
                  {resumo.code}
                </CustomText>
                {resumo.can_invite && (
                  <Ionicons
                    name={copiado ? "checkmark-circle" : "copy-outline"}
                    size={20}
                    color={copiado ? Colors.success : Colors.gray_medium}
                    style={{ marginLeft: 10 }}
                  />
                )}
              </TouchableOpacity>

              {resumo.can_invite ? (
                <>
                  <CustomText color={copiado ? "success" : "gray_medium"} size="extraSmall" classes="text-center mt-2">
                    {copiado ? t("profile.invite.copied") : t("profile.invite.copy_hint")}
                  </CustomText>
                  <TouchableOpacity
                    onPress={partilhar}
                    activeOpacity={0.85}
                    className="w-full rounded-xl py-4 mt-4 flex-row items-center justify-center"
                    style={{ backgroundColor: Colors.secondary }}
                  >
                    <Ionicons name="share-outline" size={20} color={Colors.primary} />
                    <CustomText color="primary" size="medium" boldness="bold" classes="ml-2">{t("profile.invite.share")}</CustomText>
                  </TouchableOpacity>
                </>
              ) : (
                <View className="w-full rounded-xl p-3 mt-4" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                  <CustomText color="secondary" size="small" classes="text-center">{t("profile.invite.cant_invite")}</CustomText>
                </View>
              )}
            </View>

            {/* Como funciona: passos numerados, ligados por um traço. */}
            <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-1 mb-2">{t("profile.invite.how")}</CustomText>
            <View className="bg-support_secondary rounded-2xl px-4 py-4 mb-4" style={cartao}>
              {passos.map((texto, i) => (
                <View key={i} className="flex-row">
                  <View className="items-center mr-3" style={{ width: 28 }}>
                    <View className="h-7 w-7 rounded-full items-center justify-center" style={{ backgroundColor: Colors.primary }}>
                      <CustomText color="secondary" size="small" boldness="bold">{i + 1}</CustomText>
                    </View>
                    {i < passos.length - 1 && (
                      <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: "rgba(250,187,91,0.35)", marginVertical: 2 }} />
                    )}
                  </View>
                  <CustomText
                    color="secondary"
                    size="small"
                    boldness={i === 1 ? "semiBold" : "regular"}
                    classes="flex-1"
                    style={{ paddingTop: 4, paddingBottom: i < passos.length - 1 ? 14 : 0, lineHeight: 20 }}
                  >
                    {texto}
                  </CustomText>
                </View>
              ))}
            </View>

            {/* Os números */}
            {resumo.friends_joined > 0 && (
              <View className="flex-row mb-4">
                {[
                  { valor: String(resumo.friends_joined), rotulo: t("profile.invite.stat_joined") },
                  { valor: String(resumo.friends_pending), rotulo: t("profile.invite.stat_pending") },
                  { valor: renderMoney(resumo.earned) as string, rotulo: t("profile.invite.stat_earned") },
                ].map((s, i) => (
                  <View key={i} className="flex-1 bg-support_secondary rounded-2xl p-3 items-center" style={{ ...cartao, marginLeft: i ? 8 : 0 }}>
                    <CustomText color="secondary" size="large" boldness="bold">{s.valor}</CustomText>
                    <CustomText color="gray_medium" size="extraSmall" classes="text-center">{s.rotulo}</CustomText>
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row px-1">
              <Ionicons name="information-circle-outline" size={16} color={Colors.gray_medium} style={{ marginTop: 1, marginRight: 6 }} />
              <CustomText color="gray_medium" size="extraSmall" classes="flex-1" style={{ lineHeight: 18 }}>
                {t("profile.invite.rules", { amount: premio, minimum: minimo, left: resumo.rewards_left_this_year })}
              </CustomText>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InvitePage;
