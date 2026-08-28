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
import { CART_ENABLED, MATCHING_ENABLED } from "@/constants/Features"

/** Verde da poupança sobre o âmbar do botão. Ver o comentário no uso: é o
 *  verde mais claro que passa contraste (5,28:1) sobre #FABB5B. */
const SAVE_ON_AMBER = "#03543A"
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
    const { serviceToRequest, setServiceToRequest, setScheduledService, scheduledService, serviceQuantity, setServiceQuantity } = useService();
    const { addItem, hasItem } = useCart();
    const { setDataToMakeSchedule } = useSchedule();
    const { userData, session } = useSession();
    const { guestSession } = useGuestSession();
    const { api } = useApi();
    const addressLabel = useAddressLabel();
    const { openDialog, closeDialog } = useDialog();
    // Abrir um pedido em seleção cria o serviço no servidor e dispara os
    // convites — um duplo-toque abriria dois. O botão trava enquanto corre.
    const [startingMatching, setStartingMatching] = useState(false);

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
            ? { service_type: stId, quantity: serviceQuantity }
            : {
                service_type_id: stId,
                quantity: serviceQuantity,
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
    }, [serviceToRequest?.service_type?.id, serviceQuantity]);

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

    /**
     * A escolha entre imediato e agendado nao era registada no fluxo direto —
     * so no cesto (cart_proceed_pressed). Sem isto nao ha forma de saber a
     * divisao atual nem se as alteracoes de desenho a moveram, e otimiza-se as
     * cegas. O evento dispara na ESCOLHA, antes das validacoes de morada e
     * zona: o que se quer medir e o que o cliente quis, e quem foi bloqueado
     * por zona ja tem o seu proprio evento (blocked_by_zone_viewed).
     */
    const trackModeSelected = (mode: "immediate" | "scheduled") => {
        track("service_mode_selected", {
            mode,
            source: "service_detail",
            service_name: serviceToRequest?.service_type?.name,
            service_type_id: serviceToRequest?.service_type?.id,
            from_price_cents: typeof fromPrice === "number" ? fromPrice : null,
        });
    };

    const scheduleService = () => {
        if (!serviceToRequest?.service_type?.id) return;
        trackModeSelected("scheduled");
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

    /**
     * Abre um pedido em seleção e leva ao ecrã onde as respostas vão chegando.
     *
     * Ao contrário do fluxo antigo, aqui o serviço é criado JÁ no servidor —
     * sem técnico e sem cobrança — e os convites saem de imediato. É por isso
     * que a partir daqui o `[serviceId]` das rotas passa a ser o id real do
     * serviço, e não o id do tipo de serviço como no fluxo antigo.
     */
    const startMatching = async () => {
        if (!serviceToRequest?.service_type?.id) return;

        try {
            setStartingMatching(true);

            const { data } = await api.post(API_ROUTES.MATCHING_START, {
                service_type: serviceToRequest.service_type.id,
                quantity: serviceQuantity,
                scheduled: false,
            });

            const serviceId = data?.data?.service?.id;

            if (!serviceId) throw new Error('missing service id');

            router.navigate(`/(app)/(modals)/(services)/(request)/matching/${serviceId}`);
        } catch {
            // Sem pedido aberto não há nada a limpar do lado do servidor: ou foi
            // criado e temos id, ou não foi. Volta-se ao fluxo antigo em vez de
            // deixar o cliente num beco — pedir o serviço é o que importa.
            goToSelectVendors();
        } finally {
            setStartingMatching(false);
        }
    };

    const requestUrgentService = () => {
        if (!serviceToRequest?.service_type?.id) return;
        trackModeSelected("immediate");
        setScheduledService(false);
        setDataToMakeSchedule(null);

        if (!MATCHING_ENABLED) {
            goToSelectVendors();
            return;
        }

        // As mesmas guardas do fluxo antigo, antes de criar seja o que for no
        // servidor: um pedido sem morada é um pedido que ninguém pode servir.
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

        startMatching();
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

         {/* O Agendar é o que o negócio quer que os clientes escolham, por
             isso leva os três fatores que pesam numa escolha entre duas opções:
             é o PRIMEIRO (ordem de leitura em PT), é o mais LARGO (1,35 contra
             1) e é o único a âmbar. Só a cor movia pouco.
             O Imediato continua sólido e a seguir, não escondido: quem tem uma
             urgência encontra-o à primeira.

             O âmbar (primário da app) está no AGENDAR e não no Imediato.
             Estava ao contrário: o desenho empurrava para a opção que custa 33%
             mais ao cliente, mesmo ao lado de um selo verde a dizer que a outra
             é mais barata — o ecrã dizia uma coisa e o selo dizia outra.
             O Imediato fica escuro e não fraco: quem tem uma fuga de água não
             pode ter de procurar o botão de que precisa.
             NOTA DE NEGÓCIO: isto passa a empurrar o agendado, que rende menos
             por serviço (−25%) mas dá melhor ocupação. Se a intenção for a
             oposta, trocam-se os dois estilos e fica como estava.

             Imediato / Agendar diretamente na barra, sem modal pelo meio.
             O modal fazia sentido quando havia três coisas no rodapé (preço,
             cesto, pedir) e não cabiam duas ações. Com o cesto oculto sobra
             espaço, e um toque a menos numa escolha de duas opções não se
             justifica esconder atrás de um ecrã. */}
         <View className="px-5 pt-3 pb-4 bg-support_secondary">
            {/* Unidades. Fica ANTES do preco e dos botoes de propósito: e a
                ultima coisa que altera o valor, e ve-la depois do preco daria a
                sensacao de que o numero em baixo ja nao servia.
                O "-" desativa-se em 1 em vez de desaparecer: um botao que some
                muda o sitio do outro debaixo do dedo. */}
            <View className="flex-row items-center justify-between mb-3">
                <View>
                    <CustomText color="secondary" size="small" boldness="bold">
                        {t("services.select_service_type.quantity_label")}
                    </CustomText>
                    <CustomText color="gray_medium" size="extraSmall" boldness="regular" numberOfLines={2}>
                        {t("services.select_service_type.quantity_hint")}
                    </CustomText>
                </View>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("services.select_service_type.quantity_less")}
                        disabled={serviceQuantity <= 1}
                        onPress={() => setServiceQuantity((n) => Math.max(1, n - 1))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                            width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
                            borderWidth: 1, borderColor: Colors.support_primary,
                            opacity: serviceQuantity <= 1 ? 0.4 : 1,
                        }}
                    >
                        <Feather name="minus" size={16} color={Colors.secondary} />
                    </TouchableOpacity>
                    <CustomText color="secondary" size="large" boldness="bolder" classes="mx-4" numberOfLines={1}>
                        {String(serviceQuantity)}
                    </CustomText>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("services.select_service_type.quantity_more")}
                        disabled={serviceQuantity >= 10}
                        onPress={() => setServiceQuantity((n) => Math.min(10, n + 1))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{
                            width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
                            backgroundColor: Colors.primary,
                            opacity: serviceQuantity >= 10 ? 0.4 : 1,
                        }}
                    >
                        <Feather name="plus" size={16} color={Colors.secondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {typeof fromPrice === "number" && fromPrice > 0 && (
                <View className="flex-row items-baseline mb-3">
                    <CustomText color="gray_medium" size="small" boldness="regular" classes="mr-1.5">
                        {t("services.select_service_type.from_label")}
                    </CustomText>
                    <CustomText color="secondary" size="extraLarge" boldness="bolder" numberOfLines={1}>
                        {renderMoney(fromPrice)}
                    </CustomText>
                </View>
            )}

            <View className="flex-row" style={{ gap: 12 }}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    onPress={scheduleService}
                    className="rounded-2xl items-center justify-center py-3.5"
                    style={{
                        flex: 1.35,
                        backgroundColor: Colors.primary,
                        shadowColor: Colors.primary,
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 5 },
                        elevation: 6,
                    }}
                >
                    <View className="flex-row items-center">
                        <Ionicons name="calendar" size={17} color={Colors.secondary} />
                        <CustomText color="secondary" size="large" boldness="bold" classes="ml-1.5" numberOfLines={1}>
                            {t("services.select_service_type.scheduled")}
                        </CustomText>
                    </View>
                    {/* A poupanca vive AQUI, e so aqui. Esteve tambem na linha do
                        preco, em verde vivo sobre branco, mas com "Poupa 25%" nos
                        dois sitios era o mesmo numero duas vezes a dois
                        centimetros de distancia.
                        Como sobre o ambar nenhum verde consegue ser vivo (o
                        #03543A, 5,28:1, e o mais claro que ainda se le), o
                        destaque vem do corpo e do peso: `small` -> `medium`, que
                        e o mesmo tamanho do "Agendar" por cima. */}
                    <CustomText size="medium" boldness="bold" color="secondary" numberOfLines={1} classes="mt-0.5" style={{ color: SAVE_ON_AMBER }}>
                        {t("services.select_service_type.spare25")}
                    </CustomText>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    onPress={requestUrgentService}
                    className="flex-1 rounded-2xl items-center justify-center py-3.5"
                    style={{ backgroundColor: Colors.secondary }}
                >
                    <View className="flex-row items-center">
                        <Ionicons name="flash" size={18} color={Colors.support_secondary} />
                        <CustomText color="support_secondary" size="large" boldness="bold" classes="ml-1.5" numberOfLines={1}>
                            {t("services.select_service_type.immediate")}
                        </CustomText>
                    </View>
                    <CustomText color="gray_light" size="extraSmall" boldness="semiBold" numberOfLines={1}>
                        {t("services.select_service_type.availableTech")}
                    </CustomText>
                </TouchableOpacity>

            </View>
         </View>

    </SafeAreaView>

    )
}

export default ServiceTypeInformation;
