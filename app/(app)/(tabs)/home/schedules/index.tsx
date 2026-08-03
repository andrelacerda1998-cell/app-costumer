import React from "react";
import {useWindowDimensions, View} from "react-native";
import {router} from "expo-router";
import {CustomText} from "@/components/CustomText";
import TouchOpacity from "@/components/TouchOpacity";
import {Colors} from "@/constants/Colors";
import CalendarIcon from "@/assets/icons/calendar";
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

    return (
        <View className="px-5 pt-4">
            <TouchOpacity
                bgColor={"bg_schedule"}
                onPress={() => router.push(`/(app)/(pages)/(schedules)/${schedulesSection.today}`)}
                otherClasses={`border border-white border-solid rounded-2xl px-4 py-4 ${
                    stacked ? "" : "flex-row items-center"
                }`}
            >
                <View className={stacked ? "flex-row items-center" : "flex-row items-center flex-1"}>
                    <View className="w-12 h-12 rounded-xl items-center justify-center mr-3">
                        <CalendarIcon color={Colors.primary}/>
                    </View>

                    <View className="flex-1">
                        <CustomText color="secondary" boldness="semiBold" size="medium">
                            {t("schedules")}
                        </CustomText>
                        <CustomText color="gray_medium" boldness="medium" size="small">
                            {totalCount} {totalCount === 1 ? t("service_singular") : t("service_plural")}
                        </CustomText>
                    </View>
                </View>

                <View className={`flex-row items-center ${stacked ? "mt-3 justify-between" : ""}`}>
                    <View className="rounded-full px-3 py-1 mr-2" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                        <CustomText color="secondary" boldness="semiBold" size="small">
                            {t("today")}: {todayCount}
                        </CustomText>
                    </View>
                    <Feather name="chevron-right" size={20} color={Colors.gray_medium}/>
                </View>
            </TouchOpacity>
        </View>
    );
}

export default Schedules;
