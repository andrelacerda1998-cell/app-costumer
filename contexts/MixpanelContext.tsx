import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { initMixpanel, optInTracking, optOutTracking, track, identify, setUserProfile, reset, flush } from '@/services/MixpanelService';

const isPreview = Constants.expoConfig?.extra?.APP_ENV === 'preview';

const CONSENT_KEY = '@mixpanel_consent';

interface MixpanelContextType {
  isInitialized: boolean;
  hasConsent: boolean;
  hasResponded: boolean;
  giveConsent: () => void;
  revokeConsent: () => void;
  track: (eventName: string, properties?: Record<string, any>) => void;
  identify: (userId: string) => void;
  setUserProfile: (properties: Record<string, any>) => void;
  reset: () => void;
}

const MixpanelContext = createContext<MixpanelContextType | undefined>(undefined);

interface MixpanelProviderProps {
  children: ReactNode;
}

export const MixpanelProvider: React.FC<MixpanelProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasConsent, setHasConsent] = useState(true);
  const [hasResponded, setHasResponded] = useState(false);

  useEffect(() => {
    if (isPreview) return;

    const init = async () => {
      const stored = await AsyncStorage.getItem(CONSENT_KEY).catch(() => null);
      // Ligado de origem, por decisão do negócio (14/09/2026): só desliga
      // quem o disser nas Definições. Antes era opt-in — nada era recolhido
      // até haver um "sim", e quase ninguém o dava.
      const consentGiven = stored !== 'false';
      const responded = stored !== null;

      const success = await initMixpanel();
      setIsInitialized(success);
      setHasResponded(responded);

      if (success && consentGiven) {
        optInTracking();
        setHasConsent(true);
        track('$session_start');
        flush();
      } else if (!consentGiven) {
        // Desligou nas Definições: o estado inicial é `true` e tem de ser
        // corrigido, senão o interruptor abre ligado depois de ele o desligar.
        optOutTracking();
        setHasConsent(false);
      }
    };
    init();
  }, []);

  const giveConsent = () => {
    optInTracking();
    setHasConsent(true);
    setHasResponded(true);
    AsyncStorage.setItem(CONSENT_KEY, 'true').catch(() => null);
  };

  const revokeConsent = () => {
    optOutTracking();
    setHasConsent(false);
    setHasResponded(true);
    AsyncStorage.setItem(CONSENT_KEY, 'false').catch(() => null);
  };

  return (
    <MixpanelContext.Provider
      value={{
        isInitialized,
        hasConsent,
        hasResponded,
        giveConsent,
        revokeConsent,
        track,
        identify,
        setUserProfile,
        reset,
      }}
    >
      {children}
    </MixpanelContext.Provider>
  );
};

export const useMixpanel = (): MixpanelContextType => {
  const context = useContext(MixpanelContext);
  if (!context) {
    throw new Error('useMixpanel must be used within a MixpanelProvider');
  }
  return context;
};
