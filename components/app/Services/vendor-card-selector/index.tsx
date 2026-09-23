import { useEffect, useState } from "react";
import { CustomText } from "@/components/CustomText"
import TouchOpacity from "@/components/TouchOpacity"
import { Colors } from "@/constants/Colors"
import { renderMoney } from "@/utils/money"
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons"
import { t } from "i18next"
import { TouchableOpacity, View } from "react-native"
import { Image } from "expo-image"
import { proxiedImage } from "@/utils/imageProxy"
import i18n from "@/translation"

/**
 * Cartão de escolha de técnico (fluxo imediato e agendado).
 *
 * O cartão está dividido em duas zonas com fundos diferentes, e a divisão é
 * deliberada — antes havia uma risca cinzenta a meio de um cartão todo branco,
 * o que fazia a metade de baixo parecer vazia:
 *
 *   QUEM    (fundo branco) foto · nome · selo · nota · distância · favorito
 *   QUANTO  (faixa tonal)  preço · preço anterior · poupança · ação
 *
 * A cor diz sempre a mesma coisa: verde = dinheiro poupado, âmbar = marca e
 * sugestão da casa, vermelho = favorito, cinza = informação neutra.
 */

/** Faixa do preço. Mais quente no cartão em destaque. */
const BAND_DEFAULT = "#FDF7EC";
const BAND_HERO = "#FEEFD5";
/** Verde da poupança — só usado para dinheiro que o cliente não gasta. */
const SAVE_INK = "#04855C";
const SAVE_BG = "#E6F5EF";
/** Azul do "Novo na Piquet": informação, nem prémio (âmbar) nem dinheiro (verde). */
const NEW_INK = "#1D5FA8";
const NEW_BG = "#E7F0FB";

export type VendorBadge = "best_rated" | "cheapest" | "closest";

