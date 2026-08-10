import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {ScrollView, Text, View, TouchableHighlight, Image, Dimensions} from "react-native";
import { Colors } from "@/constants/Colors";
import { router } from "expo-router";
import { useSession } from "@/contexts/SessionContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useAddressLabel } from "@/hooks/useAddressLabel";
import BackHeader from "@/components/app/BackHeader";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useService } from "@/contexts/ServiceContext";
import { useApi } from "@/contexts/ApiContext";
import FilterButton from "@/components/FilterButton";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import UserAvatarIcon from "@/assets/icons/user-avatar";
import { API_ROUTES } from '@/constants/ApiRoutes';
import { useTranslation } from "react-i18next";
import {useDialog} from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import {useSchedule} from "@/contexts/ScheduleContext";
import { AvailableSlot } from "@/types/schedule/vendors";

interface TimeSlotInfo{
  available: boolean;
  time: string;
  time_end: string;
}

const { height } = Dimensions.get("window");

// Chave de dia por componentes LOCAIS ("YYYY-MM-DD"). Usar toISOString() aqui
// converteria para UTC e, no verão PT (UTC+1) sobre uma data à meia-noite local,
// recuaria 1 dia — desalinhando o strip, o filtro de slots e o payload.
const getLocalDayKey = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ScheduleService = () => {
  const { selectedProfessional, setServiceToRequest, serviceToRequest, saveService, setScheduledService } = useService(); // saveService
  const { api } = useApi();
  const { userData, session } = useSession();
  const { guestSession } = useGuestSession();
  const addressLabel = useAddressLabel();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "pt_PT" ? "pt-PT" : "en-US";
  const { setDataToMakeSchedule } = useSchedule();
  const getTomorrowStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  };

  const [selectedDate, setSelectedDate] = useState(getTomorrowStart());
  const [dates, setDates] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<boolean>(false);

  const [leftSideSlots, setLeftSideSlots] = useState<TimeSlotInfo[]>([]); //any
  const [rightSideSlots, setRightSideSlots] = useState<TimeSlotInfo[]>([]);//any
  const [dayTimeSlots, setDayTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTimeEnd, setSelectedTimeEnd] = useState<string>("");

  const TIME_INTERVAL_MINUTES = 30; // 30 mins
  const { openDialog } = useDialog();

  const generateMonthDates = (startDate: Date) => {
    const arr: any[] = [];
    const base = new Date(startDate);
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 15; i++) {
      const current = new Date(base);
      current.setDate(base.getDate() + i);
      arr.push({
        label: current.getDate().toString().padStart(2, "0"),
        value: getLocalDayKey(current),
        day: (() => { const d = current.toLocaleDateString(locale, { weekday: "short" }); return d.charAt(0).toUpperCase() + d.slice(1); })(),
        date: current,
      });
    }
    setDates(arr);
  };

  useEffect(() => {
    generateMonthDates(getTomorrowStart());
  }, []);

  useEffect(() => {
    setScheduledService(true);
  }, [setScheduledService]);

  //generate time slots and fill the UI cols to show in the "available time slots"
  const filterSlotsByDate = (date: Date, slotsData?: AvailableSlot[]) => {
    const slots = Array.isArray(slotsData) ? slotsData : availableSlots;
    const dateStr = getLocalDayKey(date);
    const daySlots = slots
      .filter((slot) => slot.date === dateStr)
      .sort((a, b) => a.time_start.localeCompare(b.time_start));

    const left: any[] = [];
    const right: any[] = [];

    daySlots.forEach((slot, i) => {
      const slotObj = {
        time: slot.time_start,
        time_end: slot.time_end,
        available: slot.enabled !== false,
      };
      i % 2 === 0 ? left.push(slotObj) : right.push(slotObj);
    });

    setLeftSideSlots(left);
    setRightSideSlots(right);
    setDayTimeSlots(daySlots.map((slot) => ({
      time: slot.time_start,
      time_end: slot.time_end,
      available: slot.enabled !== false,
    })));
  };

  const getVendorWorkAvailability = () => {
    if (!selectedProfessional?.id) return;

    setLoadingAvailability(true);
    setAvailabilityError(false);

    const serviceId = serviceToRequest?.id;
    const serviceTypeId = serviceToRequest?.service_type?.id;
    const queryParam = serviceId
      ? `service_id=${serviceId}`
      : serviceTypeId
      ? `service_type_id=${serviceTypeId}`
      : "";
    const url = queryParam
      ? `${API_ROUTES.GET_SCHEDULE_VENDOR_AVAILABILITY(selectedProfessional.id)}?${queryParam}`
      : API_ROUTES.GET_SCHEDULE_VENDOR_AVAILABILITY(selectedProfessional.id);

    api
      .get(url)
      .then((res) => {
        const responseData = res?.data?.data ?? res?.data;
        const slots = Array.isArray(responseData?.available_slots)
          ? responseData.available_slots
          : Array.isArray(responseData?.availability)
          ? responseData.availability
          : Array.isArray(responseData?.slots)
          ? responseData.slots
          : Array.isArray(responseData)
          ? responseData
          : [];

        setAvailableSlots(slots);
        filterSlotsByDate(selectedDate, slots);
      })
      .catch((err) => {
        // Distinguir uma falha de carregamento (rede/servidor) de "sem horários"
        // reais: silenciar o erro fingiria uma agenda vazia ao utilizador.
        console.error("An error occurred:", err);
        setAvailabilityError(true);
        setAvailableSlots([]);
      })
      .finally(() => {
        setLoadingAvailability(false);

      });
  };

  useEffect(() => {
    if (selectedProfessional) getVendorWorkAvailability();
  }, [selectedProfessional]);

  const onChangeDate = (date: Date) => {
    setSelectedDate(date);
    filterSlotsByDate(date);
    setSelectedTime("");
    setSelectedTimeEnd("");
  };

  const onChangeTime = (time: string, timeEnd: string) => {
    setSelectedTime(time);
    setSelectedTimeEnd(timeEnd);
  };

  const isDayEnabled = (date: Date) => {
    const dateStr = getLocalDayKey(date);
    return availableSlots.some((slot) => slot.date === dateStr);
  };

  const formatDateStr = (isoString: any) => {
    // Mesma chave LOCAL usada no strip e no filtro de slots, para o payload
    // (scheduled_day) coincidir com o dia que o utilizador escolheu.
    return getLocalDayKey(new Date(isoString));
  }

  const makeSchedule = async () => {
   // Validate if every required data exists, if not, do not proceed

    //  console.log('saveService =: ', saveService?.id);
    if (
      !selectedTime ||
      !selectedProfessional?.id ||
      !serviceToRequest?.service_type?.id ||  // or  saveService?.id
      !selectedDate
    ) {
      /**
       * Important:
       * sometimes, the code falls here because there is no serviceToRequest.service_type?.id, we need to fix this as soon as possible
       this happens on clicking Backheader because it sets setServiceToRequest(null) => update : this seems to be resokved after commenting the setState(null)

      */
      console.warn("Missing required data!", { serviceToRequest });
      // Dar feedback visível em vez de falhar em silêncio.
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: t("services.schedule_service.missing_data"),
        closeAfterMSeconds: 2500,
        closeOnClickOutside: true,
      });
      return;
    }

    //timeParts represents the hour part and the minute part. ex: selectedTime is 14:00, 14 is hour part, 00 is minute part

    const timeParts = selectedTime.split(":");
    if (timeParts.length !== 2) {
      console.warn("Invalid selected time:", selectedTime);
      return;
    }

    const [startHour, startMin] = timeParts.map((timeValues) => {
       const numericTimeValue = Number(timeValues);
      return isNaN(numericTimeValue) ? null : numericTimeValue;
    });

     //handle invalid time
    if (startHour === null || startMin === null) {
      console.warn("selectedTime with invalid values:", selectedTime);
      return;
    }

    // Calculate the end time, assuming that each slot lasts 1 hour, this may change

    // const endHour = (startHour + 1).toString().padStart(2, "0"); //padStart fills the beginning of the string to make sure the string has the needed length
    // const endTime = `${endHour}:${startMin.toString().padStart(2, "0")}`;

    const endTime = selectedTimeEnd || calculateEndTime(selectedTime);

    if (!endTime) return;

    //validate and format date
    let scheduledDay: string;
    try {
      scheduledDay = formatDateStr(selectedDate); //  "YYYY-MM-DD"
      if (!scheduledDay) throw new Error("Invalid format");
    } catch (err) {
      // console.warn("Error on formatting date:", err);
      return;
    }

    //body to send to the API:
    const dataToMakeSchedule = {
      vendor_id: selectedProfessional?.id,
      customer_id: userData?.id,
      scheduled_day: scheduledDay,
      service_type_id: serviceToRequest?.service_type?.id,
      scheduled_time_start: selectedTime,
      scheduled_time_end: endTime,
    };
    setDataToMakeSchedule(dataToMakeSchedule);

    router.navigate(`/(app)/(modals)/(services)/(request)/checkout/${serviceToRequest?.service_type?.id}`);

  };

  const calculateEndTime = (startTime: any, duration = TIME_INTERVAL_MINUTES) => {

    // if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) return null;
    if (!startTime) return null;

    const [h, m] = startTime.split(":").map(Number);

    if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;

    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setMinutes(d.getMinutes() + duration);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };


  //Portugal Continental time
  const getCurrentPtTime = () => {
    return new Intl.DateTimeFormat("pt-PT", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
  }




  const convertToMins = (hhmm?: string | null): number => {
    if (!hhmm) return 0;

    const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return 0;

    const h = Number(match[1]);
    const m = Number(match[2]);

    if (h > 23 || m > 59) return 0;

    return h * 60 + m;
  };


  const safeToDateString = (date?: Date | null): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return ""; // ou retorna alguma string default
    }
    return date.toDateString();
  };


  const isDateToday = (input?: string | Date | null): boolean => {
    if (!input) return false;

  // se input já for uma instância de Date, usa-o.
  // Caso contrário, cria um novo Date a partir dele. // => depois, valida esse result p nao usarmos um Invalid Date





    const date =
      input instanceof Date
        ? input
        : new Date(input);


    if (!(date instanceof Date) || isNaN(date.getTime())) return false;

    // if (isNaN(date.getTime())) return false; // Invalid Date

    const today = new Date();

    // Comparar por componentes LOCAIS (o slot/selectedDate está à meia-noite local).
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }


  /**
   *
   *
   * Todo: implement a way to calculate what time is it in 30 mins intervals, so if the user
   * is in this screen at 10:29, there is a calculation to block the slot 10:30 in that precise moment.
   *
   * also todo: update dos bloqueios de slots caso já esteja em cima da hora. no mesmo dia, se sao 10:59 e
   *  o tecnico tem 20 min para aceitar o agendamento, e ainda se vai deslocar para o local,
   * deve haver uma margem de tempo para impedir agendamentos em cima da hora, ou pode chegar atrasado? => ver como vai funcionar isto
   *
   */

  const isSlotPast = (slotTime: string, slotDate: Date): boolean => {
    if (!slotTime || !slotDate) return false;

    // pega a hora atual em Portugal
    const nowPt = new Date(new Date().toLocaleString("en-GB", { timeZone: "Europe/Lisbon" }));

    // cria um Date para o slot combinando data + hora do slot no fuso PT
    const [h, m] = slotTime.split(":").map(Number);
    const slotDatePt = new Date(slotDate.toLocaleString("en-GB", { timeZone: "Europe/Lisbon" }));
    slotDatePt.setHours(h, m, 0, 0);

    return slotDatePt.getTime() < nowPt.getTime();
  };


  // makeSchedule exige hora + profissional + tipo de serviço: refletir tudo no
  // estado do botão, não só a hora.
  const canContinue = !!selectedTime && !!selectedProfessional?.id && !!serviceToRequest?.service_type?.id;

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <BackHeader
        onBack={() => {
          setDataToMakeSchedule(null);
          setScheduledService(false);
          if (router.canGoBack()) return router.back();
          return router.push("/(app)/(tabs)/home");
        }}
        backButtonColor="secondary"
        middleItem={() => (
          // Sem ação de troca de morada neste ecrã: apresentar como texto,
          // sem chevron nem afordância de toque que não faz nada.
          <View className="flex flex-row items-center">
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {addressLabel}
            </CustomText>
          </View>
        )}
        otherClasses="p-5"
      />

      <KeyboardAwareScrollView bottomOffset={20}>
        <ScrollView
          className="space-y-4"
          contentContainerStyle={{ flexGrow: 1, padding: 0,  minHeight: height }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 min-h-screen bg-support_secondary p-5 rounded-t-3xl space-y-4">

            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              <View className="w-[36px] h-[36px] border border-black rounded-full overflow-hidden">
                {selectedProfessional?.avatar?.small ? (
                   <Image
                      resizeMode="cover"
                      style={{ borderRadius: 36 / 2 }}
                      source={{
                        uri: selectedProfessional?.avatar?.small || "https://images.unsplash.com/photo-1635501108508-8ca1523a099e?auto=format&fit=crop&q=60&w=600",
                      }}
                    className="w-full h-full"
                  />
                  ) : ( <UserAvatarIcon />
                )}
              </View>
              <View className="flex-col ml-[8px] mt-[8px]">
                <CustomText color="secondary" numberOfLines={1} boldness="bold">
                  {selectedProfessional?.name || t("services.schedule_service.selected_professional")}
                </CustomText>
              </View>
            </View>

            <View>
              <CustomText color="secondary" boldness="semiBold">
                {t("services.schedule_service.choose_day")}
              </CustomText>


              {loadingAvailability ? (
                <View className="rounded-[6px] flex flex-row mt-[6px] mb-[20px]">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <View key={index}>
                      <View className="w-[55px] h-[55px] p-[5px] mr-[3px] border border-support_primary rounded-[3px] bg-support_secondary flex-row">
                        <View className="w-full justify-center items-center">
                          <View className="w-[20px] h-[12px] bg-support_primary rounded-[6px] mb-[6px]" />
                          <View className="w-[25px] h-[18px] bg-support_primary rounded-[9px]" />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  <View className="rounded-[6px] flex flex-row mt-[6px] mb-[20px]">
                    {dates.map((filter, index) => {
                      // const enabled = isDayEnabled(filter.date);

                       const filterDate = filter?.date instanceof Date ? filter.date : null;
                       const enabled = filterDate ? isDayEnabled(filterDate) : false;


                      return (
                        <FilterButton
                          key={`filter-btn-${index}`}
                          // selectedFilter={selectedDate.toDateString() === filter.date.toDateString() ? filter.value : ""}
                          // selectedFilter={safeToDateString(selectedDate) === safeToDateString(filter.date) ? filter.value : ""}
                          selectedFilter={safeToDateString(selectedDate) === safeToDateString(filterDate) ? filter.value || "" : ""}

                          // filter={filter.value}
                          filter={filter?.value || ""}
                          // onPress={() => enabled && onChangeDate(filter.date)} //make sure the day is in the present or future and that the professional works that day

                         onPress={() => enabled && filterDate && onChangeDate(filterDate)}

                        disabled={!enabled} // prevent past and disabled days from being selected
                        >
                          <View
                            style={{
                              backgroundColor: !enabled
                                ? Colors.support_primary
                                // : selectedDate.toDateString() === filter.date.toDateString()

                                :  safeToDateString(selectedDate) === safeToDateString(filter.date)




                                ? Colors.primary
                                : Colors.support_secondary,
                              width: 55,
                              height: 55,
                              padding: 5,
                              marginRight: 3,
                              borderColor:
                                // selectedDate.toDateString() === filter.date.toDateString()

                              safeToDateString(selectedDate) === safeToDateString(filter.date)



                                  ? Colors.primary
                                  : Colors.gray_lighter,
                              borderWidth: 1,
                              borderRadius: 3,
                              flexDirection: "row",
                            }}
                          >
                          <View className="w-full justify-center items-center">
                            <Text
                              className="text-[13px]"
                              style={{ color: !enabled ? Colors.gray_medium : Colors.secondary }}
                            >
                              {filter.day}
                            </Text>
                            <Text
                              className="text-[18px]"
                              style={{ color: !enabled ? Colors.gray_medium : Colors.secondary }}
                            >
                              {filter.label}
                            </Text>
                        </View>
                     </View>
                        </FilterButton>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            <View>
              <CustomText color="secondary" boldness="semiBold">
                {t("services.schedule_service.availableTimeSlots")}
              </CustomText>
            </View>

            {
              loadingAvailability ?


               <View style={{ flexDirection: "row", marginTop: 8 }}>

                  <View style={{ flexDirection: "column", width: "50%" }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <View
                        key={i}
                        className="w-[95%] h-[40px] mb-2 rounded-[3px] bg-support_primary"
                      />
                    ))}
                  </View>


                  <View style={{ flexDirection: "column", width: "50%" }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <View
                        key={i}
                        className="w-[95%] h-[40px] ml-[5%] mb-2 rounded-[3px] bg-support_primary"
                      />
                    ))}
                  </View>
              </View>


               :

            availabilityError ?

              // Falha de carregamento (rede/servidor): não fingir "sem horários".
              <View className="flex-1 w-full pt-2">
                <CustomText color="secondary" boldness="semiBold" size='small' classes='w-full mb-1 break-words'>
                  {t("services.schedule_service.availability_error_title")}
                </CustomText>
                <CustomText color="gray_medium" boldness="regular" size='small' classes='w-full mb-3 break-words'>
                  {t("services.schedule_service.availability_error_subtitle")}
                </CustomText>
                <CustomTouchableOpacity
                  size="small"
                  type="primary"
                  className="self-start px-5"
                  onPress={getVendorWorkAvailability}
                  accessibilityRole="button"
                  accessibilityLabel={t("services.schedule_service.retry")}
                >
                  <CustomText color="secondary" boldness="bold" size="small">
                    {t("services.schedule_service.retry")}
                  </CustomText>
                </CustomTouchableOpacity>
              </View>
              :

            !loadingAvailability && Array.isArray(availableSlots) && availableSlots.length === 0 ?

              <View className="flex-1 w-full pt-2" style={{ flex: 0.75, backgroundColor: Colors.support_secondary }}>
                <View className="flex-1 w-full">
                 <CustomText color="secondary" boldness="semiBold" size='small' classes='w-full mb-1 break-words mb-3'>
                    {t("services.schedule_service.no_slots_title")}
                  </CustomText>
                  <CustomText color="secondary" boldness="regular" size='small'  classes='w-full mb-0.5 break-words'>
                    {t("services.schedule_service.no_slots_subtitle")}
                  </CustomText>
                  <CustomText color="secondary" boldness="regular" size='small' classes='w-full mb-0.5 break-words'>
                    {t("services.schedule_service.no_slots_subtitle_2")}
                  </CustomText>
                </View>
              </View>
              : dayTimeSlots.length === 0 ?
                // Há horários noutros dias, mas nenhum no dia selecionado.
                <View className="flex-1 w-full pt-2">
                  <CustomText color="secondary" boldness="regular" size='small' classes='w-full break-words'>
                    {t("services.schedule_service.no_slots_for_day")}
                  </CustomText>
                </View>
              :
              <View>
                {([
                  { key: "morning", label: t("services.schedule_service.period_morning"), from: 0, to: 12 * 60 },
                  { key: "afternoon", label: t("services.schedule_service.period_afternoon"), from: 12 * 60, to: 19 * 60 },
                  { key: "evening", label: t("services.schedule_service.period_evening"), from: 19 * 60, to: 24 * 60 },
                ]).map((period) => {
                  const slots = dayTimeSlots.filter((item) => {
                    const mins = convertToMins(item.time);
                    return mins >= period.from && mins < period.to;
                  });
                  if (slots.length === 0) return null;
                  return (
                    <View key={period.key} className="mb-2">
                      <CustomText color="gray_medium" size="small" boldness="semiBold" classes="mb-2 mt-1">
                        {period.label}
                      </CustomText>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {slots.map((item, i) => {
                          const isPast = isDateToday(selectedDate) && convertToMins(item.time) < convertToMins(getCurrentPtTime());
                          const disabled = !item.available || isPast;
                          const selected = selectedTime === item.time;
                          return (
                            <TouchableHighlight
                              key={`${period.key}-${i}`}
                              underlayColor="transparent"
                              onPress={() => onChangeTime(item.time, item.time_end)}
                              disabled={disabled}
                              accessibilityRole="button"
                              accessibilityLabel={item.time}
                              accessibilityState={{ selected, disabled }}
                              style={{
                                width: "31%",
                                height: 44,
                                borderRadius: 10,
                                borderWidth: 1,
                                backgroundColor: disabled
                                  ? Colors.support_primary
                                  : selected
                                  ? Colors.primary
                                  : Colors.support_secondary,
                                // Âmbar só no selecionado. Os disponíveis usavam a
                                // mesma cor da seleção, por isso 17 slots por
                                // escolher já pareciam todos escolhidos e nada
                                // guiava o olho.
                                borderColor: disabled
                                  ? Colors.gray_lighter
                                  : selected
                                  ? Colors.primary
                                  : Colors.support_primary,
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: disabled ? Colors.gray_medium : Colors.secondary,
                                  fontFamily: selected ? "Poppins_600SemiBold" : "Poppins_400Regular",
                                }}
                              >
                                {item.time}
                              </Text>
                            </TouchableHighlight>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            }



          </View>
        </ScrollView>
      </KeyboardAwareScrollView>

      {/* Rodapé fixo: confirmar visível sem fazer scroll até ao fim */}
      {!loadingAvailability && Array.isArray(availableSlots) && availableSlots.length > 0 && (
        <View className="px-5 pb-5 pt-2 bg-support_secondary">
          <TouchableHighlight
            underlayColor="transparent"
            onPress={makeSchedule}
            disabled={!canContinue}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
            style={{
              backgroundColor: canContinue ? Colors.primary : "rgba(250,187,91,0.35)",
              borderRadius: 999,
              paddingVertical: 18,
              alignItems: "center",
              justifyContent: "center",
              ...(canContinue
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
            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1} style={{ opacity: canContinue ? 1 : 0.5 }}>
              {selectedTime
                ? `${t("services.select_service_type.proceed")}  ·  ${selectedTime}`
                : t("services.select_service_type.proceed")}
            </CustomText>
          </TouchableHighlight>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ScheduleService;
