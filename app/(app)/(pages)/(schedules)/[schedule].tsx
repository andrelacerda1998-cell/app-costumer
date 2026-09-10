import React, {useEffect, useState} from "react";
import {View, FlatList, SafeAreaView, Platform, TouchableOpacity, Linking} from "react-native";
import {router, useLocalSearchParams} from "expo-router";
import {AntDesign} from "@expo/vector-icons";
import {useTranslation} from "react-i18next";
import {Colors} from "@/constants/Colors";
import {Feather} from "@expo/vector-icons";
import {CustomText} from "@/components/CustomText";
import {useService} from "@/contexts/ServiceContext";
import {useSchedule} from "@/contexts/ScheduleContext";
import {useDialog} from "@/contexts/DialogContext";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import BackHeader from "@/components/app/BackHeader";
import CalendarIcon from "@/assets/icons/calendar";
import LocationIcon from "@/assets/icons/location";
import ProfileIcon from "@/assets/icons/person";
import {ScheduledService, ServiceStatus} from "@/types/services";
import TouchOpacity from "@/components/TouchOpacity";
import {renderMoney} from "@/utils/money";
import {formatScheduledTime} from "@/utils/schedule";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";
import XIcon from "@/assets/icons/x";
import CheckMark from "@/assets/icons/check-mark";


interface ServicesPageProps {
    /**
     * Dentro do separador "Serviços", que já traz cabeçalho e filtros próprios:
     * o ecrã entra só com a lista. Assim existe uma lista só, em vez de uma
     * cópia para a barra e outra para a navegação normal.
     */
    embedded?: boolean;
}

interface ServLabels {
    [key: string]: string
}


