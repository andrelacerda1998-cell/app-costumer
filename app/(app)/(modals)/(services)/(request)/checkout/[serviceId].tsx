import { Colors } from "@/constants/Colors";
import CartQueueProgress from "@/components/app/Services/CartQueueProgress";
import i18n from "@/translation";
import { formatBookingDay, formatScheduledTime } from "@/utils/schedule";
import {
  AntDesign,
  Entypo,
  Feather,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
  Octicons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  AppState,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
} from "react-native";
import BackHeader from "@/components/app/BackHeader";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useSession } from "@/contexts/SessionContext";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { CustomText } from "@/components/CustomText";
import * as WebBrowser from "expo-web-browser";
import { useService } from "@/contexts/ServiceContext";
import { useCart } from "@/contexts/CartContext";
import ArrowIcon from "@/assets/icons/arrow";
import MoreIcon from "@/assets/icons/more";
import { useWallet } from "@/contexts/WalletContext";
import { PaymentMethod } from "@/types/paymentMethods";
import { useTranslation } from "react-i18next";
import MbWayPhoneNumber from "@/components/modals/mbway/mbway-phone-number";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import MbWay from "@/assets/icons/mbway";
import { renderMoney } from "@/utils/money";
import ServicePhotosPicker, { ServicePhoto } from "@/components/app/Services/ServicePhotosPicker";
import AttentionIcon from "@/assets/icons/attention";
import { useSchedule } from "@/contexts/ScheduleContext";
import { validateNIF } from "@/utils";
import CustomTextInput from "@/components/CustomTextInput";
import { useCampaign } from "@/contexts/CampaignContext";
import { useGuestSession } from "@/contexts/GuestSessionContext";
import { useAddressLabel } from "@/hooks/useAddressLabel";
import { OtpInput } from "react-native-otp-entry";
import { useMixpanel } from "@/contexts/MixpanelContext";
import ValidatePhoneModal from "@/components/ValidatePhoneModal";
interface CheckoutRequest {
  amount: number;
  amount_formated: string;
  // Ausente (não zero) quando o backend não tem a parcela para dar — ex.: fluxo de
  // matching, que parte de um preço já congelado no candidato. Por isso opcional e
  // não com default 0: mostrar "0,00€" seria inventar informação que não existe.
  travel_amount?: number;
  travel_amount_formated?: string;
  balance: number;
  balance_formated: string;
  balance_after_payment: number;
  balance_after_payment_formated: string;
  balance_total_used: number;
  balance_total_used_formated: string;
  value_for_payment: number;
  value_for_payment_formated: string;
}
const OTP_TTL_SECONDS = 300;

