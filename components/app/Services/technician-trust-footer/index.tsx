import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

/**
 * Rodapé de confiança da seleção de técnico (fluxo imediato e agendado):
 * três garantias da plataforma com ícone em círculo, título e descrição.
 */
const TechnicianTrustFooter = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useTranslation();

  const items = [
    { icon: "shield-checkmark" as const, title: "verified_technicians", desc: "verified_desc" },
    { icon: "lock-closed" as const, title: "fixed_price", desc: "fixed_price_desc" },
    { icon: "star" as const, title: "real_reviews", desc: "real_reviews_desc" },
  ];

  /**
   * Versão em colunas para o ecrã de escolha.
   *
   * Os três blocos empilhados na vertical eram uma parede de texto que competia
   * com os cartões; encolher para uma linha só resolveu isso mas deixou o fundo
   * do ecrã vazio. Em três colunas as mesmas garantias ocupam a largura toda com
   * pouca altura — enchem o espaço sem voltar a disputar a atenção, porque cada
   * uma passa a ser duas palavras em vez de um título com descrição.
   */
  if (compact) {
    /**
     * Uma cor por garantia, todas já da paleta da app:
     *  - verde `success` na verificação — é o par que a app já usava no escudo
     *    "Técnico Verificado", e verde+escudo lê-se sem ninguém ter de pensar;
     *  - azul `link` no preço — a cor com que se sinaliza segurança;
     *  - âmbar `primary` na avaliação — a estrela é âmbar em toda a app.
     *
     * Fundo branco em vez do creme âmbar: com o fundo tingido as três cores
     * ficavam abafadas e o banner lia-se como um bloco só. Sobre branco, cada
     * garantia distingue-se — que é o que faz o conjunto transmitir confiança
     * em vez de parecer decoração.
     */
    const tint = [
      { icon: "shield-checkmark" as const, bg: Colors.success, fg: Colors.support_secondary },
      { icon: "lock-closed" as const, bg: Colors.link, fg: Colors.support_secondary },
      // Sobre âmbar usa-se sempre `secondary`: branco sobre âmbar dá 1,7:1 e é
      // ilegível (regra da paleta em constants/Colors.ts).
      { icon: "star" as const, bg: Colors.primary, fg: Colors.secondary },
    ];

    return (
      <View
        className="flex-row rounded-3xl px-3 py-4"
        style={{
          backgroundColor: Colors.support_secondary,
          borderWidth: 1,
          borderColor: Colors.support_primary,
        }}
      >
        {items.map((item, index) => (
          <View key={item.title} className="flex-1 items-center px-1.5">
            <View
              className="items-center justify-center rounded-full mb-2"
              style={{ width: 38, height: 38, backgroundColor: tint[index].bg }}
            >
              <Ionicons name={tint[index].icon} size={17} color={tint[index].fg} />
            </View>
            <CustomText
              size="specExtraSmall"
              color="secondary"
              boldness="bold"
              numberOfLines={2}
              classes="text-center"
              style={{ lineHeight: 14 }}
            >
              {t(`services.select_vendor.trust_banner.${item.title}_short`)}
            </CustomText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl p-4"
      style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
    >
      {items.map((item, i) => (
        <View
          key={item.title}
          className="flex-row items-center"
          style={{ marginBottom: i < items.length - 1 ? 14 : 0 }}
        >
          <View
            className="items-center justify-center rounded-full mr-3"
            style={{ width: 40, height: 40, backgroundColor: "rgba(250,187,91,0.35)" }}
          >
            <Ionicons name={item.icon} size={18} color={Colors.secondary} />
          </View>
          <View className="flex-1">
            <CustomText size="small" color="secondary" boldness="bold" numberOfLines={1}>
              {t(`services.select_vendor.trust_banner.${item.title}`)}
            </CustomText>
            <CustomText size="extraSmall" color="gray_medium" boldness="regular" numberOfLines={2}>
              {t(`services.select_vendor.trust_banner.${item.desc}`)}
            </CustomText>
          </View>
        </View>
      ))}
    </View>
  );
};

export default TechnicianTrustFooter;