const Services: React.FC<ServicesPageProps> = ({ embedded = false }) => {
    const {schedule} = useLocalSearchParams();
    const {scheduledServices, setScheduledServices, setServiceToRequest, setSelectedProfessional, setScheduledService} = useService();
    const {setDataToMakeSchedule} = useSchedule();
    const {openDialog, closeDialog} = useDialog();
    const {api} = useApi();
    const {t} = useTranslation();
    const [cancelingId, setCancelingId] = useState<number | null>(null);


    const serviceLabels: ServLabels = {
        today: t("schedules_screen.today_title"),
        all: t("schedules_screen.all_title"),
    };


// const validateIfTomorrow = (dateStr: unknown): boolean => {
//   try {
//     if (typeof dateStr !== "string") return false;

//     // aceita YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ssZ
//     const normalized = dateStr.slice(0, 10);

//     if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;

//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     const tomorrowStr = tomorrow.toLocaleDateString("en-CA");

//     return normalized === tomorrowStr;
//   } catch {
//     return false;
//   }
// };


    const validateIfToday = (dateStr: unknown): boolean => {
        try {
            if (typeof dateStr !== "string") return false;
            const normalized = dateStr.slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
            const todayStr = new Date().toLocaleDateString("en-CA");
            return normalized === todayStr;
        } catch {
            return false;
        }
    };

    // Sem filtros: mostra sempre todos os agendamentos, do mais próximo para o mais distante
    const activeTab = "all";
    const isTodayView = false;

    const formatDateLabel = (dateStr?: string) => {
        if (!dateStr) return "";
        if (validateIfToday(dateStr)) return t("date_label.today");
        const date = new Date(`${dateStr}T00:00:00`);
        if (Number.isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("pt-PT", {day: "2-digit", month: "2-digit"});
    };

    const getPriceLabel = (item: ScheduledService) => {
        if (item?.price === null || item?.price === undefined) return null;
        // price vem em euros; renderMoney espera cêntimos.
        return renderMoney(item.price * 100) || null;
    };

    const getLocationLabel = (item: ScheduledService) => {
        const location =
            (item as any)?.address ??
            (item as any)?.location?.address ??
            (item as any)?.service?.address ??
            null;
        if (!location) return null;
        if (typeof location === "string") return location;
        const label = location?.name ?? location?.street_name ?? null;
        return label ? String(label) : null;
    };

    const filterData = (services: ScheduledService[]) => {
        if (!services || !Array.isArray(services)) {
            return [];
        }


        const sortByDateTimeAsc = (arr: ScheduledService[]) => {
            return arr.slice().sort((a, b) => {
                const aDateTime = new Date(`${a.scheduled_day}T${a.scheduled_time_start || "00:00"}`).getTime();
                const bDateTime = new Date(`${b.scheduled_day}T${b.scheduled_time_start || "00:00"}`).getTime();
                return aDateTime - bDateTime;
            });
        };

        return sortByDateTimeAsc(services);
    };

    /**
     * Confirmar e pagar uma ocorrência de uma série.
     *
     * Reaproveita o checkout de sempre em vez de um ecrã novo: o cliente já
     * conhece aquele ecrã, e o que falta aqui é exatamente o que ele faz —
     * escolher o método e pagar. Os contextos são preenchidos a partir da
     * marcação, que já traz serviço, técnico, dia e hora.
     */
    const confirmAndPay = (item: ScheduledService) => {
        const serviceTypeId = item?.service_type?.id;
        if (!serviceTypeId) return;

        setScheduledService(true);
        setServiceToRequest((prev: any) => ({
            ...prev,
            service_type: item.service_type,
            vendor: item.vendor ? { id: item.vendor.id, name: item.vendor.name } : prev?.vendor,
        }));
        if (item?.vendor?.id) {
            setSelectedProfessional({ id: item.vendor.id, name: item.vendor.name } as any);
        }
        setDataToMakeSchedule({
            vendor_id: item?.vendor?.id,
            scheduled_day: item.scheduled_day,
            service_type_id: serviceTypeId,
            scheduled_time_start: item.scheduled_time_start,
            scheduled_time_end: item.scheduled_time_end,
            // O servidor tem de confirmar ESTA marcação, não criar outra igual —
            // sem o id, o cliente ficava com duas no mesmo horário.
            schedule_id: item.id,
            ...(item.recurrence ? { recurrence: item.recurrence } : {}),
        } as any);

        router.push(`/(app)/(modals)/(services)/(request)/checkout/${serviceTypeId}`);
    };

    const handleCancelSchedule = async (item: ScheduledService) => {
        try {
            setCancelingId(item.id);
            await api.post(API_ROUTES.CUSTOMER_CANCEL_SCHEDULE(String(item.id)));
            setScheduledServices((prev) => (prev ? prev.filter((service) => service.id !== item.id) : prev));
            closeDialog();
            openDialog({
                icon: <CheckMark color={Colors.secondary}/>,
                title: t("schedules_screen.cancel_success.title"),
                subtitle: t("schedules_screen.cancel_success.subtitle"),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: true,
            });
        } catch (error) {
            closeDialog();
            openDialog({
                icon: <XIcon color={Colors.secondary}/>,
                title: t("errors.title"),
                subtitle: t("errors.occurred_an_error"),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: true,
            });
        } finally {
            setCancelingId(null);
        }
    };

    // Conteúdo do diálogo com estado local para o botão refletir o envio em curso.
    // (o customContent é um snapshot; sem estado próprio o botão não reagiria a cancelingId)
    const CancelDialogContent = ({item}: {item: ScheduledService}) => {
        const [submitting, setSubmitting] = useState(false);
        const serviceName = item?.service_type?.name || t("schedules_screen.service_fallback");
        const onConfirm = async () => {
            setSubmitting(true);
            try {
                await handleCancelSchedule(item);
            } finally {
                setSubmitting(false);
            }
        };
        return (
            <View
                className="rounded-2xl bg-support_secondary px-6 py-5"
                style={{width: "90%", maxWidth: 360}}
            >
                <CustomText color="secondary" boldness="semiBold" classes="text-center text-lg">
                    {t("services.cancel.title")}
                </CustomText>
                <View className="mt-3 space-y-3">
                    <CustomText color="secondary" size="small" classes="text-center">
                        {t("services.cancel.question", {service: serviceName})}
                    </CustomText>
                    <CustomText color="gray_medium" size="small" classes="text-center">
                        {t("services.cancel.notice_reserved")}
                    </CustomText>
                    <CustomText color="gray_medium" size="small" classes="text-center">
                        {t("services.cancel.notice_fees")}
                    </CustomText>
                </View>
                <View className="pt-10 flex flex-col justify-between gap-4">
                    <View>
                        <CustomTouchableOpacity
                            size="large"
                            type="danger"
                            text={
                                submitting
                                    ? t("services.cancel.loading")
                                    : t("services.cancel.title")
                            }
                            textColor="support_secondary"
                            textBoldness="semiBold"
                            onPress={onConfirm}
                            disabled={submitting}
                        />
                    </View>
                    <View>
                        <CustomTouchableOpacity
                            size="large"
                            type="primary"
                            text={t("services.cancel.back")}
                            textColor="secondary"
                            textBoldness="semiBold"
                            onPress={closeDialog}
                            disabled={submitting}
                        />
                    </View>
                </View>
            </View>
        );
    };

    const openCancelDialog = (item: ScheduledService) => {
        openDialog({
            customContent: <CancelDialogContent item={item}/>,
        });
    };

    // Ligar ao técnico: o contacto só chega da API quando o agendamento está
    // aceite/confirmado (ver ListSchedulesController). Era o buraco do incidente
    // 13/08 — o cliente não tinha forma de contactar quem o ia atender.
    //
    // SEM CHAMADOR NESTE MOMENTO. O botão saiu do cartão da lista a pedido, e o
    // ecrã de detalhe não tem nenhuma forma de ligar — ou seja, o incidente
    // 13/08 está reaberto até isto voltar a ter um sítio. Fica aqui de
    // propósito, e não apagado: a decisão pendente é ONDE o contacto vive, não
    // se deve existir. Se a resposta for "no detalhe", é mover esta função e o
    // botão para lá; se for "em lado nenhum", então apaga-se isto e as chaves
    // de tradução `call_technician` e `call_unavailable`.
    const handleCallTechnician = async (item: ScheduledService) => {
        const phone = item?.vendor?.phone;
        if (!phone) {
            openDialog({
                icon: <XIcon color={Colors.secondary}/>,
                title: t("schedules_screen.call_unavailable.title"),
                subtitle: t("schedules_screen.call_unavailable.subtitle"),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: true,
            });
            return;
        }
        const url = `tel:${String(phone).replace(/\s+/g, "")}`;
        try {
            await Linking.openURL(url);
        } catch {
            openDialog({
                icon: <XIcon color={Colors.secondary}/>,
                title: t("schedules_screen.call_unavailable.title"),
                subtitle: t("schedules_screen.call_unavailable.subtitle"),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: true,
            });
        }
    };


    const list = (

                <FlatList
                    data={(scheduledServices && filterData(scheduledServices)) || []}
                    keyExtractor={(item) => String(item.id)}
                    style={{flex: 1}}
                    contentContainerStyle={{paddingBottom: 24, flexGrow: 1}}
                    ListEmptyComponent={() => {
                        // Antes do primeiro fetch (feito no home) não há como distinguir
                        // "vazio" de "ainda a carregar" — não mostrar o card nesse caso.
                        if (scheduledServices === null) return null;
                        return (
                            <View className="flex-1 items-center justify-center px-4" style={{ paddingBottom: 64 }}>
                                <View
                                    className="items-center justify-center rounded-full mb-6"
                                    style={{ width: 120, height: 120, backgroundColor: "rgba(250,187,91,0.12)" }}
                                >
                                    <View
                                        className="items-center justify-center rounded-full"
                                        style={{ width: 84, height: 84, backgroundColor: "rgba(250,187,91,0.2)" }}
                                    >
                                        <AntDesign name="calendar" size={36} color={Colors.primary}/>
                                    </View>
                                </View>
                                <CustomText
                                    size="large"
                                    color="secondary"
                                    boldness="bold"
                                    classes="text-center mb-3"
                                >
                                    {isTodayView
                                        ? t("schedules_screen.empty_title_today")
                                        : t("schedules_screen.empty_title_all")}
                                </CustomText>
                                <CustomText
                                    size="small"
                                    color="gray_medium"
                                    boldness="medium"
                                    classes="text-center mb-8"
                                >
                                    {t("schedules_screen.empty_subtitle")}
                                </CustomText>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => router.navigate('/(app)/(tabs)/list')}
                                    style={{
                                        backgroundColor: Colors.primary,
                                        borderRadius: 999,
                                        paddingVertical: 16,
                                        paddingHorizontal: 28,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        shadowColor: Colors.primary,
                                        shadowOpacity: 0.45,
                                        shadowRadius: 14,
                                        shadowOffset: { width: 0, height: 6 },
                                        elevation: 8,
                                    }}
                                >
                                    <CustomText size="medium" color="secondary" boldness="bold" numberOfLines={1}>
                                        {t("schedules_screen.empty_cta")}
                                    </CustomText>
                                    <AntDesign name="arrowright" size={18} color={Colors.secondary} style={{ marginLeft: 8 }}/>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    renderItem={({item}) => {
                        const priceLabel = getPriceLabel(item);
                        const dateLabel = formatDateLabel(item?.scheduled_day);
                        const timeLabel = formatScheduledTime(item?.scheduled_time_start)
                            || t("schedules_screen.time_fallback");
                        const running = item.status === ServiceStatus.ACCEPTED || item.status === ServiceStatus.ARRIVED;
                        const recurrence = item.recurrence ?? null;
                        // DOIS "por confirmar" diferentes, e o cartão precisa dos dois:
                        //
                        // `isPending` — o PROFISSIONAL ainda não aceitou. Sem isto o
                        // pedido parecia marcado (incidente 13/08). Vem do estado que
                        // o /customer/schedule devolve ('pending' | 'accepted').
                        //
                        // `awaiting` — o CLIENTE ainda não pagou esta ocorrência de uma
                        // série. Sem a confirmação dele não há valor cativo, e o horário
                        // liberta-se 48h antes.
                        const isPending = item?.status === "pending";
                        const awaiting = !!item.awaiting_confirmation;
                        return (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => router.push(`/(app)/(pages)/(schedules)/detail/${item.id}`)}
                                className="mb-2.5 rounded-3xl bg-support_secondary p-3.5"
                                style={{
                                    borderWidth: awaiting ? 1.5 : 0,
                                    borderColor: "rgba(250,187,91,0.9)",
                                    shadowColor: "#000",
                                    shadowOpacity: 0.05,
                                    shadowRadius: 12,
                                    shadowOffset: { width: 0, height: 4 },
                                    elevation: 2,
                                }}
                            >
                                {/* Mesma linguagem do cesto e da escolha de técnico:
                                    imagem do serviço à esquerda, nome e preço na
                                    mesma linha. O cartão inteiro é tocável — o botão
                                    "Ver detalhes" era a única forma de lá chegar. */}
                                <View className="flex-row items-center">
                                    {/* Sem miniatura: os dados do agendamento não
                                        trazem imagem do tipo de serviço, e o
                                        quadrado cinzento com um calendário era um
                                        marcador de posição repetido em todos os
                                        cartões, a roubar largura ao nome. */}
                                    <View className="flex-1 mr-2">
                                        <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={2}>
                                            {item?.service_type?.name || t("schedules_screen.service_fallback")}
                                        </CustomText>
                                    </View>
                                    <View className="items-end">
                                        <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={1}>
                                            {priceLabel || t("schedules_screen.no_price_short")}
                                        </CustomText>
                                        {!!priceLabel && (
                                            <CustomText color="gray_strong" size="extraSmall" boldness="regular">
                                                {t("services.checkout.resume.vat_included")}
                                            </CustomText>
                                        )}
                                    </View>
                                </View>

                                {/* A repetição junto ao nome: quem tem uma série
                                    precisa de a distinguir das marcações soltas
                                    ao percorrer a lista. */}
                                {!!recurrence && (
                                    /* Etiqueta âmbar, como a do dia e hora: em
                                       cinzento pequeno ficava a parecer legenda
                                       e era o que distinguia uma série de uma
                                       marcação solta. */
                                    <View
                                        className="flex-row items-center rounded-full px-2.5 py-1 mt-2 self-start"
                                        style={{ backgroundColor: "rgba(250,187,91,0.22)" }}
                                    >
                                        <Feather name="repeat" size={12} color={Colors.secondary} />
                                        <CustomText color="secondary" size="extraSmall" boldness="bold" classes="ml-1.5" numberOfLines={1}>
                                            {t(`schedules_screen.recurrence_${recurrence}`)}
                                        </CustomText>
                                    </View>
                                )}

                                <View className="h-[1px] bg-support_primary my-2.5" />

                                {/* COLUNA, não linha.
                                    Isto era um `flex-row items-center justify-between` com
                                    QUATRO blocos lá dentro: dia/hora, estado, técnico+cancelar
                                    e o botão de ligar. Cada um deles tinha sido escrito para
                                    ocupar a sua própria linha — nota-se pelos `mt-3`/`mt-2`,
                                    que num flex-row não fazem nada. Espremidos lado a lado,
                                    o nome do técnico ficava cortado a meio ("Com: Test Vend…")
                                    e os dois botões saíam do cartão: o "Cancelar" e o "Ligar
                                    ao técnico" existiam no código e NUNCA se viam no ecrã. */}
                                <View>
                                    {/* Dia/hora e estado partilham a primeira linha: são os
                                        dois dados que se leem de relance ao percorrer a lista.
                                        `flex-shrink` no primeiro para o estado nunca ser
                                        empurrado para fora quando o rótulo é comprido
                                        ("Aguarda confirmação"). */}
                                    <View className="flex-row items-center justify-between">
                                    <View
                                        className="flex-row items-center rounded-full px-3 py-1.5 flex-shrink"
                                        style={{ backgroundColor: "rgba(250,187,91,0.22)" }}
                                    >
                                        <Feather name="clock" size={13} color={Colors.secondary} />
                                        <CustomText color="secondary" size="small" boldness="bold" classes="ml-2" numberOfLines={1}>
                                            {t("schedules_screen.time_label", { date: dateLabel, time: timeLabel })}
                                        </CustomText>
                                    </View>

                                    {/* Estado do agendamento: pendente (âmbar) vs confirmado (verde).
                                        É o que faltava — sem isto um pedido por confirmar parecia
                                        marcado (incidente 13/08). */}
                                    <View className="flex-row items-center ml-2">
                                        {isPending ? (
                                            <View className="flex-row items-center px-3 py-1 rounded-full bg-[#FEECC8]">
                                                {/* secondary sobre âmbar = 10,1:1; branco daria 1,7:1 (ilegível). */}
                                                <CustomText color="secondary" size="small" boldness="medium">
                                                    {t("schedules_screen.status_pending")}
                                                </CustomText>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center px-3 py-1 rounded-full" style={{backgroundColor: `${Colors.success}26`}}>
                                                <View className="h-3.5 w-3.5 mr-1" style={{marginTop: 1}}>
                                                    <CheckMark color={Colors.success}/>
                                                </View>
                                                <CustomText color="success" size="small" boldness="medium">
                                                    {t("schedules_screen.status_confirmed")}
                                                </CustomText>
                                            </View>
                                        )}
                                        {/* "Em execução" à frente do estado: quando o técnico
                                            já está a trabalhar, é isso que o cliente quer ver,
                                            e não que o agendamento foi confirmado há três dias. */}
                                        {running && !awaiting && (
                                            <View className="px-2.5 py-1 rounded-full bg-primary ml-2">
                                                <CustomText color="secondary" size="extraSmall" boldness="bold" numberOfLines={1}>
                                                    {t("schedules_screen.in_progress")}
                                                </CustomText>
                                            </View>
                                        )}
                                    </View>
                                    </View>

                                    {/* Segunda linha: quem vem, e a saída. O nome do técnico
                                        num `flex-1` com `numberOfLines` — a truncar com
                                        reticências dentro do cartão, em vez de desaparecer
                                        por baixo da margem. */}
                                    <View className="mt-2.5 flex-row items-center justify-between">
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <View className="h-4 w-4" style={{marginTop: 1}}>
                                                <ProfileIcon size={16}/>
                                            </View>
                                            <CustomText color="secondary" size="small" classes="ml-2 flex-1" numberOfLines={1}>
                                                {t("schedules_screen.with")}: {item?.vendor?.name || t("schedules_screen.professional_fallback")}
                                            </CustomText>
                                        </View>

                                        {/* "Ver detalhes" e nao "Cancelar".
                                            O cartao inteiro ja abre o detalhe — isto torna
                                            isso visivel, em vez de o deixar por adivinhar.
                                            E cancelar deixa de estar a um toque de distancia
                                            numa lista que se percorre depressa: continua a
                                            existir, no detalhe, depois de se ver o que se
                                            esta a cancelar. */}
                                        <TouchOpacity
                                            rounded="full"
                                            border
                                            borderColor="gray_medium"
                                            otherClasses="px-3 py-1"
                                            onPress={() => router.push(`/(app)/(pages)/(schedules)/detail/${item.id}`)}
                                        >
                                            <CustomText color="secondary" size="small">
                                                {t("schedules_screen.view_details")}
                                            </CustomText>
                                        </TouchOpacity>
                                    </View>

                                </View>

                                {/* Uma etiqueta não é uma ação. Esta ocorrência
                                    precisa de um pagamento para existir, por isso
                                    o cartão traz o botão que o faz — com o valor
                                    à vista, como no checkout. */}
                                {awaiting && (
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() => confirmAndPay(item)}
                                        className="rounded-full flex-row items-center justify-center mt-2.5"
                                        style={{
                                            backgroundColor: Colors.primary,
                                            paddingVertical: 11,
                                            shadowColor: Colors.primary,
                                            shadowOpacity: 0.4,
                                            shadowRadius: 10,
                                            shadowOffset: { width: 0, height: 4 },
                                            elevation: 4,
                                        }}
                                    >
                                        <Feather name="lock" size={15} color={Colors.secondary} />
                                        <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1} classes="ml-2">
                                            {priceLabel
                                                ? t("schedules_screen.confirm_and_pay_with_price", { price: priceLabel })
                                                : t("schedules_screen.confirm_and_pay")}
                                        </CustomText>
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
    );

    if (embedded) return <View className="flex-1 px-5">{list}</View>;

    return (
        <SafeAreaView className={`flex-1 bg-primary ${Platform.OS === "ios" ? "pt-2" : ""}`}>
            {/* "Agendamentos" e não "Todos os serviços": o conteúdo deste ecrã são
                agendamentos, e o vazio já dizia "Ainda não tens agendamentos" —
                título e conteúdo falavam de coisas diferentes. */}
            <View className="px-5 pt-3 pb-2">
                <BackHeader
                    backButtonColor="secondary"
                    middleItem={() => (
                        <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                            {t("schedules_screen.header")}
                        </CustomText>
                    )}
                />
            </View>

            <View className="flex-1 rounded-t-3xl px-5 pt-5" style={{ backgroundColor: "#FAF7F2" }}>
                {list}
            </View>
        </SafeAreaView>
    );
};

export default Services;
