import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { proxiedImage } from "@/utils/imageProxy";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useCart, type CartBooking, type CartMode } from "@/contexts/CartContext";
import { useService } from "@/contexts/ServiceContext";
import { useSchedule } from "@/contexts/ScheduleContext";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useMixpanel } from "@/contexts/MixpanelContext";
import { renderMoney } from "@/utils/money";
import { useTranslation } from "react-i18next";
import { ServiceTypeInterface } from "@/types/services";
import VendorCard, { type VendorBadge } from "@/components/app/Services/vendor-card-selector";
import RemoteThumb from "@/components/app/Services/RemoteThumb";
import { serviceIcon } from "@/components/app/Services/operationAreaIcon";
import TechnicianTrustFooter from "@/components/app/Services/technician-trust-footer";
import { useFavoriteVendors } from "@/hooks/useFavoriteVendors";
import { resolveVendorBadges } from "@/utils/vendorBadges";

interface VendorOption {
  id: number;
  name: string;
  rating: number | null;
  ratingsCount: number | null;
  distance: number | null;
  rate: number;
  avatar: string | null;
  raw: any;
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

/**
 * Fluxo do cesto (espelho da build 15):
 * - se HÁ técnicos que fazem todos os serviços → escolha única (uma visita);
 * - se NÃO há → um técnico por serviço, em reservas separadas.
 * O backend processa um serviço por pedido, por isso a confirmação percorre
 * a fila (um checkout por serviço); o cesto vai limpando à medida que cria.
 */
const CartTechnicians = () => {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const mode: CartMode = params.mode === "scheduled" ? "scheduled" : "immediate";

  const { items, hydrated, startQueue } = useCart();

  /**
   * Imagens frescas do catálogo — o cesto guarda o serviço no telemóvel, mas o
   * endereço da imagem que o backoffice devolve expira ao fim de uma hora.
   * Mesmo problema, mesma solução do ecrã do cesto.
   */
  const [freshImages, setFreshImages] = useState<Record<number, string>>({});

  const { setServiceToRequest, setScheduledService, setSelectedProfessional } = useService();
  const { setDataToMakeSchedule } = useSchedule();
  const { session } = useSession();
  const { guestSession, setSelectedVendor: setGuestSelectedVendor } = useGuestSession();
  const { api } = useApi();
  const { track } = useMixpanel();

  const [loading, setLoading] = useState(true);
  const [vendorsByService, setVendorsByService] = useState<Record<number, VendorOption[]>>({});
  // técnico único
  const [selectedCommon, setSelectedCommon] = useState<number | null>(null);
  // um técnico por serviço: serviceTypeId -> vendorId
  const [selectedPerService, setSelectedPerService] = useState<Record<number, number>>({});
  const { isFavorite, toggleFavorite } = useFavoriteVendors();

  const normalize = (v: any): VendorOption => ({
    id: v?.id,
    name: v?.name ?? "",
    // O backend passou a devolver nota real (null enquanto não houver
    // avaliações) e a contagem — antes isto forçava 0 e o cartão mostrava
    // "Novo na Piquet" mesmo a quem tinha avaliações.
    rating: typeof v?.rating === "number" ? v.rating : null,
    ratingsCount: typeof v?.ratings_count === "number" ? v.ratings_count : null,
    // A distância vinha na resposta e era deitada fora aqui: no fluxo direto o
    // cliente vê "a 16,0 km" e no cesto não via nada.
    distance: typeof v?.distance === "number" ? v.distance : null,
    rate: typeof v?.rate === "number" ? v.rate : Number(v?.rate) || 0,
    avatar: v?.avatar?.small ?? (typeof v?.avatar === "string" ? v.avatar : null),
    raw: v,
  });

  useEffect(() => {
    if (!items.length) return;
    let alive = true;
    api
      .post(API_ROUTES.POST_SEARCH_OPERATION_AREAS, { operation_areas: [] })
      .then(({ data }) => {
        if (!alive) return;
        const map: Record<number, string> = {};
        (data?.data?.services_types ?? []).forEach((service: any) => {
          if (service?.id && typeof service?.image === "string") map[service.id] = service.image;
        });
        setFreshImages(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [items.length]);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const results: Record<number, VendorOption[]> = {};
      await Promise.all(
        items.map(async (item) => {
          try {
            const endpoint = session
              ? mode === "scheduled"
                ? API_ROUTES.POST_SCHEDULE_VENDORS
                : API_ROUTES.CUSTOMER_REQUEST_SERVICE
              : API_ROUTES.GUEST_SEARCH_VENDORS;
            const payload = session
              ? { service_type: item.id }
              : {
                  service_type_id: item.id,
                  latitude: guestSession?.guest_address?.latitude,
                  longitude: guestSession?.guest_address?.longitude,
                  ...(mode === "scheduled" ? { scheduled: true } : {}),
                };
            const res = await api.post(endpoint, payload);
            const vendors = res?.data?.data?.vendors;
            const list = Array.isArray(vendors) ? vendors : Object.values(vendors ?? {});
            results[item.id] = list.map(normalize).filter((v: VendorOption) => v.id);
          } catch {
            results[item.id] = [];
          }
        }),
      );
      if (!cancelled) {
        setVendorsByService(results);
        setLoading(false);
      }
    };
    // O cesto é lido do AsyncStorage de forma assíncrona: enquanto não estiver
    // hidratado, `items` é [] e uma pesquisa feita agora ficaria vazia para sempre
    // (o efeito não voltava a correr). Espera-se pela hidratação e mantém-se o loading.
    if (!hydrated) return;
    if (items.length > 0) fetchAll();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // Técnicos comuns a TODOS os serviços, com preço total real (Σ rate por serviço)
  const commonVendors = useMemo(() => {
    if (items.length === 0 || Object.keys(vendorsByService).length < items.length) return [];
    const lists = items.map((i) => vendorsByService[i.id] ?? []);
    if (lists.some((l) => l.length === 0)) return [];
    const first = lists[0];
    return first
      .filter((v) => lists.every((l) => l.some((x) => x.id === v.id)))
      .map((v) => ({
        ...v,
        total: lists.reduce((sum, l) => sum + (l.find((x) => x.id === v.id)?.rate ?? 0), 0),
      }))
      // 1.º critério a melhor avaliação (sem nota conta como -1: quem nunca foi
      // avaliado não passa à frente); 2.º critério, em empate, o mais barato.
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (a.total - b.total))
      .slice(0, 3);
  }, [vendorsByService, items]);

  // Selos por grupo: cada serviço tem a sua lista, logo o "mais barato" e o
  // "mais perto" são relativos a esse serviço e não ao cesto todo.
  const badgesByService = useMemo(() => {
    const out: Record<number, Record<number, VendorBadge>> = {};
    Object.entries(vendorsByService).forEach(([serviceId, list]) => {
      out[Number(serviceId)] = resolveVendorBadges(list).badges;
    });
    return out;
  }, [vendorsByService]);

  const commonBadges = useMemo(() => resolveVendorBadges(commonVendors).badges, [commonVendors]);

  const isMultiMode = !loading && commonVendors.length === 0;

  // Pré-selecionar a melhor opção assim que as listas chegam: melhor avaliação
  // e, em empate, mais barato (as listas já vêm ordenadas por essa regra).
  // Só preenche o que ainda não foi escolhido — não sobrepõe a escolha do cliente.
  useEffect(() => {
    if (loading) return;
    if (!isMultiMode) {
      if (selectedCommon === null && commonVendors.length > 0) {
        setSelectedCommon(commonVendors[0].id);
      }
      return;
    }
    setSelectedPerService((prev) => {
      const next = { ...prev };
      items.forEach((i) => {
        if (next[i.id] !== undefined) return;
        const best = [...(vendorsByService[i.id] ?? [])]
          .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (a.rate - b.rate))[0];
        if (best) next[i.id] = best.id;
      });
      return next;
    });
  }, [loading, isMultiMode, commonVendors, vendorsByService, items, selectedCommon]);

  // items.length > 0: com o cesto vazio, `items.every(...)` é verdadeiro por vacuidade
  // e o CTA ficaria ativo para uma fila sem reservas (startBooking(bookings[0]) rebentava).
  const allChosen =
    items.length > 0 &&
    (isMultiMode ? items.every((i) => selectedPerService[i.id] !== undefined) : selectedCommon !== null);

  const total = useMemo(() => {
    if (!isMultiMode) {
      return commonVendors.find((v) => v.id === selectedCommon)?.total ?? 0;
    }
    return items.reduce((sum, i) => {
      const v = (vendorsByService[i.id] ?? []).find((x) => x.id === selectedPerService[i.id]);
      return sum + (v?.rate ?? 0);
    }, 0);
  }, [isMultiMode, commonVendors, selectedCommon, items, selectedPerService, vendorsByService]);

  const startBooking = (booking: CartBooking) => {
    const vendor = booking.vendor;
    setScheduledService(mode === "scheduled");
    setSelectedProfessional(vendor);
    setServiceToRequest({ service_type: booking.serviceType, vendor });
    if (!session) setGuestSelectedVendor(vendor.id, vendor);
    if (mode === "scheduled") {
      // O ecrã de agendamento define dataToMakeSchedule fresco antes do checkout.
      router.navigate("/(app)/(modals)/(services)/(schedule)/schedule/schedule-service");
    } else {
      // Reserva imediata: um agendamento antigo que tenha ficado em memória (o cliente
      // escolheu data e desistiu) faria o checkout enviar scheduled=true com a data errada.
      // O fluxo de serviço único já limpa isto no "Pedir já"; o cesto entra direto no
      // checkout e tem de o limpar aqui.
      setDataToMakeSchedule(null);
      router.navigate(`/(app)/(modals)/(services)/(request)/checkout/${booking.serviceType.id}`);
    }
  };

  const proceed = () => {
    if (!allChosen) return;
    const bookings: CartBooking[] = items.map((item) => {
      const vendorOpt = isMultiMode
        ? (vendorsByService[item.id] ?? []).find((v) => v.id === selectedPerService[item.id])
        : commonVendors.find((v) => v.id === selectedCommon);
      return { serviceType: item, vendor: vendorOpt?.raw };
    });
    startQueue(bookings, mode);
    track("cart_booking_flow_started", {
      items: items.length,
      single_technician: !isMultiMode,
      mode,
    });
    startBooking(bookings[0]);
  };


  /**
   * Mesmo cartão do fluxo direto, em modo de seleção.
   *
   * Este ecrã tinha uma lista própria — retrato pequeno, preço numa pílula e um
   * rádio à direita — que não se parecia nada com o ecrã de escolha de técnico
   * do fluxo normal. Para o cliente é a mesma decisão ("qual destes profissionais
   * quero"), e duas linguagens visuais para a mesma decisão obrigam-no a
   * reaprender o ecrã. Aqui tocar seleciona em vez de avançar, porque há um
   * técnico a escolher por serviço e um botão de confirmação no fim.
   */
  const vendorTile = (
    v: VendorOption & { total?: number },
    selected: boolean,
    price: number,
    onPress: () => void,
    badge?: VendorBadge | null,
  ) => (
    <View key={v.id} className="mb-2.5">
      <VendorCard
        selectable
        selected={selected}
        imgSrc={v.avatar}
        name={v.name}
        rating={v.rating}
        ratingsCount={v.ratingsCount}
        distance={v.distance}
        badge={badge ?? null}
        favorite={isFavorite(v.id)}
        onToggleFavorite={() => toggleFavorite(v.id)}
        price={price}
        onPress={onPress}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="px-5 pt-3 pb-2">
        <BackHeader
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("cart.technicians_header")}
            </CustomText>
          )}
        />
      </View>

