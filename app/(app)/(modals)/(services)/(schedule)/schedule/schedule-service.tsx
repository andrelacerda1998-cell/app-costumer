import React, { useState, useEffect } from "react";
import CartQueueProgress from "@/components/app/Services/CartQueueProgress";
import { SafeAreaView } from "react-native-safe-area-context";
import {ScrollView, Text, View, TouchableHighlight, Image} from "react-native";
import { Colors } from "@/constants/Colors";
import { Feather } from "@expo/vector-icons";
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
import { dedupeSlotsByRoundedTime } from "@/utils/availability";

interface TimeSlotInfo{
  available: boolean;
  time: string;
  time_end: string;
}

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
  const { setDataToMakeSchedule, setVendorAvailability } = useSchedule();
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
  /**
   * Uma hora só, de propósito. Deixar escolher várias parecia dar jeito ao
   * cliente, mas do outro lado o técnico recebe um pedido sem saber a que hora
   * está a responder — e um pedido ambíguo é um pedido recusado.
   */
  const [selectedSlots, setSelectedSlots] = useState<TimeSlotInfo[]>([]);
  const selectedTime = selectedSlots[0]?.time ?? "";
  const selectedTimeEnd = selectedSlots[0]?.time_end ?? "";

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

    // Uma hora, uma opção. As agendas dos técnicos vêm desalinhadas ao minuto
    // (12:00 num, 12:01 noutro) e a união crua dava ao cliente duas escolhas
    // indistinguíveis para a mesma marcação. Aqui juntam-se e mostra-se a hora
    // redonda; a hora exata do técnico escolhido é reposta no ecrã seguinte.
    const uiSlots = dedupeSlotsByRoundedTime(
      daySlots.map((slot) => ({
        time: slot.time_start,
        time_end: slot.time_end,
        available: slot.enabled !== false,
      })),
    );

    const left: any[] = [];
    const right: any[] = [];

    uiSlots.forEach((slot, i) => {
      i % 2 === 0 ? left.push(slot) : right.push(slot);
    });

    setLeftSideSlots(left);
    setRightSideSlots(right);
    setDayTimeSlots(uiSlots);
  };

  const serviceQueryParam = () => {
    const serviceId = serviceToRequest?.id;
    const serviceTypeId = serviceToRequest?.service_type?.id;
    return serviceId
      ? `service_id=${serviceId}`
      : serviceTypeId
      ? `service_type_id=${serviceTypeId}`
      : "";
  };

  const parseSlots = (res: any): AvailableSlot[] => {
    const responseData = res?.data?.data ?? res?.data;
    return Array.isArray(responseData?.available_slots)
      ? responseData.available_slots
      : Array.isArray(responseData?.availability)
      ? responseData.availability
      : Array.isArray(responseData?.slots)
      ? responseData.slots
      : Array.isArray(responseData)
      ? responseData
      : [];
  };

  const fetchVendorSlots = async (vendorId: number): Promise<AvailableSlot[]> => {
    const q = serviceQueryParam();
    const url = q
      ? `${API_ROUTES.GET_SCHEDULE_VENDOR_AVAILABILITY(vendorId)}?${q}`
      : API_ROUTES.GET_SCHEDULE_VENDOR_AVAILABILITY(vendorId);
    const res = await api.get(url);
    return parseSlots(res);
  };

  /**
   * Agenda de um técnico já escolhido — o caminho antigo, mantido para quem
   * chega aqui com profissional definido (ex.: repetir um agendamento).
   */
  const loadSingleVendorAvailability = async (vendorId: number) => {
    const slots = await fetchVendorSlots(vendorId);
    setVendorAvailability({ [vendorId]: slots as any });
    setAvailableSlots(slots);
    filterSlotsByDate(selectedDate, slots);
  };

  /**
   * União da agenda dos técnicos disponíveis para este serviço.
   *
   * O cliente escolhe primeiro QUANDO e só depois QUEM. Como o backend só sabe
   * responder "quando é que o técnico X está livre", junta-se aqui a agenda dos
   * (no máximo 3) técnicos que ele devolveria de qualquer forma — a união é
   * exatamente o espaço de horas que alguma vez seria oferecido.
   */
  const loadCombinedAvailability = async () => {
    const endpoint = session ? API_ROUTES.POST_SCHEDULE_VENDORS : API_ROUTES.GUEST_SEARCH_VENDORS;
    const payload = session
      ? { service_type: serviceToRequest?.service_type?.id }
      : {
          service_type_id: serviceToRequest?.service_type?.id,
          latitude: guestSession?.guest_address?.latitude,
          longitude: guestSession?.guest_address?.longitude,
          scheduled: true,
        };

    const res = await api.post(endpoint, payload);
    const data = res?.data?.data;
    const raw = data?.vendors ?? data;
    const list: any[] = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.values(raw) : [];
    const ids = list.map((v) => Number(v?.id)).filter((id) => Number.isFinite(id)).slice(0, 3);

    if (ids.length === 0) {
      setVendorAvailability({});
      setAvailableSlots([]);
      filterSlotsByDate(selectedDate, []);
      return;
    }

    // Um técnico indisponível não pode deitar abaixo o ecrã inteiro: falha
    // individual conta como agenda vazia para esse técnico.
    const results = await Promise.all(
      ids.map((id) => fetchVendorSlots(id).catch(() => [] as AvailableSlot[])),
    );

    const byVendor: Record<number, AvailableSlot[]> = {};
    ids.forEach((id, index) => { byVendor[id] = results[index]; });
    setVendorAvailability(byVendor as any);

    // União por (dia, hora): a hora aparece se PELO MENOS UM técnico a tiver.
    const merged = new Map<string, AvailableSlot>();
    results.flat().forEach((slot) => {
      if (!slot?.date || !slot?.time_start) return;
      const key = `${slot.date}T${slot.time_start}`;
      const existing = merged.get(key);
      if (!existing || (existing.enabled === false && slot.enabled !== false)) {
        merged.set(key, slot);
      }
    });

    const union = Array.from(merged.values());
    setAvailableSlots(union);
    filterSlotsByDate(selectedDate, union);
  };

  const loadAvailability = () => {
    setLoadingAvailability(true);
    setAvailabilityError(false);

    const run = selectedProfessional?.id
      ? loadSingleVendorAvailability(selectedProfessional.id)
      : loadCombinedAvailability();

    run
      .catch(() => {
        // Distinguir uma falha de carregamento (rede/servidor) de "sem horários"
        // reais: silenciar o erro fingiria uma agenda vazia ao utilizador.
        setAvailabilityError(true);
        setAvailableSlots([]);
      })
      .finally(() => setLoadingAvailability(false));
  };

  useEffect(() => {
    loadAvailability();
  }, [selectedProfessional?.id, serviceToRequest?.service_type?.id]);

  /** "Hoje", "Amanhã" ou o dia da semana — como se diz uma data em voz alta. */
  const dayTabLabel = (date: Date | null) => {
    if (!date) return "";
    const key = getLocalDayKey(date);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (key === getLocalDayKey(today)) return t("services.schedule_service.today");
    if (key === getLocalDayKey(tomorrow)) return t("services.schedule_service.tomorrow");
    const label = date.toLocaleDateString(locale, { weekday: "long" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  /** A data por extenso curta, por baixo da etiqueta: "5 set 2026". */
  const dayTabDate = (date: Date | null) => {
    if (!date) return "";
    // Composto à mão: o toLocaleDateString com month "short" cai para o formato
    // numérico ("5/09/2026") no motor do RN, que se lê muito pior.
    const month = date
      .toLocaleDateString(locale, { month: "short" })
      .replace(".", "");
    return `${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  const onChangeDate = (date: Date) => {
    setSelectedDate(date);
    filterSlotsByDate(date);
    setSelectedSlots([]);
  };

  const onChangeTime = (time: string, timeEnd: string) => {
    // Tocar na hora já escolhida desmarca; noutra qualquer, substitui.
    setSelectedSlots((prev) =>
      prev.some((slot) => slot.time === time) ? [] : [{ time, time_end: timeEnd, available: true }],
    );
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
    // O técnico deixou de ser exigido aqui: com o fluxo invertido é escolhido
    // no ecrã seguinte, e mantê-lo na validação fazia o "Continuar" não fazer
    // rigorosamente nada — sem navegação e sem mensagem.
    if (
      !selectedTime ||
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

    // Com tecnico ja escolhido (ex.: repetir agendamento) segue direto para o
    // checkout; caso contrario vai escolher entre quem esta livre nesta hora.
    if (selectedProfessional?.id) {
      router.navigate(`/(app)/(modals)/(services)/(request)/checkout/${serviceToRequest?.service_type?.id}`);
      return;
    }
    router.navigate(
      `/(app)/(modals)/(services)/(schedule)/select-technician/${serviceToRequest?.service_type?.id}`,
    );

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
  // O técnico deixou de ser pré-requisito: com o fluxo invertido, é ele que vem
  // a seguir. Exigi-lo aqui deixava o "Continuar" desativado para sempre, com a
  // hora já escolhida e sem nada a indicar o que faltava.
  const canContinue = !!selectedTime && !!serviceToRequest?.service_type?.id;

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

      {/* flex: 1 e sem minHeight de janela inteira, de propósito.
          Sem o flex este scroll dimensionava-se pelo conteúdo, e o conteúdo pedia
          `minHeight: height` (a janela toda) + `min-h-screen`: ficava mais alto do
          que o espaço debaixo do cabeçalho, e o fim da lista de horas passava para
          debaixo do rodapé fixo. Na prática a última fila de horas ficava cortada
          ao meio e não havia scroll que a trouxesse acima do botão — quem quisesse
          a última hora do dia não a conseguia ler nem escolher.
          Com flex: 1 o scroll encolhe para o espaço disponível e a lista rola toda
          acima do rodapé. O flexGrow no conteúdo continua a garantir que o cartão
          branco enche o ecrã quando há poucas horas para mostrar. */}
      {/* Um só scroll. Havia um ScrollView dentro do KeyboardAwareScrollView —
          que também rola — e o de dentro ficava sem altura definida: o cartão
          branco acabava onde acabava o conteúdo e via-se o âmbar do fundo por
          baixo, como se o ecrã estivesse cortado a meio. */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
          <View className="flex-1 bg-support_secondary p-5 rounded-t-3xl space-y-4" style={{ paddingBottom: 112 }}>

            {/* Sem técnico escolhido (fluxo normal: primeiro quando, depois quem)
                o cabeçalho mostra o serviço. Antes dizia "Profissional
                selecionado" com um avatar vazio, porque este ecrã pressupunha
                que a escolha do técnico já tinha acontecido. */}
            <CartQueueProgress classes="mb-4" />

            {selectedProfessional?.name ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View className="w-[36px] h-[36px] border border-black rounded-full overflow-hidden">
                  {selectedProfessional?.avatar?.small ? (
                    <Image
                      resizeMode="cover"
                      style={{ borderRadius: 36 / 2 }}
                      source={{ uri: selectedProfessional.avatar.small }}
                      className="w-full h-full"
                    />
                  ) : (
                    <UserAvatarIcon />
                  )}
                </View>
                <View className="flex-col ml-[8px]">
                  <CustomText color="secondary" numberOfLines={1} boldness="bold">
                    {selectedProfessional.name}
                  </CustomText>
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 6 }}>
                <CustomText color="secondary" boldness="bold" size="extraLarge" numberOfLines={2}>
                  {serviceToRequest?.service_type?.name}
                </CustomText>
                <CustomText color="gray_strong" boldness="regular" size="small" numberOfLines={2} classes="mt-1">
                  {t("services.schedule_service.pick_time_first")}
                </CustomText>
              </View>
            )}

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
                  contentContainerStyle={{ paddingTop: 10, paddingRight: 8 }}
                >
                  {/* Separadores em vez de caixas: o dia lê-se por palavras
                      ("Hoje", "Amanhã", o dia da semana) com a data por baixo,
                      e o sublinhado marca onde se está. Ocupa menos altura e
                      deixa a grelha de horas começar mais acima. */}
                  {dates.map((filter, index) => {
                    const filterDate = filter?.date instanceof Date ? filter.date : null;
                    const enabled = filterDate ? isDayEnabled(filterDate) : false;
                    const selected = safeToDateString(selectedDate) === safeToDateString(filterDate);
                    return (
                      <TouchableHighlight
                        key={`day-${index}`}
                        underlayColor="transparent"
                        disabled={!enabled}
                        onPress={() => enabled && filterDate && onChangeDate(filterDate)}
                        accessibilityRole="button"
                        accessibilityLabel={`${dayTabLabel(filterDate)} ${dayTabDate(filterDate)}`}
                        accessibilityState={{ selected, disabled: !enabled }}
                        style={{
                          marginRight: 18,
                          paddingBottom: 10,
                          borderBottomWidth: 3,
                          borderBottomColor: selected ? Colors.primary : "transparent",
                          opacity: enabled ? 1 : 0.4,
                        }}
                      >
                        <View>
                          <Text
                            className="text-[16px]"
                            style={{
                              color: Colors.secondary,
                              fontFamily: selected ? "Poppins_600SemiBold" : "Poppins_400Regular",
                            }}
                          >
                            {dayTabLabel(filterDate)}
                          </Text>
                          <Text
                            className="text-[12px] mt-0.5"
                            style={{ color: Colors.gray_strong, fontFamily: "Poppins_400Regular" }}
                          >
                            {dayTabDate(filterDate)}
                          </Text>
                        </View>
                      </TouchableHighlight>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View className="mt-1">
              <CustomText color="secondary" boldness="semiBold">
                {t("services.schedule_service.availableTimeSlots")}
              </CustomText>
              {/* O dia escolhido por escrito: a tira rola, e depois de rolar
                  deixa de se ver qual é o separador ativo. */}
              <CustomText color="gray_strong" size="small" boldness="regular" classes="mt-0.5">
                {selectedDate.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
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
              <View className="items-center justify-center px-6" style={{ paddingVertical: 48 }}>
                <View
                  className="items-center justify-center rounded-full mb-4"
                  style={{ width: 84, height: 84, backgroundColor: "rgba(250,187,91,0.18)" }}
                >
                  <Feather name="wifi-off" size={32} color={Colors.secondary} />
                </View>
                <CustomText color="secondary" boldness="bold" size="large" classes="text-center">
                  {t("services.schedule_service.availability_error_title")}
                </CustomText>
                <CustomText color="gray_strong" boldness="regular" size="small" classes="text-center mt-2 mb-6">
                  {t("services.schedule_service.availability_error_subtitle")}
                </CustomText>
                <TouchableHighlight
                  underlayColor="transparent"
                  onPress={loadAvailability}
                  accessibilityRole="button"
                  style={{
                    backgroundColor: Colors.primary,
                    borderRadius: 999,
                    paddingVertical: 15,
                    paddingHorizontal: 32,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: Colors.primary,
                    shadowOpacity: 0.45,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 6,
                  }}
                >
                  <View className="flex-row items-center">
                    <Feather name="refresh-cw" size={16} color={Colors.secondary} />
                    <CustomText color="secondary" boldness="bold" size="medium" classes="ml-2">
                      {t("services.schedule_service.retry")}
                    </CustomText>
                  </View>
                </TouchableHighlight>
              </View>
              :

            !loadingAvailability && Array.isArray(availableSlots) && availableSlots.length === 0 ?

              <View className="items-center justify-center px-6" style={{ paddingVertical: 48 }}>
                <View
                  className="items-center justify-center rounded-full mb-4"
                  style={{ width: 84, height: 84, backgroundColor: "rgba(250,187,91,0.18)" }}
                >
                  <Feather name="calendar" size={32} color={Colors.secondary} />
                </View>
                <CustomText color="secondary" boldness="bold" size="large" classes="text-center">
                  {t("services.schedule_service.no_slots_title")}
                </CustomText>
                <CustomText color="gray_strong" boldness="regular" size="small" classes="text-center mt-2">
                  {t("services.schedule_service.no_slots_subtitle")}
                </CustomText>
              </View>
                            : dayTimeSlots.length === 0 ?
                // Há horários noutros dias, mas nenhum no dia selecionado.
                <View className="items-center justify-center px-6" style={{ paddingVertical: 40 }}>
                  <Feather name="calendar" size={28} color={Colors.gray_medium} />
                  <CustomText color="gray_strong" boldness="regular" size="small" classes="text-center mt-3">
                    {t("services.schedule_service.no_slots_for_day")}
                  </CustomText>
                </View>
              :
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {/* Uma grelha corrida em vez de três blocos (manhã/tarde/noite):
                    as horas já estão por ordem, e os títulos partiam a lista em
                    pedaços que obrigavam a mais scroll para ver as mesmas horas. */}
                {dayTimeSlots.map((item, i) => {
                  const isPast = isDateToday(selectedDate) && convertToMins(item.time) < convertToMins(getCurrentPtTime());
                  const disabled = !item.available || isPast;
                  const selected = selectedSlots.some((slot) => slot.time === item.time);
                  return (
                    <TouchableHighlight
                      key={`slot-${i}`}
                      underlayColor="transparent"
                      onPress={() => onChangeTime(item.time, item.time_end)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel={item.time}
                      accessibilityState={{ selected, disabled }}
                      style={{
                        width: "31.5%",
                        height: 52,
                        borderRadius: 14,
                        borderWidth: 1,
                        backgroundColor: disabled
                          ? Colors.support_primary
                          : selected
                          ? Colors.primary
                          : Colors.support_secondary,
                        borderColor: disabled
                          ? Colors.gray_lighter
                          : selected
                          ? Colors.primary
                          : Colors.support_primary,
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 17,
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
            }



          </View>
      </KeyboardAwareScrollView>

      {/* Rodapé fixo: confirmar visível sem fazer scroll até ao fim.
          Ancorado em absoluto e não em fluxo, para o rodapé ser medido contra o
          SafeAreaView (que tem altura real) e não contra o que sobra depois de
          dois scrolls encaixados se medirem. Com o paddingBottom no conteúdo
          acima, a lista de horas rola inteira por baixo dele e a última fila
          deixa de ficar presa atrás do botão. */}
      {!loadingAvailability && Array.isArray(availableSlots) && availableSlots.length > 0 && (
        <View
          className="px-5 pb-5 pt-2 bg-support_secondary"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
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
              {/* Só "Confirmar". A hora já está assinalada a âmbar na grelha,
                  logo acima do botão — repeti-la aqui era dizer duas vezes a
                  mesma coisa a dois dedos de distância. */}
              {t("services.schedule_service.confirm")}
            </CustomText>
          </TouchableHighlight>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ScheduleService;
