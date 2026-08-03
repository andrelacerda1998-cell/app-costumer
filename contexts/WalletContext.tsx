import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { API_ROUTES } from "@/constants/ApiRoutes";
import { PaymentMethod } from "@/types/paymentMethods";
import {useSession} from "@/contexts/SessionContext";
import {useApi} from "@/contexts/ApiContext";

interface WalletContextProps {
  paymentMethods: PaymentMethod[] | null;
  fetchPaymentMethods: () => void;
  isLoadingPaymentMethods: boolean;
  shouldAutoSelectNewestPaymentMethod: boolean;
  requestAutoSelectNewestPaymentMethod: () => void;
  clearAutoSelectNewestPaymentMethod: () => void;
}

const WalletContext = createContext<WalletContextProps | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const {session} = useSession();
  // Usa a instância partilhada do ApiProvider: traz os interceptores (Authorization
  // com renovação do token e Accept-Language). Com axios cru, um token expirado
  // devolvia 401 e a carteira ficava indistinguível de "sem métodos de pagamento".
  const {api} = useApi();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[] | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [shouldAutoSelectNewestPaymentMethod, setShouldAutoSelectNewestPaymentMethod] = useState(false);

  const fetchPaymentMethods = useCallback(async () => {
    if (!session) {
      setPaymentMethods(null);
      setIsLoadingPaymentMethods(false);
      setShouldAutoSelectNewestPaymentMethod(false);
      return;
    }
    setIsLoadingPaymentMethods(true);
    try {
      const response = await api.get(API_ROUTES.GET_PAYMENTS_METHODS);
      const { data } = response.data;

      setPaymentMethods(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  }, [session, api]);

  useEffect(() => {
    if (!session) {
      setPaymentMethods(null);
      setIsLoadingPaymentMethods(false);
      setShouldAutoSelectNewestPaymentMethod(false);
      return;
    }

    fetchPaymentMethods();
  }, [session, fetchPaymentMethods]);

  return (
    <WalletContext.Provider
      value={{
        paymentMethods,
        fetchPaymentMethods,
        isLoadingPaymentMethods,
        shouldAutoSelectNewestPaymentMethod,
        requestAutoSelectNewestPaymentMethod: () => setShouldAutoSelectNewestPaymentMethod(true),
        clearAutoSelectNewestPaymentMethod: () => setShouldAutoSelectNewestPaymentMethod(false),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
