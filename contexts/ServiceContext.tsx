import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApi } from "./ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { OperationAreaInterface, ServiceInterface, ServiceStatus, ServiceTypeInterface, ServiceWithVendorInterface, VendorsInterface2, ScheduledService, ServiceExtra } from "@/types/services";
import useEcho from "@/hooks/echo";
import { router } from "expo-router";
import { useDialog } from "./DialogContext";
import { View } from "react-native";
import CheckMark from "@/assets/icons/check-mark";
import { buildCountdownInfo } from "@/utils/serviceCountdown";
import { startServiceActivity, updateServiceActivity, endServiceActivity } from "@/modules/live-activity";
import { Colors } from "@/constants/Colors";
import XIcon from "@/assets/icons/x";
import { t } from "i18next";
import { useSession } from "./SessionContext";

export type HistoryStatusFilter = 'all' | 'closed' | 'canceled';

// Rascunho do formulário de checkout, preservado quando o cliente cancela/recusa um pagamento
// com cartão para poder voltar ao checkout sem preencher tudo de novo. Associado ao service_type
// para nunca reidratar num pedido de outro serviço.
export interface CheckoutDraft {
  serviceTypeId: string;
  paymentMethodId: number | 'mb_way';
  customerNIF: string;
  voucherCode: string;
  voucher: { id: number; name: string; discount_percentage: number } | null;
  mbWayPhone: string | null;
  guestPhone: string;
}

interface ServiceContextProps {
  operationAreas: OperationAreaInterface[] | null;
  setOperationAreas: (operationAreas: OperationAreaInterface[] | null) => void;
  setScheduledServices: React.Dispatch<React.SetStateAction<ScheduledService[] | null>>;
  scheduledServices: ScheduledService[] | null;
  getOperationAreas: () => Promise<[]>;
  getScheduledServices: ()=> Promise<[]>;
  openService: ServiceInterface | null;
  setOpenService: React.Dispatch<React.SetStateAction<ServiceInterface | null>>;
  serviceToRequest: ServiceWithVendorInterface | null;
  setServiceToRequest: React.Dispatch<React.SetStateAction<ServiceWithVendorInterface | null>>;
  /**
   * Unidades do mesmo serviço no pedido ("2 reparações de torneira").
   *
   * Vive no contexto e não no ecrã da ficha porque o número escolhido lá tem
   * de acompanhar o cliente até ao fim: a lista de técnicos mostra o preço já
   * com ele, a agenda reserva o tempo proporcional e o checkout cobra sobre
   * ele. Guardá-lo no ecrã obrigaria a arrastá-lo por cinco rotas à mão, e
   * bastava esquecer uma para o preço apresentado deixar de ser o cobrado.
   */
  serviceQuantity: number;
  setServiceQuantity: React.Dispatch<React.SetStateAction<number>>;
  servicePendingAcceptance: ServiceInterface | null;
  setServicePendingAcceptance: React.Dispatch<React.SetStateAction<ServiceInterface | null>>;
  checkoutDraft: CheckoutDraft | null;
  setCheckoutDraft: React.Dispatch<React.SetStateAction<CheckoutDraft | null>>;
  clearCheckoutState: () => void;
  getOpenService: () => void;
  subscribeToServicesChannel: (serviceId: ServiceInterface['id']) => void;
  getPendingService: () => void;
  historyServices: ServiceInterface[];
  setHistoryServices: React.Dispatch<React.SetStateAction<ServiceInterface[]>>;
  verifyStatus: (serviceId: string, onTimeout?: () => void) => void;
  forceVerifyStatus: (serviceId: string) => Promise<'paid' | 'pending' | 'refused' | 'error'>;
  stopVerifyStatus: () => void;
  getHistoryServices: (offset?: number, status?: HistoryStatusFilter) => void;
  loadingServicesHistory: boolean;
  historyError: boolean;
  haveMoreServicesHistory: boolean;
  historyCounts: { closed: number; canceled: number };
  scheduledService: boolean;
  setScheduledService: (scheduledService: boolean) => void;
  selectedProfessional: VendorsInterface2 | null;
  setSelectedProfessional: React.Dispatch<React.SetStateAction<VendorsInterface2 | null>>;
  saveService: any,//later type this correctly
  setSaveService: any, //later type this correctly
  isWaitAcceptScreenActive: boolean;
  setIsWaitAcceptScreenActive: React.Dispatch<React.SetStateAction<boolean>>;
  isChatScreenActive: boolean;
  setIsChatScreenActive: React.Dispatch<React.SetStateAction<boolean>>;
  unreadServiceMessages: number;
  setUnreadServiceMessages: React.Dispatch<React.SetStateAction<number>>;
  pendingSearchTerm: string;
  setPendingSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  // Tempo extra / peças pedidas pelo técnico durante o serviço (ver BACKEND_PENDENCIAS.md #9).
  serviceExtras: ServiceExtra[];
  setServiceExtras: React.Dispatch<React.SetStateAction<ServiceExtra[]>>;
  getServiceExtras: () => Promise<void>;
}

