import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useSession } from './SessionContext';
import { API_ROUTES } from '@/constants/ApiRoutes';
import { useApi } from './ApiContext';

interface CampaignContextType {
  campaignLogId: number | null;
  setCampaignLogId: (id: number | null) => void;
  clearCampaignLogId: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

const CAMPAIGN_TIMEOUT_MS = 48 * 60 * 60 * 1000;

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useSession();
  const { api } = useApi();
  const [campaignLogId, setCampaignLogIdState] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCampaignLogId = useCallback(() => {
    setCampaignLogIdState(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setCampaignLogId = useCallback((id: number | null) => {
    setCampaignLogIdState(id);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (id !== null) {
      timeoutRef.current = setTimeout(() => {
        setCampaignLogIdState(null);
      }, CAMPAIGN_TIMEOUT_MS);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <CampaignContext.Provider value={{ campaignLogId, setCampaignLogId, clearCampaignLogId }}>
      {children}
    </CampaignContext.Provider>
  );
};

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}