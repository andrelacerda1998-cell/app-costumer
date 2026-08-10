import { CustomText } from "@/components/CustomText"
import TouchOpacity from "@/components/TouchOpacity"
import { Colors } from "@/constants/Colors"
import { renderMoney } from "@/utils/money"
import { AntDesign, Feather } from "@expo/vector-icons"
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
  originalPrice,
  onPress,
  favorite = false,
  onToggleFavorite,
}: {
  imgSrc: string | null,
  name: string,
  /** null/0 = técnico ainda sem avaliações. Não inventamos nota. */
  rating: number | null,
  ratingsCount?: number | null,
  /**
   * No máximo um selo por cartão. Repetir o mesmo nos três não ajudava a
   * escolher — o objetivo é dar a cada opção a sua própria razão.
   */
  badge?: VendorBadge | null,
  /** Cartão sugerido: contorno âmbar, faixa mais quente e botão preenchido. */
  hero?: boolean,
  distance: number | null,
  price: number,
  /** Só o fluxo agendado tem preço anterior; sem ele não há riscado nem poupança. */
  originalPrice?: number | null,
  onPress: () => void,
  favorite?: boolean,
  /** Ausente = a listagem não suporta favoritos e o coração não aparece. */
  onToggleFavorite?: () => void,
}) => {
  const hasRating = typeof rating === "number" && rating > 0;
  const hasDiscount =
    typeof originalPrice === "number" && originalPrice > 0 && originalPrice > price;
  // Poupança em euros em vez de "−25%": ninguém converte uma percentagem de
  // cabeça a meio de uma decisão, e o valor concreto ocupa o canto que estava vazio.
  const savings = hasDiscount ? (originalPrice as number) - price : 0;

  const decimal = i18n.language === "pt_PT" ? "," : ".";
  const ratingLabel = hasRating ? rating.toFixed(1).replace(".", decimal) : null;
  const distanceLabel =
    typeof distance === "number" && Number.isFinite(distance)
      ? t("services.select_vendor.distance_away", {
          distance: distance.toFixed(1).replace(".", decimal),
        })
      : null;

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
        shadowColor: "#000",
        shadowOpacity: hero ? 0.1 : 0.05,
        shadowRadius: hero ? 16 : 12,
        shadowOffset: { width: 0, height: hero ? 6 : 4 },
        elevation: hero ? 4 : 2,
        borderWidth: hero ? 2 : 0,
        borderColor: hero ? Colors.primary : "transparent",
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("services.select_vendor.choose_a11y", { name })}
    >
      {/* ---------------- QUEM ---------------- */}
      <View className="flex-row items-center px-4 pt-4 pb-3.5">
        <View className="h-[58px] w-[58px] rounded-[18px] overflow-hidden flex-shrink-0">
          {imgSrc ? (
            <Image
              source={{ uri: proxiedImage(imgSrc, 150) }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: "rgba(250,187,91,0.3)" }}
            >
              <Feather name="user" size={30} color={Colors.secondary} />
            </View>
          )}
        </View>

        <View className="flex-1 ml-3">
          {/* O nome tem a linha toda para si. Quando partilhava a linha com o
              selo, nomes compostos ("António Nascimento") eram cortados a meio
              — e o nome do profissional é a última coisa que se deve truncar
              num ecrã de escolha. O selo desceu para a linha dos atributos,
              onde sobra espaço. */}
          <CustomText color="secondary" boldness="bold" numberOfLines={1} size="large">
            {name}
          </CustomText>

          {/* Nota, distância e selo numa linha só — mas com quebra permitida:
              com texto de acessibilidade grande, o selo saía pela direita do
              ecrã e ficava cortado a meio da palavra. */}
          <View className="flex-row items-center mt-1.5" style={{ flexWrap: "wrap", rowGap: 4 }}>
            {ratingLabel ? (
              <>
                <AntDesign name="star" size={12.5} color={Colors.primary} />
                <CustomText color="secondary" size="small" boldness="bold" classes="ml-1">
                  {ratingLabel}
                </CustomText>
                {typeof ratingsCount === "number" && ratingsCount > 0 && (
                  <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1" numberOfLines={1}>
                    {`(${ratingsCount})`}
                  </CustomText>
                )}
              </>
            ) : (
              // Sem avaliações não mostramos nota nenhuma. Dizer "5,0" a quem
              // nunca foi avaliado seria inventar prova social.
              <CustomText color="gray_medium" size="small" boldness="medium" numberOfLines={1}>
                {t("services.select_vendor.no_ratings_yet")}
              </CustomText>
            )}

            {!!distanceLabel && (
              <>
                <CustomText color="gray_light" size="small" boldness="regular" classes="mx-1.5">
                  ·
                </CustomText>
                <CustomText color="gray_medium" size="small" boldness="medium" numberOfLines={1}>
                  {distanceLabel}
                </CustomText>
              </>
            )}

            {!!badgeLabel && (
              <View
                className="rounded-lg px-2 py-0.5 ml-2"
                style={{ backgroundColor: badgeStyle.bg }}
              >
                <CustomText
                  size="specExtraSmall"
                  boldness="bold"
                  color="secondary"
                  numberOfLines={1}
                  style={{ color: badgeStyle.ink, letterSpacing: 0.4 }}
                >
                  {badgeLabel.toUpperCase()}
                </CustomText>
              </View>
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
            <AntDesign
              name={favorite ? "heart" : "hearto"}
              size={19}
              color={favorite ? Colors.error : Colors.gray_light}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* ---------------- QUANTO + AÇÃO ---------------- */}
      <View
        className="flex-row items-center px-4 pt-3 pb-3.5"
        style={{ backgroundColor: hero ? BAND_HERO : BAND_DEFAULT }}
      >
        <View className="flex-1 mr-2">
          <View className="flex-row items-center">
            <CustomText color="secondary" boldness="bolder" size="extraLarge" numberOfLines={1}>
              {price !== null ? renderMoney(price) : t("wallet.service.no_price_provided")}
            </CustomText>
            {hasDiscount && (
              <CustomText
                color="gray_light"
                boldness="regular"
                size="small"
                numberOfLines={1}
                classes="line-through ml-2"
              >
                {renderMoney(originalPrice as number)}
              </CustomText>
            )}
          </View>

          {hasDiscount && (
            <View className="self-start rounded-md px-1.5 py-0.5 mt-1" style={{ backgroundColor: SAVE_BG }}>
              <CustomText size="specExtraSmall" boldness="bold" color="secondary" style={{ color: SAVE_INK }}>
                {t("services.select_vendor.savings", { amount: renderMoney(savings) })}
              </CustomText>
            </View>
          )}
        </View>

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
          <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1}>
            {t("services.select_vendor.choose")}
          </CustomText>
          <Feather name="chevron-right" size={15} color={Colors.secondary} style={{ marginLeft: 2 }} />
        </View>
      </View>
    </TouchOpacity>
  )
}

export default VendorCard;
