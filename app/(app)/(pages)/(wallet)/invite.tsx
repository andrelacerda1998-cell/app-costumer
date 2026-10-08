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
            {/* Destaque: o presente e as duas recompensas lado a lado. Diz a
                regra inteira sem uma frase — quem recebe o quê, e quando. */}
            <View className="rounded-3xl px-5 pt-6 pb-5 mt-1 mb-4 overflow-hidden" style={{ backgroundColor: Colors.primary }}>
              {/* Brilho de fundo: um círculo claro, só decoração. */}
              <View style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.18)", top: -60, right: -50 }} />

              <View className="h-14 w-14 rounded-full items-center justify-center self-center mb-3" style={{ backgroundColor: Colors.secondary }}>
                <Ionicons name="gift" size={26} color={Colors.primary} />
              </View>
              <CustomText color="secondary" size="title" boldness="bold" classes="text-center">
                {t("profile.invite.headline", { amount: premio })}
              </CustomText>

              <View className="flex-row mt-5">
                {[
                  { rotulo: t("profile.invite.for_friend"), quando: t("profile.invite.for_friend_when") },
                  { rotulo: t("profile.invite.for_you"), quando: t("profile.invite.for_you_when") },
                ].map((r, i) => (
                  <View
                    key={i}
                    className="flex-1 rounded-2xl py-3 px-2 items-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.55)", marginLeft: i ? 10 : 0 }}
                  >
                    <CustomText color="gray_strong" size="extraSmall" boldness="semiBold">{r.rotulo}</CustomText>
                    <CustomText color="secondary" size="subtitle" boldness="bold">{premio}</CustomText>
                    <CustomText color="gray_strong" size="extraSmall" classes="text-center">{r.quando}</CustomText>
                  </View>
                ))}
              </View>
            </View>

            {/* O código num bilhete: recortes nos lados e picotado entre o
                código e o botão. Tocar no código ou em "Copiar" copia. */}
            <View className="bg-support_secondary rounded-3xl mb-4" style={cartao}>
              <View className="px-5 pt-5 pb-4">
                <CustomText color="gray_medium" size="extraSmall" boldness="semiBold" style={{ letterSpacing: 1.5 }}>
                  {t("profile.invite.your_code").toUpperCase()}
                </CustomText>
                <View className="flex-row items-center justify-between mt-1">
                  <TouchableOpacity onPress={copiar} disabled={!resumo.can_invite} activeOpacity={0.6} className="flex-1">
                    <CustomText
                      color={resumo.can_invite ? "secondary" : "gray_medium"}
                      size="title"
                      boldness="bold"
                      style={{ letterSpacing: 5 }}
                    >
                      {resumo.code}
                    </CustomText>
                  </TouchableOpacity>
                  {resumo.can_invite && (
                    <TouchableOpacity
                      onPress={copiar}
                      activeOpacity={0.7}
                      className="flex-row items-center rounded-full px-3 py-2"
                      style={{ backgroundColor: copiado ? "rgba(5,150,105,0.12)" : "#F4F2EE" }}
                    >
                      <Ionicons name={copiado ? "checkmark" : "copy-outline"} size={15} color={copiado ? Colors.success : Colors.secondary} />
                      <CustomText color={copiado ? "success" : "secondary"} size="small" boldness="semiBold" classes="ml-1">
                        {copiado ? t("profile.invite.copied") : t("profile.invite.copy")}
                      </CustomText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Picotado com os recortes do bilhete. */}
              <View className="flex-row items-center">
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FAF7F2", marginLeft: -11 }} />
                <View style={{ flex: 1, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: Colors.support_primary, marginHorizontal: 6 }} />
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FAF7F2", marginRight: -11 }} />
              </View>

              <View className="px-5 pt-4 pb-5">
                {resumo.can_invite ? (
                  <>
                    <TouchableOpacity
                      onPress={partilhar}
                      activeOpacity={0.85}
                      className="w-full rounded-2xl py-4 flex-row items-center justify-center"
                      style={{ backgroundColor: Colors.secondary }}
                    >
                      <Ionicons name="share-outline" size={20} color={Colors.primary} />
                      <CustomText color="primary" size="medium" boldness="bold" classes="ml-2">{t("profile.invite.share")}</CustomText>
                    </TouchableOpacity>
                    <CustomText color="gray_medium" size="extraSmall" classes="text-center mt-3" style={{ lineHeight: 17 }}>
                      {t("profile.invite.where")}
                    </CustomText>
                  </>
                ) : (
                  <View className="w-full rounded-2xl p-3" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                    <CustomText color="secondary" size="small" classes="text-center">{t("profile.invite.cant_invite")}</CustomText>
                  </View>
                )}
              </View>
            </View>

            {/* Os números, só quando já há alguma coisa para contar. */}
            {resumo.friends_joined > 0 && (
              <View className="flex-row mb-4">
                {[
                  { valor: String(resumo.friends_joined), rotulo: t("profile.invite.stat_joined") },
                  { valor: String(resumo.friends_pending), rotulo: t("profile.invite.stat_pending") },
                  { valor: renderMoney(resumo.earned) as string, rotulo: t("profile.invite.stat_earned") },
                ].map((st, i) => (
                  <View key={i} className="flex-1 bg-support_secondary rounded-2xl p-3 items-center" style={{ ...cartao, marginLeft: i ? 8 : 0 }}>
                    <CustomText color="secondary" size="large" boldness="bold">{st.valor}</CustomText>
                    <CustomText color="gray_medium" size="extraSmall" classes="text-center">{st.rotulo}</CustomText>
                  </View>
                ))}
              </View>
            )}

            {/* As regras ficam a um toque: quem quer saber, abre. */}
            <TouchableOpacity onPress={() => setRegras((v) => !v)} className="flex-row items-center justify-center py-2">
              <CustomText color="gray_medium" size="small" boldness="semiBold">
                {regras ? t("profile.invite.hide_rules") : t("profile.invite.show_rules")}
              </CustomText>
              <Ionicons name={regras ? "chevron-up" : "chevron-down"} size={14} color={Colors.gray_medium} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            {regras && (
              <CustomText color="gray_medium" size="extraSmall" classes="mx-3 mt-1 text-center" style={{ lineHeight: 18 }}>
                {t("profile.invite.rules", { amount: premio, minimum: minimo, left: resumo.rewards_left_this_year })}
              </CustomText>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default InvitePage;
