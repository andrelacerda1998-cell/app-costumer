import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useStorageState } from '@/hooks/useStorageState';
import { useApi } from './ApiContext';
import { API_ROUTES } from '@/constants/ApiRoutes';
import axios from 'axios';
import { UserDataInterface } from '@/types/session';
import { useAsyncStorage } from "@/hooks/useAsyncStorage";
import i18n from "@/translation";
import * as Localization from "expo-localization";
import { router } from "expo-router";
import { useDialog } from "./DialogContext";
import XIcon from "@/assets/icons/x";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/Colors";
import { initMixpanel, identify, setUserProfile, reset } from '@/services/MixpanelService';

interface SessionContextType {
    // isAuthenticated: boolean;
    // sessionToken: string | null;
    // login: () => void;
    // logout: () => void;
    signOut: () => void;
    // setSessionToken: (token: string | null) => void;
    isLoading: boolean;
    session: string | null;
    setSession: (token: string | null) => void;
    isLoadingUserData: boolean;
    userData: UserDataInterface | null;
    setUserData: (data: any) => void;
    fetchAndSaveUserData: () => void;
    changeUserLanguage: () => void;
    getAvailableGenders: () => void;
    availableGenders: { id: number; name: string; }[];
}

const SessionContext = createContext<SessionContextType>({
    // isAuthenticated: false,
    // sessionToken: null,
    // login: () => {},
    // logout: () => {},
    signOut: () => {},
    // setSessionToken: () => {},
    isLoading: true,
    session: null,
    setSession: () => {},
    isLoadingUserData: true,
    userData: null,
    setUserData: () => {},
    fetchAndSaveUserData: () => {},
    changeUserLanguage: () => {},
    getAvailableGenders: () => {},
    availableGenders: [],
});

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const { openDialog } = useDialog();
    const [[isLoading, session], setSession] = useStorageState('session');
    const [[isLoadingUserData, userData], setUserData] = useAsyncStorage('user-data');
    const [availableGenders, setAvailableGenders] = useState<{ id:number; name:string; }[]>([]);

    const getAvailableGenders = () => {
        axios.get(API_ROUTES.COMMON_GET_GENDERS, {
            headers: {
                'Accept-Language': i18n.language === 'pt_PT' ? 'pt-pt' : 'en',
            }
        })
            .then(response => {
                setAvailableGenders(response.data.data.genders);
            })
            .catch(error => {
                if (error?.response?.status !== 401) {
                    openDialog({
                        icon: <XIcon color={Colors.primary} />,
                        title: t('errors.title'),
                        subtitle: error?.response?.data?.metadata?.message || error?.response?.data?.message || t('errors.occurred_an_error'),
                        closeAfterMSeconds: 2000,
                        closeOnClickOutside: true,
                    })
                }
            });
	}

    const changeUserLanguage = async () => {
        const code = Localization.getLocales()[0]?.languageCode ?? 'pt'; // default pt quando não resolve
        const isPortuguese = code === 'pt';

        axios.post(API_ROUTES.AUTH_LOCALE, {
            language: isPortuguese ? 'pt-pt' : 'en'
        }, {
            headers: {
                Authorization: `Bearer ${session}`
            }
        })
            .then(() => {
                i18n.changeLanguage(isPortuguese ? 'pt_PT' : 'en_US');
            })
    }

    const signOut = () => {
        reset();
        if (session) {
            axios.delete(API_ROUTES.AUTH_LOGOUT, {
                headers: {
                    Authorization: `Bearer ${session}`
                }
            }).catch((error) => {
                console.error(error, error?.response?.data, 'this error happened inside of the signOut on sessioncontext');
            }).finally(() => {
                setSession(null);
                setUserData(null);    
            });
        } else {
            setSession(null);
            setUserData(null);
        }
    }


    const fetchAndSaveUserData = () => {
        //console.log("retrieving user data");

        axios.get(API_ROUTES.AUTH_ME, {
            headers: {
                Authorization: `Bearer ${session}`
            }
        }).then((response) => {
            // console.log(response.data.data, "response.data.data in auth me");
            const userData = response.data.data;
            setUserData(userData);
            identify(String(userData.id));
            setUserProfile({
                $name: userData.name,
                $email: userData.email,
                $phone: userData.phone_number,
                created_at: userData.created_at
            });
            if (!userData.allowed_by_zone && userData.address) {
                router.push('/(app)/(modals)/blocked-by-zone');
            }
        }).catch((error) => {
            console.error(error, error?.response?.data);
            // Só terminar a sessão perante um token inválido (401/403).
            // Um erro de rede transitório em /auth/me não deve deslogar o utilizador.
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                signOut();
            }
        })
    }

    useEffect(() => {
        if (session) {
            changeUserLanguage();
            fetchAndSaveUserData();
        }
    }, [session])

    if (typeof userData === 'string') {
        return null;
    }

    return (
        <SessionContext.Provider
            value={{
                // isAuthenticated,
                // sessionToken,
                // setSessionToken,
                signOut,
                isLoading,
                session,
                setSession,
                isLoadingUserData,
                userData,
                setUserData,
                fetchAndSaveUserData,
                changeUserLanguage,
                getAvailableGenders,
                availableGenders
            }}
        >
            {children}
        </SessionContext.Provider>
    );
};

export function useSession() {
    const value = useContext(SessionContext);
    if (!value) {
        throw new Error('useSession must be wrapped in a <SessionProvider />');
    }

    return value;
}
