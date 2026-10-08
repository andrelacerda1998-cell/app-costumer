import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Share, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
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
  const [regras, setRegras] = useState(false);

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
  // O limite do ano vem do servidor (10 se for um servidor mais antigo).
  const limite = resumo?.rewards_limit ?? 10;
  const ganhas = resumo ? Math.max(0, limite - resumo.rewards_left_this_year) : 0;

  const mensagem = () =>
    resumo
      ? t("profile.invite.share_message", { code: resumo.code, amount: premio, link: resumo.share_url || "https://piquetapp.com" })
      : "";

  // WhatsApp é o canal de quase toda a gente cá: um toque, sem a folha de
  // partilha. wa.me abre a app se estiver instalada (e o WhatsApp Web se não),
  // sem precisar de declarar o esquema whatsapp:// na build.
  const partilharWhatsApp = () => {
    if (!resumo) return;
    track("referral_shared", { channel: "whatsapp" });
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(mensagem())}`).catch(() => partilhar());
  };

  const partilhar = () => {
    if (!resumo) return;
    track("referral_shared", { channel: "share_sheet" });
    Share.share({ message: mensagem() }).catch(() => {});
  };

  const copiar = async () => {
    if (!resumo) return;
    await Clipboard.setStringAsync(resumo.code);
    track("referral_shared", { channel: "copy" });
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };


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
            {/* Destaque com a mesma anatomia do da Carteira: cartão escuro, valor
                em âmbar, e as duas partes em linhas por baixo. */}
            <View className="rounded-2xl p-5 mb-5" style={{ backgroundColor: Colors.secondary }}>
              <CustomText color="support_secondary" size="small" boldness="semiBold" style={{ opacity: 0.75 }}>
                {t("profile.invite.hero_label")}
              </CustomText>
              <CustomText color="primary" size="title" boldness="bold" classes="mt-1">
                {t("profile.invite.headline", { amount: premio })}
              </CustomText>

              <View className="mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" }}>
                {[
                  { rotulo: t("profile.invite.for_friend"), quando: t("profile.invite.for_friend_when") },
                  { rotulo: t("profile.invite.for_you"), quando: t("profile.invite.for_you_when") },
                ].map((r, i) => (
                  <View key={i} className={`flex-row justify-between items-center ${i ? "mt-3" : ""}`}>
                    <View className="flex-1 mr-3">
                      <CustomText color="support_secondary" size="medium" boldness="semiBold">{r.rotulo}</CustomText>
                      <CustomText color="support_secondary" size="extraSmall" style={{ opacity: 0.7 }}>{r.quando}</CustomText>
                    </View>
                    <CustomText color="support_secondary" size="medium" boldness="bold">{premio}</CustomText>
                  </View>
                ))}
              </View>
            </View>

            {/* O código: um cartão como os da Conta, com a pílula de copiar. A
                instrução para o amigo vive aqui, junto do código. */}
            <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-1 mb-2">
              {t("profile.invite.your_code")}
            </CustomText>
            <View className="bg-support_secondary rounded-2xl px-4 py-3 mb-3" style={cartao}>
              <View className="flex-row items-center">
                <View className="h-9 w-9 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                  <Ionicons name="ticket-outline" size={18} color={Colors.secondary} />
                </View>
                <TouchableOpacity onPress={copiar} disabled={!resumo.can_invite} activeOpacity={0.6} className="flex-1">
                  <CustomText
                    color={resumo.can_invite ? "secondary" : "gray_medium"}
                    size="extraLarge"
                    boldness="bold"
                    style={{ letterSpacing: 3 }}
                  >
                    {resumo.code}
                  </CustomText>
                </TouchableOpacity>
                {resumo.can_invite && (
                  <TouchableOpacity
                    onPress={copiar}
                    activeOpacity={0.7}
                    className="flex-row items-center rounded-full px-3 py-1.5"
                    style={{ backgroundColor: copiado ? "rgba(5,150,105,0.12)" : "#F4F2EE" }}
                  >
                    <Ionicons name={copiado ? "checkmark" : "copy-outline"} size={14} color={copiado ? Colors.success : Colors.secondary} />
                    <CustomText color={copiado ? "success" : "secondary"} size="small" boldness="semiBold" classes="ml-1">
                      {copiado ? t("profile.invite.copied") : t("profile.invite.copy")}
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>
              {resumo.can_invite && (
                <CustomText color="gray_medium" size="extraSmall" classes="mt-2" style={{ marginLeft: 48 }}>
                  {t("profile.invite.where")}
                </CustomText>
              )}
            </View>

            {resumo.can_invite ? (
              <View className="mb-5">
                {/* WhatsApp primeiro: o cartão âmbar de ação da Carteira. */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={partilharWhatsApp}
                  className="rounded-2xl p-4 flex-row items-center"
                  style={{ backgroundColor: Colors.primary, ...cartao }}
                >
                  <View className="h-10 w-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: "rgba(27,27,27,0.1)" }}>
                    <Ionicons name="logo-whatsapp" size={21} color={Colors.secondary} />
                  </View>
                  <View className="flex-1">
                    <CustomText color="secondary" size="medium" boldness="bold">{t("profile.invite.share_whatsapp")}</CustomText>
                    <CustomText color="secondary" size="small">{t("profile.invite.share_whatsapp_sub")}</CustomText>
                  </View>
                  <Feather name="chevron-right" size={20} color={Colors.secondary} />
                </TouchableOpacity>

                {/* Outras apps: uma linha como as da Conta. */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={partilhar}
                  className="bg-support_secondary rounded-2xl px-4 py-3 mt-3 flex-row items-center"
                  style={cartao}
                >
                  <View className="h-9 w-9 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                    <Ionicons name="share-social-outline" size={18} color={Colors.secondary} />
                  </View>
                  <View className="flex-1">
                    <CustomText color="secondary" size="medium" boldness="semiBold">{t("profile.invite.share_other")}</CustomText>
                    <CustomText color="gray_medium" size="small">{t("profile.invite.share_other_sub")}</CustomText>
                  </View>
                  <Feather name="chevron-right" size={20} color={Colors.gray_medium} />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="rounded-2xl px-4 py-3 mb-5 flex-row items-center" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.secondary} />
                <CustomText color="secondary" size="small" classes="ml-2 flex-1">{t("profile.invite.cant_invite")}</CustomText>
              </View>
            )}

            {/* O progresso: quantas das 10 recompensas do ano já ganhou, e os
                números em lista como os valores da Conta. Sem convites ainda,
                uma linha que diz o que vale o primeiro. */}
            {resumo.can_invite && (
              <>
                <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-1 mb-2">
                  {t("profile.invite.stats_title")}
                </CustomText>
                <View className="bg-support_secondary rounded-2xl px-4 pt-4 mb-5" style={cartao}>
                  <View className="flex-row justify-between items-center">
                    <CustomText color="secondary" size="small" boldness="semiBold">
                      {t("profile.invite.progress", { done: ganhas, total: limite })}
                    </CustomText>
                    {resumo.friends_completed > 0 && (
                      <CustomText color="gray_medium" size="small">
                        {t("profile.invite.earned_short", { amount: renderMoney(resumo.earned) })}
                      </CustomText>
                    )}
                  </View>
                  <View className="h-2 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "#F4F2EE" }}>
                    <View className="h-2 rounded-full" style={{ width: `${Math.min(100, (ganhas / limite) * 100)}%`, backgroundColor: Colors.primary }} />
                  </View>

                  {resumo.friends_joined === 0 ? (
                    <CustomText color="gray_medium" size="small" classes="py-3">
                      {t("profile.invite.empty", { amount: premio })}
                    </CustomText>
                  ) : (
                    <View className="mt-2">
                      {[
                        { rotulo: t("profile.invite.stat_joined"), valor: String(resumo.friends_joined) },
                        { rotulo: t("profile.invite.stat_pending"), valor: String(resumo.friends_pending) },
                      ].map((st, i, arr) => (
                        <View
                          key={i}
                          className="flex-row items-center py-3"
                          style={{ borderTopWidth: 1, borderTopColor: Colors.support_primary }}
                        >
                          <CustomText color="secondary" size="medium" boldness="semiBold" classes="flex-1">{st.rotulo}</CustomText>
                          <CustomText color="gray_medium" size="medium">{st.valor}</CustomText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Regras: uma linha que abre, como as das Definições. */}
            <View className="bg-support_secondary rounded-2xl px-4" style={cartao}>
              <TouchableOpacity onPress={() => setRegras((v) => !v)} activeOpacity={0.7} className="flex-row items-center py-3">
                <View className="h-9 w-9 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.secondary} />
                </View>
                <CustomText color="secondary" size="medium" boldness="semiBold" classes="flex-1">
                  {t("profile.invite.rules_title")}
                </CustomText>
                <Feather name={regras ? "chevron-up" : "chevron-down"} size={20} color={Colors.gray_medium} />
              </TouchableOpacity>
              {regras && (
                <CustomText color="gray_medium" size="small" classes="pb-4" style={{ lineHeight: 20 }}>
                  {t("profile.invite.rules", { amount: premio, minimum: minimo, left: resumo.rewards_left_this_year })}
                </CustomText>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InvitePage;