const VendorCard = ({
  imgSrc,
  name,
  rating,
  ratingsCount,
  badge,
  hero = false,
  distance,
  price,
  travelAmount = null,
  compact = false,
  originalPrice,
  quantity = 1,
  onPress,
  favorite = false,
  onToggleFavorite,
  selectable = false,
  selected = false,
}: {
  imgSrc: string | null,
  name: string,
  /** null/0 = técnico ainda sem avaliações. Não inventamos nota. */
  rating: number | null,
  ratingsCount?: number | null,
  /**
   * Unidades pedidas. Só se mostra acima de 1: escrever "×1" em todos os
   * cartões seria ruído no caso normal, e o que interessa aqui é justificar
   * um valor mais alto do que o cliente esperaria de uma unidade.
   */
  quantity?: number,
  /**
   * No máximo um selo por cartão. Repetir o mesmo nos três não ajudava a
   * escolher — o objetivo é dar a cada opção a sua própria razão.
   */
  badge?: VendorBadge | null,
  /** Cartão sugerido: contorno âmbar, faixa mais quente e botão preenchido. */
  hero?: boolean,
  distance: number | null,
  price: number,
  /**
   * Parcela da deslocação JÁ INCLUÍDA no `price` — não é um extra a somar.
   *
   * Cada profissional parte de um sítio diferente, por isso a estrada é uma
   * das razões pelas quais os três preços não são iguais. Sem o número, o
   * cliente vê "10 km" ao lado da nota e um preço mais alto, e não tem como
   * ligar uma coisa à outra.
   *
   * Ausente = a listagem não sabe a parcela e não se mostra nada. Inventar uma
   * conta na app (preço/km × km) daria um valor diferente do que está no
   * total, porque a app não conhece nem a comissão nem o IVA.
   */
  travelAmount?: number | null,
  /** Cartão mais baixo, para listas com vários serviços (cesto). */
  compact?: boolean,
  /** Só o fluxo agendado tem preço anterior; sem ele não há riscado nem poupança. */
  originalPrice?: number | null,
  onPress: () => void,
  favorite?: boolean,
  /** Ausente = a listagem não suporta favoritos e o coração não aparece. */
  onToggleFavorite?: () => void,
  /**
   * Modo de seleção (cesto): tocar escolhe em vez de avançar, porque ali há um
   * técnico a escolher por serviço e só depois um botão de confirmação.
   */
  selectable?: boolean,
  selected?: boolean,
}) => {
  const hasRating = typeof rating === "number" && rating > 0;
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > 0 && originalPrice > price;
  // Derivada dos dois valores, nunca escrita à mão: é a única forma de esta
  // linha não poder divergir do que o backend cobra.
  const discountPercent = hasDiscount
    ? Math.round((1 - price / (originalPrice as number)) * 100)
    : 0;

  const decimal = i18n.language === "pt_PT" ? "," : ".";
  const ratingLabel = hasRating ? rating.toFixed(1).replace(".", decimal) : null;
  const distanceLabel =
    typeof distance === "number" && Number.isFinite(distance)
      ? t("services.select_vendor.distance_away", {
          distance: distance.toFixed(1).replace(".", decimal),
        })
      : null;

  /**
   * Decomposição do preço. Zero não se mostra: um serviço sem estrada não tem
   * nada a explicar, e no cesto (compacto) nove cartões com quatro linhas cada
   * eram uma parede.
   *
   * O custo do serviço sai por SUBTRAÇÃO da deslocação, e não de uma segunda
   * conta: assim as duas linhas somam sempre o preço que está por cima.
   */
  const showBreakdown =
    !compact && price !== null && typeof travelAmount === "number" && travelAmount > 0;
  const serviceCost = showBreakdown ? price - (travelAmount as number) : null;

  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => {
    setAvatarFailed(false);
  }, [imgSrc]);

  const badgeLabel = badge ? t(`services.select_vendor.badge_${badge}`) : null;
  /**
   * O âmbar fica reservado ao motivo do destaque (melhor avaliação), o verde ao
   * dinheiro, e "Mais perto" passa a neutro — é informação útil mas não é um
   * argumento de qualidade, e dois selos âmbar no mesmo ecrã diluíam a hierarquia.
   */
  const badgeStyle =
    badge === "cheapest"
      ? { bg: SAVE_BG, ink: SAVE_INK }
      : badge === "best_rated"
      ? { bg: Colors.primary, ink: Colors.secondary }
      : { bg: Colors.support_primary, ink: Colors.gray_medium };

  return (
    <TouchOpacity
      className="w-full rounded-3xl bg-support_secondary overflow-hidden"
      style={{
        // Sombra mais marcada e contorno claro nos não escolhidos: sobre o
        // creme do ecrã, cartões brancos sem aresta pareciam manchas do fundo
        // e não peças que se podem tocar.
        shadowColor: "#000",
        shadowOpacity: hero ? 0.14 : 0.09,
        shadowRadius: hero ? 18 : 14,
        shadowOffset: { width: 0, height: hero ? 7 : 5 },
        elevation: hero ? 6 : 4,
        borderWidth: hero || selected ? 2 : 1,
        borderColor: hero || selected ? Colors.primary : "rgba(0,0,0,0.07)",
      }}
      onPress={onPress}
      accessibilityRole={selectable ? "radio" : "button"}
      accessibilityState={selectable ? { selected } : undefined}
      accessibilityLabel={t("services.select_vendor.choose_a11y", { name })}
    >
      {/* ---------------- SELO ----------------
          Faixa no topo do cartão, e não uma etiqueta ao lado da nota: na linha
          dos atributos o selo quebrava para uma segunda linha e ficava a
          competir com a ficha da avaliação. No topo é um cabeçalho — diz a
          razão do cartão antes do nome, e a linha de baixo fica só com nota e
          distância, sempre em uma linha. */}
      {!!badgeLabel && (
        <View
          className={`flex-row items-center ${compact ? "px-3 py-1" : "px-4 py-1"}`}
          style={{ backgroundColor: badgeStyle.bg }}
        >
          <AntDesign
            name={badge === "best_rated" ? "star" : badge === "cheapest" ? "tag" : "environment"}
            size={12}
            color={badgeStyle.ink}
          />
          <CustomText
            size="extraSmall"
            boldness="bold"
            color="secondary"
            numberOfLines={1}
            classes="ml-1.5"
            style={{ color: badgeStyle.ink, letterSpacing: 0.6 }}
          >
            {badgeLabel.toUpperCase()}
          </CustomText>
        </View>
      )}

      {/* ---------------- QUEM ---------------- */}
      <View className={`flex-row items-center ${compact ? "px-3 pt-2 pb-1.5" : "px-4 pt-2.5 pb-2"}`}>
        <View
          className="rounded-[16px] overflow-hidden flex-shrink-0"
          style={{ width: compact ? 40 : 46, height: compact ? 40 : 46 }}
        >
          {/* `avatarFailed`: sem isto, uma fotografia que não carregue deixava
              um buraco branco no cartão — pior do que o ícone, porque parece
              conteúdo em falta em vez de ausência de fotografia. */}
          {imgSrc && !avatarFailed ? (
            <Image
              source={{ uri: proxiedImage(imgSrc, 150) }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: "rgba(250,187,91,0.3)" }}
            >
              <Feather name="user" size={compact ? 20 : 27} color={Colors.secondary} />
            </View>
          )}
        </View>

        <View className="flex-1 ml-3">
          {/* O nome tem a linha toda para si. Quando partilhava a linha com o
              selo, nomes compostos ("António Nascimento") eram cortados a meio
              — e o nome do profissional é a última coisa que se deve truncar
              num ecrã de escolha. O selo desceu para a linha dos atributos,
              onde sobra espaço. */}
          <CustomText color="secondary" boldness="bold" numberOfLines={1} size={compact ? "medium" : "large"}>
            {name}
          </CustomText>

          {/* Nota, distância e selo numa linha só — mas com quebra permitida:
              com texto de acessibilidade grande, o selo saía pela direita do
              ecrã e ficava cortado a meio da palavra. */}
          <View className={`flex-row items-center ${compact ? "mt-0.5" : "mt-1.5"}`} style={{ flexWrap: "wrap", rowGap: 4 }}>
            {ratingLabel ? (
              /* A nota é o argumento de qualidade do cartão e estava com o
                 mesmo peso da distância — texto pequeno, número seco entre
                 parênteses. Passa a ficha própria: estrela maior, nota em
                 destaque e "23 avaliações" por extenso, que é o que dá
                 confiança ao número. */
              <View
                className="flex-row items-center rounded-lg px-2 py-1"
                style={{ backgroundColor: "rgba(250,187,91,0.18)" }}
              >
                <AntDesign name="star" size={14} color={Colors.primary} />
                <CustomText color="secondary" size="medium" boldness="bolder" classes="ml-1">
                  {ratingLabel}
                </CustomText>
                {typeof ratingsCount === "number" && ratingsCount > 0 && (
                  <CustomText color="gray_medium" size="small" boldness="medium" classes="ml-1.5" numberOfLines={1}>
                    {t("services.select_vendor.reviews_count", { count: ratingsCount })}
                  </CustomText>
                )}
              </View>
            ) : (
              // Sem avaliações não mostramos nota nenhuma. Dizer "5,0" a quem
              // nunca foi avaliado seria inventar prova social. Mas a ficha
              // tem o mesmo formato da nota — estrela vazia em vez de cheia,
              // fundo neutro em vez de âmbar — para se ler como "ainda sem
              // nota" e não como texto solto ao lado de fichas a sério.
              <View
                className="flex-row items-center rounded-lg px-2 py-1"
                style={{ backgroundColor: NEW_BG }}
              >
                <Ionicons name="star-outline" size={14} color={NEW_INK} />
                <CustomText color="secondary" size="small" boldness="bold" classes="ml-1" numberOfLines={1} style={{ color: NEW_INK }}>
                  {t("services.select_vendor.no_ratings_yet")}
                </CustomText>
              </View>
            )}

            {!!distanceLabel && (
              <>
                <CustomText color="gray_light" size="small" boldness="regular" classes="mx-2">
                  ·
                </CustomText>
                <CustomText color="gray_medium" size="small" boldness="medium" numberOfLines={1}>
                  {distanceLabel}
                </CustomText>
              </>
            )}

          </View>
        </View>

        {onToggleFavorite && (
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: favorite }}
            accessibilityLabel={
              favorite
                ? t("services.select_vendor.favorite_remove_a11y", { name })
                : t("services.select_vendor.favorite_add_a11y", { name })
            }
            onPress={onToggleFavorite}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            className="ml-2 p-1"
          >
            <Ionicons
              name={favorite ? "heart" : "heart-outline"}
              size={19}
              color={favorite ? Colors.error : Colors.gray_light}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ---------------- QUANTO + AÇÃO ---------------- */}
      <View
        className={compact ? "px-3 pt-1.5 pb-2" : "px-4 pt-2 pb-2.5"}
        style={{ backgroundColor: hero ? BAND_HERO : BAND_DEFAULT }}
      >
        {/* De onde vem o preço, ANTES do total: primeiro as parcelas, depois a
            soma — é a ordem por que se lê uma conta, e a ordem do checkout.
            À largura do cartão e não ao lado do preço, para os valores
            alinharem entre os três profissionais: é assim que se compara.

            Os mesmos rótulos do checkout, das mesmas chaves: quem compara aqui
            e confirma lá não pode encontrar duas palavras para a mesma coisa. */}
        {showBreakdown && (
          <View
            className="mb-1.5 pb-1.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.07)" }}
          >
            <View className="flex-row items-center justify-between">
              <CustomText color="gray_strong" size="small" boldness="regular" numberOfLines={1}>
                {t("services.checkout.resume.service_amount")}
              </CustomText>
              <CustomText color="secondary" size="small" boldness="semiBold" numberOfLines={1}>
                {renderMoney(serviceCost)}
              </CustomText>
            </View>
            <View className="flex-row items-center justify-between">
              <CustomText color="gray_strong" size="small" boldness="regular" numberOfLines={1}>
                {t("services.checkout.resume.travel")}
              </CustomText>
              <CustomText color="secondary" size="small" boldness="semiBold" numberOfLines={1}>
                {renderMoney(travelAmount as number)}
              </CustomText>
            </View>
          </View>
        )}

      <View className="flex-row items-center">
        {/* Duas linhas, cada uma com UMA ideia — antes eram três com factos
            soltos: o preço numa, o "IVA incluído" encostado à direita do
            riscado, e a poupança sozinha por baixo, longe do valor riscado a
            que se refere. Lia-se como quatro coisas espalhadas.
            Agora: em cima o dinheiro (o que custa, o que custava, quanto poupa),
            em baixo a letra pequena. Quem compara três técnicos percorre só a
            primeira linha de cada cartão. */}
        <View className="flex-1 mr-2">
          <View className="flex-row items-baseline" style={{ flexWrap: "wrap", rowGap: 2 }}>
            {/* "Total" só quando há parcelas por cima. Sem elas o número é o
                único valor do cartão e o rótulo era ruído; com elas, um número
                grande sem nome lia-se como um terceiro item da lista.

                Do tamanho e da cor do número, de propósito: "Total 138,20 €"
                é uma frase só, e um rótulo cinzento e pequeno ao lado de um
                número grande e preto lia-se como legenda de outra coisa. */}
            {showBreakdown && (
              <CustomText
                color="secondary"
                size={compact ? "large" : "extraLarge"}
                boldness="bolder"
                classes="mr-2"
              >
                {t("services.checkout.resume.total")}
              </CustomText>
            )}
            <CustomText color="secondary" boldness="bolder" size={compact ? "large" : "extraLarge"} numberOfLines={1}>
              {price !== null ? renderMoney(price) : t("wallet.service.no_price_provided")}
            </CustomText>
            {/* Encostado ao preço, e não junto ao nome: é o número que explica
                o valor, e explicação longe do que explica não se lê. */}
            {quantity > 1 && (
              <View className="rounded-md px-1.5 py-0.5 ml-2" style={{ backgroundColor: Colors.support_primary }}>
                <CustomText size="specExtraSmall" boldness="bold" color="secondary">
                  {`×${quantity}`}
                </CustomText>
              </View>
            )}
            {/* No compacto o "IVA incluído" vem ao lado do valor: a linha
                própria custava altura em cada um dos nove cartões do cesto,
                mas a dúvida — é isto que pago? — continua a merecer resposta
                junto ao número. */}
          </View>

          {/*
            O valor alternativo, dito pelo nome.

            Aqui esteve um preco riscado, sem rotulo. Um riscado afirma "era
            este o preco antes" — e nao e: este numero e o que o MESMO trabalho
            custaria se fosse pedido para agora, e nunca foi cobrado a ninguem.
            Anunciar uma reducao contra um preco de referencia que nao se
            praticou e coisa que a lei regula (DL 70/2021), alem de dizer ao
            cliente uma coisa que nao aconteceu.

            A percentagem sai dos dois numeros, nao de um texto fixo. O botao do
            ecra anterior promete "Poupa 25%" escrito a mao; se o premio de
            imediatismo mudar no backend, esta linha acompanha e aquele nao.
          */}
          {hasDiscount && !compact && (
            <CustomText color="gray_strong" size="extraSmall" boldness="regular" classes="mt-1" numberOfLines={1}>
              {t("services.select_vendor.instead_of_now", {
                amount: renderMoney(originalPrice as number),
                percent: discountPercent,
              })}
            </CustomText>
          )}

        </View>

        {/* No cesto tocar SELECIONA (há um técnico a escolher por serviço e um
            botão de confirmação no fim), por isso ali a ação dá lugar a um rádio. */}
        {selectable ? (
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 26,
              height: 26,
              borderWidth: 2,
              borderColor: selected ? Colors.primary : Colors.gray_light,
              backgroundColor: selected ? Colors.primary : "transparent",
            }}
          >
            {selected && <Feather name="check" size={15} color={Colors.secondary} />}
          </View>
        ) : (
          <View
            className="flex-row items-center rounded-full pl-5 pr-4 py-2.5"
            style={
              hero
                ? {
                    backgroundColor: Colors.primary,
                    shadowColor: Colors.primary,
                    shadowOpacity: 0.45,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 4,
                  }
                : {
                    backgroundColor: Colors.support_secondary,
                    borderWidth: 1.4,
                    borderColor: Colors.secondary,
                  }
            }
          >
            <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
              {t("services.select_vendor.choose")}
            </CustomText>
            <Feather name="chevron-right" size={15} color={Colors.secondary} style={{ marginLeft: 2 }} />
          </View>
        )}
      </View>
      </View>
    </TouchOpacity>
  )
}

export default VendorCard;
