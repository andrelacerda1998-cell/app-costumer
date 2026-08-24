import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GuestAddress {
    name?: string;
    street_name?: string;
    street_number?: string;
    additional_info?: string;
    postal_code?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude: number;
    longitude: number;
}

export interface GuestSessionData {
    guest_address: GuestAddress | null;
    guest_phone: string | null;
    guest_token?: string | null;
    selected_operation_area_id: number | null;
    selected_service_type_id: number | null;
    selected_vendor_id: number | null;
    selected_service_type: any | null;
    selected_vendor: any | null;
    wizard_step: number;
    data_to_make_schedule: any | null;
}

interface GuestSessionContextType {
    guestSession: GuestSessionData;
    setGuestAddress: (address: GuestAddress | null) => void;
    setGuestPhone: (phone: string | null) => void;
    setSelectedOperationArea: (id: number | null) => void;
    setSelectedServiceType: (id: number | null, serviceType?: any | null) => void;
    setSelectedVendor: (id: number | null, vendor?: any | null) => void;
    setWizardStep: (step: number) => void;
    setScheduleData: (data: any | null) => void;
    setGuestToken: (token: string | null) => void;
    clearGuestSession: () => void;
    hasResumableSession: boolean;
    clearHasResumable: () => void;
}

const STORAGE_KEY = 'guest-session';

const defaultGuestSession: GuestSessionData = {
    guest_address: null,
    guest_phone: null,
    selected_operation_area_id: null,
    selected_service_type_id: null,
    selected_vendor_id: null,
    selected_service_type: null,
    selected_vendor: null,
    wizard_step: 0,
    data_to_make_schedule: null,
};

const GuestSessionContext = createContext<GuestSessionContextType>({
    guestSession: defaultGuestSession,
    setGuestAddress: () => {},
    setGuestPhone: () => {},
    setSelectedOperationArea: () => {},
    setSelectedServiceType: () => {},
    setSelectedVendor: () => {},
    setGuestToken: () => {},
    setWizardStep: () => {},
    setScheduleData: () => {},
    clearGuestSession: () => {},
    hasResumableSession: false,
    clearHasResumable: () => {},
});

export const GuestSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [guestSession, setGuestSession] = useState<GuestSessionData>(defaultGuestSession);
    const [hasResumableSession, setHasResumableSession] = useState(false);

    const loadGuestSession = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as GuestSessionData;
                if (parsed.selected_operation_area_id !== null || parsed.guest_address !== null) {
                    setGuestSession(parsed);
                    setHasResumableSession(true);
                }
            }
        } catch (e) {
            console.error('Failed to load guest session:', e);
        }
    }, []);

    React.useEffect(() => {
        loadGuestSession();
    }, [loadGuestSession]);

    const saveGuestSession = useCallback(async (data: GuestSessionData) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save guest session:', e);
        }
    }, []);

    const setGuestAddress = useCallback((address: GuestAddress | null) => {
        setGuestSession(prev => {
            const updated = { ...prev, guest_address: address };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const setGuestPhone = useCallback((phone: string | null) => {
        setGuestSession(prev => {
            const updated = { ...prev, guest_phone: phone };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const setGuestToken = useCallback((token: string | null) => {
        setGuestSession(prev => {
            const updated = { ...prev, guest_token: token };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const setSelectedOperationArea = useCallback((id: number | null) => {
        setGuestSession(prev => {
            const updated = { ...prev, selected_operation_area_id: id };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const setSelectedServiceType = useCallback((id: number | null, serviceType: any | null = null) => {
        setGuestSession(prev => {
            const updated = {
                ...prev,
                selected_service_type_id: id,
                selected_service_type: serviceType,
                wizard_step: id !== null ? Math.max(prev.wizard_step, 1) : prev.wizard_step,
            };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const setSelectedVendor = useCallback((id: number | null, vendor: any | null = null) => {
        setGuestSession(prev => {
            const updated = {
                ...prev,
                selected_vendor_id: id,
                selected_vendor: vendor,
                wizard_step: id !== null ? Math.max(prev.wizard_step, 2) : prev.wizard_step,
            };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const setWizardStep = useCallback((step: number) => {
        setGuestSession(prev => {
            const updated = { ...prev, wizard_step: step };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const setScheduleData = useCallback((data: any | null) => {
        setGuestSession(prev => {
            const updated = { ...prev, data_to_make_schedule: data };
            saveGuestSession(updated);
            return updated;
        });
    }, [saveGuestSession]);

    const clearGuestSession = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setGuestSession(defaultGuestSession);
            setHasResumableSession(false);
        } catch (e) {
            console.error('Failed to clear guest session:', e);
        }
    }, []);

    const clearHasResumable = useCallback(() => {
        setHasResumableSession(false);
    }, []);

    return (
        <GuestSessionContext.Provider
            value={{
                guestSession,
                setGuestAddress,
                setGuestPhone,
                setGuestToken,
                setSelectedOperationArea,
                setSelectedServiceType,
                setSelectedVendor,
                setWizardStep,
                setScheduleData,
                clearGuestSession,
                hasResumableSession,
                clearHasResumable,
            }}
        >
            {children}
        </GuestSessionContext.Provider>
    );
};

export function useGuestSession() {
    const value = useContext(GuestSessionContext);
    if (!value) {
        throw new Error('useGuestSession must be wrapped in a <GuestSessionProvider />');
    }
    return value;
}
