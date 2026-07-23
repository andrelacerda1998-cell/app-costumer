import { Colors } from "@/constants/Colors";
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
  const { userData, session } = useSession();
  const { serviceToRequest, scheduledService, checkoutDraft, setCheckoutDraft } = useService();
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "mb_way">("mb_way");

  // Pagamento com cartão à espera de 3DS: guarda o serviço já criado e o URL de validação
  // para nunca repetir o POST (que criaria serviço e autorização duplicados no cartão).
  const pending3dsRef = useRef<{ serviceId: string; validationUrl: string; checks: number } | null>(null);
  const checking3dsRef = useRef(false);
  // Lock síncrono contra duplo-submit de pagamento (fecha a janela de duplo-clique
  // antes de openingService re-renderizar o botão). Mesmo padrão do validatingRef do OTP.
  const submittingRef = useRef(false);
  const sendingRef = useRef(false);

  const [openMbWayPhoneModal, setOpenMbWayPhoneModal] = useState(false);
  const [mbWayPhone, setMbWayPhone] = useState<string | null>(null);
  const [customerNIF, setCustomerNIF] = useState<string>("");
  const [customerNotes, setCustomerNotes] = useState<string>("");
  const [showPaymentOptions, setShowPaymentOptions] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [billingInfo, setBillingInfo] = useState<{
    name: string | null;
    nif: string | null;
    address: string | null;
    postal_code: string | null;
    locality: string | null;
  } | null>(null);

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
  const [mockCode, setMockCode] = useState<string | undefined>(undefined);

  const serviceType = serviceToRequest?.service_type?.id;
  const vendorId = serviceToRequest?.vendor?.id;

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

  useEffect(() => {
    track("checkout_started", {
      service_name: serviceToRequest?.service_type?.name,
      technician_id: vendorId,
      price: checkoutData?.value_for_payment,
    });
  }, []);

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
    setCustomerNIF(checkoutDraft.customerNIF);
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

  const calculateService = () => {
    if (!serviceType || !vendorId) return;
    setIsLoading(true);

    const isScheduled = Boolean(dataToMakeSchedule) || scheduledService;
    const payload: any = {
      service_type: serviceType,
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
        console.log("Calculate customer", response);
        setCheckoutData(response.data.data);
      })
      .catch((error) => {
        console.log("Calculate customer", error);
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
    pending3dsRef.current = null;
    setCheckoutDraft(null); // pagamento concluído: um novo pedido parte do zero
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
        router.dismissTo(
          "/(app)/(modals)/(services)/(request)/checkout/card/denied",
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
        router.dismissTo(
          "/(app)/(modals)/(services)/(request)/checkout/card/denied",
        );
        return;
      }

      // Restantes retornos (validation/pending, aprovação fora da app na Wise, cancel/dismiss):
      // desfecho ainda por confirmar → ecrã de espera, que faz polling ao checkPaymentStatus.
      // Sem webhook Payshop, um settle tardio TEM de ser apanhado por polling — não podemos
      // desistir aos ~6s. O polling resolve para confirmed (200) ou denied (402).
      pending3dsRef.current = null; // impede o AppState listener de reagir a um fluxo já entregue
      router.dismissTo({
        pathname: "/(app)/(modals)/(services)/(request)/checkout/card/waiting",
        params: { serviceId: reconcileServiceId },
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

    if (pending3dsRef.current) {
      // Já existe um pagamento 3DS em curso: reconciliar em vez de criar outro pedido.
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
    setOpeningService(true);
    const payload: any = {
      service_type: serviceType,
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
      .post(API_ROUTES.POST_OPEN_SERVICE, payload, { timeout: 30000 })
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
    track("checkout_confirm_pressed", { payment_method: "mb_way" });
    if (submittingRef.current) return;
    submittingRef.current = true;
    setOpeningService(true);
    const payload: any = {
      service_type: serviceType,
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
      .post(API_ROUTES.POST_OPEN_SERVICE_MBWAY, payload, { timeout: 30000 })
      .then((response) => {
        const service = response.data.data.service;
        track("service_confirmed", {
          price: checkoutData?.value_for_payment,
          is_new_user: isGuest,
        });
        setOpeningService(false);
        clearCampaignLogId();

        setTimeout(() => {
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
        // Falha sem resposta (rede/timeout) não pode ser silenciosa: fallback genérico.
        const errorMsg = error.response?.data?.message || t("errors.occurred_an_error");
        setOpenServiceError(errorMsg);
        track("checkout_payment_error", { payment_method: "mb_way", error: errorMsg });
      })
      .finally(() => {
        // No finally (não no catch): mesmo que algo acima lance, o overlay NUNCA fica preso.
        submittingRef.current = false;
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

    if (!isValid) setError("NIF inserido não é válido.");
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
  console.log(otpInputRef.current, "otpInputRef.current")

  // Duração real do serviço (service_type.time vem em minutos do backend)
  const durationLabel = (() => {
    const mins = serviceToRequest?.service_type?.time;
    if (typeof mins !== "number" || mins <= 0) return null;
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  })();

  // Data da reserva: agendada (dia + janela) ou imediata
  const bookingDateLabel = dataToMakeSchedule
    ? `${dataToMakeSchedule.scheduled_day} · ${dataToMakeSchedule.scheduled_time_start}–${dataToMakeSchedule.scheduled_time_end}`
    : t("services.checkout.resume.date_asap");

  const selectedPaymentLabel =
    paymentMethod === "mb_way"
      ? t("services.checkout.payment_methods.mb_way")
      : paymentMethod
        ? `${paymentMethod.brand} ****${paymentMethod.last4}`
        : t("services.checkout.payment_methods.choose");

  return (
    <SafeAreaView className="flex-1 bg-primary">
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

                {/* Telefone (só convidados, até validar OTP) — a morada vive no Resumo da reserva */}
                {isGuest && otpState!=="verified"&&( <View
                  className="bg-support_secondary rounded-2xl p-4"
                  style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                >
                <View className="flex-row items-start space-x-3">
                  <View
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(250,187,91,0.2)" }}
                  >
                    <Feather name="phone" size={16} color={Colors.secondary} />
                  </View>
                  <View className="flex-1">
                  <CustomText
                    color="gray_medium"
                    size="small"
                    boldness="regular"
                    numberOfLines={1}
                  >
                    {t("general.phone_number")}
                  </CustomText>
                  {isGuest ? (
                    <View className="mt-1 space-y-4">
                      <View className="flex-row items-center space-x-2">
                        <View className="flex-1 flex-row items-center border border-gray-400 rounded-md bg-support_secondary px-3">
                          <CustomText
                            color="gray_medium"
                            size="small"
                            boldness="regular"
                          >
                            +351
                          </CustomText>
                          <TextInput
                            value={guestPhone.replace(/^\+351/, "")}
                            editable={otpState === "idle"}
                            onChangeText={(text) => {
                              const digits = text.replace(/\D/g, "");
                              setGuestPhone(`+351${digits}`);
                              saveGuestPhone(`+351${digits}`);
                            }}
                            onBlur={() => {
                              if (guestPhone.replace(/^\+351/, "").length > 0) {
                                track("checkout_input_filled", { field: "guest_phone" });
                              }
                            }}
                            placeholder="912 345 678"
                            placeholderTextColor={Colors.gray_strong}
                            keyboardType="phone-pad"
                            className="flex-1 py-3 pl-2 text-secondary text-sm font-poppins-regular"
                          />
                        </View>
                        {/* Nota: este bloco está dentro de otpState!=="verified",
                            por isso um ícone de "verificado" aqui nunca renderizava
                            (código morto removido na limpeza de tipos). */}
                      </View>
                      {otpState === "idle" && (<View>
                        <CustomTouchableOpacity
                          key={
                            sendOtpDisabled
                              ? "otp-btn-disabled"
                              : "otp-btn-enabled"
                          }
                          size="large"
                          type="primary"
                          textColor="secondary"
                          textBoldness="semiBold"
                          text={
                            isRegistering
                              ? t("general.loading")
                              : getRemainingCooldown() > 0
                                ? t("guest.checkout.enter_received_code") // mesmo número, código ainda válido
                                : t("guest.checkout.send_otp") // número novo / cooldown expirado
                          }
                          onPress={handleSendOtp}
                          disabled={sendOtpDisabled}
                        />
                        </View>)}

                      {/* {otpState === "sent" && (
                        <View className="space-y-4 py-2">
                          <CustomText
                            color="gray_medium"
                            size="small"
                            boldness="regular"
                            classes="text-center"
                          >
                            {t("guest.checkout.otp_sent_to", {
                              phone: formatPhone(guestPhone),
                            })}
                          </CustomText>
                          <OtpInput
                            ref={otpInputRef}
                            numberOfDigits={6}
                            onFilled={handleVerifyOtp}
                            focusColor={Colors.primary}
                            disabled={isRegistering}
                            theme={{
                              containerStyle: {
                                justifyContent: "center",
                                gap: 8,
                              },
                              pinCodeContainerStyle: {
                                borderColor: Colors.gray_strong,
                                borderRadius: 12,
                                backgroundColor: Colors.support_secondary,
                                width: 46,
                                height: 56,
                              },
                              pinCodeTextStyle: {
                                color: Colors.secondary,
                                fontSize: 20,
                              },
                              focusedPinCodeContainerStyle: {
                                borderColor: Colors.primary,
                                borderWidth: 2,
                              },
                            }}
                          />
                          {isRegistering && (
                            <CustomText
                              color="gray_medium"
                              size="small"
                              boldness="regular"
                              classes="text-center"
                            >
                              {t("general.loading")}
                            </CustomText>
                          )}
                          <TouchableOpacity
                            onPress={
                              otpResendTimer === 0 ? handleSendOtp : undefined
                            }
                            disabled={otpResendTimer > 0 || isRegistering}
                            className="items-center py-1"
                          >
                            <CustomText
                              color={
                                otpResendTimer > 0 ? "gray_medium" : "secondary"
                              }
                              size="small"
                              boldness={
                                otpResendTimer > 0 ? "regular" : "semiBold"
                              }
                            >
                              {otpResendTimer > 0
                                ? t("guest.checkout.otp_resend_in", {
                                    seconds: otpResendTimer,
                                  })
                                : t("guest.checkout.otp_resend")}
                            </CustomText>
                          </TouchableOpacity>
                        </View>
                      )} */}
                    </View>
                  ) : (
                    <CustomText
                      color="gray_medium"
                      size="small"
                      boldness="regular"
                      numberOfLines={1}
                    >
                      {userData?.phone_number ?? t("general.no_phone_number")}
                    </CustomText>
                  )}
                  </View>
                </View>
                </View>)}

              </View>
              {(!isGuest || otpState === "verified") && (
                <>
                  <View className="px-5 space-y-4">
                    {/* <CustomText color="secondary" size="extraLarge" boldness="semiBold" numberOfLines={1}>
                    {t('services.checkout.resume.title')}
                  </CustomText> */}

                    {/* Cartão: O seu pedido */}
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
                      <View className="flex-row items-center space-x-3">
                        <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: "rgba(250,187,91,0.2)" }}>
                          <Feather name="file-text" size={22} color={Colors.secondary} />
                        </View>
                        <View className="flex-1">
                          <CustomText color="gray_medium" size="small" boldness="regular">
                            {t("services.checkout.resume.your_request")}
                          </CustomText>
                          {isLoading ? (
                            <View className="rounded-full overflow-hidden w-[70%] h-5 mt-1">
                              <View className="w-full h-full bg-[#111215]"></View>
                            </View>
                          ) : (
                            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={2}>
                              {serviceToRequest?.service_type?.name}
                            </CustomText>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Cartão: Técnico escolhido */}
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
                      <CustomText color="gray_medium" size="small" boldness="regular" classes="mb-2">
                        {t("services.checkout.resume.assigned_technician")}
                      </CustomText>
                      {isLoading ? (
                        <View className="rounded-full overflow-hidden w-[70%] h-5">
                          <View className="w-full h-full bg-[#111215]"></View>
                        </View>
                      ) : (
                        <View className="flex-row items-center space-x-3">
                          <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(250,187,91,0.25)" }}>
                            <Feather name="user" size={20} color={Colors.secondary} />
                          </View>
                          <View className="flex-1">
                            <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={1}>
                              {serviceToRequest?.vendor?.name}
                            </CustomText>
                            {typeof serviceToRequest?.vendor?.rating === "number" && serviceToRequest.vendor.rating > 0 && (
                              <View className="flex-row items-center mt-0.5">
                                <Feather name="star" size={13} color={Colors.primary} />
                                <CustomText color="gray_medium" size="small" boldness="regular" classes="ml-1">
                                  {serviceToRequest.vendor.rating.toFixed(1)}
                                </CustomText>
                              </View>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                    {/* Cartão: Resumo da reserva */}
                    <View
                      className="bg-support_secondary rounded-2xl p-4"
                      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
                    >
                      <CustomText color="secondary" size="large" boldness="bold" classes="mb-3">
                        {t("services.checkout.resume.booking_title")}
                      </CustomText>

                      <View className="mb-3">
                        <View className="flex-row items-center space-x-2">
                          <Feather name="calendar" size={16} color={Colors.gray_medium} />
                          <CustomText color="gray_medium" size="medium" boldness="regular">
                            {t("services.checkout.resume.date")}
                          </CustomText>
                        </View>
                        <CustomText color="secondary" size="medium" boldness="bold" classes="mt-1">
                          {bookingDateLabel}
                        </CustomText>
                      </View>

                      <View>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center space-x-2">
                            <Feather name="map-pin" size={16} color={Colors.gray_medium} />
                            <CustomText color="gray_medium" size="medium" boldness="regular">
                              {t("services.checkout.resume.address")}
                            </CustomText>
                          </View>
                        </View>
                        <CustomText color="secondary" size="medium" boldness="bold" numberOfLines={2} classes="mt-1">
                          {addressLabel}
                        </CustomText>
                        {!isGuest && userData?.address?.additional_info && (
                          <CustomText color="gray_medium" size="small" boldness="regular" numberOfLines={1}>
                            {userData?.address?.additional_info}
                          </CustomText>
                        )}
                      </View>
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
                        placeholderTextColor={Colors.gray_light}
                        multiline
                        textAlignVertical="top"
                        style={{ minHeight: 88, borderWidth: 1, borderColor: "#E4E3E3", borderRadius: 12, padding: 12, fontFamily: "Poppins_400Regular", fontSize: 14, color: Colors.secondary }}
                      />
                    </View>

                    {/* NIF + Código de desconto (lado a lado, sem cartão) */}
                    <View>
                      <View className="flex-row" style={{ gap: 12 }}>
                        {/* NIF */}
                        <View style={{ flex: 4 }}>
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
                        <View style={{ flex: 6 }}>
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

                    <View className="flex-row justify-between items-center mb-2">
                      <CustomText color="secondary" size="medium" boldness="regular">
                        {t("services.checkout.resume.discounts")}
                      </CustomText>
                      {isLoading ? (
                        <View className="rounded-full overflow-hidden w-10 h-4">
                          <View className="w-full h-full bg-[#111215]"></View>
                        </View>
                      ) : voucher &&
                        !voucherError &&
                        checkoutData?.amount !== undefined &&
                        checkoutData?.value_for_payment !== undefined &&
                        checkoutData.amount - checkoutData.value_for_payment - (checkoutData?.balance_total_used ?? 0) > 0 ? (
                        <CustomText color="success" size="medium" boldness="bold">
                          −{renderMoney(checkoutData.amount - checkoutData.value_for_payment - (checkoutData?.balance_total_used ?? 0))}
                        </CustomText>
                      ) : (
                        <CustomText color="gray_medium" size="medium" boldness="regular">
                          —
                        </CustomText>
                      )}
                    </View>

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

                  {/* Nota: Pagamento seguro */}
                  <View
                    className="flex-row items-center rounded-2xl p-4"
                    style={{ backgroundColor: "rgba(250,187,91,0.15)" }}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: "rgba(250,187,91,0.35)" }}
                    >
                      <Feather name="lock" size={17} color={Colors.secondary} />
                    </View>
                    <View className="flex-1">
                      <CustomText color="secondary" size="medium" boldness="bold">
                        {t("services.checkout.secure_title")}
                      </CustomText>
                      <CustomText color="gray_medium" size="extraSmall" boldness="regular">
                        {t("services.checkout.secure_subtitle")}
                      </CustomText>
                    </View>
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
          {!(!paymentMethod ||
              isLoading ||
              openingService ||
              (isGuest && otpState !== "verified"))&&(
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenService}
            style={{
              backgroundColor: Colors.primary,
              borderRadius: 999,
              paddingVertical: 18,
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: Colors.primary,
              shadowOpacity: 0.55,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Feather name="lock" size={18} color={Colors.secondary} />
            <CustomText color="secondary" size="large" boldness="bold" numberOfLines={1} classes="ml-2">
              {checkoutData?.value_for_payment !== undefined
                ? `${t("services.checkout.confirm")}  ·  ${renderMoney(checkoutData?.value_for_payment)}`
                : t("services.checkout.confirm")}
            </CustomText>
          </TouchableOpacity>)}
          
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
