import { useCart } from "@/contexts/CartContext";
import {Colors} from '@/constants/Colors'
import {Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons} from '@expo/vector-icons'
import {router, useLocalSearchParams} from 'expo-router'
import React,{useEffect,useState} from 'react'
import {SafeAreaView} from "react-native-safe-area-context";
import {Alert, Dimensions, Platform, Pressable, ScrollView, Text, TouchableOpacity, View} from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import {useAddressLabel} from '@/hooks/useAddressLabel'
import {CustomText} from "@/components/CustomText"
import {useService} from "@/contexts/ServiceContext"
import {useSchedule} from "@/contexts/ScheduleContext"
import {useSession} from "@/contexts/SessionContext"
import {useGuestSession} from "@/contexts/GuestSessionContext"
import {useApi} from "@/contexts/ApiContext"
import {API_ROUTES} from "@/constants/ApiRoutes"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { useTranslation } from "react-i18next"
import { useMixpanel } from "@/contexts/MixpanelContext"
import { useDialog } from "@/contexts/DialogContext"
import { renderMoney } from "@/utils/money"
import { CART_ENABLED } from "@/constants/Features"
import useServiceModeChooser from "@/components/app/Services/useServiceModeChooser"
import IDomParser from "advanced-html-parser"
import CircledCheckMarkFilled from "@/assets/icons/circled-check-mark-1";
import BoltSm from "@/assets/icons/boltsm";
import CircledX from "@/assets/icons/circled-x-mark-1";
import CalendarSm from "@/assets/icons/calendarsm";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get("window");



