import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "@/contexts/ApiContext";
import { useDialog } from "@/contexts/DialogContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { Colors } from "@/constants/Colors";
import XIcon from "@/assets/icons/x";

/**
 * Desistir de um pedido que ainda não é um serviço (à procura, a escolher, ou
 * escolhido e por pagar).
 *
 * Antes não havia saída: o ecrã de espera só tinha "voltar", e voltar não
 * fechava nada. O pedido continuava a convidar técnicos, e o pedido seguinte
 * do cliente devolvia este.
 *
 * Pede confirmação porque é irreversível e avisa quem já respondeu. Com um
 * pagamento a meio (MB Way ou 3DS por confirmar) o servidor recusa com 409, e
 * diz-se isso mesmo em vez de um erro genérico.
 */
export function useCancelMatchingRequest() {
  const { t } = useTranslation();
  const { api } = useApi();
  const { openDialog } = useDialog();
  const [cancelling, setCancelling] = useState(false);
  const busy = useRef(false);

  const cancel = useCallback(async (serviceId: number | string, onDone?: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setCancelling(true);

    try {
      await api.post(API_ROUTES.POST_CANCEL_SERVICE(String(serviceId)));
      onDone?.();
    } catch (error: any) {
      const emCurso = error?.response?.status === 409;
      openDialog({
        icon: <XIcon color={Colors.secondary} />,
        title: emCurso ? t("matching.cancel.payment_in_progress_title") : t("errors.title"),
        subtitle: emCurso ? t("matching.cancel.payment_in_progress_subtitle") : t("errors.occurred_an_error"),
        closeOnClickOutside: true,
        closeAfterMSeconds: 5000,
      });
    } finally {
      busy.current = false;
      setCancelling(false);
    }
  }, [api, openDialog, t]);

  /** Pergunta primeiro; só cancela se o cliente confirmar. */
  const askToCancel = useCallback((serviceId: number | string, onDone?: () => void) => {
    openDialog({
      title: t("matching.cancel.confirm_title"),
      subtitle: t("matching.cancel.confirm_subtitle"),
      successButtonText: t("matching.cancel.confirm"),
      cancelButtonText: t("matching.cancel.keep"),
      closeOnClickOutside: true,
      onSuccess: () => { cancel(serviceId, onDone); },
    });
  }, [cancel, openDialog, t]);

  return { askToCancel, cancelling };
}

export default useCancelMatchingRequest;
