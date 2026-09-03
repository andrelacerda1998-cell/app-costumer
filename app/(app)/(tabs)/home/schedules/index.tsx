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

export const schedulesSection = {
    all: "all",
    today: "today",
}

const Schedules = () => {
    const {t} = useTranslation();
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
                </View>

                <View className="absolute right-4 top-0 bottom-0 justify-center">
                    <Feather name="chevron-right" size={20} color={Colors.gray_medium}/>
                </View>
            </TouchOpacity>
        </View>
    );
}

export default Schedules;