const ServiceTypeInformation = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { track } = useMixpanel();
    const { serviceToRequest, setServiceToRequest, setScheduledService, scheduledService } = useService();
    const { addItem, hasItem } = useCart();
    const { setDataToMakeSchedule } = useSchedule();
    const { userData, session } = useSession();
    const { guestSession } = useGuestSession();
    const { api } = useApi();
    const addressLabel = useAddressLabel();
    const { openDialog, closeDialog } = useDialog();
    const { openModeChooser: showModeChooser } = useServiceModeChooser();

    useEffect(() => {
        track("service_type_viewed", { service_name: serviceToRequest?.service_type?.name });
    }, []);

    // "Desde" real: tarifa mais baixa dos técnicos disponíveis na zona.
    // Fallback silencioso para o starts_from do catálogo (sem morada/erro).
    const [minVendorRate, setMinVendorRate] = useState<number | null>(null);
    useEffect(() => {
        const stId = serviceToRequest?.service_type?.id;
        if (!stId) return;
        const hasGuestCoords = !!(guestSession?.guest_address?.latitude && guestSession?.guest_address?.longitude);
        if (!session && !hasGuestCoords) return;
        const endpoint = session ? API_ROUTES.CUSTOMER_REQUEST_SERVICE : API_ROUTES.GUEST_SEARCH_VENDORS;
        const payload = session
            ? { service_type: stId }
            : {
                service_type_id: stId,
                latitude: guestSession?.guest_address?.latitude,
                longitude: guestSession?.guest_address?.longitude,
              };
        api.post(endpoint, payload)
            .then((res: any) => {
                const vendors = res?.data?.data?.vendors;
                const list: any[] = Array.isArray(vendors) ? vendors : Object.values(vendors ?? {});
                const rates = list
                    .map((v) => (typeof v?.rate === "number" ? v.rate : Number(v?.rate)))
                    .filter((r) => Number.isFinite(r) && r > 0);
                if (rates.length > 0) setMinVendorRate(Math.min(...rates));
            })
            .catch(() => {});
    }, [serviceToRequest?.service_type?.id]);

    // minVendorRate vem em cêntimos (rate do técnico); starts_from vem em EUROS
    // (catálogo) — converter para cêntimos antes de renderMoney (que divide por 100).
    const startsFromCents = typeof serviceToRequest?.service_type?.starts_from === "number"
        ? serviceToRequest.service_type.starts_from * 100
        : null;
    const fromPrice = minVendorRate ?? startsFromCents;

    // Duracao estimada a partir de service_type.time (minutos). "1h", "1h30",
    // "45 min" — nunca "90 minutos", que ninguem converte de cabeca.
    const durationLabel = (() => {
        const mins = serviceToRequest?.service_type?.time;
        if (typeof mins !== "number" || !Number.isFinite(mins) || mins <= 0) return null;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h === 0) return t("services.select_service_type.duration_minutes", { minutes: m });
        return t("services.select_service_type.duration_hours", {
            duration: m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`,
        });
    })();

    // A descricao vem em HTML nalguns tipos de servico.
    const serviceDescription = (() => {
        const raw = serviceToRequest?.service_type?.description;
        if (!raw) return null;
        if (raw[0] !== "<") return raw;
        try {
            return IDomParser.parse(raw).documentElement?.textContent?.trim() || null;
        } catch {
            return null;
        }
    })();

    const goToSelectVendors = () => {
        if (!serviceToRequest?.service_type?.id) return;
        if (!userData) {
            router.navigate('/(app)/(modals)/(services)/(request)/address/guest');
            return;
        }
        if (!userData.address) {
            router.navigate('/(app)/(modals)/(address)/update');
            return;
        }
        if (!userData.allowed_by_zone) {
            router.navigate('/(app)/(modals)/blocked-by-zone');
            return;
        }
        router.navigate(`/(app)/(modals)/(services)/(request)/select-vendor/${serviceToRequest.service_type.id}`);
    };

    const scheduleService = () => {
        if (!serviceToRequest?.service_type?.id) return;
        if (!userData) {
            setScheduledService(true);
            router.navigate('/(app)/(modals)/(services)/(request)/address/guest');
            return;
        }
        if (!userData.address) {
            router.navigate('/(app)/(modals)/(address)/update');
            return;
        }
        if (!userData.allowed_by_zone) {
            router.navigate('/(app)/(modals)/blocked-by-zone');
            return;
        }
        setScheduledService(true);
        // Primeiro QUANDO, depois QUEM. Antes escolhia-se o tecnico e so a
        // seguir se descobriam os horarios dele: quem nao encontrasse hora que
        // servisse tinha de voltar atras e recomecar. Como os precos variam
        // ate 3x entre tecnicos, era facil escolher o mais barato e descobrir
        // que nao tinha vaga.
        router.navigate('/(app)/(modals)/(services)/(schedule)/schedule/schedule-service');
    };

    const requestUrgentService = () => {
        if (!serviceToRequest?.service_type?.id) return;
        setScheduledService(false);
        setDataToMakeSchedule(null);
        goToSelectVendors();
    };

    // "Pedir já" abre a escolha: serviço imediato ou agendado.
    // O conteúdo do modal vive em useServiceModeChooser — a mesma decisão
    // aparece no cesto e não pode divergir.
    const openModeChooser = () => {
        if (!serviceToRequest?.service_type?.id) return;
        showModeChooser({
            onImmediate: requestUrgentService,
            onScheduled: scheduleService,
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-primary">
            <BackHeader
                onBack={() => {
                    setServiceToRequest(null);
                    setScheduledService(false);
                    setDataToMakeSchedule(null);
                    if (router.canGoBack()) {
                        return router.back();
                    }
                    return router.push("/(app)/(tabs)/home");
                }}
                backButtonColor="secondary"
                middleItem={() => (
                    <View className="flex flex-row items-center">
                        <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                            {addressLabel}
                        </CustomText>
                    </View>
                )}
                otherClasses="p-5"
            />

            <ScrollView
                className="bg-support_secondary rounded-t-3xl space-y-4 flex-1"
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingTop: 20,
                    // minHeight: height, // test to check if the yellow background that appears below the white screen remains hidden
                    minHeight: "100%",
                    paddingBottom: 20 + (insets?.bottom || 0)
            
                }}
        >
            <View>
            <View>
                <CustomText
                color="secondary"
                boldness="semiBold"
                size="large"
                classes="text-center"
                >
                {serviceToRequest?.service_type?.name || ""}
                </CustomText>

                {/* A descricao e a duracao existem no service_type e nao eram
                    mostradas em lado nenhum. Este ecra tinha ~40% de altura vazia
                    entre as listas e o rodape: em vez de a fechar com espacamento,
                    fica preenchida com o que o cliente quer mesmo saber antes de
                    decidir — o que e, quanto tempo demora e desde quanto custa. */}
                {!!serviceDescription && (
                    <CustomText
                        color="gray_medium"
                        boldness="regular"
                        size="small"
                        classes="text-center mt-2"
                    >
                        {serviceDescription}
                    </CustomText>
                )}

                {/* Só a duração. O preço estava aqui E na barra fixa do fundo, e a
                    barra é o sítio certo: fica colada ao botão e acompanha o
                    scroll, enquanto este só se via antes de rolar. */}
                {!!durationLabel && (
                    <View className="flex-row justify-center mt-4" style={{ gap: 10, flexWrap: "wrap" }}>
                        {!!durationLabel && (
                            <View
                                className="flex-row items-center rounded-full px-3 py-2"
                                style={{ backgroundColor: "rgba(250,187,91,0.18)" }}
                            >
                                <Ionicons name="time-outline" size={14} color={Colors.secondary} />
                                <CustomText color="secondary" size="small" boldness="semiBold" classes="ml-1.5" numberOfLines={1}>
                                    {durationLabel}
                                </CustomText>
                            </View>
                        )}
                    </View>
                )}
            </View>

            <View className="my-8">
                {serviceToRequest?.service_type?.includes &&
                serviceToRequest?.service_type?.includes?.length > 0 && (
                    <View>
                    <View className="flex-row items-center space-x-2 mb-1">
                        <CustomText color="secondary" boldness="semiBold">
                        {t("services.select_service_type.includes")}
                        </CustomText>
                    </View>

                        {serviceToRequest?.service_type?.includes?.map((item, index) => (
                            <View style={{ flexDirection: "row" }} key={index}>
                                <View
                                    style={{ flexDirection: "column", marginRight: 5 }}
                                >
                                    <View
                                        key={`includes-${index}`}
                                        className="w-[17px] h-[17px]"
                                    >
                                        <CircledCheckMarkFilled
                                            color="#FFFFFF"
                                            background="lime"
                                        />
                                   </View>
                                </View>
                                <View style={{ flexDirection: "column" }}>
                                <CustomText
                                    color="secondary"
                                    boldness="regular"
                                    size="medium"
                                >
                                    {item.charAt(0).toUpperCase() + item.slice(1)}
                                </CustomText>
                                </View>
                            </View>
                            )
                        )}
                    </View>
                )}

                {serviceToRequest?.service_type?.excludes && serviceToRequest?.service_type?.excludes?.length > 0 && (
                    <View>
                        <View className="flex-row items-center space-x-2 mt-10 mb-1">
                            <CustomText color="secondary" boldness="semiBold">
                            {t("services.select_service_type.excludes")}
                            </CustomText>
                        </View>

                {serviceToRequest?.service_type?.excludes?.map((item, index) => (
                    <View key={`excludes-${index}`}style={{ flexDirection: "row" }}>
                        <View style={{ flexDirection: "column", marginRight: 5 }}>
                            <View className="w-[17px] h-[17px]">
                                <CircledX color="red" />
                            </View>
                            </View>
                        <View style={{ flexDirection: "column" }}>
                            <CustomText color="secondary" boldness="regular" size="medium">
                                {item.charAt(0).toUpperCase() + item.slice(1)}
                            </CustomText>
                        </View>
                    </View>
                        )
                    )}
                    </View>
                )}
                 </View>
            </View>


        </ScrollView>
        

         {/* Banner de confiança + barra de ação (build 15) */}
         <View className="px-5 pt-1 bg-support_secondary">
            <View
                className="flex-row items-center rounded-2xl p-3"
                style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
            >
                <View
                    className="items-center justify-center rounded-full mr-3"
                    style={{ width: 44, height: 44, backgroundColor: Colors.support_secondary }}
                >
                    <Ionicons name="star" size={20} color={Colors.primary} />
                </View>
                <View className="flex-1">
                    <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                        {t("services.select_service_type.trust_title")}
                    </CustomText>
                    <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                        {t("services.select_service_type.trust_sub")}
                    </CustomText>
                </View>
            </View>
         </View>

         <View className="flex-row items-center px-5 py-4 bg-support_secondary" style={{ gap: 12 }}>
            {typeof fromPrice === "number" && fromPrice > 0 && (
                <View>
                    <CustomText color="gray_medium" size="small" boldness="regular">
                        {t("services.select_service_type.from_label")}
                    </CustomText>
                    <CustomText color="secondary" size="extraLarge" boldness="bolder" numberOfLines={1}>
                        {renderMoney(fromPrice)}
                    </CustomText>
                </View>
            )}

            {/* Adicionar ao cesto. Escondido com o cesto: sem isto o cliente
                juntava serviços a um cesto que já não conseguia abrir. */}
            {CART_ENABLED && serviceToRequest?.service_type?.id ? (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                        const st = serviceToRequest.service_type;
                        if (st) addItem(st);
                        router.navigate('/(app)/(tabs)/cart');
                    }}
                    className="items-center justify-center rounded-2xl"
                    style={{ width: 56, height: 56, borderWidth: 1.5, borderColor: Colors.primary }}
                >
                    <Ionicons
                        name={serviceToRequest.service_type?.id && hasItem(serviceToRequest.service_type.id) ? "cart" : "cart-outline"}
                        size={24}
                        color={Colors.secondary}
                    />
                </TouchableOpacity>
            ) : null}

            {/* Pedir já → escolha imediato/agendado */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={openModeChooser}
                className="flex-1 rounded-full items-center justify-center flex-row"
                style={{
                    height: 56,
                    backgroundColor: Colors.primary,
                    shadowColor: Colors.primary,
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 5 },
                    elevation: 6,
                }}
            >
                {/* "Pedir serviço" e não "Pedir já": este botão não pede nada de
                    imediato — abre a escolha entre imediato e agendado. O raio
                    reforçava a mesma promessa errada, e passou a seta, que é o
                    que de facto acontece (avança para o passo seguinte).
                    Enquanto havia o botão do cesto ao lado a contradição passava
                    despercebida; sendo agora a única ação do ecrã, não passa. */}
                <CustomText color="secondary" size="large" boldness="bold" classes="mr-1.5" numberOfLines={1}>
                    {t("services.select_service_type.request_service")}
                </CustomText>
                <Feather name="arrow-right" size={18} color={Colors.secondary} />
            </TouchableOpacity>
         </View>

    </SafeAreaView>

    )
}

export default ServiceTypeInformation;
