import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { Colors } from "@/constants/Colors";
import { useApi } from "@/contexts/ApiContext";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { renderMoney } from "@/utils/money";
import { lerCodigoPendente, limparCodigoPendente } from "@/utils/conviteRecebido";
import { eurosCurto, cartao, dataCurta, ReferralSummary, WalletData, WalletMovement } from "@/components/app/Wallet/types";

/**
 * A Carteira: o que o cliente tem para gastar em serviços.
 *
 * Duas partes, porque têm regras diferentes e o cliente tem de as perceber:
 * o Saldo (reembolsos, é dinheiro dele, não expira) e o Crédito de convites
 * (dado pela Piquet, expira). No checkout gasta-se primeiro o crédito de
 * convites, porque é o que expira.
 *
 * Os textos dos movimentos vêm prontos do servidor, no idioma do cliente.
 */
const WalletPage = () => {
  const { t, i18n } = useTranslation();
  const { api } = useApi();
  const { track } = useMixpanel();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [referral, setReferral] = useState<ReferralSummary | null>(null);
  const [movimentos, setMovimentos] = useState<WalletMovement[]>([]);
  const [pagina, setPagina] = useState(1);
  const [aCarregarMais, setACarregarMais] = useState(false);
  const [erro, setErro] = useState(false);

  const [codigoAberto, setCodigoAberto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [aAplicar, setAAplicar] = useState(false);
  const [codigoErro, setCodigoErro] = useState<string | null>(null);
  const [codigoOk, setCodigoOk] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setErro(false);
    Promise.all([api.get(API_ROUTES.CUSTOMER_WALLET), api.get(API_ROUTES.CUSTOMER_REFERRAL)])
      .then(([w, r]) => {
        const dados: WalletData = w.data.data;
        setWallet(dados);
        setMovimentos(dados.movimentos.items);
        setPagina(dados.movimentos.meta.current_page);
        setReferral(r.data.data);
      })
      .catch(() => setErro(true));
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      track("wallet_viewed");
      carregar();
    }, [carregar]),
  );

  // Código que veio com o link do amigo: aparece já escrito no "Tenho um código".
  useEffect(() => {
    lerCodigoPendente().then((c) => {
      if (c) {
        setCodigo(c);
        setCodigoAberto(true);
      }
    });
  }, []);

  const carregarMais = () => {
    if (!wallet || aCarregarMais || pagina >= wallet.movimentos.meta.last_page) return;
    setACarregarMais(true);
    api
      .get(API_ROUTES.CUSTOMER_WALLET, { params: { page: pagina + 1 } })
      .then((res) => {
        const dados: WalletData = res.data.data;
        setMovimentos((antes) => [...antes, ...dados.movimentos.items]);
        setPagina(dados.movimentos.meta.current_page);
      })
      .finally(() => setACarregarMais(false));
  };

  const aplicarCodigo = () => {
    if (!codigo.trim() || aAplicar) return;
    setAAplicar(true);
    setCodigoErro(null);
    api
      .post(API_ROUTES.CUSTOMER_REFERRAL_APPLY, { code: codigo.trim() })
      .then((res) => {
        setCodigoOk(res.data.data.message);
        limparCodigoPendente();
        setCodigo("");
        setCodigoAberto(false);
        track("referral_code_applied", { where: "wallet" });
        carregar();
      })
      .catch((e) => {
        setCodigoErro(e?.response?.data?.message || t("profile.wallet.code_error"));
      })
      .finally(() => setAAplicar(false));
  };

  const premio = referral ? eurosCurto(referral.reward_amount) : "";

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#FAF7F2" }} edges={["top", "left", "right"]}>
      <View className="px-5 pt-4">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("profile.wallet.title")}
            </CustomText>
          )}
          otherClasses="pb-3"
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {!wallet && !erro && (
          <View className="py-16 items-center">
            <ActivityIndicator color={Colors.secondary} />
          </View>
        )}

        {erro && (
          <TouchableOpacity onPress={carregar} className="py-16 items-center">
            <CustomText color="gray_medium" size="medium">{t("profile.wallet.load_error")}</CustomText>
          </TouchableOpacity>
        )}

        {wallet && (
          <>
            {/* Total e as duas partes */}
            <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: Colors.secondary }}>
              <CustomText color="support_secondary" size="small" boldness="semiBold" style={{ opacity: 0.75 }}>
                {t("profile.wallet.available")}
              </CustomText>
              <CustomText color="primary" size="headline" boldness="bold" classes="mt-1">
                {renderMoney(wallet.total)}
              </CustomText>

              <View className="mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" }}>
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 mr-3">
                    <CustomText color="support_secondary" size="medium" boldness="semiBold">{t("profile.wallet.saldo")}</CustomText>
                    <CustomText color="support_secondary" size="extraSmall" style={{ opacity: 0.7 }}>{t("profile.wallet.saldo_hint")}</CustomText>
                  </View>
                  <CustomText color="support_secondary" size="medium" boldness="bold">{renderMoney(wallet.saldo)}</CustomText>
                </View>

                <View className="flex-row justify-between items-center mt-3">
                  <View className="flex-1 mr-3">
                    <CustomText color="support_secondary" size="medium" boldness="semiBold">{t("profile.wallet.convites")}</CustomText>
                    <CustomText color="support_secondary" size="extraSmall" style={{ opacity: 0.7 }}>
                      {wallet.convites_a_expirar.length > 0
                        ? t("profile.wallet.expires", {
                            amount: renderMoney(wallet.convites_a_expirar[0].amount),
                            date: dataCurta(wallet.convites_a_expirar[0].expires_at, i18n.language),
                          })
                        : t("profile.wallet.convites_hint")}
                    </CustomText>
                  </View>
                  <CustomText color="support_secondary" size="medium" boldness="bold">{renderMoney(wallet.convites)}</CustomText>
                </View>
              </View>
            </View>

            {/* Convida um amigo */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/(app)/(pages)/(wallet)/invite")}
              className="rounded-2xl p-4 flex-row items-center mb-3"
              style={{ backgroundColor: Colors.primary, ...cartao }}
            >
              <View className="h-10 w-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: "rgba(27,27,27,0.1)" }}>
                <Ionicons name="gift-outline" size={20} color={Colors.secondary} />
              </View>
              <View className="flex-1">
                <CustomText color="secondary" size="medium" boldness="bold">
                  {t("profile.wallet.invite_cta", { amount: premio })}
                </CustomText>
                <CustomText color="secondary" size="small">
                  {t("profile.wallet.invite_cta_sub", { amount: premio })}
                </CustomText>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.secondary} />
            </TouchableOpacity>

            {/* Tenho um código — só para quem ainda não usou nenhum */}
            {referral && !referral.used_a_code && (
              <View className="bg-support_secondary rounded-2xl px-4 py-3 mb-5" style={cartao}>
                {!codigoAberto ? (
                  <TouchableOpacity onPress={() => setCodigoAberto(true)} className="flex-row items-center">
                    <Ionicons name="ticket-outline" size={18} color={Colors.secondary} />
                    <CustomText color="secondary" size="medium" boldness="semiBold" classes="ml-2 flex-1">
                      {t("profile.wallet.have_code")}
                    </CustomText>
                    <Feather name="chevron-down" size={18} color={Colors.gray_medium} />
                  </TouchableOpacity>
                ) : (
                  <View>
                    <CustomText color="secondary" size="medium" boldness="semiBold" classes="mb-2">
                      {t("profile.wallet.have_code")}
                    </CustomText>
                    <View className="flex-row items-center">
                      <TextInput
                        value={codigo}
                        onChangeText={(v) => {
                          setCodigo(v.toUpperCase());
                          setCodigoErro(null);
                        }}
                        placeholder={t("profile.wallet.code_placeholder")}
                        placeholderTextColor={Colors.gray_medium}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={12}
                        className="flex-1 rounded-xl px-4 py-3 mr-2"
                        style={{ backgroundColor: "#F4F2EE", color: Colors.secondary, fontSize: 16, letterSpacing: 2 }}
                        onSubmitEditing={aplicarCodigo}
                      />
                      <TouchableOpacity
                        onPress={aplicarCodigo}
                        disabled={!codigo.trim() || aAplicar}
                        className="rounded-xl px-4 py-3"
                        style={{ backgroundColor: codigo.trim() ? Colors.secondary : Colors.support_primary }}
                      >
                        {aAplicar ? (
                          <ActivityIndicator color={Colors.primary} />
                        ) : (
                          <CustomText color={codigo.trim() ? "primary" : "gray_medium"} size="medium" boldness="bold">
                            {t("profile.wallet.apply")}
                          </CustomText>
                        )}
                      </TouchableOpacity>
                    </View>
                    {!!codigoErro && (
                      <CustomText color="error" size="small" classes="mt-2">{codigoErro}</CustomText>
                    )}
                  </View>
                )}
              </View>
            )}

            {!!codigoOk && (
              <View className="rounded-2xl px-4 py-3 mb-5 flex-row items-center" style={{ backgroundColor: "rgba(5,150,105,0.1)" }}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <CustomText color="success" size="small" boldness="semiBold" classes="ml-2 flex-1">{codigoOk}</CustomText>
              </View>
            )}

            {/* Movimentos */}
            <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-1 mb-2 mt-1">
              {t("profile.wallet.movements")}
            </CustomText>
            <View className="bg-support_secondary rounded-2xl px-4" style={cartao}>
              {movimentos.length === 0 ? (
                <CustomText color="gray_medium" size="medium" classes="py-5 text-center">
                  {t("profile.wallet.empty")}
                </CustomText>
              ) : (
                movimentos.map((m, i) => (
                  <View
                    key={m.id}
                    className="flex-row items-center py-3"
                    style={{ borderBottomWidth: i < movimentos.length - 1 ? 1 : 0, borderBottomColor: Colors.support_primary }}
                  >
                    <View className="flex-1 mr-3">
                      <CustomText color="secondary" size="medium" boldness="semiBold" numberOfLines={2}>
                        {m.descricao}
                      </CustomText>
                      <CustomText color="gray_medium" size="extraSmall">
                        {dataCurta(m.data, i18n.language)} · {m.parte === "convites" ? t("profile.wallet.convites") : t("profile.wallet.saldo")}
                      </CustomText>
                    </View>
                    <CustomText color={m.tipo === "entrada" ? "success" : "secondary"} size="medium" boldness="bold">
                      {m.tipo === "entrada" ? "+" : "−"}
                      {renderMoney(m.valor)}
                    </CustomText>
                  </View>
                ))
              )}
            </View>

            {pagina < wallet.movimentos.meta.last_page && (
              <TouchableOpacity onPress={carregarMais} className="items-center py-4">
                {aCarregarMais ? (
                  <ActivityIndicator color={Colors.secondary} />
                ) : (
                  <CustomText color="secondary" size="medium" boldness="semiBold">{t("profile.wallet.load_more")}</CustomText>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default WalletPage;
