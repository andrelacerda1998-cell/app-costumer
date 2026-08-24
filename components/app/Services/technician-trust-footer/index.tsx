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
     * UMA cor, não três.
     *
     * Antes cada garantia tinha o seu disco cheio — verde, azul e âmbar, com o
     * glifo a branco. Cada escolha justificava-se sozinha (verde+escudo, azul de
     * segurança, âmbar da estrela), mas juntas em fila davam três círculos
     * saturados de matizes diferentes, que é o vocabulário de um autocolante e
     * não o de uma garantia. E os discos, por serem a coisa mais forte do bloco,
     * puxavam mais atenção do que as palavras que interessam.
     *
     * Agora: sem discos, uma cor só nos três ícones, e a estrutura a fazer o
     * trabalho que a cor fazia — três colunas separadas por filetes finos, como
     * num rodapé de certificação. Confiança transmite-se com contenção; três
     * cores primárias transmitem outra coisa.
     *
     * Âmbar, a cor da marca — mas usada onde ela funciona.
     *
     * O #FABB5B é uma cor CLARA: sobre branco dá 1,7:1, e três ícones finos
     * desenhados a âmbar sobre branco desapareceriam (é a mesma regra que já
     * está em constants/Colors.ts para o texto). Âmbar não serve para marcar
     * traços finos sobre fundo claro — serve para preencher.
     *
     * Por isso entra das duas maneiras em que se lê:
     *  - como CAMPO: o cartão passa a creme âmbar, e o banner inteiro é da cor
     *    da marca em vez de o serem só três glifos;
     *  - como TINTA: os ícones ficam no mesmo âmbar levado ao valor escuro
     *    (#8A5A00, o bronze da família) — 5,4:1 sobre o creme, portanto legível,
     *    e é o mesmo matiz, não outra cor.
     * O resultado é quente e da marca, sem nada a esbater-se.
     */
    const TRUST_INK = "#8A5A00";
    const TRUST_FIELD = "#FDF3E3";
    const TRUST_LINE = "#EFDCBB";

    return (
      <View
        className="flex-row rounded-2xl px-2 py-4"
        style={{
          backgroundColor: TRUST_FIELD,
          borderWidth: 1,
          borderColor: TRUST_LINE,
        }}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.title}>
            {index > 0 && (
              <View style={{ width: 1, alignSelf: "stretch", marginVertical: 2, backgroundColor: TRUST_LINE }} />
            )}
            <View className="flex-1 items-center px-2">
              <Ionicons name={item.icon} size={19} color={TRUST_INK} />
              {/* 12 px e nao 10: aos 10 os rotulos liam-se como legenda de
                  rodape, e estas sao as garantias da plataforma. Sobe um degrau
                  da escala — o suficiente para terem peso, sem passarem a
                  competir com os nomes dos tecnicos.
                  minHeight de duas linhas em TODAS as colunas: aos 12 px o
                  "Tecnicos verificados" quebra e as outras duas nao, e o bloco
                  ficava com as colunas desencontradas em baixo. Reservando as
                  duas linhas sempre, os rotulos alinham pelo topo e o conjunto
                  le-se como uma so peca — independentemente da traducao, que em
                  ingles quebra noutro sitio. */}
              <CustomText
                size="extraSmall"
                color="secondary"
                boldness="semiBold"
                numberOfLines={2}
                classes="text-center mt-1.5"
                style={{ lineHeight: 16, minHeight: 32 }}
              >
                {t(`services.select_vendor.trust_banner.${item.title}_short`)}
              </CustomText>
            </View>
          </React.Fragment>
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
