import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { API_ROUTES } from "@/constants/ApiRoutes";
import { PaymentMethod } from "@/types/paymentMethods";
import {useSession} from "@/contexts/SessionContext";
import axios from 'axios';
import i18n from "@/translation";

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
      const response = await axios.get(API_ROUTES.GET_PAYMENTS_METHODS, {
        headers: {
          Authorization: `Bearer ${session}`,
          'Accept-Language': i18n.language === 'pt_PT' ? 'pt-PT' : 'en-US',
        },
      });
      const { data } = response.data;

      setPaymentMethods(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  }, [session]);

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
