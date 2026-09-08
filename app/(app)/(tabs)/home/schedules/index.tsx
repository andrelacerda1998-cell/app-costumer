import React from "react";
import {useWindowDimensions, View} from "react-native";
import {router} from "expo-router";
import {CustomText} from "@/components/CustomText";
import TouchOpacity from "@/components/TouchOpacity";
import {Colors} from "@/constants/Colors";
import {Feather} from "@expo/vector-icons";
import {useTranslation} from "react-i18next";
import {ScheduledService} from "@/types/services";
import {useService} from "@/contexts/ServiceContext";
import {formatScheduledTime} from "@/utils/schedule";

export const schedulesSection = {
    all: "all",
    today: "today",
}

const Schedules = () => {
    const {t, i18n} = useTranslation();
    const {scheduledServices} = useService();
    // Com o texto do sistema aumentado, a coluna de texto e o badge "Hoje: N"
    // competiam pela largura e o título colapsava numa letra por linha, empurrando
    // a grelha de categorias para fora do ecrã (auditoria 2026-08-03). Acima de
    // 1,3× o cartão passa a empilhar em coluna.
    const {fontScale} = useWindowDimensions();
    const stacked = fontScale > 1.3;

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

    const getTotalCount = () => {
        if (scheduledServices && Array.isArray(scheduledServices)) {
            return scheduledServices.length;
        }
        return 0;
    };

    const getTodayCount = () => {
        if (scheduledServices && Array.isArray(scheduledServices)) {
            const filtered = scheduledServices.filter((item: ScheduledService) =>
                validateIfToday(item.scheduled_day)
            );
            return filtered.length;
        }
        return 0;
    };

    const totalCount = getTotalCount();
    const todayCount = getTodayCount();

    /**
     * O próximo agendamento e quantos esperam pagamento.
     *
     * O cartão dizia só "3 serviços agendados" — um número sem nada que se lhe
     * diga. O que faz falta antes de tocar é QUANDO é o próximo e se falta
     * pagar alguma ocorrência de uma série: essa cai se ninguém lhe tocar.
     */
    const list: ScheduledService[] = Array.isArray(scheduledServices) ? scheduledServices : [];

    const next = React.useMemo(() => {
        const startOf = (item: ScheduledService) =>
            new Date(`${String(item.scheduled_day).slice(0, 10)}T${item.scheduled_time_start || "00:00"}`).getTime();

        return list
            .filter((item) => Number.isFinite(startOf(item)))
            .sort((a, b) => startOf(a) - startOf(b))[0] ?? null;
    }, [list]);

    const awaitingCount = list.filter((item) => item.awaiting_confirmation).length;

    /**
     * "Hoje · 14:30" ou "Seg., 7 set · 14:30".
     *
     * O dia por extenso ("Segunda-feira, 7 de setembro") não cabia na linha e
     * era cortado justamente antes da hora — o dado que interessa.
     */
    const nextLabel = React.useMemo(() => {
        if (!next?.scheduled_day) return null;

        const time = formatScheduledTime(next.scheduled_time_start);
        const locale = i18n.language === "pt_PT" ? "pt-PT" : "en-US";
        const date = new Date(`${String(next.scheduled_day).slice(0, 10)}T00:00:00`);
        if (Number.isNaN(date.getTime())) return null;

        const day = validateIfToday(next.scheduled_day)
            ? t("date_label.today")
            : `${date.toLocaleDateString(locale, { weekday: "short" }).replace(".", "")}, ` +
              `${date.getDate()} ${date.toLocaleDateString(locale, { month: "short" }).replace(".", "")}`;

        return [day, time].filter(Boolean).join(" · ");
    }, [next, i18n.language, t]);

    // Sem agendamentos não há nada para mostrar nem para onde ir: o cartão ocupava
    // a posição mais valiosa da Home (logo abaixo da pesquisa) a anunciar "0 serviços"
    // e empurrava as categorias — o único caminho de reserva — para baixo da dobra.
    // Volta a aparecer assim que existir um agendamento.
    if (totalCount === 0) return null;

    return (
        <View className="px-5 pt-4 pb-2">
            <TouchOpacity
                onPress={() => router.push(`/(app)/(pages)/(schedules)/${schedulesSection.today}`)}
                otherClasses="rounded-2xl px-4 py-4"
                style={{
                    backgroundColor: Colors.support_secondary,
                    borderWidth: 1,
                    borderColor: "rgba(250,187,91,0.45)",
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                }}
            >
                {/* Ícone e ações fora do fluxo, como no cartão do serviço a
                    decorrer: assim o texto centra-se no cartão inteiro e não no
                    espaço que sobra entre os dois. */}
                <View className="absolute left-4 top-0 bottom-0 justify-center">
                    <View
                        className="w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: Colors.secondary }}
                    >
                        <Feather name="calendar" size={22} color={Colors.primary}/>
                    </View>
                </View>

                {/* Uma linha só: quando há algo hoje, é isso que interessa
                    dizer; caso contrário, o total. O rótulo "2 Hoje" e a frase
                    de ajuda diziam o mesmo por outras palavras. */}
                <View className={stacked ? "" : "items-center px-14"}>
                    <CustomText color="secondary" boldness="bold" size="medium" numberOfLines={2} classes="text-center">
                        {todayCount > 0
                            ? t("schedules_line_today", {
                                count: todayCount,
                                label: todayCount === 1 ? t("schedule_singular") : t("schedule_plural"),
                            })
                            : t("schedules_line_all", {
                                count: totalCount,
                                label: totalCount === 1 ? t("schedule_singular") : t("schedule_plural"),
                            })}
                    </CustomText>

                    {/* Quando é o próximo: é a pergunta que se faz a seguir ao
                        número, e evita abrir a lista só para a responder. */}
                    {!!nextLabel && (
                        <CustomText color="gray_strong" size="small" boldness="regular" numberOfLines={1} classes="text-center mt-0.5">
                            {t("schedules_next_line", { when: nextLabel })}
                        </CustomText>
                    )}

                    {/* Uma ocorrência por pagar cai se ninguém lhe tocar — não
                        pode ficar escondida atrás de um número. */}
                    {awaitingCount > 0 && (
                        <View
                            className="flex-row items-center rounded-full px-3 py-1 mt-2"
                            style={{ backgroundColor: Colors.primary }}
                        >
                            <Feather name="lock" size={12} color={Colors.secondary} />
                            <CustomText color="secondary" size="extraSmall" boldness="bold" numberOfLines={1} classes="ml-1.5">
                                {t("schedules_awaiting_payment", { count: awaitingCount })}
                            </CustomText>
                        </View>
                    )}
                </View>

                <View className="absolute right-4 top-0 bottom-0 justify-center">
                    <Feather name="chevron-right" size={20} color={Colors.gray_medium}/>
                </View>
            </TouchOpacity>
        </View>
    );
}

export default Schedules;
