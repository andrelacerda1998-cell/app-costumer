import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { useStorageState } from '@/hooks/useStorageState';
import { useApi } from './ApiContext';
import { API_ROUTES } from '@/constants/ApiRoutes';
import axios from 'axios';
import { UserDataInterface } from '@/types/session';
import { useAsyncStorage } from "@/hooks/useAsyncStorage";
import i18n, { getSavedLanguage, type AppLanguage } from "@/translation";
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
    /**
     * Avança a cada fim de sessão. Quem inicia uma operação assíncrona que
     * acaba a escrever a sessão guarda este valor no princípio e compara-o no
     * fim: se mudou, a sessão foi fechada entretanto e a escrita é descartada.
     */
    sessionGeneration: () => number;
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
    sessionGeneration: () => 0,
});

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const { openDialog } = useDialog();
    const [[isLoading, session], setSession] = useStorageState('session');
    const [[isLoadingUserData, userData], setUserData] = useAsyncStorage('user-data');
    const [availableGenders, setAvailableGenders] = useState<{ id:number; name:string; }[]>([]);
    // Garante uma única tentativa de renovação por ciclo de arranque (evita ciclo refresh→401→refresh).
    const hasTriedRefreshRef = useRef(false);
    // Ver `sessionGeneration` na interface: o contador que invalida escritas
    // de sessão que chegam depois de ela já ter sido fechada.
    const sessionGenerationRef = useRef(0);
    const sessionGeneration = () => sessionGenerationRef.current;

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
        // A escolha manual do utilizador (guardada nas Definições) tem prioridade;
        // só usamos o locale do dispositivo quando ainda não há preferência definida.
        const saved = await getSavedLanguage();
        const lng: AppLanguage = saved
            ?? (Localization.getLocales()[0]?.languageCode === 'pt' ? 'pt_PT' : 'en_US');
        const isPortuguese = lng === 'pt_PT';

        axios.post(API_ROUTES.AUTH_LOCALE, {
            language: isPortuguese ? 'pt-pt' : 'en'
        }, {
            headers: {
                Authorization: `Bearer ${session}`
            }
        })
            .then(() => {
                i18n.changeLanguage(lng);
            })
    }

    /**
     * Fechar a sessão é uma decisão local — não pode ficar pendurada na rede.
     *
     * O `setSession(null)` vivia dentro do `.finally()` do DELETE /auth/logout.
     * Durante essa ida e volta, qualquer renovação de token em voo resolvia e
     * escrevia um token novo POR CIMA, ressuscitando a sessão que acabáramos de
     * fechar. No incidente que medimos foram 47 logouts com 200 e a app na
     * mesma autenticada, a martelar a API centenas de vezes por minuto.
     *
     * Agora são duas coisas separadas: o estado local sai já, e o servidor é
     * avisado a seguir com o token que ainda temos em mão. Avançar a geração
     * invalida as escritas atrasadas — sem isso, limpar o estado mais cedo só
     * tornaria a corrida mais curta, não a eliminaria.
     */
    const signOut = () => {
        reset();
        sessionGenerationRef.current += 1;

        const tokenAoSair = session;
        setSession(null);
        setUserData(null);

        if (tokenAoSair) {
            axios.delete(API_ROUTES.AUTH_LOGOUT, {
                headers: {
                    Authorization: `Bearer ${tokenAoSair}`
                }
            }).catch((error) => {
                console.error(error, error?.response?.data, 'this error happened inside of the signOut on sessioncontext');
            });
        }
    }


    const requestUserData = (token: string) =>
        axios.get(API_ROUTES.AUTH_ME, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

    const applyUserData = (response: any) => {
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
    };

    const fetchAndSaveUserData = async () => {
        //console.log("retrieving user data");
        const token = session;
        if (!token) {
            return;
        }
        const generation = sessionGenerationRef.current;

        try {
            applyUserData(await requestUserData(token));
            hasTriedRefreshRef.current = false;
            return;
        } catch (error: any) {
            console.error(error, error?.response?.data);
            // Só terminar a sessão perante um token inválido (401/403).
            // Um erro de rede transitório em /auth/me não deve deslogar o utilizador.
            if (error?.response?.status !== 401 && error?.response?.status !== 403) {
                return;
            }
        }

        // Este pedido não passa pelos interceptores do ApiContext (axios cru), por isso
        // não tem renovação automática. Antes de despejar o utilizador para convidado,
        // tentamos UMA renovação do token — a janela de refresh pode ainda ser válida.
        if (hasTriedRefreshRef.current) {
            signOut();
            return;
        }
        hasTriedRefreshRef.current = true;

        let newToken: string | undefined;
        try {
            const refreshResponse = await axios.post(API_ROUTES.AUTH_REFRESH, [], {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            newToken = refreshResponse?.data?.data?.access_token;
        } catch (refreshError: any) {
            console.error(refreshError, refreshError?.response?.data, 'refresh falhou em fetchAndSaveUserData');
            if (!refreshError?.response) {
                // Falha de rede no refresh: manter a sessão, tal como em /auth/me.
                hasTriedRefreshRef.current = false;
                return;
            }
            signOut();
            return;
        }

        if (!newToken) {
            signOut();
            return;
        }

        // Guardar o token novo: o efeito [session] abaixo repete o /auth/me com ele.
        // Se esse também devolver 401/403, o guard acima faz signOut (sem ciclo).
        //
        // A não ser que a sessão tenha sido fechada enquanto o refresh viajava:
        // aí este token já não é de ninguém, e escrevê-lo reabria a sessão.
        if (sessionGenerationRef.current !== generation) {
            return;
        }
        setSession(newToken);
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
                availableGenders,
                sessionGeneration
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
