import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {ScrollView, Text, View, TouchableHighlight, Image, Dimensions, Alert} from "react-native";
import { Colors } from "@/constants/Colors";
import { Entypo } from "@expo/vector-icons";
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

  const [leftSideSlots, setLeftSideSlots] = useState<TimeSlotInfo[]>([]); //any
  const [rightSideSlots, setRightSideSlots] = useState<TimeSlotInfo[]>([]);//any
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [selectedTimeEnd, setSelectedTimeEnd] = useState<string>("");

  const scrollRef = useRef<ScrollView>(null);
  const TIME_INTERVAL_MINUTES = 30; // 30 mins
  const { openDialog } = useDialog();

  const getSelectedSlotData = () => {
    if (!selectedDay || !selectedTime) return null;

    const [hour, minute] = selectedTime.split(":").map(Number);
    //padStart: this is useful to make sure that the hour and minute always have 2 digits.
    const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

   //calculate the end:
    // const endHour = (hour + 1).toString().padStart(2, "0");
    // const endTime = `${endHour}:${minute.toString().padStart(2, "0")}`;

    const endTime = calculateEndTime(startTime);

    if (!endTime) return;

    return {
      date: selectedDay?.value || "",  // "2025-12-16"
      start: startTime,             // "08:00"
      end: endTime,                 // "09:00"
    };
  };

  const generateMonthDates = (startDate: Date) => {
    const arr: any[] = [];
    const base = new Date(startDate);
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 15; i++) {
      const current = new Date(base);
      current.setDate(base.getDate() + i);
      arr.push({
        label: current.getDate().toString().padStart(2, "0"),
        value: current.toISOString(),
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
    const dateStr = date.toISOString().split("T")[0];
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
  };

  const getVendorWorkAvailability = () => {
    if (!selectedProfessional?.id) return;

    setLoadingAvailability(true);

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
        console.error("An error occurred:", err);
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
    const dateStr = date.toISOString().split("T")[0];
    return availableSlots.some((slot) => slot.date === dateStr);
  };

  const formatDateStr = (isoString: any) => {
    const date = new Date(isoString);

    if (!(date instanceof Date) || isNaN(date.getTime())) return "";

    // Obter ano, mês e dia
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
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
      console.warn("Missing required data!", {
      //   // selectedTime,
      //   // selectedProfessional,
       serviceToRequest,
      //   // userData,
      //   // selectedDate,
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

    return (
      date.getUTCFullYear() === today.getUTCFullYear() &&
      date.getUTCMonth() === today.getUTCMonth() &&
      date.getUTCDate() === today.getUTCDate()
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
          <CustomTouchableOpacity
            size="small"
            type="transparent"
            className="flex flex-row items-center"
          >
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {addressLabel}
            </CustomText>
            <Entypo name="chevron-down" size={20} color={Colors.secondary} />
          </CustomTouchableOpacity>
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
                      <View className="w-[55px] h-[55px] p-[5px] mr-[3px] border border-[#e5e5e5] rounded-[3px] bg-[#f0f5f5] flex-row">
                        <View className="w-full justify-center items-center">
                          <View className="w-[20px] h-[12px] bg-[#d1e0e0] rounded-[6px] mb-[6px]" />
                          <View className="w-[25px] h-[18px] bg-[#d1e0e0] rounded-[9px]" />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onLayout={() => {
                    if (scrollRef.current && dates.length > 0) {
                      const todayIndex = dates.findIndex(
                        // (d) => new Date(d.value).toDateString() === new Date().toDateString()
                        (d) => safeToDateString(new Date(d.value)) === safeToDateString(new Date())
                      );
                      if (todayIndex >= 0) scrollRef.current.scrollTo({ x: todayIndex * 58, animated: true });
                    }
                  }}
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
                                ? "#e0e0e0"
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
                              style={{ color: !enabled ? "#9e9e9e" : Colors.secondary }}
                            >
                              {filter.day}
                            </Text>
                            <Text
                              className="text-[18px]"
                              style={{ color: !enabled ? "#9e9e9e" : "black" }}
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
                        className="w-[95%] h-[40px] mb-2 rounded-[3px] bg-gray-200"
                      />
                    ))}
                  </View>


                  <View style={{ flexDirection: "column", width: "50%" }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <View
                        key={i}
                        className="w-[95%] h-[40px] ml-[5%] mb-2 rounded-[3px] bg-gray-200"
                      />
                    ))}
                  </View>
              </View>


               :

            !loadingAvailability && Array.isArray(availableSlots) && availableSlots.length === 0 ?

              <View className="flex-1 w-full pt-2" style={{ flex: 0.75, backgroundColor: '#ffffff' }}>
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
              :
              <View style={{ flexDirection: "row" }}>

                <View style={{ flexDirection: "column", width: "50%" }}>
                  { Array.isArray(leftSideSlots) &&
                  leftSideSlots.map((item, i) => {
                      return  (
                      <TouchableHighlight
                        key={i}
                        underlayColor="transparent"
                        onPress={() => onChangeTime(item.time, item.time_end)}
                        // disabled={!item.available}
                        //disables time if the slot is already past
                        // disabled={ !item.available || (convertToMins(item.time) < convertToMins(getCurrentPtTime()))}

                         disabled={ !item.available || (isDateToday(selectedDate)  &&  (convertToMins(item.time) < convertToMins(getCurrentPtTime())))}


                        style={{
                          width: "95%",
                          height: 40,
                          marginRight: "5%",
                          marginBottom: 6,
                          borderRadius: 3,
                          borderWidth: 1,
                          backgroundColor: !item.available || (isDateToday(selectedDate)  &&  (convertToMins(item.time) < convertToMins(getCurrentPtTime())))
                            ? "#e0e0e0"
                            : selectedTime === item.time
                            ? Colors.primary
                            : Colors.support_secondary,



                          borderColor: Colors.primary,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: Colors.secondary }}>{item.time}</Text>
                      </TouchableHighlight>
                    )
                  }
                   )}
                </View>
                <View style={{ flexDirection: "column", width: "50%" }}>
                  {Array.isArray(rightSideSlots) && rightSideSlots.map((item, i) => (
                    <TouchableHighlight
                      key={i}
                      onPress={() => onChangeTime(item.time, item.time_end)}
                      // disabled={!item.available}
                      //disables time if the slot is already past
                      disabled={ !item.available || (isDateToday(selectedDate)  &&  (convertToMins(item.time) < convertToMins(getCurrentPtTime())))}

                      underlayColor="transparent"
                      style={{
                        width: "95%",
                        height: 40,
                        marginLeft: "5%",
                        marginBottom: 6,
                        borderRadius: 3,
                        borderWidth: 1,
                        backgroundColor: !item.available || (isDateToday(selectedDate)  &&  (convertToMins(item.time) < convertToMins(getCurrentPtTime())))
                          ? "#e0e0e0"
                          : selectedTime === item.time
                          ? Colors.primary
                          : Colors.support_secondary,

                        borderColor: Colors.primary,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: Colors.secondary }}>{item.time}</Text>
                    </TouchableHighlight>
                  ))}
                </View>
              </View>
            }



            {!loadingAvailability  && Array.isArray(availableSlots) && availableSlots.length > 0 &&
              <View className="flex-1">
                <CustomTouchableOpacity
                  textSize="medium"
                  size="large"
                  type="primary"
                  textColor="secondary"
                  textBoldness="semiBold"
                  text={t("services.select_service_type.proceed")}
                  onPress={makeSchedule}
                  textSizeSM="extraSmall"
                  textBoldnessSM={`light`}
                  textNumberOfLinesSM={1}
                  btnIcon={<></>}
                  />
              </View>
            }
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ScheduleService;