const ServiceContext = createContext<ServiceContextProps | undefined>(undefined);

export const ServiceProvider = ({ children }: { children: ReactNode }) => {
  const { api } = useApi();
  const echo = useEcho();
  const { openDialog } = useDialog();
  const { userData, session } = useSession();
  const [operationAreas, setOperationAreas] = useState<OperationAreaInterface[] | null>(null);

  // Categorias em cache local: a grelha da Home aparece instantânea no
  // arranque (sem esperar pela API); a lista fresca substitui-a a seguir.
  const OPERATION_AREAS_KEY = "piquet_operation_areas_v1";
  useEffect(() => {
    AsyncStorage.getItem(OPERATION_AREAS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOperationAreas((prev) => (prev && prev.length > 0 ? prev : parsed));
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (Array.isArray(operationAreas) && operationAreas.length > 0) {
      AsyncStorage.setItem(OPERATION_AREAS_KEY, JSON.stringify(operationAreas)).catch(() => {});
    }
  }, [operationAreas]);

  const [openService, setOpenService] = useState<ServiceInterface | null>(null);
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[] | null>(null);
  const [serviceToRequest, setServiceToRequest] = useState<ServiceWithVendorInterface | null>(null);
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);
  const [servicePendingAcceptance, setServicePendingAcceptance] = useState<ServiceInterface | null>(null);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [historyServices, setHistoryServices] = useState<ServiceInterface[]>([]);

  // Ponto único de limpeza do estado do checkout. Chamar em TODAS as transições para
  // "pago" (wait-accept, card/confirmed, mb-way/confirmed): sem isto, o rascunho —
  // que existe só para o cliente não repreencher tudo depois de uma recusa — sobrevive
  // ao pagamento e volta a aplicar um voucher já consumido no pedido seguinte.
  const clearCheckoutState = useCallback(() => {
    setCheckoutDraft(null);
  }, []);

  // Arranca a false: antes era true, o que fazia o ecra mostrar esqueleto desde
  // o primeiro render mesmo que nenhum pedido chegasse a ser feito — e se o
  // useFocusEffect nao disparasse (entrada por deep link, por exemplo), o
  // esqueleto ficava eterno porque so o .finally o desligava.
  const [loadingServicesHistory, setLoadingServicesHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [haveMoreServicesHistory, setHaveMoreServicesHistory] = useState(true);
  const [historyCounts, setHistoryCounts] = useState<{ closed: number; canceled: number }>({ closed: 0, canceled: 0 });
  const [scheduledService, setScheduledService] = useState<boolean>(false);

  const [selectedProfessional, setSelectedProfessional] = useState<VendorsInterface2 | null>(null);
  const [saveService, setSaveService] = useState<any>(null);
  const [isWaitAcceptScreenActive, setIsWaitAcceptScreenActive] = useState<boolean>(false);
  const isWaitAcceptScreenActiveRef = useRef<boolean>(false);
  const [isChatScreenActive, setIsChatScreenActive] = useState<boolean>(false);
  const isChatScreenActiveRef = useRef<boolean>(false);
  const [unreadServiceMessages, setUnreadServiceMessages] = useState<number>(0);
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string>('');
  const [serviceExtras, setServiceExtras] = useState<ServiceExtra[]>([]);

  // Keep ref in sync with state for access inside event handlers
  useEffect(() => {
    isWaitAcceptScreenActiveRef.current = isWaitAcceptScreenActive;
  }, [isWaitAcceptScreenActive]);

  useEffect(() => {
    isChatScreenActiveRef.current = isChatScreenActive;
  }, [isChatScreenActive]);

  useEffect(() => {
    setUnreadServiceMessages(0);
  }, [openService?.id]);

  // Sem isto, o estado do utilizador anterior (histórico, serviço aberto, etc.)
  // sobrevive ao signout porque o provider nunca é desmontado.
  useEffect(() => {
    if (!session) {
      setHistoryServices([]);
      setLoadingServicesHistory(true);
      setHaveMoreServicesHistory(true);
      setOpenService(null);
      setServicePendingAcceptance(null);
      setScheduledServices(null);
      setServiceToRequest(null);
      // Serviço novo, contagem nova: sem isto, quem pediu 3 torneiras via 3
      // no serviço seguinte sem ter mexido em nada.
      setServiceQuantity(1);
      setCheckoutDraft(null);
      setSelectedProfessional(null);
      setSaveService(null);
      setScheduledService(false);
      setUnreadServiceMessages(0);
      setPendingSearchTerm('');
      setServiceExtras([]);
    }
  }, [session]);

  // Muda de serviço (ou deixa de haver um) → a lista de extras é sempre do
  // serviço em curso, nunca de um anterior.
  useEffect(() => {
    setServiceExtras([]);
  }, [openService?.id]);

  // Refs (não `let` no corpo do componente): o stop/force chamados noutro render
  // têm de conseguir limpar o intervalo criado por um render anterior.
  const paymentStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paymentStatusAttemptsRef = useRef<number>(0);
  // Gate de navegação única para o desfecho do pagamento (confirmed/denied).
  const paymentRedirectDoneRef = useRef<boolean>(false);

  useEffect(() => {
    if (openService?.id) {
      subscribeToServicesChannel(openService.id);
    } else if (servicePendingAcceptance?.id) {
      subscribeToServicesChannel(servicePendingAcceptance.id);
    }

    return () => {
      // O echo pode ainda não existir (ligação por abrir) ou já ter caído: sair
      // de um canal que nunca se subscreveu não é erro, mas rebentava o render.
      if (openService?.id) {
        echo?.leaveChannel(`common.services.${openService.id}`);
      } else if (servicePendingAcceptance?.id) {
        echo?.leaveChannel(`common.services.${servicePendingAcceptance.id}`);
      }
    }
  }, [echo, openService, servicePendingAcceptance]);

  useEffect(() => {
    if (!echo || !userData?.id) return;

    const customerChannel = echo.private(`service.customer.${userData.id}`);
    const handleScheduleAccepted = (data: any) => {
      // Sem log do `data`: o evento traz o serviço completo (morada, contactos).
      setServicePendingAcceptance(null);
      if (!isWaitAcceptScreenActiveRef.current) {
        openDialog({
          icon: <CheckMark color={Colors.secondary} />,
          title: t('services.service.channel.accepted.title'),
          subtitle: t('services.service.channel.accepted.subtitle'),
          closeAfterMSeconds: 3000,
          closeOnClickOutside: true,
        })
      }
    };
    const handleVendorHeadingToLocation = (data: any) => {
      const nextService = data?.service || data?.serviceDetails;
      if (nextService) {
        setOpenService(nextService);
      }
      openDialog({
        icon: <CheckMark color={Colors.secondary} />,
        title: t('services.service.channel.vendor_heading.title'),
        subtitle: t('services.service.channel.vendor_heading.subtitle'),
        closeAfterMSeconds: 3000,
        closeOnClickOutside: true,
      })
    };

    customerChannel.subscribed((test: any) => {
      // console.log(test, 'test on customer channel subscribed');
      customerChannel.error(function (error: any){
        if (__DEV__) console.log(error);
      })
      customerChannel.listen(".AcceptScheduleEvent", handleScheduleAccepted);
      customerChannel.listen(".App\\Events\\Customer\\Schedule\\AcceptScheduleEvent", handleScheduleAccepted);
      customerChannel.listen(".VendorHeadingToLocationEvent", handleVendorHeadingToLocation);
      customerChannel.listen(".App\\Events\\Customer\\VendorHeadingToLocationEvent", handleVendorHeadingToLocation);
    });

    return () => {
      echo.leaveChannel(`service.customer.${userData.id}`);
    };
  }, [echo, userData?.id]);

  const getOpenService = async () => {
    const response = await api.get(API_ROUTES.CUSTOMER_GET_OPEN_SERVICES);
    if (openService && !response.data.data.service) {
      router.dismissTo('/(app)/(tabs)/home');
      handleServiceStatusChange();
    }
    setOpenService(response.data.data.service || null);
  }

  const handleServiceStatusChange = () => {
    if (!openService) return;
    api.get(API_ROUTES.GET_SERVICE_DETAILS(`${openService.id}`))
      .then((response) => {
        const service = response.data.data.service;
        if (service.status === ServiceStatus.CLOSED) {
          router.navigate({
            pathname: '/(app)/(bottom-sheets)/(services)/rate/[serviceId]',
            params: {
              serviceId: openService.id,
              service: JSON.stringify(openService),
            },
          })
        } else if (service.status === ServiceStatus.REFUSED) {
          openDialog({
            icon: <XIcon color={Colors.secondary} />,
            title: t('services.service.channel.refused.title'),
            subtitle: t('services.service.channel.refused.subtitle'),
            closeAfterMSeconds: 3000,
            closeOnClickOutside: true,
          })
        } else if (service.status === ServiceStatus.CANCELED) {
          openDialog({
            title: t('services.wait_accept.canceled.title'),
            subtitle: t('services.wait_accept.canceled.subtitle'),
            closeAfterMSeconds: 3000,
            closeOnClickOutside: true,
          })
        }
        // else if (service.status === ServiceStatus.ACCEPTED) {
        //   setOpenService(service);
        //   setStatus("success");
        //   setServicePendingAcceptance(null);
        // }
      })
      // .catch((error) => {
      //   console.error(error);
      // })
  }

  const getPendingService = async () => {
    const response = await api.get(API_ROUTES.GET_PENDING_SERVICES);
    setServicePendingAcceptance(response.data.data.service);
  }

  // Lista de tempo extra / peças pedidas pelo técnico para o serviço em curso.
  // Falha silenciosa: é complementar ao pedido em tempo real (o evento do canal
  // continua a funcionar mesmo que este GET falhe), por isso não interrompe o ecrã.
  const getServiceExtras = async () => {
    if (!openService?.id) return;
    try {
      const response = await api.get(API_ROUTES.CUSTOMER_SERVICE_EXTRAS(openService.id));
      setServiceExtras(response?.data?.data?.extras ?? []);
    } catch (error) {
      // sem lista fresca: mantém o que já estava (ex.: recebido em tempo real)
    }
  }

  useEffect(() => {
    if (openService?.id) {
      getServiceExtras();
    }
  }, [openService?.id]);

  /**
   * Live Activity do ecrã bloqueado (iOS): nome do técnico, tipo de serviço e
   * quanto falta, enquanto o serviço decorre no local.
   *
   * Reage ao ESTADO real do serviço, e não a um botão: arranca quando o técnico
   * chega (status ARRIVED, com fim estimável) e termina assim que deixa de haver
   * execução — serviço concluído, cancelado ou simplesmente já não há serviço
   * aberto. Sem isto último, a atividade ficava presa no ecrã depois de acabar.
   *
   * Em Android / build sem o módulo nativo, as chamadas são no-ops (ver
   * modules/live-activity): este efeito pode correr em todo o lado sem guardas.
   */
  /**
   * ATALHO DE DESENVOLVIMENTO — só em __DEV__, nunca em produção.
   *
   * A Live Activity depende de um serviço real em execução (status Arrived), o
   * que exige backend com sessão. Para a poder VER e validar sem isso, expõe-se
   * um gatilho global que injeta um openService fictício e deixa o efeito real
   * abaixo fazer o resto — o mesmo caminho de código de produção, sem atalhos
   * na lógica que interessa validar.
   *
   * Uso: no debugger, globalThis.__piquetFakeArrivedService(90)
   */
  useEffect(() => {
    if (!__DEV__) return;
    (globalThis as any).__piquetFakeArrivedService = (minutes: number = 90) => {
      setOpenService({
        id: "dev-live-activity",
        status: ServiceStatus.ARRIVED,
        arrived_at: new Date().toISOString(),
        server_time: new Date().toISOString(),
        service_type: { id: 1, name: "Desentupimento de Cano", time: minutes },
        vendor: { user: { id: 1, name: "Afonso Neto" } },
      } as any);
    };
    (globalThis as any).__piquetClearService = () => setOpenService(null);
  }, []);

  const liveActivityRunningRef = useRef(false);
  useEffect(() => {
    const info = buildCountdownInfo(openService);
    if (info.active && info.endAtMs != null) {
      if (!liveActivityRunningRef.current) {
        startServiceActivity({
          technicianName: info.technicianName ?? "",
          serviceType: info.serviceType ?? "",
          endAtMs: info.endAtMs,
        });
        liveActivityRunningRef.current = true;
      } else {
        // O fim pode ser reestimado (ex.: extra de tempo aprovado muda a duração).
        updateServiceActivity(info.endAtMs);
      }
    } else if (liveActivityRunningRef.current) {
      endServiceActivity();
      liveActivityRunningRef.current = false;
    }
  }, [openService?.status, openService?.arrived_at, openService?.service_type?.time, openService?.id]);

  const getOperationAreas = async () => {
    try {
      const response = await api.get(API_ROUTES.GET_OPERATION_AREAS);
      const { operation_areas } = response.data.data;

      return operation_areas;
    } catch (error) {
      console.error(error);

      return [];
    }
  };

  const getScheduledServices = async() => {

      try{
        const response = await api.get(API_ROUTES.CUSTOMER_GET_SCHEDULED_SERVICES);

        if(response?.data?.data?.schedules && Array.isArray(response?.data?.data?.schedules)){

          return response?.data?.data?.schedules;

        }else{
          return [];
        }

      }
      catch(error: any){

       return [];

      }
  }

  const subscribeToServicesChannel = (serviceId: ServiceInterface['id']) => {
    // console.log({serviceId}, 'serviceId on subscribe to services channel');

    if (echo) {
      const channel = echo.private(`common.services.${serviceId}`);

      // console.log({channel}, 'channel on subscribe to services channel');

      if (channel) {
        channel.subscribed((test: any) => {
          // console.log(test, 'test on subscribed');
          channel.error(function (error: any){
            // console.log(error);
          })
          channel.listen(".ServiceFinishedEvent", (data: any) => {
            // console.log("Service was finished, logged data on wait accept: ", data);
            setOpenService(data.serviceDetails)
            router.push("/(app)/(pages)/(services)/(open)/close");
          });
          channel.listen(".ServiceArrivedEvent", (data: any) => {
            // console.log("Service was arrived, logged data on wait accept: ", data);
            setOpenService(data.serviceDetails)
            router.push("/(app)/(pages)/(services)/(open)/vendor-arrived");
          });
          channel.listen(".ServiceAcceptedEvent", (data: any) => {
            setOpenService(data.service);
            setServicePendingAcceptance(null);
            // Only show dialog if user is NOT on the wait-accept screen (screen handles its own UI)
            if (!isWaitAcceptScreenActiveRef.current) {
              openDialog({
                icon: <CheckMark color={Colors.secondary} />,
                title: t('services.service.channel.accepted.title'),
                subtitle: t('services.service.channel.accepted.subtitle'),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: true,
              })
            }
          });
          const handleScheduleAccepted = (data: any) => {
            setServicePendingAcceptance(null);
            // Only show dialog if user is NOT on the wait-accept screen (screen handles its own UI)
            if (!isWaitAcceptScreenActiveRef.current) {
              openDialog({
                icon: <CheckMark color={Colors.secondary} />,
                title: t('services.service.channel.accepted.title'),
                subtitle: t('services.service.channel.accepted.subtitle'),
                closeAfterMSeconds: 3000,
                closeOnClickOutside: true,
              })
            }
          };
          channel.listen(".AcceptScheduleEvent", handleScheduleAccepted);
          channel.listen(".App\\Events\\Customer\\Schedule\\AcceptScheduleEvent", handleScheduleAccepted);
          channel.listen(".ServiceCanceledEvent", (data: any) => {
            // console.log("Service was canceled, logged data on wait accept: ", data);
            setOpenService(null);
            setServicePendingAcceptance(null);
            openDialog({
              icon: <XIcon color={Colors.secondary} />,
              title: t('services.service.channel.canceled.title'),
              subtitle: t('services.service.channel.canceled.subtitle'),
              closeAfterMSeconds: 3000,
              closeOnClickOutside: true,
              onClose: () => {
                router.push("/(app)/(tabs)/home");
              }
            })
            if (data.service.id) {
              echo.leaveChannel(`common.services.${data.service.id}`);
            }
          })
          // channel.listen(".ServiceClosedEvent", (data: any) => {
          //   console.log(" Service was closed, logged data on wait accept: ", data);
          //   setServicePendingAcceptance(null);
          // });
          channel.listen(".ServiceTimeoutEvent", (data: any) => {
            // console.log("Service was timeout, logged data on wait accept: ", data);
            setServicePendingAcceptance(null);
            echo.leaveChannel(`common.services.${data.service.id}`);
            openDialog({
              icon: <XIcon color={Colors.secondary} />,
              title: t('services.service.channel.timedout.title'),
              subtitle: t('services.service.channel.timedout.subtitle'),
              closeAfterMSeconds: 3000,
              closeOnClickOutside: true,
            })
          });
          channel.listen(".ServiceRefusedEvent", (data: any) => {
            // console.log("Service was refused, logged data on wait accept: ", data);
            setServicePendingAcceptance(null);
            echo.leaveChannel(`common.services.${data.service.id}`);
            openDialog({
              icon: <XIcon color={Colors.secondary} />,
              title: t('services.service.channel.refused.title'),
              subtitle: t('services.service.channel.refused.subtitle'),
              closeAfterMSeconds: 3000,
              closeOnClickOutside: true,
            })
          });
          channel.listen(".UpdateLocationEvent", (data: any) => {
            setOpenService(data.service);
          });
          channel.listen(".NewMessageEvent", (messageToHandle: { message: string }) => {
            if (!userData) return;
            if (isChatScreenActiveRef.current) return;
            try {
              const { user_id } = JSON.parse(messageToHandle.message);
              if (user_id === userData.id) return;
              setUnreadServiceMessages((prev) => prev + 1);
            } catch (error) {
              console.error("Failed to parse message payload:", error);
            }
          });
          // Tempo extra / peça pedida pelo técnico (ver BACKEND_PENDENCIAS.md #9).
          // Novo pedido pendente → interrompe com a folha de revisão, onde quer
          // que o cliente esteja na app.
          channel.listen(".ServiceExtraRequestedEvent", (data: any) => {
            const extra: ServiceExtra | undefined = data?.extra;
            if (!extra?.id) return;
            setServiceExtras((prev) => {
              const idx = prev.findIndex((e) => e.id === extra.id);
              if (idx === -1) return [extra, ...prev];
              const next = [...prev];
              next[idx] = extra;
              return next;
            });
            if (extra.status === "pending") {
              router.navigate({
                pathname: "/(app)/(bottom-sheets)/(services)/extra-request/[extraId]",
                params: { extraId: String(extra.id) },
              });
            }
          });
          // O técnico retirou um pedido ainda pendente (ex.: já não precisa).
          channel.listen(".ServiceExtraWithdrawnEvent", (data: any) => {
            const extraId = data?.extra?.id ?? data?.extraId;
            if (extraId == null) return;
            setServiceExtras((prev) =>
              prev.map((e) => (e.id === extraId ? { ...e, status: "withdrawn" } : e))
            );
          });
        })
      }
    }
  }

  const stopVerifyStatus = () => {
    if (paymentStatusIntervalRef.current) {
      clearInterval(paymentStatusIntervalRef.current);
      paymentStatusIntervalRef.current = null;
    }
    paymentStatusAttemptsRef.current = 0;
  }

  // Navegação de desfecho é sempre 1x por fluxo de pagamento: um poll tardio ou um
  // force-check concorrente nunca podem reabrir o confirmed/denied.
  const navigateToPaymentOutcome = (pathname: Parameters<typeof router.dismissTo>[0]) => {
    if (paymentRedirectDoneRef.current) return;
    paymentRedirectDoneRef.current = true;
    stopVerifyStatus();
    try {
      router.dismissTo(pathname);
    } catch (e) {
      // dismissTo lança se a rota alvo já não estiver na stack (user saiu do fluxo).
      try {
        router.replace(pathname);
      } catch (err) {
        console.error('Failed to navigate to payment outcome screen:', err);
      }
    }
  }

  const handlePaymentConfirmed = (service: ServiceInterface) => {
    if (paymentRedirectDoneRef.current) return;
    setServicePendingAcceptance(service);
    navigateToPaymentOutcome(`/(app)/(modals)/(services)/(request)/checkout/mb-way/confirmed`);
  }

  const handlePaymentRefused = () => {
    navigateToPaymentOutcome(`/(app)/(modals)/(services)/(request)/checkout/mb-way/denied`);
  }

  const verifyStatus = (serviceId: string, onTimeout?: () => void) => {
    // Só o serviceId manda. Bloquear com openService/servicePendingAcceptance deixava o
    // ecrã de espera MB Way sem qualquer polling (e sem desfecho) sempre que já existia
    // um serviço aberto ou por aceitar — ex.: um agendamento pendente, que o
    // getPendingService() repõe a cada regresso à app. O polling é por serviceId, a
    // invariante de intervalo único é garantida pelo stopVerifyStatus() abaixo, e o
    // ecrã pára o polling ao desmontar.
    if (!serviceId) return;
    // Invariante de intervalo único: nunca deixar um polling anterior órfão.
    stopVerifyStatus();
    paymentRedirectDoneRef.current = false;
    const intervalId = setInterval(() => {
      // Auto-defesa: se este intervalo deixou de ser o ativo (outro verifyStatus começou),
      // mata-se a si próprio em vez de continuar a fazer polling para sempre.
      if (paymentStatusIntervalRef.current !== intervalId) {
        clearInterval(intervalId);
        return;
      }
      if (paymentStatusAttemptsRef.current >= 24) {
        stopVerifyStatus();
        onTimeout?.();
        return;
      }
      api.get(API_ROUTES.GET_SERVICE_PAYMENT_STATUS(serviceId))
        .then((response) => {
          handlePaymentConfirmed(response.data.data.service);
        })
        .catch((error) => {
          if (error?.response?.status === 402) {
            handlePaymentRefused();
          }
        })
        .finally(() => {
          paymentStatusAttemptsRef.current++;
        })
    }, 10000)
    paymentStatusIntervalRef.current = intervalId;
  }

  // Force-check disparado pelo botão "Já realizei o pagamento": one-shot ao mesmo endpoint.
  // 200 → pago (navega para confirmed); 402 → recusado (navega para denied);
  // 400 → Payshop ainda sem confirmação (o ecrã mostra feedback e o polling continua).
  const forceVerifyStatus = async (serviceId: string): Promise<'paid' | 'pending' | 'refused' | 'error'> => {
    try {
      const response = await api.get(API_ROUTES.GET_SERVICE_PAYMENT_STATUS(serviceId));
      handlePaymentConfirmed(response.data.data.service);
      return 'paid';
    } catch (error: any) {
      if (error?.response?.status === 402) {
        handlePaymentRefused();
        return 'refused';
      }
      if (error?.response?.status === 400) {
        return 'pending';
      }
      return 'error';
    }
  }

  const getHistoryServices = (offset?: number, status: HistoryStatusFilter = 'all') => {
    setHistoryError(false);
    if (!loadingServicesHistory) setLoadingServicesHistory(true);
    api.post(API_ROUTES.POST_SERVICES_HISTORY, {
      offset: offset !== undefined ? offset : historyServices.length,
      // O backend devolve a lista já filtrada por status; 'all' omite o filtro.
      ...(status !== 'all' ? { status } : {}),
    })
      .then((response) => {
        const { data } = response.data;

        setHaveMoreServicesHistory(!!data.have_more);
        setHistoryCounts({
          closed: data.closed_count ?? 0,
          canceled: data.canceled_count ?? 0,
        });

        setHistoryServices(data.services)
      })
      .catch((error) => {
        // `error.response` nao existe em falha de rede — o acesso direto a
        // .status rebentava dentro do proprio catch.
        const status = error?.response?.status;
        // 401 e tratado pelo interceptor da sessao; aqui so marcamos o ecra.
        if (status !== 401) setHistoryError(true);
      })
      .finally(() => {
        setLoadingServicesHistory(false);
      });
  }

  return (
    <ServiceContext.Provider
      value={{
        operationAreas,
        setOperationAreas,
        getOperationAreas,
        openService,
        setOpenService,
        serviceToRequest,
        setServiceToRequest,
        serviceQuantity,
        setServiceQuantity,
        servicePendingAcceptance,
        setServicePendingAcceptance,
        checkoutDraft,
        setCheckoutDraft,
        clearCheckoutState,
        getOpenService,
        subscribeToServicesChannel,
        getPendingService,
        historyServices,
        setHistoryServices,
        verifyStatus,
        forceVerifyStatus,
        stopVerifyStatus,

        getHistoryServices,
        loadingServicesHistory,
        historyError,
        haveMoreServicesHistory,
        historyCounts,
        scheduledService,
        setScheduledService,
        selectedProfessional,
        setSelectedProfessional,
        setSaveService,
        saveService,
        isWaitAcceptScreenActive,
        setIsWaitAcceptScreenActive,
        isChatScreenActive,
        setIsChatScreenActive,
        unreadServiceMessages,
        setUnreadServiceMessages,
        getScheduledServices,
        setScheduledServices,
        scheduledServices,
        pendingSearchTerm,
        setPendingSearchTerm,
        serviceExtras,
        setServiceExtras,
        getServiceExtras,
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
};

export const useService = () => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
};
