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
 * Cartão de escolha de técnico.
 *
 * O que ficou de fora, e porquê:
 *  - "Técnico Verificado" em cada cartão. Todos os técnicos da lista são
 *    verificados, logo o selo não distinguia nenhum deles — era peso visual a
 *    dizer o mesmo três vezes. A garantia passa a viver só no rodapé.
 *  - Estado "selecionado". Tocar num cartão avança logo para o passo seguinte,
 *    por isso a moldura no primeiro cartão anunciava uma escolha que ninguém
 *    tinha feito.
 *
 * O que ficou: foto, nome, avaliação, distância e preço — os quatro critérios
 * com que se escolhe de facto — mais o coração e uma ação explícita.
 *
 * A contagem de avaliações passou a aparecer porque o backend passou a enviá-la:
 * a app tentava `rating_count`/`ratings_count`/`reviews_count` e nenhum existia,
 * pelo que a linha nunca chegava a renderizar.
 */
const VendorCard = ({
  imgSrc,
  name,
  rating,
  ratingsCount,
  closest = false,
  distance,
  price,
  onPress,
  favorite = false,
  onToggleFavorite,
}: {
  imgSrc: string | null,
  name: string,
  /** null/0 = técnico ainda sem avaliações. Não inventamos nota. */
  rating: number | null,
  /** Vem de `ratings_count`. O endpoint antigo não o enviava de todo. */
  ratingsCount?: number | null,
  /** O backend ordena por distância: o primeiro é o mais perto, não o "melhor". */
  closest?: boolean,
  distance: number | null,
  price: number,
  onPress: () => void,
  favorite?: boolean,
  /** Ausente = a listagem não suporta favoritos e o coração não aparece. */
  onToggleFavorite?: () => void,
}) => {
  const hasRating = typeof rating === "number" && rating > 0;

  const decimal = i18n.language === "pt_PT" ? "," : ".";
  const ratingLabel = hasRating ? rating.toFixed(1).replace(".", decimal) : null;
  const distanceLabel =
    typeof distance === "number" && Number.isFinite(distance)
      ? t("services.select_vendor.distance_away", {
          distance: distance.toFixed(1).replace(".", decimal),
        })
      : null;

  return (
    <TouchOpacity
      className="w-full p-4 rounded-3xl bg-support_secondary"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("services.select_vendor.choose_a11y", { name })}
    >
      <View className="flex-row items-center">
        <View className="h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0">
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
              style={{ backgroundColor: "rgba(250,187,91,0.25)" }}
            >
              <Feather name="user" size={30} color={Colors.secondary} />
            </View>
          )}
        </View>

        <View className="flex-1 ml-3">
          <CustomText color="secondary" boldness="bold" numberOfLines={1} size="large">
            {name}
          </CustomText>

          {/* Uma linha só com o que decide: nota (ou a ausência dela) e distância. */}
          <View className="flex-row items-center mt-1">
            {ratingLabel ? (
              <>
                <AntDesign name="star" size={13} color={Colors.primary} />
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
          </View>

          {/* "Mais perto" e não "Recomendado": a ordenação do backend é por
              distância (e só depois por nota), por isso é isso — e apenas isso —
              que podemos afirmar sobre o primeiro da lista. */}
          {closest && (
            <View className="flex-row mt-1.5">
              <View
                className="flex-row items-center rounded-full px-2 py-0.5"
                style={{ backgroundColor: "rgba(250,187,91,0.28)" }}
              >
                <Feather name="navigation" size={9} color={Colors.secondary} />
                <CustomText color="secondary" size="extraSmall" boldness="bold" classes="ml-1" numberOfLines={1}>
                  {t("services.select_vendor.closest_badge")}
                </CustomText>
              </View>
            </View>
          )}
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
            className="self-start ml-2 p-1"
          >
            <AntDesign
              name={favorite ? "heart" : "hearto"}
              size={18}
              color={favorite ? Colors.error : Colors.gray_light}
            />
          </TouchableOpacity>
        )}
      </View>

      <View className="h-[1px] w-full bg-support_primary mt-3.5 mb-3" />

      <View className="flex-row items-center justify-between">
        <CustomText color="secondary" boldness="bolder" size="extraLarge" numberOfLines={1}>
          {price !== null ? renderMoney(price) : t("wallet.service.no_price_provided")}
        </CustomText>

        {/* Ação explícita: o cartão inteiro é tocável, mas sem isto não era óbvio
            que tocar avançava — parecia uma ficha de leitura. */}
        <View
          className="flex-row items-center rounded-full px-4 py-2"
          style={{ backgroundColor: Colors.primary }}
        >
          <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1}>
            {t("services.select_vendor.choose")}
          </CustomText>
          <Feather name="chevron-right" size={16} color={Colors.secondary} style={{ marginLeft: 2 }} />
        </View>
      </View>
    </TouchOpacity>
  )
}

export default VendorCard;
