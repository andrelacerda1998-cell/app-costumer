import React, {useEffect, useState} from "react";
import {View, FlatList, SafeAreaView, Platform} from "react-native";
import {router, useLocalSearchParams} from "expo-router";
import {AntDesign} from "@expo/vector-icons";
import {useTranslation} from "react-i18next";
import {Colors} from "@/constants/Colors";
import {CustomText} from "@/components/CustomText";
import {useService} from "@/contexts/ServiceContext";
import {useDialog} from "@/contexts/DialogContext";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import BackHeader from "@/components/app/BackHeader";
import CalendarIcon from "@/assets/icons/calendar";
import LocationIcon from "@/assets/icons/location";
import ProfileIcon from "@/assets/icons/person";
import {ScheduledService, ServiceStatus} from "@/types/services";
import TouchOpacity from "@/components/TouchOpacity";
import {renderMoney} from "@/utils/money";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";
import XIcon from "@/assets/icons/x";
import CheckMark from "@/assets/icons/check-mark";


interface ServicesPageProps {
}

interface ServLabels {
    [key: string]: string
}


const Services: React.FC<ServicesPageProps> = () => {
    const {schedule} = useLocalSearchParams();
    const {scheduledServices, setScheduledServices} = useService();
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

    const getScheduleKey = () => (typeof schedule === "string" ? schedule : "all");
    const [activeTab, setActiveTab] = useState(getScheduleKey());

    useEffect(() => {
        setActiveTab(getScheduleKey());
    }, [schedule]);

    const isTodayView = activeTab === "today";

    const formatDateLabel = (dateStr?: string) => {
        if (!dateStr) return "";
        if (validateIfToday(dateStr)) return t("date_label.today");
        const date = new Date(`${dateStr}T00:00:00`);
        if (Number.isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("pt-PT", {day: "2-digit", month: "2-digit"});
    };

    const getPriceLabel = (item: ScheduledService) => {

        return item?.price+"€";
    };

    const getLocationLabel = (item: ScheduledService) => {
        const location =
            (item as any)?.address ??
            (item as any)?.location?.address ??
            (item as any)?.service?.address ??
            null;
        return location ? String(location) : null;
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

        switch (activeTab) {
            case "all":
                return sortByDateTimeAsc(services);

            case "today":
                const filteredToday = services.filter(item => validateIfToday(item.scheduled_day));
                return sortByDateTimeAsc(filteredToday);

            // case "tomorrow":
            //   const filteredTomorrow = services.filter(item => validateIfTomorrow(item.scheduled_day));
            //   return sortByDateTimeAsc(filteredTomorrow);

            default:
                return sortByDateTimeAsc(services);
        }
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

    const openCancelDialog = (item: ScheduledService) => {
        const serviceName = item?.service_type?.name || t("schedules_screen.service_fallback");
        openDialog({
            customContent: (
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
                                    cancelingId === item.id
                                        ? t("services.cancel.loading")
                                        : t("services.cancel.title")
                                }
                                textColor="support_secondary"
                                textBoldness="semiBold"
                                onPress={() => handleCancelSchedule(item)}
                                disabled={cancelingId === item.id}
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
                            />
                        </View>
                    </View>
                </View>
            ),
        });
    };


    return (
        <SafeAreaView className={`flex-1 bg-primary ${Platform.OS === "ios" ? "pt-2" : ""}`}>
            <View className="px-5 pt-3 pb-2">
                <BackHeader
                    backButtonColor="secondary"
                    middleItem={() => (
                        <View className="flex-row items-center gap-8">
                            <TouchOpacity
                                onPress={() => setActiveTab("today")}
                                otherClasses="items-center"
                            >
                                <CustomText color="secondary" boldness={isTodayView ? "bold" : "semiBold"}>
                                    {t("scheduleType.today")}
                                </CustomText>
                                {isTodayView && <View className="mt-1 h-1 w-8 rounded-full bg-support_secondary"/>}
                            </TouchOpacity>
                            <TouchOpacity
                                onPress={() => setActiveTab("all")}
                                otherClasses="items-center"
                            >
                                <CustomText color="secondary" boldness={!isTodayView ? "bold" : "semiBold"}>
                                    {t("scheduleType.all")}
                                </CustomText>
                                {!isTodayView && <View className="mt-1 h-1 w-8 rounded-full bg-support_secondary"/>}
                            </TouchOpacity>
                        </View>
                    )}
                />
            </View>

            <View className="flex-1 bg-support_secondary rounded-t-3xl px-5 pt-5">
                <View className="flex-row items-center justify-between mb-5">
                    <CustomText color="secondary" boldness="semiBold" classes="text-xl">
                        {serviceLabels[activeTab]}
                    </CustomText>
                    <View className="h-8 w-8"/>
                </View>

                <FlatList
                    data={(scheduledServices && filterData(scheduledServices)) || []}
                    keyExtractor={(item) => String(item.id)}
                    style={{flex: 1}}
                    contentContainerStyle={{paddingBottom: 24}}
                    ListEmptyComponent={() => {
                        // Antes do primeiro fetch (feito no home) não há como distinguir
                        // "vazio" de "ainda a carregar" — não mostrar o card nesse caso.
                        if (scheduledServices === null) return null;
                        return (
                            <View className="items-center px-4 pt-10">
                                <View
                                    className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
                                    style={{backgroundColor: `${Colors.primary}26`}}
                                >
                                    <AntDesign name="calendar" size={32} color={Colors.primary}/>
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
                                <CustomTouchableOpacity
                                    size="large"
                                    type="primary"
                                    textColor="secondary"
                                    textBoldness="semiBold"
                                    onPress={() => router.navigate('/(app)/(tabs)/list')}
                                >
                                    <CustomText size="small" color="secondary" boldness="bold">
                                        {t("schedules_screen.empty_cta")}
                                    </CustomText>
                                    <AntDesign name="arrowright" size={18} color={Colors.secondary}/>
                                </CustomTouchableOpacity>
                            </View>
                        );
                    }}
                    renderItem={({item}) => {
                        const priceLabel = getPriceLabel(item);
                        const locationLabel = getLocationLabel(item);
                        const dateLabel = formatDateLabel(item?.scheduled_day);
                        return (
                            <View className="mb-4">
                                <View className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-1 pr-3">
                                            <CustomText color="secondary" boldness="semiBold" classes="text-base">
                                                {item?.service_type?.name || t("schedules_screen.service_fallback")}
                                            </CustomText>
                                            {locationLabel && (
                                                <View className="flex-row items-center mt-2">
                                                    <View className="h-4 w-4" style={{marginTop: 1}}>
                                                        <LocationIcon color={Colors.primary}/>
                                                    </View>
                                                    <CustomText color="gray_medium" size="small" classes="ml-2">
                                                        {locationLabel}
                                                    </CustomText>
                                                </View>
                                            )}
                                        </View>

                                        <CustomText color="secondary" boldness="bold" classes="text-base">
                                            {priceLabel || t("schedules_screen.no_price_short")}
                                        </CustomText>
                                    </View>

                                    <View className="mt-3 flex-row items-center">
                                        <View className="h-4 w-4" style={{marginTop: 1}}>
                                            <CalendarIcon color={Colors.primary}/>
                                        </View>
                                        <CustomText color="secondary" size="small" classes="ml-2">
                                            {t("schedules_screen.time_label", {
                                                date: dateLabel,
                                                time: item?.scheduled_time_start || t("schedules_screen.time_fallback"),
                                            })}
                                        </CustomText>
                                    </View>

                                    <View className="mt-2 flex-row items-center justify-between">
                                        <View className="flex-row items-center">
                                            <View className="h-4 w-4" style={{marginTop: 1}}>
                                                <ProfileIcon size={16}/>
                                            </View>
                                            <CustomText color="secondary" size="small" classes="ml-2">
                                                {t("schedules_screen.with")}: {item?.vendor?.name || t("schedules_screen.professional_fallback")}
                                            </CustomText>
                                        </View>

                                        {item.status !== ServiceStatus.ACCEPTED && item.status !== ServiceStatus.ARRIVED ? (
                                            <TouchOpacity
                                                rounded="full"
                                                border
                                                borderColor="no_error_red"
                                                otherClasses="px-3 py-1"
                                                onPress={() => openCancelDialog(item)}
                                            >
                                                <CustomText color="no_error_red" size="small">
                                                    {t("services.cancel.title")}
                                                </CustomText>
                                            </TouchOpacity>
                                        ) : (
                                            <View className="px-3 py-1 rounded-full bg-primary">
                                                <CustomText color="support_secondary" size="small">
                                                    {t("schedules_screen.in_progress")}
                                                </CustomText>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            </View>
        </SafeAreaView>
    );
};

export default Services;
