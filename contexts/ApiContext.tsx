import React, {type PropsWithChildren, useContext, useEffect, useRef, useState} from "react";
import axios, {AxiosInstance} from "axios";
import {Alert} from "react-native";
import * as Clipboard from "expo-clipboard";
import {jwtDecode} from "jwt-decode";
import {API_BASE_URL} from "@/constants/ApiRoutes";
import {useSession} from "@/contexts/SessionContext";
import "core-js/stable/atob";
import { useDialog } from "./DialogContext";
import { useTranslation } from "react-i18next";
import XIcon from "@/assets/icons/x";
import { Colors } from "@/constants/Colors";
import { avaliarRenovacao, descartarTentativa } from "@/utils/refreshThrottle";

const ApiContext = React.createContext<{
    api: AxiosInstance;
}>({
    api: axios.create({
        baseURL: API_BASE_URL,
        timeout: 30000,
    }),
});

export function ApiProvider({ children }: PropsWithChildren) {
    const { signOut, session, setSession, isLoading: sessionLoading, sessionGeneration } = useSession();
    const { openDialog } = useDialog();
    const { t, i18n } = useTranslation();
    // O inicializador TEM de ser uma função-fábrica: uma instância do axios é
    // ela própria uma função, e o useState executava-a como inicializador
    // preguiçoso. O `api` que saía daqui não era a instância — era o resultado
    // de a chamar sem configuração — e só ganhava os métodos quando o efeito
    // abaixo lhe fazia Object.assign. Como os efeitos dos filhos correm antes
    // dos do pai, quem pedisse dados ao montar (WalletContext, métodos de
    // pagamento) apanhava `api.get is not a function`.
    const [api] = useState<AxiosInstance>(() => axios.create({
        baseURL: API_BASE_URL,
        timeout: 30000,
    }));

    /**
     * A sessão só existe depois de ser lida do SecureStore, e isso acontece
     * DEPOIS do primeiro render — o `useStorageState` arranca em
     * `[true, null]`. Como os efeitos dos filhos correm antes dos do pai (é o
     * mesmo motivo do comentário acima), um ecrã que peça dados ao montar
     * dispara antes de haver token: o interceptor via `session` a null, não
     * punha cabeçalho nenhum, e o servidor respondia 401.
     *
     * Não era intermitente — era em todos os arranques, e aparecia como um
     * "Request failed with status code 401" sem dono logo no ecrã inicial.
     *
     * Estes dois refs resolvem as duas metades do problema: a promessa faz o
     * pedido ESPERAR pela reidratação, e o ref do token garante que, ao
     * retomar, se lê a sessão real e não a que a closure capturou a null.
     */
    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    const hydratedRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
    if (hydratedRef.current === null) {
        let resolve: () => void = () => {};
        const promise = new Promise<void>((r) => {
            resolve = r;
        });
        hydratedRef.current = { promise, resolve };
    }
    useEffect(() => {
        if (!sessionLoading) {
            hydratedRef.current?.resolve();
        }
    }, [sessionLoading]);

    useEffect(() => {
        const instance = axios.create({
            baseURL: API_BASE_URL,
            timeout: 30000,
        });

        instance.interceptors.request.use(async (config) => {
            // Espera pela leitura do SecureStore antes de decidir se há token.
            await hydratedRef.current?.promise;

            // Do ref e não da closure: este interceptor foi criado quando
            // `session` ainda era null, e é esse valor que ele veria.
            let token = sessionRef.current;

            config.headers['Accept-Language'] = i18n.language === 'pt_PT' ? 'pt-PT' : 'en-US';

            if (token) {
                try {
                    const date = jwtDecode(token)['exp'];

                    const now = Math.floor(Date.now() / 1000);

                    if (date && date < now) {
                        token = (await refreshToken()) ?? null;
                        if (!token) {
                            // O refresh falhou — refreshToken() já tratou o signOut/diálogo.
                            // Não enviar "Bearer undefined": abortar o pedido de forma limpa.
                            return Promise.reject(new axios.Cancel('token refresh failed'));
                        }
                    }
                } catch (e) {
                    console.error("Failed to decode token:", e);
                    signOut();
                    openDialog({
                        icon: <XIcon color={Colors.secondary} />,
                        title: t('session.logout.success.title'),
                        subtitle: t('session.logout.success.subtitle_error'),
                        closeAfterMSeconds: 3000,
                        closeOnClickOutside: true,
                    })
                    return config;
                }

                config.headers.Authorization = "Bearer " + token;
            }

            return config;
        });

        instance.interceptors.response.use(
            async (response) => {
                return response
            },
            async (error) => {
                return handleError(error, instance);
            }
        );

        Object.assign(api, instance);
    }, [session]);

    const renovacaoEmVooRef = useRef<Promise<string | undefined> | null>(null);
    const renovacoesRecentesRef = useRef<number[]>([]);

    const terminarSessaoPorRenovacaoFalhada = () => {
        renovacoesRecentesRef.current = [];
        signOut();
        openDialog({
            icon: <XIcon color={Colors.secondary} />,
            title: t('session.logout.success.title'),
            subtitle: t('session.logout.success.subtitle_timeout'),
            closeAfterMSeconds: 3000,
            closeOnClickOutside: true,
        })
    };

    /**
     * Uma renovação de cada vez, e um tecto de renovações por minuto.
     *
     * Esta função não tinha travão nenhum: renovava a cada 401 de cada pedido.
     * Com meia dúzia de ecrãs a pedir dados, um token que já não autentica
     * gerava uma renovação por pedido — e como cada renovação devolve uma
     * string diferente, o `setSession` mudava sempre o estado, re-disparava
     * todos os hooks com `session` nas dependências, e esses voltavam a falhar.
     * O ciclo fechava-se e acelerava sozinho: 989 pedidos num minuto, de um
     * telemóvel parado, até o rate limiter responder 429 e a Home ficar em
     * esqueletos.
     *
     * A promessa partilhada resolve a explosão horizontal: N pedidos em
     * paralelo custam uma renovação, não N. O tecto resolve a vertical: se
     * renovar não está a resolver nada, insistir não vai começar a resolver.
     *
     * O tecto fica aqui e não só no servidor de propósito. As builds que já
     * estão nos telemóveis vão falar com servidores de todas as idades, e
     * quem tem de saber parar é quem está a bater à porta.
     */
    async function refreshToken(): Promise<string | undefined> {
        if (!session) {
            return;
        }

        // Já vai uma a caminho: esperar por ela em vez de abrir outra.
        if (renovacaoEmVooRef.current) {
            return renovacaoEmVooRef.current;
        }

        const agora = Date.now();
        const decisao = avaliarRenovacao(renovacoesRecentesRef.current, agora);
        renovacoesRecentesRef.current = decisao.historico;

        if (!decisao.permitir) {
            terminarSessaoPorRenovacaoFalhada();
            return;
        }

        const generation = sessionGeneration();
        const tokenAoPedir = session;

        const promessa = (async (): Promise<string | undefined> => {
            try {
                const response = await axios.post(API_BASE_URL+"/auth/refresh", [], {
                    headers: {
                        Authorization: "bearer " + tokenAoPedir,
                    },
                });
                const { access_token } = response?.data.data;

                if (!access_token) {
                    return undefined;
                }

                // A sessão pode ter sido fechada enquanto isto viajava. Escrever
                // agora reabria-a — é exatamente o que fazia os logouts não pegar.
                if (sessionGeneration() !== generation) {
                    return undefined;
                }

                setSession(access_token);
                return access_token;
            } catch (error: any) {
                // Uma falha de rede não é um token inválido. Deslogar quem entrou
                // num túnel seria trocar um problema por outro — e o tecto acima
                // tornaria isso mais fácil, não menos. Não conta para o tecto.
                if (!error?.response) {
                    renovacoesRecentesRef.current = descartarTentativa(renovacoesRecentesRef.current, agora);
                    return undefined;
                }

                terminarSessaoPorRenovacaoFalhada();
                return undefined;
            }
        })();

        renovacaoEmVooRef.current = promessa;

        // Limpar aqui e não num `finally` lá dentro: se o pedido falhasse de
        // forma síncrona, o `finally` corria ANTES da atribuição acima e a
        // referência ficava presa a uma promessa já resolvida — renovar deixava
        // de funcionar para o resto da sessão. Comparar a identidade garante que
        // só se limpa a própria, e nunca uma renovação mais recente.
        promessa.finally(() => {
            if (renovacaoEmVooRef.current === promessa) {
                renovacaoEmVooRef.current = null;
            }
        });

        return promessa;
    }


    const handleError = async (error: any, apiInstance: AxiosInstance) => {
        if (error.response && error.response.status === 500) {
            const data = error.response.data;

            if (data?.telescope) {
                // Alert.alert("Something went wrong", "Please, try again", [
                //     {
                //         text: "Copy Error",
                //         onPress: async () => {
                //             try {
                //                 await Clipboard.setStringAsync(data?.telescope);
                //                 Alert.alert("Copied!", "Error copied to clipboard.");
                //             } catch (copyError) {
                //                 console.error("Failed to copy error:", copyError);
                //             }
                //         },
                //     },
                //     {
                //         text: "OK",
                //     },
                // ]);
            } else {
                // Alert.alert("Something went wrong", "Please, try again");
            }
        }

        const originalRequest = error.config;

        // Check if the session is still valid
        if (!session) {
            return Promise.reject(error);
        }

        // Perante um 401, tentar renovar o token UMA vez e repetir o pedido.
        // O guard `_retry` garante uma única repetição (sem ciclo infinito).
        if (error?.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const access_token = await refreshToken();

            if (access_token) {
                originalRequest.headers.Authorization = "Bearer " + access_token;
                return apiInstance(originalRequest);
            }

            // O refresh falhou — refreshToken() já fez signOut + diálogo.
            return Promise.reject(error);
        }

        return Promise.reject(error);
    };


    return <ApiContext.Provider value={{ api }}>{children}</ApiContext.Provider>;
}

export function useApi() {
    return useContext(ApiContext);
}