const Checkout = () => {
  const { t } = useTranslation();
  const { track } = useMixpanel();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const { setSession } = useSession();
  const {
    paymentMethods,
    fetchPaymentMethods,
    shouldAutoSelectNewestPaymentMethod,
    clearAutoSelectNewestPaymentMethod,
  } = useWallet();
  const { userData, session, setUserData } = useSession();
  const { serviceToRequest, scheduledService, checkoutDraft, setCheckoutDraft, clearCheckoutState, serviceQuantity } = useService();
  const { removeItem: removeCartItem } = useCart();
  const { guestSession, setGuestPhone: saveGuestPhone } = useGuestSession();
  const addressLabel = useAddressLabel();
  const isGuest = !session;
  const navigation = useNavigation();
  const { dataToMakeSchedule } = useSchedule();
  const { campaignLogId, clearCampaignLogId } = useCampaign();
  const [isLoading, setIsLoading] = useState(false);
  const [openingService, setOpeningService] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutRequest | null>(
    null,
  );
  const [openServiceError, setOpenServiceError] = useState<string | null>(null);
  // O servidor exige telemóvel verificado para abrir um pedido
  // (can_request_service). Verifica-se AQUI, no checkout, e não noutro ecrã:
  // mandar alguém para fora a meio do pagamento é das formas mais fiáveis de
  // perder a venda. O ValidatePhoneModal já existia para o fluxo de convidado;
  // reutiliza-se com os endpoints de utilizador autenticado.
  const needsPhoneVerification = userData?.phone_number_verified_at === null;
  const [phoneOtpVisible, setPhoneOtpVisible] = useState(false);
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);

  const handleSendPhoneCode = async () => {
    if (sendingPhoneOtp) return;
    setSendingPhoneOtp(true);

    try {
      await api.get(API_ROUTES.GET_SMS_VALIDATION);
      setPhoneOtpVisible(true);
    } catch (error: any) {
      const status = error?.response?.status;

      // 403 = já estava verificado. Não é erro para o cliente: é o estado que
      // ele queria. Acontece quando o userData está desatualizado.
      if (status === 403) {
        setUserData({ ...userData, phone_number_verified_at: new Date().toISOString() });
      } else if (status === 400) {
        // Código já enviado e ainda válido — abre a caixa em vez de reclamar.
        setPhoneOtpVisible(true);
      } else {
        Alert.alert(t("errors.title"), error?.response?.data?.message || t("errors.occurred_an_error"));
      }
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneCode = async (code: string) => {
    try {
      const res = await api.post(API_ROUTES.POST_SMS_VALIDATION, { code });
      const verifiedAt = res?.data?.data?.verified_at;

      if (!verifiedAt) return false;

      // Atualizar o userData faz o bloco desaparecer e o pagamento seguir, sem
      // sair do ecrã nem perder o que já estava preenchido.
      setUserData({ ...userData, phone_number_verified_at: verifiedAt });
      setPhoneOtpVisible(false);

      return true;
    } catch {
      return false;
    }
  };
  // Cálculo do preço falhou: distingue "ainda não pedimos o preço" (1º render) de
  // "pedimos e correu mal" — só no segundo caso se mostra o hint/retry ao cliente.
  const [priceError, setPriceError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "mb_way">("mb_way");

  // Pagamento com cartão à espera de 3DS: guarda o serviço já criado e o URL de validação
  // para nunca repetir o POST (que criaria serviço e autorização duplicados no cartão).
  const pending3dsRef = useRef<{ serviceId: string; validationUrl: string; checks: number } | null>(null);
  const checking3dsRef = useRef(false);
  // Lock síncrono contra duplo-submit de pagamento (fecha a janela de duplo-clique
  // antes de openingService re-renderizar o botão). Mesmo padrão do validatingRef do OTP.
  const submittingRef = useRef(false);
  const sendingRef = useRef(false);
  // O guard beforeRemove existe para o user não fugir do checkout a meio de um pagamento.
  // Mas as navegações do PRÓPRIO fluxo (dismissAll do sucesso, dismissTo do 3DS) acontecem
  // com openingService ainda a true e eram travadas pelo mesmo guard — o checkout ficava
  // preso na stack por baixo do ecrã seguinte. Este ref abre a porta APENAS nesses pontos,
  // sempre imediatamente antes da navegação, e é reposto a false a cada nova submissão.
  const allowLeaveRef = useRef(false);

  const [openMbWayPhoneModal, setOpenMbWayPhoneModal] = useState(false);
  const [mbWayPhone, setMbWayPhone] = useState<string | null>(null);
  const [customerNIF, setCustomerNIF] = useState<string>("");
  const [customerNotes, setCustomerNotes] = useState<string>("");
  const [servicePhotos, setServicePhotos] = useState<ServicePhoto[]>([]);

  // NIF de faturação: pré-preenchido a partir do perfil (Dados de faturação),
  // com fallback no NIF da conta; nunca sobrepõe o que o cliente escrever.
  const nifPrefetchedRef = useRef(false);
  useEffect(() => {
    if (isGuest || nifPrefetchedRef.current) return;
    nifPrefetchedRef.current = true;
    api
      .get(API_ROUTES.GET_BILLING_INFO)
      .then((res) => {
        const nif = res.data?.data?.billingInfo?.nif || userData?.nif;
        if (nif && /^\d{9}$/.test(String(nif))) {
          setCustomerNIF((prev) => (prev && prev.length > 0 ? prev : String(nif)));
        }
      })
      .catch(() => {
        const nif = userData?.nif;
        if (nif && /^\d{9}$/.test(String(nif))) {
          setCustomerNIF((prev) => (prev && prev.length > 0 ? prev : String(nif)));
        }
      });
  }, [isGuest]);
  const [showPaymentOptions, setShowPaymentOptions] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [billingInfo, setBillingInfo] = useState<{
    name: string | null;
    nif: string | null;
    address: string | null;
    postal_code: string | null;
    locality: string | null;
  } | null>(null);

  const [showExcludes, setShowExcludes] = useState(false);
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [voucher, setVoucher] = useState<{
    id: number;
    name: string;
    discount_percentage: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<
    { id: string; label: string; enabled: boolean }[]
  >([]);
  const [guestPhone, setGuestPhone] = useState<string>(
    guestSession?.guest_phone ?? "",
  );
  const [guestPaymentMethods, setGuestPaymentMethods] = useState<
    PaymentMethod[]
  >([]);
  const [otpState, setOtpState] = useState<"idle" | "sent" | "verified">(
    "idle",
  );
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<any>(null);
  const otpSentAtRef = useRef<number | null>(null);
  const paymentMethodInitializedRef = useRef(false);
  const otpSentPhoneRef = useRef<string | null>(null);

  // Pré-preenche o MB Way com o número já validado (conta, ou OTP do convidado)
  // para pagar sem passos extra; editável no cartão de pagamento.
  useEffect(() => {
    if (mbWayPhone) return;
    const candidate = (
      userData?.phone_number ||
      (otpState === "verified" ? guestPhone : "") ||
      ""
    ).replace(/[\s.\-]/g, "");
    if (/^(\+351)?9\d{8}$/.test(candidate)) {
      setMbWayPhone(candidate.startsWith("+351") ? candidate : `+351${candidate}`);
    }
  }, [userData?.phone_number, otpState]);
  const [mockCode, setMockCode] = useState<string | undefined>(undefined);

  const serviceType = serviceToRequest?.service_type?.id;
  const vendorId = serviceToRequest?.vendor?.id;

  /**
   * Modo seleção de profissional — ver docs/matching.md no backend.
   *
   * O serviço JÁ existe no servidor, com técnico escolhido e preço congelado:
   * aqui só se cobra. No fluxo antigo é o contrário — este ecrã é que cria o
   * serviço, e o `[serviceId]` da rota é o id do TIPO de serviço, não de um
   * serviço real. Por isso o modo tem de vir num parâmetro explícito: pelo
   * valor não há como distinguir um do outro.
   */
  const routeParams = useLocalSearchParams();
  const isMatching = routeParams.matching === '1';
  const matchingServiceId = isMatching ? String(routeParams.serviceId) : null;
  // Congelado no momento da escolha. Recalcular aqui daria outro número: a
  // comissão da plataforma varia com a hora do dia, e o cliente veria um preço
  // no ecrã de escolha e outro no de pagamento.
  const matchingAmount = isMatching && routeParams.amount ? Number(routeParams.amount) : null;

  const sendOtpDisabled =
    isRegistering || !guestPhone || guestPhone === "+351";

  const isPaymentMethodEnabled = (id: string) => {
    if (availablePaymentMethods.length === 0) return true;
    const found = availablePaymentMethods.find((m) => m.id === id);
    return found ? found.enabled : true;
  };

  const getPreferredPaymentMethod = (methods: PaymentMethod[] | null | undefined): PaymentMethod | 'mb_way' => {
    if (!methods || methods.length === 0) return 'mb_way';
    return methods.find((item) => item.isDefault) ?? methods[0];
  };

  const getNewestPaymentMethod = (methods: PaymentMethod[] | null | undefined): PaymentMethod | 'mb_way' => {
    if (!methods || methods.length === 0) return 'mb_way';

    return [...methods].sort((a, b) => {
      const aCreatedAt = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreatedAt = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (aCreatedAt !== bCreatedAt) {
        return bCreatedAt - aCreatedAt;
      }

      return b.id - a.id;
    })[0];
  };

  // checkout_started: emitir só depois de checkoutData existir (no mount é null e o
  // price ia sempre undefined); guarda para não repetir em recálculos posteriores.
  const checkoutStartedTrackedRef = useRef(false);
  useEffect(() => {
    if (checkoutStartedTrackedRef.current || !checkoutData) return;
    checkoutStartedTrackedRef.current = true;
    track("checkout_started", {
      service_name: serviceToRequest?.service_type?.name,
      technician_id: vendorId,
      price: checkoutData?.value_for_payment,
    });
  }, [checkoutData]);

  useEffect(() => {
    if (!paymentMethods && session) fetchPaymentMethods();
    api
      .get(API_ROUTES.COMMON_GET_PAYMENT_METHODS)
      .then((res) => {
        const methods = res?.data?.data?.payment_methods;
        if (Array.isArray(methods)) setAvailablePaymentMethods(methods);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const methods = isGuest ? guestPaymentMethods : paymentMethods;
    const preferredMethod = getPreferredPaymentMethod(methods);

    // O ramo do auto-select vive fora do updater: chamar o setState do WalletProvider
    // dentro dele corre na fase de render e o React proíbe atualizar outro componente aí.
    if (shouldAutoSelectNewestPaymentMethod) {
      if (!methods || methods.length === 0) {
        return;
      }

      clearAutoSelectNewestPaymentMethod();
      setPaymentMethod(getNewestPaymentMethod(methods));
      return;
    }

    setPaymentMethod((current) => {
      if (!paymentMethodInitializedRef.current) {
        paymentMethodInitializedRef.current = true;
        return preferredMethod;
      }

      if (current === 'mb_way') {
        return 'mb_way';
      }

      const matchedMethod = methods?.find((item) => item.id === current.id);
      return matchedMethod ?? preferredMethod;
    });
  }, [isGuest, paymentMethods, guestPaymentMethods, shouldAutoSelectNewestPaymentMethod, clearAutoSelectNewestPaymentMethod]);

  // Reidratação do rascunho após cancelar/recusar um pagamento: repõe o formulário sem o
  // cliente preencher tudo de novo. Declarado DEPOIS do effect de inicialização do método
  // acima para, no mesmo render, ter a última palavra sobre o paymentMethod.
  const draftHydratedRef = useRef(false);
  useEffect(() => {
    if (draftHydratedRef.current || !checkoutDraft) return;

    // Rascunho de outro serviço: descartar para não poluir este pedido.
    if (checkoutDraft.serviceTypeId !== String(serviceType)) {
      setCheckoutDraft(null);
      draftHydratedRef.current = true;
      return;
    }

    // Campos simples — reidratação imediata.
    setCustomerNIF((prev) => checkoutDraft.customerNIF || prev);
    setVoucherCode(checkoutDraft.voucherCode);
    setVoucher(checkoutDraft.voucher);
    setMbWayPhone(checkoutDraft.mbWayPhone);
    if (checkoutDraft.guestPhone) setGuestPhone(checkoutDraft.guestPhone);

    // Método de pagamento — resolve o id na lista carregada; espera-a se ainda não chegou.
    if (checkoutDraft.paymentMethodId === "mb_way") {
      setPaymentMethod("mb_way");
      paymentMethodInitializedRef.current = true;
      draftHydratedRef.current = true;
      return;
    }

    const methods = isGuest ? guestPaymentMethods : paymentMethods;
    const found = methods?.find((m) => m.id === checkoutDraft.paymentMethodId);
    if (found) {
      setPaymentMethod(found);
      paymentMethodInitializedRef.current = true;
      draftHydratedRef.current = true;
    } else if (methods && methods.length > 0) {
      // Métodos já carregaram mas o cartão do rascunho já não existe: manter o resto.
      draftHydratedRef.current = true;
    }
  }, [checkoutDraft, serviceType, paymentMethods, guestPaymentMethods, isGuest]);

  const snapshotCheckoutDraft = () => {
    if (!serviceType) return;
    setCheckoutDraft({
      serviceTypeId: String(serviceType),
      paymentMethodId: paymentMethod === "mb_way" ? "mb_way" : paymentMethod.id,
      customerNIF,
      voucherCode,
      voucher,
      mbWayPhone,
      guestPhone,
    });
  };

  useEffect(() => {
    calculateService();
  }, [serviceType, vendorId, dataToMakeSchedule, scheduledService, voucher]);

  useEffect(() => {
    const subscription = navigation.addListener("beforeRemove", (e) => {
      if (!openingService) {
        track("checkout_abandoned", { reason: "back" });
        return;
      }

      // Saída autorizada pelo próprio fluxo de pagamento (sucesso, recusa ou entrega ao
      // ecrã de espera): tem de passar, senão o dismissAll/dismissTo é engolido e o
      // checkout fica vivo na stack por baixo do ecrã seguinte.
      if (allowLeaveRef.current) return;

      e.preventDefault();
    });

    return subscription;
  }, [navigation, openingService]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        track("checkout_abandoned", { reason: "app_background" });
      }
      if (state === "active" && pending3dsRef.current) {
        // Voltou do app do banco (3DS): confirmar o pagamento e avançar sem cliques.
        resolve3dsRef.current?.(3, true);
      }
    });

    return () => subscription.remove();
  }, []);

  // Failsafe absoluto: o user NUNCA pode ficar preso no overlay de processamento.
  // Se por qualquer caminho imprevisto o estado não for reposto (o request tem timeout
  // de 30s), este watchdog força o regresso ao checkout com mensagem de erro.
  useEffect(() => {
    if (!openingService) return;
    const failsafe = setTimeout(() => {
      setOpeningService(false);
      setOpenServiceError(t("errors.occurred_an_error"));
    }, 45000);

    return () => clearTimeout(failsafe);
  }, [openingService]);

  const getBillingInfoRef = useRef<() => void>();

  const getBillingInfo = () => {
    const url =
      isGuest && guestSession?.guest_token
        ? `${API_ROUTES.GET_BILLING_INFO}?guest_token=${guestSession.guest_token}`
        : API_ROUTES.GET_BILLING_INFO;
    api.get(url).then((response) => {
      const data = response.data.data;
      setBillingInfo(data.billingInfo);
      if (isGuest && Array.isArray(data.paymentMethods)) {
        setGuestPaymentMethods(data.paymentMethods);
      }
    });
  };

  getBillingInfoRef.current = getBillingInfo;

  useLayoutEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      getBillingInfoRef.current?.();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    getBillingInfoRef.current?.();
  }, [session]);


  // Pedido criado: o serviço sai do cesto (se lá estava)
  const clearFromCart = () => {
    const stId = serviceToRequest?.service_type?.id;
    if (stId) removeCartItem(stId);
  };

  const calculateService = () => {
    if (!serviceType || !vendorId) return;
    setIsLoading(true);
    setPriceError(false);

    // Modo seleção: o preço já foi decidido e mostrado ao cliente quando ele
    // escolheu. Pedir um recálculo aqui traria outro valor (a comissão muda com
    // a hora) e o cliente veria o preço mudar entre escolher e pagar. O saldo e
    // o cupão continuam a ser aplicados no servidor, no momento da cobrança.
    if (isMatching && matchingAmount !== null) {
      setCheckoutData({
        amount: matchingAmount,
        amount_formated: (matchingAmount / 100).toFixed(2),
        balance: 0,
        balance_formated: '0.00',
        balance_after_payment: 0,
        balance_after_payment_formated: '0.00',
        balance_total_used: 0,
        balance_total_used_formated: '0.00',
        value_for_payment: matchingAmount,
        value_for_payment_formated: (matchingAmount / 100).toFixed(2),
      } as CheckoutRequest);
      setIsLoading(false);

      return;
    }

    const isScheduled = Boolean(dataToMakeSchedule) || scheduledService;
    const payload: any = {
      service_type: serviceType,
      quantity: serviceQuantity,
      vendor_id: vendorId,
      scheduled: isScheduled,
      is_guest: isGuest,
    };

    if (isGuest && guestSession?.guest_address) {
      payload.address = {
        latitude: guestSession.guest_address.latitude,
        longitude: guestSession.guest_address.longitude,
        street_name: guestSession.guest_address.street_name,
        street_number: guestSession.guest_address.street_number,
        postal_code: guestSession.guest_address.postal_code,
        city: guestSession.guest_address.city,
        state: guestSession.guest_address.state,
        country: guestSession.guest_address.country,
      };
    }

    if (voucher?.id) {
      payload.voucher_id = voucher.id;
    }
    api
      .post(API_ROUTES.CUSTOMER_CALCULATE_SERVICE, payload)
      .then((response) => {
        setCheckoutData(response.data.data);
      })
      .catch((error) => {
        setPriceError(true);
        openDialog({
          title: t("errors.title"),
          subtitle: t("errors.server_error"),
          closeAfterMSeconds: 2000,
          closeOnClickOutside: true,
        });
        /*if (router.canGoBack()) {
          router.back();
        } else {
          router.dismissAll();
        }*/
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const validateVoucher = () => {
    if (!voucherCode.trim()) {
      setVoucher(null);
      setVoucherError(null);
      calculateService();
      return;
    }

    setValidatingVoucher(true);
    setVoucherError(null);

    const isScheduled = dataToMakeSchedule !== null;

    api
      .post(API_ROUTES.POST_VALIDATE_VOUCHER, {
        voucher_name: voucherCode.trim(),
        service_type: serviceType,
      quantity: serviceQuantity,
        is_scheduled: isScheduled,
      })
      .then((response) => {
        const voucherData = response.data.data.voucher;
        setVoucher(voucherData);
        setVoucherError(null);
        track("checkout_input_filled", { field: "voucher_code", voucher_code: voucherCode.trim() });
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          t("services.checkout.voucher.invalid");
        setVoucherError(errorMessage);
        setVoucher(null);
        track("checkout_voucher_error", { voucher_code: voucherCode.trim(), error: errorMessage });
      })
      .finally(() => {
        setValidatingVoucher(false);
      });
  };

  useEffect(() => {
    if (!billingInfo) return;
    const hasMissing =
      billingInfo.name === null ||
      billingInfo.nif === null ||
      billingInfo.address === null ||
      billingInfo.postal_code === null ||
      billingInfo.locality === null;
    if (hasMissing) {
      track("checkout_billing_info_missing");
    }
  }, [billingInfo]);

  const goToWaitAccept = (serviceId: string | number) => {
    // Pagamento concluído: a saída é do fluxo, não do user — libertar o guard beforeRemove.
    allowLeaveRef.current = true;
    pending3dsRef.current = null;
    clearFromCart();
    clearCheckoutState(); // pagamento concluído: um novo pedido parte do zero
    if (router.canDismiss()) {
      router.dismissAll();
      router.navigate(
        `/(app)/(modals)/(services)/(request)/wait-accept/${serviceId}`,
      );
    } else {
      router.push(
        `/(app)/(modals)/(services)/(request)/wait-accept/${serviceId}`,
      );
    }
  };

  const checkPending3dsStatus = async (
    serviceId: string | number,
  ): Promise<"paid" | "pending" | "refused"> => {
    try {
      await api.get(API_ROUTES.GET_SERVICE_PAYMENT_STATUS(String(serviceId)));
      return "paid";
    } catch (error: any) {
      if (error?.response?.status === 402) return "refused";
      return "pending";
    }
  };

  // Reconciliação pós-3DS: ao voltar do app do banco (ex.: Wise) a sessão do browser
  // fecha com "cancel"/"dismiss" mesmo com o pagamento já autorizado. Verificar o estado
  // no backend (que consulta a Payshop e marca pago) em vez de deixar o user repetir o
  // checkout. Com silent=true só navega em caso de pagamento confirmado — usado quando o
  // browser 3DS ainda pode estar aberto e um dialog por baixo dele seria enganador.
  const resolvePending3ds = async (attempts: number, silent = false) => {
    const pending = pending3dsRef.current;
    if (!pending || checking3dsRef.current) return;
    checking3dsRef.current = true;
    try {
      let status: "paid" | "pending" | "refused" = "pending";
      for (let i = 0; i < attempts; i++) {
        status = await checkPending3dsStatus(pending.serviceId);
        if (status !== "pending") break;
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      if (status === "paid") {
        try {
          WebBrowser.dismissAuthSession();
        } catch {}
        track("service_confirmed", {
          price: checkoutData?.value_for_payment,
          is_new_user: isGuest,
        });
        goToWaitAccept(pending.serviceId);
        return;
      }

      if (silent) return;

      if (status === "refused") {
        pending3dsRef.current = null;
        track("checkout_payment_error", {
          payment_method: "credit_card",
          error: "3ds_refused",
        });
        // Recusa confirmada pelo backend (402): ecrã de recusa, coerente com o open3dsBrowser.
        allowLeaveRef.current = true; // saída do fluxo, não do user
        // O modo e o serviço viajam com o pedido: em modo seleção, "tentar de
        // novo" tem de voltar a pagar ESTE serviço, não criar outro.
        router.dismissTo(
          isMatching
            ? {
                pathname: "/(app)/(modals)/(services)/(request)/checkout/card/denied" as const,
                params: { serviceId: String(matchingServiceId), matching: "1", amount: String(matchingAmount ?? "") },
              }
            : ("/(app)/(modals)/(services)/(request)/checkout/card/denied" as any),
        );
        return;
      }

      pending.checks += 1;
      if (pending.checks >= 3) {
        // 3DS provavelmente abandonado/expirado: libertar o fluxo para um novo pedido.
        pending3dsRef.current = null;
        openDialog({
          icon: <XIcon color={Colors.secondary} />,
          title: t("services.checkout.payment_methods.failed.title"),
          subtitle: t("services.checkout.payment_methods.failed.subtitle"),
          closeAfterMSeconds: 3000,
          closeOnClickOutside: true,
        });
        return;
      }

      // O Dialog dispara onCancel também no backdrop e no back do Android — por isso a
      // re-verificação (inócua se acidental) fica no onCancel e a reabertura da página
      // do banco só acontece no botão primário explícito.
      openDialog({
        title: t("services.checkout.three_ds.pending_title"),
        subtitle: t("services.checkout.three_ds.pending_subtitle"),
        successButtonText: t("services.checkout.three_ds.reopen"),
        cancelButtonText: t("services.checkout.three_ds.check_again"),
        onSuccess: () => {
          open3dsBrowser(pending.validationUrl);
        },
        onCancel: () => {
          resolvePending3ds(3);
        },
      });
    } finally {
      checking3dsRef.current = false;
    }
  };

  const open3dsBrowser = async (validationUrl: string) => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        validationUrl,
        "piquet.customer:://",
        {
          dismissButtonStyle: "cancel",
          readerMode: false,
          showTitle: true,
          toolbarColor: Colors.primary,
          secondaryToolbarColor: "black",
          preferEphemeralSession: true,
        },
      );

      const pending = pending3dsRef.current;
      if (!pending) return; // já resolvido pela auto-verificação ao voltar do banco

      const returnUrl = result.type === "success" ? result.url : "";
      const reconcileServiceId = pending.serviceId;

      // 3DS aprovado e confirmado pelo backend.
      if (returnUrl.startsWith("piquet.customer:://validation/success")) {
        track("service_confirmed", {
          price: checkoutData?.value_for_payment,
          is_new_user: isGuest,
        });
        goToWaitAccept(pending.serviceId);
        return;
      }

      // Recusa explícita do banco: o backend redirecionou para o deep link de falha e já
      // marcou o serviço CANCELED. Ir DIRETO para o ecrã de recusa — nunca para o de espera.
      if (returnUrl.startsWith("piquet.customer:://(app)/(bottom-sheets)/failed")) {
        pending3dsRef.current = null;
        track("checkout_payment_error", {
          payment_method: "credit_card",
          error: "3ds_refused",
        });
        allowLeaveRef.current = true; // saída do fluxo, não do user
        // O modo e o serviço viajam com o pedido: em modo seleção, "tentar de
        // novo" tem de voltar a pagar ESTE serviço, não criar outro.
        router.dismissTo(
          isMatching
            ? {
                pathname: "/(app)/(modals)/(services)/(request)/checkout/card/denied" as const,
                params: { serviceId: String(matchingServiceId), matching: "1", amount: String(matchingAmount ?? "") },
              }
            : ("/(app)/(modals)/(services)/(request)/checkout/card/denied" as any),
        );
        return;
      }

      // Restantes retornos (validation/pending, aprovação fora da app na Wise, cancel/dismiss):
      // desfecho ainda por confirmar → ecrã de espera, que faz polling ao checkPaymentStatus.
      // Sem webhook Payshop, um settle tardio TEM de ser apanhado por polling — não podemos
      // desistir aos ~6s. O polling resolve para confirmed (200) ou denied (402).
      pending3dsRef.current = null; // impede o AppState listener de reagir a um fluxo já entregue
      clearFromCart();
      allowLeaveRef.current = true; // entrega ao ecrã de espera: saída do fluxo, não do user
      router.dismissTo({
        pathname: "/(app)/(modals)/(services)/(request)/checkout/card/waiting",
        // O modo viaja com o pedido: sem isto, um pagamento de seleção que caia
        // aqui voltava ao checkout em modo antigo e o botão de tentar de novo
        // criava um SERVIÇO NOVO em vez de pagar o que já existe.
        params: isMatching
          ? { serviceId: reconcileServiceId, matching: '1', amount: String(matchingAmount ?? '') }
          : { serviceId: reconcileServiceId },
      });
    } catch (error) {
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: t("errors.title"),
        subtitle: (error as any).message,
        closeAfterMSeconds: 2000,
        closeOnClickOutside: true,
      });
    }
  };

  const resolve3dsRef = useRef<typeof resolvePending3ds>();
  resolve3dsRef.current = resolvePending3ds;

  //we will need to add  the nif in ths request if the customer wishes to add it? - check how billing works
  const handleOpenService = () => {
    if (paymentMethod === "mb_way") {
      handleOpenServiceWithMbWay();
      return;
    }

    if (!serviceType || !vendorId) return;

    // Nova tentativa: o guard beforeRemove volta a fechar até o fluxo autorizar a saída.
    allowLeaveRef.current = false;

    if (pending3dsRef.current) {
      // Já existe um pagamento 3DS em curso: reconciliar em vez de criar outro pedido.
      setOpenServiceError(null); // erro da tentativa anterior não pode acompanhar a nova
      setOpeningService(true);
      resolvePending3ds(2).finally(() => setOpeningService(false));
      return;
    }

    // Guardar o rascunho antes de criar o pedido: se recusar/cancelar, o cliente volta ao
    // checkout com tudo preenchido.
    snapshotCheckoutDraft();

    track("checkout_confirm_pressed", { payment_method: typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.brand });
    if (submittingRef.current) return;
    submittingRef.current = true;
    // Nova tentativa: limpar o erro da anterior, senão fica visível por baixo do CTA
    // durante o processamento (e até ao lado do ecrã de sucesso).
    setOpenServiceError(null);
    setOpeningService(true);
    const payload: any = {
      service_type: serviceType,
      quantity: serviceQuantity,
      vendor_id: vendorId,
      payment_method: paymentMethod?.id,
    };

    if (isGuest) {
      if (guestPhone.trim()) payload.phone_number = guestPhone.trim();
      if (guestSession?.guest_token)
        payload.guest_token = guestSession.guest_token;
      if (guestSession?.guest_address)
        payload.address = guestSession.guest_address;
    }

    if (voucher?.id) {
      payload.voucher_id = voucher.id;
    }

    if (customerNIF && customerNIF.trim().length > 0 && !error) {
      payload.nif = customerNIF.trim();
    }
    if (customerNotes && customerNotes.trim().length > 0) {
      payload.customer_notes = customerNotes.trim();
    }
    // So as que subiram. Uma foto por subir ou falhada nao segura o pagamento:
    // o pedido e valido sem ela, e prender a cobranca a um upload seria trocar
    // um contratempo por uma reserva perdida.
    const uploadedPhotoIds = servicePhotos
      .filter((photo) => photo.status === "done" && photo.id)
      .map((photo) => photo.id);
    if (uploadedPhotoIds.length > 0) {
      payload.photo_ids = uploadedPhotoIds;
    }
    if (campaignLogId) {
      payload.campaign_log_id = campaignLogId;
    }
    if (dataToMakeSchedule) {
      payload.scheduled = true;
      payload.schedule = {
        scheduled_day: dataToMakeSchedule.scheduled_day,
        scheduled_time_start: dataToMakeSchedule.scheduled_time_start,
        scheduled_time_end: dataToMakeSchedule.scheduled_time_end,
      };
    } else {
      payload.scheduled = false;
    }

    api
      // timeout: sem ele, um servidor pendurado deixava o user preso no overlay de processamento
      //
      // Modo seleção: o serviço já existe e já tem técnico — aqui só se cobra,
      // por isso o corpo é mínimo. A RESPOSTA tem a mesma forma nos dois casos
      // (`service.id` e `payment_validationUrl`), e é por isso que todo o
      // tratamento a seguir — 3DS, deep links, navegação — serve os dois sem
      // uma única alteração.
      .post(
        isMatching ? API_ROUTES.MATCHING_CHECKOUT(matchingServiceId!) : API_ROUTES.POST_OPEN_SERVICE,
        isMatching
          ? {
              method: 'credit_card',
              payment_method: paymentMethod?.id,
              ...(voucher?.id ? { voucher_id: voucher.id } : {}),
            }
          : payload,
        { timeout: 30000 }
      )
      .then(async ({ data }) => {
        clearCampaignLogId();
        if (data.data.payment_validationUrl) {
          pending3dsRef.current = {
            serviceId: String(data.data.service.id),
            validationUrl: data.data.payment_validationUrl,
            checks: 0,
          };
          await open3dsBrowser(data.data.payment_validationUrl);
        } else {
          track("service_confirmed", {
            price: checkoutData?.value_for_payment,
            is_new_user: isGuest,
          });
          goToWaitAccept(data.data.service.id);
          return;
        }
      })
      .catch((error) => {
        // Falha sem resposta (rede/timeout) não pode ser silenciosa: fallback genérico.
        const errorMsg = error.response?.data?.message || t("errors.occurred_an_error");
        setOpenServiceError(errorMsg);
        track("checkout_payment_error", { payment_method: typeof paymentMethod === "string" ? paymentMethod : paymentMethod?.brand, error: errorMsg });
      })
      .finally(() => {
        submittingRef.current = false;
        setOpeningService(false);
      });
  };

  const handleOpenServiceWithMbWay = () => {
    if (!mbWayPhone) {
      setOpenMbWayPhoneModal(true);
      return;
    }
    if (!serviceType || !vendorId || !serviceType) return;

    // Nova tentativa: o guard beforeRemove volta a fechar até o fluxo autorizar a saída.
    allowLeaveRef.current = false;

    // Mesmo motivo do cartão: guardar o rascunho ANTES de criar o pedido. Sem isto, uma
    // recusa/expiração do MB WAY devolvia o cliente a um checkout vazio (o ecrã de recusa
    // reidrata a partir deste rascunho). O clearCheckoutState dos ecrãs "confirmed" garante
    // que o rascunho não sobrevive a um pagamento bem sucedido.
    snapshotCheckoutDraft();

    track("checkout_confirm_pressed", { payment_method: "mb_way" });
    if (submittingRef.current) return;
    submittingRef.current = true;
    // Nova tentativa: limpar o erro da anterior (ver handleOpenService).
    setOpenServiceError(null);
    setOpeningService(true);
    const payload: any = {
      service_type: serviceType,
      quantity: serviceQuantity,
      vendor_id: vendorId,
      mbway_phone: mbWayPhone.replace("+351", ""),
    };

    if (isGuest) {
      if (guestPhone.trim()) payload.phone_number = guestPhone.trim();
      if (guestSession?.guest_token)
        payload.guest_token = guestSession.guest_token;
    }

    if (voucher?.id) {
      payload.voucher_id = voucher.id;
    }

    if (customerNIF && customerNIF.trim().length > 0 && !error) {
      payload.nif = customerNIF.trim();
    }
    if (customerNotes && customerNotes.trim().length > 0) {
      payload.customer_notes = customerNotes.trim();
    }
    // So as que subiram. Uma foto por subir ou falhada nao segura o pagamento:
    // o pedido e valido sem ela, e prender a cobranca a um upload seria trocar
    // um contratempo por uma reserva perdida.
    const uploadedPhotoIds = servicePhotos
      .filter((photo) => photo.status === "done" && photo.id)
      .map((photo) => photo.id);
    if (uploadedPhotoIds.length > 0) {
      payload.photo_ids = uploadedPhotoIds;
    }
    if (campaignLogId) {
      payload.campaign_log_id = campaignLogId;
    }
    if (dataToMakeSchedule) {
      payload.scheduled = true;
      payload.schedule = {
        scheduled_day: dataToMakeSchedule.scheduled_day,
        scheduled_time_start: dataToMakeSchedule.scheduled_time_start,
        scheduled_time_end: dataToMakeSchedule.scheduled_time_end,
      };
    } else {
      payload.scheduled = false;
    }

    api
      // timeout: sem ele, um servidor pendurado deixava o user preso no overlay de processamento
      // Ver a nota no pagamento por cartão: em modo seleção muda só o endpoint
      // e o corpo, a resposta tem a mesma forma.
      .post(
        isMatching ? API_ROUTES.MATCHING_CHECKOUT(matchingServiceId!) : API_ROUTES.POST_OPEN_SERVICE_MBWAY,
        isMatching
          ? {
              method: 'mbway',
              mbway_phone: mbWayPhone.replace('+351', ''),
              ...(voucher?.id ? { voucher_id: voucher.id } : {}),
            }
          : payload,
        { timeout: 30000 }
      )
      .then((response) => {
        const service = response.data.data.service;
        track("service_confirmed", {
          price: checkoutData?.value_for_payment,
          is_new_user: isGuest,
        });
        // O overlay TEM de cair antes da navegação: o listener "beforeRemove" faz
        // e.preventDefault() enquanto openingService for true e bloquearia o dismissAll.
        // Mas o lock síncrono (submittingRef) fica FECHADO até o ecrã ser substituído:
        // durante o ~1s até à navegação o CTA volta a ficar tocável e, sem o lock, um
        // segundo toque criava um SEGUNDO pagamento MB Way.
        setOpeningService(false);
        clearCampaignLogId();

        clearFromCart();
        setTimeout(() => {
          // Redundante com o setOpeningService(false) acima, mas independente do timing do
          // re-render: garante que o guard beforeRemove não engole este dismissAll.
          allowLeaveRef.current = true;
          router.dismissAll();
          router.dismissTo({
            pathname:
              "/(app)/(modals)/(services)/(request)/checkout/mb-way/waiting",
            params: {
              serviceId: service.id,
            },
          });
        }, 1000);
      })
      .catch((error) => {
        // Único ramo que liberta o lock: aqui não foi criado pagamento nenhum, logo o
        // cliente tem de poder tentar de novo. (Este catch está encadeado a seguir ao
        // then, por isso também apanha uma exceção lançada lá dentro.)
        submittingRef.current = false;
        // Falha sem resposta (rede/timeout) não pode ser silenciosa: fallback genérico.
        const errorMsg = error.response?.data?.message || t("errors.occurred_an_error");
        setOpenServiceError(errorMsg);
        track("checkout_payment_error", { payment_method: "mb_way", error: errorMsg });
      })
      .finally(() => {
        // No finally (não no catch): mesmo que algo acima lance, o overlay NUNCA fica preso.
        setOpeningService(false);
      });
  };

  const startOtpTimer = () => {
    setOtpResendTimer(30);
    if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    otpTimerRef.current = setInterval(() => {
      setOtpResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(otpTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatPhone = (raw: string) => {
    const stripped = raw.replace(/^\+351/, "").replace(/\D/g, "");
    return `+351${stripped}`;
  };

  const handleSendOtp = async () => {
    if (sendingRef.current) return;
    const formatted = formatPhone(guestPhone);
    if (!guestPhone || formatted.length < 13) {
      Alert.alert(t("errors.title"), t("general.phone_number_invalid"));
      return;
    }

    if (getRemainingCooldown() > 0) {
      setOtpState("sent");
      return;
    }

    sendingRef.current = true;
    track("phone_entered");
    setIsRegistering(true);
    try {
      const res = await api.post(API_ROUTES.GUEST_SEND_OTP, {
        phone_number: formatted,
      });
      track("sms_sent");
      otpSentAtRef.current = Date.now();
      otpSentPhoneRef.current = formatted;
      setOtpState("sent");
      startOtpTimer();
      const mockCode = res?.data?.data?.mock_code;
      if (mockCode) {
         setMockCode(mockCode);
       }
    } catch (error: any) {
      Alert.alert(
        t("errors.title"),
        error.response?.data?.message || t("errors.occurred_an_error"),
      );
    } finally {
      setIsRegistering(false);
      sendingRef.current = false;
    }
  };

  const handleVerifyOtp = async (code: string) => {
    const formatted = formatPhone(guestPhone);
    setIsRegistering(true);
    try {
      const verifyRes = await api.post(API_ROUTES.GUEST_VERIFY_OTP, {
        phone_number: formatted,
        code,
      });
      const token = verifyRes.data.data.verification_token;

      const registerRes = await api.post(API_ROUTES.GUEST_REGISTER, {
        phone_number: formatted,
        verification_token: token,
        address: {
          latitude: guestSession?.guest_address?.latitude,
          longitude: guestSession?.guest_address?.longitude,
          street_name: guestSession?.guest_address?.street_name,
          street_number: guestSession?.guest_address?.street_number,
          additional_info: guestSession?.guest_address?.additional_info,
          postal_code: guestSession?.guest_address?.postal_code,
          city: guestSession?.guest_address?.city,
          state: guestSession?.guest_address?.state,
          country: guestSession?.guest_address?.country,
        },
      });
      setSession(registerRes.data.data.access_token);
      saveGuestPhone(formatted);
      setOtpState("verified");
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
      const timeToVerify = otpSentAtRef.current
        ? Math.round((Date.now() - otpSentAtRef.current) / 1000)
        : undefined;
      track("sms_verified", { time_to_verify_seconds: timeToVerify });
    } catch (error: any) {
      Alert.alert(
        t("errors.title"),
        error.response?.data?.message || t("errors.occurred_an_error"),
      );
      return;
    } finally {
      setIsRegistering(false);
      return;
    }
  };

  const addNIF = (value: any) => {
    setCustomerNIF(value);

    if (typeof value === "string" && value?.trim()?.length === 0) {
      setError("");
    }

    const isValid = validateNIF(value);

    if (!isValid) setError(t("services.checkout.nif_invalid"));
    else setError("");
  };

  const getRemainingCooldown = () => {
    if (!otpSentAtRef.current) return 0;
    if (otpSentPhoneRef.current !== formatPhone(guestPhone)) return 0; // número mudou → libera envio
    const elapsed = (Date.now() - otpSentAtRef.current) / 1000;
    return Math.max(0, Math.ceil(OTP_TTL_SECONDS - elapsed));
  };
  useEffect(() => {
    if (typeof customerNIF === "string" && customerNIF.length === 0)
      setError("");
  }, [customerNIF]);

  // Duração real do serviço (service_type.time vem em minutos do backend)
  const durationLabel = (() => {
    const mins = serviceToRequest?.service_type?.time;
    if (typeof mins !== "number" || mins <= 0) return null;
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  })();

  // Data da reserva por extenso. Mostrava a data em bruto do backend
  // ("2026-08-11 · 14:00–14:30"): formato ISO não é para ler, e o intervalo
  // repetia aqui o erro que já corrigi nos outros ecrãs — o scheduled_time_end
  // é o tamanho da marcação, não uma janela de chegada acordada com o cliente.
  const bookingDateLabel = dataToMakeSchedule
    ? [
        formatBookingDay(dataToMakeSchedule.scheduled_day, i18n.language),
        formatScheduledTime(dataToMakeSchedule.scheduled_time_start),
      ]
        .filter(Boolean)
        .join(" · ")
    : t("services.checkout.resume.date_asap");

  // Desconto de voucher efetivamente aplicado (0 quando não há).
  const voucherDiscount =
    voucher && !voucherError && checkoutData?.amount !== undefined && checkoutData?.value_for_payment !== undefined
      ? Math.max(
          0,
          checkoutData.amount - checkoutData.value_for_payment - (checkoutData?.balance_total_used ?? 0),
        )
      : 0;

  // Inclusões e exclusões do tipo de serviço — vêm no service_type que o catálogo
  // já mete inteiro no serviceToRequest, por isso não há pedido novo.
  const includes = Array.isArray(serviceToRequest?.service_type?.includes)
    ? (serviceToRequest?.service_type?.includes as string[]).filter(Boolean)
    : [];
  const excludes = Array.isArray(serviceToRequest?.service_type?.excludes)
    ? (serviceToRequest?.service_type?.excludes as string[]).filter(Boolean)
    : [];

  // "912 345 678" — sem indicativo, agrupado para leitura
  const mbWayPhonePretty = mbWayPhone
    ? mbWayPhone.replace(/^\+?351/, "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
    : null;

  const selectedPaymentLabel =
    paymentMethod === "mb_way"
      ? t("services.checkout.payment_methods.mb_way")
      : paymentMethod
        ? `${paymentMethod.brand} ****${paymentMethod.last4}`
        : t("services.checkout.payment_methods.choose");

  // CTA de pagar: em vez de o esconder quando desativado, mostra-se desativado com um hint
  // do que falta. Só guard visual/UX — o handleOpenService (e os seus locks) fica intacto.

  // Sem service_type/vendor não há preço nem pedido possível: o calculateService e o
  // handleOpenService já fazem return silencioso, por isso o botão TEM de refletir isso.
  const isMissingServiceContext = !serviceType || !vendorId;
  // Preço ainda não calculado (1º render ou o calculateService falhou): nunca deixar
  // confirmar um pagamento sem o valor ter sido mostrado ao cliente.
  const isPriceUnavailable = !checkoutData;
  // NIF preenchido mas inválido: o payload descarta-o em silêncio e a fatura sairia sem
  // contribuinte. Bloquear até corrigir ou limpar o campo.
  const hasInvalidNif = customerNIF.trim().length > 0 && !!error;

  const isCtaDisabled =
    !paymentMethod ||
    isLoading ||
    openingService ||
    isMissingServiceContext ||
    isPriceUnavailable ||
    hasInvalidNif ||
    (isGuest && otpState !== "verified");

  // Enquanto isLoading (carregamento normal) não se mostra hint de preço — só quando o
  // cálculo já terminou e mesmo assim não há valor.
  const canRetryPrice =
    isPriceUnavailable && !isLoading && !isMissingServiceContext && priceError;
  const ctaHint = isMissingServiceContext
    ? t("services.checkout.cta_hint_missing_service")
    : isGuest && otpState !== "verified"
      ? t("services.checkout.validate_phone_hint")
      : canRetryPrice
        ? t("services.checkout.cta_hint_price_unavailable")
        : hasInvalidNif
          ? t("services.checkout.cta_hint_invalid_nif")
          : null;

  return (
    <SafeAreaView className="flex-1 bg-primary">
      {/* Utilizador com sessão: mesma caixa do fluxo de convidado, endpoints
          diferentes (auth/sms-validation em vez de auth/guest/phone). */}
      <ValidatePhoneModal
        visible={phoneOtpVisible}
        onClose={() => setPhoneOtpVisible(false)}
        phoneNumber={userData?.phone_number}
        onValidate={handleVerifyPhoneCode}
        onResend={handleSendPhoneCode}
        onVerified={() => setPhoneOtpVisible(false)}
      />

      <ValidatePhoneModal
        visible={otpState === "sent"}
        onClose={() => setOtpState("idle")}
        phoneNumber={guestPhone}
        onValidate={(code) => handleVerifyOtp(code)}
        onResend={() => handleSendOtp()}
        onVerified={() => {}}
        resendRemainingSeconds={getRemainingCooldown()}
        mockCode={mockCode}
      />

      {/* <StatusBar backgroundColor={Colors.primary} animated /> */}

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText color="secondary" boldness="bold" numberOfLines={1}>
            {t("services.checkout.header")}
          </CustomText>
          // <CustomTouchableOpacity
          //   size="small"
          //   type="transparent"
          //   className="flex flex-row items-center"
          //   onPress={() => router.navigate('/(app)/(modals)/(address)/update')}
          // >
          //   <CustomText color="secondary" boldness="bold" numberOfLines={1}>
          //     {t('services.checkout.header')}
          //   </CustomText>
          //   <Entypo name="chevron-down" size={20} color={Colors.secondary} />
          // </CustomTouchableOpacity>
        )}
        rigthItem={() => (
          <TouchableOpacity
            className="flex items-end"
            onPress={() => {
              if (openingService) return;
              router.push("/(app)/(bottom-sheets)/(services)/service-details");
            }}
          >
            {/* <Feather name="help-circle" size={30} color={Colors.secondary} /> */}
          </TouchableOpacity>
        )}
        otherClasses="p-5"
        disabled={openingService}
      />

      <View
        className="flex-1 rounded-t-3xl space-y-4 overflow-hidden"
        style={{ backgroundColor: "#FAF7F2" }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            <View className="space-y-6">
              <View className="p-5 space-y-6">
                {(billingInfo?.name === null ||
                  billingInfo?.nif === null ||
                  billingInfo?.address === null ||
                  billingInfo?.postal_code === null ||
                  billingInfo?.locality === null) && (
                  <View>
                    <TouchableOpacity
                      onPress={() => {
                        router.push("/(app)/(modals)/(payments)/invoice-data");
                      }}
                      className="flex-row justify-between items-center bg-[#6A40DA] p-3 rounded-xl"
                    >
                      <View className="w-[10%]">
                        <View className="w-7 h-7">
                          <AttentionIcon color={Colors.secondary} />
                        </View>
                      </View>
                      <View className="w-[90%]">
                        <CustomText color="secondary">
                          {t("complete_profile.invoice_data")}
                        </CustomText>
                      </View>
                    </TouchableOpacity>

                    <View className="mt-6 h-[1px] w-full bg-gray_strong"></View>
                  </View>
                )}


              </View>
              {(
                <>
                  <View className="px-5 space-y-4">
                    {/* <CustomText color="secondary" size="extraLarge" boldness="semiBold" numberOfLines={1}>
                    {t('services.checkout.resume.title')}
                  </CustomText> */}

                    <CartQueueProgress classes="mb-4" />

                    {/* Cartão da reserva.
                        Antes eram quatro linhas todas com o mesmo peso — etiqueta
                        cinzenta + valor — incluindo "O teu pedido: Desentupimento
                        de Cano". Mas o serviço não é um dado entre quatro: é o
                        assunto do ecrã. Passa a título do cartão, e os outros três
                        perdem a etiqueta, porque o ícone já diz o que são (uma
                        morada com um pin não precisa da palavra "Morada"). Quatro
                        filetes passam a um. */}
                    <View
                      className="bg-support_secondary rounded-2xl p-4"
                      style={{
                        shadowColor: "#000",
                        shadowOpacity: 0.05,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 2,
                      }}
                    >
                      <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                        {t("services.checkout.resume.your_request")}
                      </CustomText>
                      {isLoading ? (
                        <View className="rounded-full overflow-hidden w-[70%] h-6 mt-1 bg-support_primary" />
                      ) : (
                        // "2 × Reparacao de torneira" em vez de so o nome: e aqui
                        // que o cliente confirma o que esta a comprar antes de
                        // pagar, e sem o numero o total mais alto nao tem
                        // explicacao no ecra onde ele decide.
                        <CustomText color="secondary" size="extraLarge" boldness="bold" numberOfLines={2} classes="mt-0.5">
                          {serviceQuantity > 1
                            ? `${serviceQuantity} × ${serviceToRequest?.service_type?.name ?? ""}`
                            : serviceToRequest?.service_type?.name}
                        </CustomText>
                      )}

                      <View className="h-[1px] w-full bg-support_primary my-3.5" />

                      {/* Técnico · quando · onde. Sem etiquetas: o ícone é a etiqueta.
                          O leitor de ecrã continua a ouvi-las via accessibilityLabel. */}
                      <View
                        className="flex-row items-center"
                        accessibilityLabel={`${t("services.checkout.resume.assigned_technician")}: ${serviceToRequest?.vendor?.name ?? ""}`}
                      >
                        <View
                          className="w-9 h-9 rounded-xl items-center justify-center"
                          style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
                        >
                          <Feather name="user" size={16} color={Colors.secondary} />
                        </View>
                        <View className="flex-1 flex-row items-center ml-3">
                          <CustomText color="secondary" size="medium" boldness="semiBold" numberOfLines={1}>
                            {serviceToRequest?.vendor?.name}
                          </CustomText>
                          {typeof serviceToRequest?.vendor?.rating === "number" &&
                            serviceToRequest.vendor.rating > 0 && (
                              <>
                                <Feather name="star" size={12} color={Colors.primary} style={{ marginLeft: 8 }} />
                                <CustomText color="gray_medium" size="small" boldness="semiBold" classes="ml-1">
                                  {serviceToRequest.vendor.rating.toFixed(1).replace(".", i18n.language === "pt_PT" ? "," : ".")}
                                </CustomText>
                              </>
                            )}
                        </View>
                      </View>

                      <View
                        className="flex-row items-center mt-3"
                        accessibilityLabel={`${t("services.checkout.resume.date")}: ${bookingDateLabel}`}
                      >
                        <View
                          className="w-9 h-9 rounded-xl items-center justify-center"
                          style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
                        >
                          <Feather name="calendar" size={16} color={Colors.secondary} />
                        </View>
                        <CustomText color="secondary" size="medium" boldness="semiBold" numberOfLines={2} classes="flex-1 ml-3">
                          {bookingDateLabel}
                        </CustomText>
                      </View>

                      <View
                        className="flex-row items-center mt-3"
                        accessibilityLabel={`${t("services.checkout.resume.address")}: ${addressLabel ?? ""}`}
                      >
                        <View
                          className="w-9 h-9 rounded-xl items-center justify-center"
                          style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
                        >
                          <Feather name="map-pin" size={16} color={Colors.secondary} />
                        </View>
                        <View className="flex-1 ml-3">
                          <CustomText color="secondary" size="medium" boldness="semiBold" numberOfLines={2}>
                            {addressLabel}
                          </CustomText>
                          {!isGuest && userData?.address?.additional_info && (
                            <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                              {userData?.address?.additional_info}
                            </CustomText>
                          )}
                        </View>
                      </View>

                      {/* O que NÃO está incluído, colapsado.
                          Só as exclusões — as inclusões são material de venda e a
                          decisão já foi tomada há três ecrãs; repeti-las aqui
                          reabre uma discussão fechada. As exclusões são a única
                          coisa neste ecrã que pode produzir surpresa DEPOIS de o
                          dinheiro sair, e uma surpresa dessas custa reembolso,
                          deslocação perdida e suporte.
                          Fechado por omissão: custa uma linha, e quem tem dúvida
                          abre. Forçar a leitura obrigaria a bloquear o botão, e
                          isso paga-se em conversão. */}
                      {excludes.length > 0 && (
                        <>
                          <View className="h-[1px] w-full bg-support_primary my-3.5" />
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setShowExcludes((prev) => !prev)}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: showExcludes }}
                            className="flex-row items-center"
                          >
                            <View
                              className="w-9 h-9 rounded-xl items-center justify-center"
                              style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
                            >
                              <Feather name="info" size={16} color={Colors.secondary} />
                            </View>
                            <CustomText color="secondary" size="medium" boldness="semiBold" numberOfLines={1} classes="flex-1 ml-3">
                              {t("services.checkout.resume.scope_title")}
                            </CustomText>
                            <Feather
                              name={showExcludes ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={Colors.gray_medium}
                            />
                          </TouchableOpacity>

                          {showExcludes && (
                            <View className="mt-3 ml-12">
                              {/* As duas listas, e não só as exclusões. Quem abre
                                  isto pediu detalhe: mostrar apenas o que NÃO vai
                                  ter, a vermelho e mesmo antes de pagar, é metade
                                  da verdade — e é a metade que assusta. */}
                              {includes.length > 0 && (
                                <View className="mb-3">
                                  <CustomText color="secondary" size="small" boldness="bold" classes="mb-1.5">
                                    {t("services.select_service_type.includes")}
                                  </CustomText>
                                  {includes.map((item, index) => (
                                    <View key={`include-${index}`} className="flex-row items-start mb-1">
                                      <Feather name="check" size={13} color={Colors.success} style={{ marginTop: 3 }} />
                                      <CustomText color="gray_medium" size="small" boldness="regular" classes="flex-1 ml-2">
                                        {item.charAt(0).toUpperCase() + item.slice(1)}
                                      </CustomText>
                                    </View>
                                  ))}
                                </View>
                              )}

                              <CustomText color="secondary" size="small" boldness="bold" classes="mb-1.5">
                                {t("services.select_service_type.excludes")}
                              </CustomText>
                              {excludes.map((item, index) => (
                                <View key={`exclude-${index}`} className="flex-row items-start mb-1">
                                  <Feather name="x" size={13} color={Colors.error} style={{ marginTop: 3 }} />
                                  <CustomText color="gray_medium" size="small" boldness="regular" classes="flex-1 ml-2">
                                    {item.charAt(0).toUpperCase() + item.slice(1)}
                                  </CustomText>
                                </View>
                              ))}
                            </View>
                          )}
                        </>
                      )}
                    </View>

                    {/* Cartão: Informação sobre o pedido (notas) */}
                    <View
                      className="bg-support_secondary rounded-2xl p-4"
                      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                    >
                      <View className="flex-row items-center mb-1">
                        <Feather name="edit-3" size={18} color={Colors.secondary} />
                        <CustomText color="secondary" size="medium" boldness="bold" classes="ml-2">
                          {t("services.checkout.notes_title")}
                        </CustomText>
                      </View>
                      <CustomText color="gray_medium" size="small" boldness="regular" classes="mb-3">
                        {t("services.checkout.notes_hint")}
                      </CustomText>
                      <TextInput
                        value={customerNotes}
                        onChangeText={setCustomerNotes}
                        placeholder={t("services.checkout.notes_placeholder")}
                        placeholderTextColor={Colors.gray_medium}
                        multiline
                        textAlignVertical="top"
                        style={{ minHeight: 88, borderWidth: 1, borderColor: "#E4E3E3", borderRadius: 12, padding: 12, fontFamily: "Poppins_400Regular", fontSize: 14, color: Colors.secondary }}
                      />

                      {/* As fotos vivem no mesmo cartao das notas porque sao a
                          mesma coisa dita de outra maneira: o que o tecnico
                          precisa de saber antes de sair. Separa-las em dois
                          cartoes faria parecer dois pedidos diferentes. */}
                      <ServicePhotosPicker photos={servicePhotos} onChange={setServicePhotos} />
                    </View>

                    {/*
                    <View className="py-2">
                      <View className="h-[2px] w-full bg-gray_strong"></View>
                    </View> */}

                    {/* <View className="flex flex-row justify-between items-center">
                      <View className="flex-1 mr-5">
                        <CustomText
                          color="secondary"
                          size="large"
                          boldness="semiBold"
                          numberOfLines={1}
                        >
                          {t("services.checkout.resume.value_to_pay")}
                        </CustomText>
                      </View>
                      <View className="flex-row justify-end">
                        {isLoading ? (
                          <View className="rounded-full overflow-hidden w-20 h-5">
                            <View className="w-full h-full bg-[#111215]"></View>
                          </View>
                        ) : (
                          <CustomText
                            color="secondary"
                            size="large"
                            boldness="semiBold"
                            numberOfLines={1}
                          >
                            {checkoutData?.value_for_payment !== undefined
                              ? renderMoney(checkoutData?.value_for_payment)
                              : ""}
                          </CustomText>
                        )}
                      </View>
                    </View> */}
                  {/* Cartão: Pagamento */}
                  <View
                    className="bg-support_secondary rounded-2xl p-4"
                    style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                  >
                    {/* Linha colapsada: método selecionado + Alterar */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center space-x-3">
                        <Feather
                          name={paymentMethod === "mb_way" ? "smartphone" : "credit-card"}
                          size={20}
                          color={Colors.secondary}
                        />
                        <View className="flex-1">
                          <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                            {t("services.checkout.payment_methods.selected_label")}
                          </CustomText>
                          <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                            {selectedPaymentLabel}
                          </CustomText>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowPaymentOptions((v) => !v)}
                        disabled={isLoading}
                        className="pl-3 py-1"
                      >
                        <CustomText color="primary" size="medium" boldness="semiBold" numberOfLines={1}>
                          {t("services.checkout.payment_methods.change")}
                        </CustomText>
                      </TouchableOpacity>
                    </View>

                    {paymentMethod === "mb_way" && mbWayPhonePretty && (
                      <View>
                        <View className="h-[1px] w-full bg-support_primary mt-3" />
                        <TouchableOpacity
                          onPress={() => setOpenMbWayPhoneModal(true)}
                          className="flex-row items-center justify-between pt-3"
                        >
                          <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                            {t("services.checkout.payment_methods.mb_way_number")}
                          </CustomText>
                          <View className="flex-row items-center">
                            <CustomText color="secondary" size="medium" boldness="semiBold" numberOfLines={1}>
                              {mbWayPhonePretty}
                            </CustomText>
                            <Feather name="edit-2" size={13} color={Colors.gray_medium} style={{ marginLeft: 8 }} />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}

                    {showPaymentOptions && (<>
                    <View className="pt-4">
                      <CustomTouchableOpacity
                        size="small"
                        type="transparent"
                        className="flex-row justify-between items-center  pb-2"
                        onPress={() => {
                          setPaymentMethod("mb_way");
                          setShowPaymentOptions(false);
                          track("checkout_input_filled", { field: "payment_method", method: "mb_way" });
                        }}
                        disabled={!isPaymentMethodEnabled("mbway")}
                      >
                        <View className="flex-1 flex-row space-x-2 items-center justify-start">
                          <View
                            style={{ width: 30, height: 30,  }}
                            className={`items-start justify-center ${!isPaymentMethodEnabled("mbway") ? "opacity-40" : ""}`}
                          >
                            <MbWay width={30} />
                          </View>
                          <CustomText
                            color={
                              isPaymentMethodEnabled("mbway")
                                ? "secondary"
                                : "gray_medium"
                            }
                            size="medium"
                            boldness="semiBold"
                            numberOfLines={1}
                          >
                            {t("services.checkout.payment_methods.mb_way")}
                          </CustomText>
                        </View>
                        <View className="flex items-end justify-center h-6 w-6">
                          <View
                            className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                              paymentMethod === "mb_way"
                                ? "border-primary"
                                : "border-gray_strong"
                            }`}
                          >
                            {paymentMethod === "mb_way" && (
                              <View className="h-3 w-3 rounded-full bg-primary" />
                            )}
                          </View>
                        </View>
                      </CustomTouchableOpacity>
                      <View className="h-[1px] mt-2 w-full bg-support_primary"></View>
                    </View>

                      {isLoading && isPaymentMethodEnabled("credit_card") ? (
                      <View className="space-y-0">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <View key={`loading-payment-method-${index}`} className="">
                            <View className="pt-4 pb-4">
                              <View className="space-x-2 flex-row items-center">
                              <View className="rounded-md overflow-hidden w-9 h-7">
                                <View className="w-full h-full bg-[#111215]"></View>
                              </View>
                              <View className="flex-1">
                                <View className="rounded-md overflow-hidden w-[30%] h-3">
                                  <View className="w-full h-full bg-[#111215]"></View>
                                </View>
                                {index === 0 && (
                                  <View className="rounded-md overflow-hidden w-[40%] h-2 mt-1">
                                    <View className="w-full h-full bg-[#111215]"></View>
                                  </View>
                                )}
                              </View>
                            </View>

                            </View>
                                <View className="h-[1px] mt-0 w-full bg-support_primary"></View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="space-y-0">
                        {isPaymentMethodEnabled("credit_card") &&
                          (isGuest ? guestPaymentMethods : paymentMethods)?.map(
                            (item, index) => {
                              const {
                                last4,
                                brand,
                                brand_description,
                                id,
                                isDefault,
                              } = item;

                              return (
                                <View key={index} className="">
                                  <CustomTouchableOpacity
                                    size="small"
                                    type="transparent"
                                    className="flex-row justify-between items-center pt-3 pb-2"
                                    onPress={() => {
                                      setPaymentMethod(item);
                                      setShowPaymentOptions(false);
                                      track("checkout_input_filled", { field: "payment_method", method: item.brand, last4: item.last4 });
                                    }}
                                    disabled={isLoading}
                                  >
                                    <View className="flex-1 flex-row space-x-2 items-center">
                                      {brand === "VISA" && (
                                        <FontAwesome6
                                          name="cc-visa"
                                          size={30}
                                          color={Colors.gray_medium}
                                        />
                                      )}
                                      {brand === "MASTERCARD" ||
                                        (brand === "MASTER" && (
                                          <FontAwesome6
                                            name="cc-mastercard"
                                            size={30}
                                            color={Colors.gray_medium}
                                          />
                                        ))}
                                      <View>
                                        <CustomText
                                          color="secondary"
                                          size="medium"
                                          boldness="regular"
                                          numberOfLines={1}
                                        >
                                          {brand} ****{last4}
                                        </CustomText>
                                        {isDefault && (
                                          <CustomText
                                            color="gray_medium"
                                            size="extraSmall"
                                            boldness="regular"
                                            numberOfLines={1}
                                          >
                                            {t(
                                              "services.checkout.payment_methods.is_default_method_label",
                                            )}
                                          </CustomText>
                                        )}
                                      </View>
                                    </View>
                                    <View className="flex items-end justify-center ">
                                      <View
                                        className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                                          paymentMethod !== "mb_way" &&
                                          paymentMethod?.id === id
                                            ? "border-primary"
                                            : "border-gray_strong"
                                        }`}
                                      >
                                        {paymentMethod !== "mb_way" &&
                                          paymentMethod?.id === id && (
                                            <View className="h-3 w-3 rounded-full bg-primary" />
                                          )}
                                      </View>
                                    </View>
                                  </CustomTouchableOpacity>
                                  <View className="h-[1px] mt-2 w-full bg-support_primary"></View>
                                </View>
                              );
                            },
                          )}
                      </View>
                    )}

                 <View className="pt-4">
                     {isPaymentMethodEnabled("credit_card") && (
                      <View>
                        <CustomTouchableOpacity
                          size="small"
                          type="transparent"
                          className="flex-row justify-between items-center mb-2"
                          onPress={() =>
                            router.navigate(
                              "/(app)/(bottom-sheets)/new-payment-method",
                            )
                          }
                          disabled={isLoading}
                        >
                          <View className="flex-1 flex-row space-x-2 items-center">
                            <View>
                             <FontAwesome6
                               name="credit-card"
                                size={30}
                                color={Colors.gray_medium}
                                        />
                            </View>
                            <CustomText
                              color="secondary"
                              size="medium"
                              boldness="semiBold"
                              numberOfLines={1}
                            >
                              {t(
                                "services.checkout.payment_methods.add_new_credit_card",
                              )}
                            </CustomText>
                          </View>
                          <View className="flex items-end h-3 w-3">
                            <ArrowIcon
                              position="right"
                              color={Colors.secondary}
                            />
                          </View>
                        </CustomTouchableOpacity>
                        <View className="h-[1px] mt-2 w-full bg-support_primary"></View>
                      </View>
                    )}
                 </View>
                  </>)}
                  </View>

                    {/* Faturação e descontos, num cartão como tudo o resto. Eram
                        os únicos blocos soltos, sem cartão, o que os fazia parecer
                        sobras do ecrã em vez de extras opcionais. E descem para
                        depois do pagamento porque é isso que são — opcionais não
                        podem ficar entre o cliente e a decisão principal. */}
                    <View
                      className="bg-support_secondary rounded-2xl p-4"
                      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                    >
                      <CustomText color="gray_medium" size="small" boldness="regular" classes="mb-3" numberOfLines={1}>
                        {t("services.checkout.extras_title")}
                      </CustomText>
                      <View style={{ gap: 16 }}>
                        {/* NIF */}
                        <View>
                          <CustomText color="secondary" size="small" boldness="semiBold" numberOfLines={1} classes="mb-2">
                            {t("services.checkout.nif_label")}
                          </CustomText>
                          <CustomTextInput
                            value={customerNIF}
                            keyboardType="numeric"
                            onChangeText={addNIF}
                            onBlur={() => {
                              if (customerNIF.trim().length > 0) {
                                track("checkout_input_filled", { field: "nif", is_valid: !error });
                              }
                            }}
                            placeholder="Ex.: 123 456 789"
                            maxLength={80}
                          />
                        </View>
                        {/* Cupão */}
                        <View>
                          <CustomText color="secondary" size="small" boldness="semiBold" numberOfLines={1} classes="mb-2">
                            {t("services.checkout.voucher.title")}
                          </CustomText>
                          <View className="flex-row items-center" style={{ gap: 6 }}>
                            <View className="flex-1">
                              <CustomTextInput
                                size="medium"
                                value={voucherCode}
                                text={voucherCode}
                                onChangeText={(text: string) => setVoucherCode(text.toUpperCase())}
                                placeholder={t("services.checkout.voucher.placeholder")}
                                fontSize="small"
                                textColor="secondary"
                                textBoldness="regular"
                                error={!!voucherError}
                                displayErrorIcon={!!voucherError}
                                success={!!voucher && !voucherError}
                                displaySuccessIcon={!!voucher && !voucherError}
                                disabled={isLoading || validatingVoucher}
                                onSubmitEditing={validateVoucher}
                              />
                            </View>
                            <CustomTouchableOpacity
                              size="small"
                              type="primary"
                              textColor="secondary"
                              textBoldness="semiBold"
                              text={t("services.checkout.voucher.apply")}
                              onPress={validateVoucher}
                              disabled={isLoading || validatingVoucher}
                            />
                          </View>
                        </View>
                      </View>

                      {error ? (
                        <CustomText color="error" size="small" boldness="regular" classes="mt-2">
                          {error}
                        </CustomText>
                      ) : null}
                      {voucherError ? (
                        <CustomText color="error" size="small" boldness="regular" classes="mt-1">
                          {voucherError}
                        </CustomText>
                      ) : null}
                      {voucher && !voucherError ? (
                        <CustomText color="success" size="small" boldness="regular" classes="mt-1">
                          {t("services.checkout.voucher.applied", { discount: voucher.discount_percentage })}
                        </CustomText>
                      ) : null}
                    </View>
                  {/* Cartão: Totais */}
                  <View
                    className="bg-support_secondary rounded-2xl p-4"
                    style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <CustomText color="secondary" size="medium" boldness="regular">
                        {t("services.checkout.resume.subtotal")}
                      </CustomText>
                      {isLoading ? (
                        <View className="rounded-full overflow-hidden w-16 h-4">
                          <View className="w-full h-full bg-[#111215]"></View>
                        </View>
                      ) : (
                        <CustomText color="secondary" size="medium" boldness="bold">
                          {renderMoney(checkoutData?.amount ?? null)}
                        </CustomText>
                      )}
                    </View>

                    {/* Deslocação em separado, dentro do subtotal — não é um extra a
                        somar, é a composição do valor já mostrado acima. Só aparece
                        quando o backend manda a parcela (não existe no fluxo de
                        matching, que parte de um preço já congelado sem essa quebra). */}
                    {checkoutData?.travel_amount !== undefined && (
                      <View className="flex-row justify-between items-center mb-2">
                        <CustomText color="gray_medium" size="small" boldness="regular">
                          {t("services.checkout.resume.travel")}
                        </CustomText>
                        <CustomText color="gray_medium" size="small" boldness="regular">
                          {renderMoney(checkoutData.travel_amount)}
                        </CustomText>
                      </View>
                    )}

                    {checkoutData?.balance_total_used !== undefined &&
                      checkoutData?.balance_total_used > 0 && (
                        <View className="flex-row justify-between items-center mb-2">
                          <CustomText color="gray_medium" size="small" boldness="regular">
                            {t("services.checkout.resume.balance_to_be_used")}
                          </CustomText>
                          <CustomText color="gray_medium" size="small" boldness="regular">
                            −{renderMoney(checkoutData?.balance_total_used)}
                          </CustomText>
                        </View>
                      )}

                    {/* A linha de descontos só aparece quando há desconto. Estava
                        sempre visível com um travessão: uma linha que nunca soma
                        nada é ruído, e um "—" não comunica "nenhum". */}
                    {voucherDiscount > 0 && (
                      <View className="flex-row justify-between items-center mb-2">
                        <CustomText color="secondary" size="medium" boldness="regular">
                          {t("services.checkout.resume.discounts")}
                        </CustomText>
                        <CustomText color="success" size="medium" boldness="bold">
                          −{renderMoney(voucherDiscount)}
                        </CustomText>
                      </View>
                    )}

                    <View className="h-[1px] w-full bg-support_primary my-2"></View>

                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-end space-x-2">
                        <CustomText color="secondary" size="large" boldness="bold">
                          {t("services.checkout.resume.total")}
                        </CustomText>
                        <CustomText color="gray_medium" size="extraSmall" boldness="regular">
                          {t("services.checkout.resume.vat_included")}
                        </CustomText>
                      </View>
                      {isLoading ? (
                        <View className="rounded-full overflow-hidden w-20 h-6">
                          <View className="w-full h-full bg-[#111215]"></View>
                        </View>
                      ) : (
                        <CustomText color="secondary" size="extraLarge" boldness="bold">
                          {checkoutData?.value_for_payment !== undefined
                            ? renderMoney(checkoutData?.value_for_payment)
                            : ""}
                        </CustomText>
                      )}
                    </View>
                  </View>

                  {/* Banner de confiança do pagamento */}
                  <View
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
                  >
                    <View className="flex-row items-center mb-3">
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: "rgba(250,187,91,0.35)" }}
                      >
                        <Feather name="lock" size={16} color={Colors.secondary} />
                      </View>
                      <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                        {t("services.checkout.secure_title")}
                      </CustomText>
                    </View>
                    {([
                      { icon: "shield" as const, key: "secure_row_data" },
                      { icon: "credit-card" as const, key: "secure_row_charge" },
                      { icon: "rotate-ccw" as const, key: "cancel_policy" },
                    ]).map((row, i) => (
                      <View key={row.key} className={`flex-row items-center ${i > 0 ? "mt-2" : ""}`}>
                        <Feather name={row.icon} size={13} color={Colors.success} />
                        <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="ml-2 flex-1">
                          {t(`services.checkout.${row.key}`)}
                        </CustomText>
                      </View>
                    ))}
                  </View>


                  </View>
                </>
              )}
            </View>
        </ScrollView>
        <View className="px-5 pb-5 pt-2">
          {openServiceError && (
            <CustomText color="error" classes="text-center pb-2">
              {openServiceError}
            </CustomText>
          )}
          {ctaHint && (
            <CustomText color="gray_medium" size="small" boldness="regular" classes="text-center pb-2">
              {ctaHint}
            </CustomText>
          )}
          {/* Telemóvel por verificar: o servidor recusa o pedido (can_request_service),
              e sem isto o cliente preenchia tudo, tocava em pagar, e lia "verifica o
              teu número" sem ter um único sítio na app onde o fazer — o aviso da Home
              está comentado. Avisar ANTES vale mais do que explicar depois.

              Não desativa o botão de propósito: o `userData` pode estar desatualizado
              (ex.: verificou noutra sessão) e bloquear com base nisso criaria uma
              recusa falsa. O servidor continua a ser a autoridade. */}
          {needsPhoneVerification && (
            <TouchableOpacity
              onPress={handleSendPhoneCode}
              disabled={sendingPhoneOtp}
              activeOpacity={0.85}
              className="flex-row items-center rounded-xl px-3 py-3 mb-2"
              style={{ backgroundColor: "#F3EDFF", opacity: sendingPhoneOtp ? 0.6 : 1 }}
            >
              <View className="w-6 h-6 mr-2">
                <AttentionIcon color="#6A40DA" />
              </View>
              <CustomText color="primary" size="small" classes="flex-1">
                {t("services.checkout.verify_phone_prompt")}
              </CustomText>
              <CustomText color="primary" size="small" boldness="bold">
                {sendingPhoneOtp
                  ? t("services.checkout.verify_phone_sending")
                  : t("services.checkout.verify_phone_action")}
              </CustomText>
            </TouchableOpacity>
          )}

          {/* O cálculo do preço falhou: sem isto o CTA desativado ficava sem saída. */}
          {canRetryPrice && (
            <TouchableOpacity
              onPress={calculateService}
              disabled={isLoading}
              className="pb-2"
            >
              <CustomText color="primary" size="small" boldness="semiBold" classes="text-center">
                {t("errors.try_again")}
              </CustomText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenService}
            disabled={isCtaDisabled}
            style={{
              backgroundColor: isCtaDisabled ? Colors.gray_strong : Colors.primary,
              borderRadius: 999,
              paddingVertical: 18,
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: isCtaDisabled ? 0.6 : 1,
              ...(isCtaDisabled
                ? {}
                : {
                    shadowColor: Colors.primary,
                    shadowOpacity: 0.55,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 8,
                  }),
            }}
          >
            <Feather name="lock" size={18} color={Colors.secondary} />
            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1} classes="ml-2">
              {checkoutData?.value_for_payment !== undefined
                ? `${t("services.checkout.confirm")}  ·  ${renderMoney(checkoutData?.value_for_payment)}`
                : t("services.checkout.confirm")}
            </CustomText>
          </TouchableOpacity>

        </View>
        
      </View>

      {openMbWayPhoneModal && (
        <View className="absolute bottom-0 left-0 w-full h-screen">
          <MbWayPhoneNumber
            onClose={() => setOpenMbWayPhoneModal(false)}
            onSave={(text: string) => setMbWayPhone(text)}
            initialPhoneNumber={userData?.phone_number || guestPhone}
          />
        </View>
      )}

      <ProcessingOverlay
        visible={openingService}
        title={t('services.checkout.processing.title')}
        subtitle={t('services.checkout.processing.subtitle')}
      />
    </SafeAreaView>
  );
};

export default Checkout;
