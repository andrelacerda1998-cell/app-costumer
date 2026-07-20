import { useEffect, useLayoutEffect, useState } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import { useApi } from "@/contexts/ApiContext";
import { useSession } from "@/contexts/SessionContext";
import NetInfo from '@react-native-community/netinfo';

import { DOMAIN, PROTOCOL } from "@/constants/ApiRoutes";
import { useAppStateStatus } from "@/contexts/AppStateStatusContext";

const useEcho = () => {
    // @ts-ignore
    const [echoInstance, setEchoInstance] = useState<Echo>();
    const { api } = useApi();
    const { session } = useSession();
    const { appStateStatus } = useAppStateStatus();

    useEffect(() => {
        if (!api || !session || appStateStatus !== "active") {
            return;
        }

        //  Setup Pusher client
        const PusherClient = new Pusher('ofo5ybpvhjf4i49rj2jm', {
            wsHost: DOMAIN,
            wsPort: 8080,
            forceTLS: false,
            enabledTransports: ["ws","wss"],
            disableStats: true,
            cluster: "mt1",
            auth: {
                headers: {
                    'Authorization': 'Bearer ' + session
                }
            },
            authorizer: (channel, options) => {
                // console.log({channel, options}, "channel and options on authorizer for websockets")

                return {
                    authorize: (socketId, callback) => {
                        api.post(`${PROTOCOL}${DOMAIN}/broadcasting/auth`, {
                            socket_id: socketId,
                            channel_name: channel.name
                        })
                            .then(response => {
                                // console.log({response}, "response on authorizer for websockets")
                                return callback(null, response.data);
                            })
                            .catch(error => {
                                console.error('Authorization error:', error.response?.data || error.message);
                                return callback(error, error);
                            });
                    }
                };
            },
        });

        //console.log({ PusherClient, channels: PusherClient.channels });

        PusherClient.connection.bind('connected', () => {
            // console.log('WebSocket connected.');
        });

        PusherClient.connection.bind('disconnected', () => {
            // console.log('WebSocket disconnected.');
        });

        PusherClient.connection.bind('error', (error: any) => {
            console.error('WebSocket connection error:', error.message || error);
        });

        PusherClient.connection.bind('unavailable', () => {
            console.warn('WebSocket service unavailable. Retrying...');
        });

        const echo = new Echo({
            broadcaster: "reverb",
            client: PusherClient,
        });

        setEchoInstance(echo);

        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
            // console.log({ netInfoState: state });

            if (state.isConnected) {
                // console.log("Network reconnected, reconnecting echo...");
                echo.connect();
            } else {
                console.warn("Network disconnected, stopping echo connection.");
                echo.disconnect();
            }
        });

        return () => {
            if (echo) {
                echo.disconnect();
            }
            unsubscribeNetInfo();
        };
    }, [api, session, appStateStatus]);

    return echoInstance;
};

export default useEcho;