      <View className="flex-1 rounded-t-3xl" style={{ backgroundColor: "#FAF7F2" }}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={Colors.primary} />
            <CustomText color="gray_medium" size="small" boldness="regular" classes="mt-4">
              {t("cart.common_checking")}
            </CustomText>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <CustomText color="secondary" boldness="bold" size="extraLarge" classes="text-center mb-1">
                {t("cart.technicians_title")}
              </CustomText>
              <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center mb-5">
                {isMultiMode ? t("cart.multi_subtitle") : t("cart.single_subtitle")}
              </CustomText>

              {!isMultiMode ? (
                <>
                  {commonVendors.map((v) =>
                    vendorTile(v, selectedCommon === v.id, v.total, () => setSelectedCommon(v.id), commonBadges[v.id]),
                  )}
                </>
              ) : (
                items.map((item, index) => {
                  const options = [...(vendorsByService[item.id] ?? [])]
                    // Mesma regra do modo comum: melhor avaliação, depois mais barato.
                    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (a.rate - b.rate))
                    .slice(0, 3);
                  return (
                    <View key={item.id} className="mb-5">
                      {/* A imagem do serviço identifica-o mais depressa que o
                          número; este fica por cima dela, pequeno, só para dizer
                          a ordem. A duração saiu: aqui escolhe-se quem faz, não
                          quanto demora. */}
                      <View className="flex-row items-center mb-2.5">
                        <View className="mr-3">
                          <RemoteThumb
                            uri={freshImages[item.id as number] ?? (item as any)?.image}
                            size={44}
                            radius={12}
                            fit="cover"
                            fallbackIcon={serviceIcon(item?.name, item?.operation_area?.name)}
                          />
                          <View
                            className="absolute items-center justify-center rounded-full"
                            style={{
                              width: 20,
                              height: 20,
                              top: -6,
                              left: -6,
                              backgroundColor: Colors.secondary,
                            }}
                          >
                            <CustomText color="primary" size="extraSmall" boldness="bold">
                              {index + 1}
                            </CustomText>
                          </View>
                        </View>
                        <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={2} classes="flex-1">
                          {item.name}
                        </CustomText>
                      </View>
                      {options.length === 0 ? (
                        /* Sem ninguém para este serviço: dizê-lo com o mesmo
                           peso do resto do ecrã, não numa linha cinzenta solta
                           que se confunde com uma legenda. */
                        <View
                          className="rounded-2xl px-4 py-3 flex-row items-center"
                          style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
                        >
                          <Feather name="users" size={16} color={Colors.gray_medium} />
                          <CustomText color="gray_strong" size="small" boldness="regular" classes="ml-2 flex-1">
                            {t("services.select_vendor.no_vendors_found")}
                          </CustomText>
                        </View>
                      ) : (
                        options.map((v) =>
                          vendorTile(
                            v,
                            selectedPerService[item.id] === v.id,
                            v.rate,
                            () => setSelectedPerService((prev) => ({ ...prev, [item.id]: v.id })),
                            badgesByService[item.id]?.[v.id],
                          ),
                        )
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* D4: a garantia existia no ecrã de escolha do fluxo direto e não
                aqui — logo onde há mais dinheiro em jogo, porque são vários
                serviços de uma vez. */}
            <View className="px-5 pt-2">
              <TechnicianTrustFooter compact />
            </View>

            <View className="px-5 pb-5 pt-2">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={proceed}
                disabled={!allChosen}
                style={{
                  backgroundColor: allChosen ? Colors.primary : "rgba(250,187,91,0.35)",
                  borderRadius: 999,
                  paddingVertical: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  ...(allChosen
                    ? {
                        shadowColor: Colors.primary,
                        shadowOpacity: 0.5,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 8,
                      }
                    : {}),
                }}
              >
                <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1} style={{ opacity: allChosen ? 1 : 0.5 }}>
                  {allChosen
                    ? t("cart.continue")
                    : isMultiMode
                      ? t("cart.pick_per_service")
                      : t("cart.pick_one")}
                </CustomText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CartTechnicians;
