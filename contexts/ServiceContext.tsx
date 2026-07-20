import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useApi } from "./ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { OperationAreaInterface, ServiceInterface, ServiceStatus, ServiceTypeInterface, ServiceWithVendorInterface, VendorsInterface2, ScheduledService } from "@/types/services";
import useEcho from "@/hooks/echo";
import { router } from "expo-router";
import { useDialog } from "./DialogContext";
import { View } from "react-native";
import CheckMark from "@/assets/icons/check-mark";
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
  setScheduledServices: (scheduledServices: ScheduledService[] | null) => void;
  scheduledServices: ScheduledService[] | null;
  getOperationAreas: () => Promise<[]>;
  getScheduledServices: ()=> Promise<[]>;
  openService: ServiceInterface | null;
  setOpenService: React.Dispatch<React.SetStateAction<ServiceInterface | null>>;
  serviceToRequest: ServiceWithVendorInterface | null;
  setServiceToRequest: React.Dispatch<React.SetStateAction<ServiceWithVendorInterface | null>>;
  servicePendingAcceptance: ServiceInterface | null;
  setServicePendingAcceptance: React.Dispatch<React.SetStateAction<ServiceInterface | null>>;
  checkoutDraft: CheckoutDraft | null;
  setCheckoutDraft: React.Dispatch<React.SetStateAction<CheckoutDraft | null>>;
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
}

const ServiceContext = createContext<ServiceContextProps | undefined>(undefined);

export const ServiceProvider = ({ children }: { children: ReactNode }) => {
  const { api } = useApi();
  const echo = useEcho();
  const { openDialog } = useDialog();
  const { userData, session } = useSession();
  const [operationAreas, setOperationAreas] = useState<OperationAreaInterface[] | null>(null);
  const [openService, setOpenService] = useState<ServiceInterface | null>(null);
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[] | null>(null);
  const [serviceToRequest, setServiceToRequest] = useState<ServiceWithVendorInterface | null>(null);
  const [servicePendingAcceptance, setServicePendingAcceptance] = useState<ServiceInterface | null>(null);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [historyServices, setHistoryServices] = useState<ServiceInterface[]>([]);

  const [loadingServicesHistory, setLoadingServicesHistory] = useState(true);
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
      setCheckoutDraft(null);
      setSelectedProfessional(null);
      setSaveService(null);
      setScheduledService(false);
      setUnreadServiceMessages(0);
      setPendingSearchTerm('');
    }
  }, [session]);

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
      if (openService?.id) {
        echo.leaveChannel(`common.services.${openService.id}`);
      } else if (servicePendingAcceptance?.id) {
        echo.leaveChannel(`common.services.${servicePendingAcceptance.id}`);
      }
    }
  }, [echo, openService, servicePendingAcceptance]);

  useEffect(() => {
    if (!echo || !userData?.id) return;

    const customerChannel = echo.private(`service.customer.${userData.id}`);
    const handleScheduleAccepted = (data: any) => {
      console.log("Service schedule was accepted (customer channel): ", data);
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
      console.log("Vendor heading to location (customer channel): ", data);
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
        console.log(error);
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
    console.log(response.data.data)
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
            console.log("Service was accepted, logged data on wait accept: ", data);
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
            console.log("Service schedule was accepted: ", data);
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
    if (!serviceId || openService || servicePendingAcceptance) return;
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
        if (error.response.status !== 401) {
          openDialog({
            icon: <XIcon color={Colors.secondary} />,
            title: t('errors.title'),
            subtitle: t('errors.occurred_an_error'),
            closeAfterMSeconds: 2000,
            closeOnClickOutside: true,
          });
        }
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
        servicePendingAcceptance,
        setServicePendingAcceptance,
        checkoutDraft,
        setCheckoutDraft,
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
        setPendingSearchTerm
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
