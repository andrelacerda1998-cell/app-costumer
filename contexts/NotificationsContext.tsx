import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { EventSubscription } from 'expo-modules-core';
import Constants from 'expo-constants';
import { Platform } from "react-native";
import { router } from "expo-router";
import { useApi } from "@/contexts/ApiContext";
import { useSession } from "@/contexts/SessionContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useCampaign } from "@/contexts/CampaignContext";
import { track } from "@/services/MixpanelService";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

const NotificationsContext = React.createContext<{}>({});

export default function NotificationsProvider({ children }: PropsWithChildren) {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [pendingResponse, setPendingResponse] = useState<Notifications.NotificationResponse | null>(null);

    const notificationListener = useRef<EventSubscription>();
    const responseListener = useRef<EventSubscription>();

    const { api } = useApi();
    const { session } = useSession();
    const { setCampaignLogId } = useCampaign();

    const apiRef = useRef(api);
    const sessionRef = useRef(session);
    useEffect(() => { apiRef.current = api; }, [api]);
    useEffect(() => { sessionRef.current = session; }, [session]);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => token && setExpoPushToken(token));

        if (Platform.OS === 'android') {
            void Notifications.getNotificationChannelsAsync();
        }

        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            const data = notification.request.content.data as { campaign_log_id?: number } | undefined;
            const campaignLogId = data?.campaign_log_id;
            if (campaignLogId && sessionRef.current && apiRef.current) {
                apiRef.current.post(
                    API_ROUTES.CAMPAIGN_LOG_OPEN(campaignLogId), {},
                    { headers: { Authorization: `Bearer ${sessionRef.current}` } }
                ).catch(() => {});
            }
        });

        // Cold start: app was killed and opened via notification tap
        Notifications.getLastNotificationResponseAsync().then(response => {
            if (response) setPendingResponse(response);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            setPendingResponse(response);
        });

        return () => {
            notificationListener.current &&
                Notifications.removeNotificationSubscription(notificationListener.current);
            responseListener.current &&
                Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, []);

    // Process pending response once session + api are ready
    useEffect(() => {
        if (pendingResponse && session) {
            handleNotificationResponse(pendingResponse);
            setPendingResponse(null);
        }
    }, [pendingResponse, session]);

    useEffect(() => {
        if (session && api && expoPushToken) {
            api.post('/auth/device', {
                expoPushToken,
                deviceName: Device.modelName,
            }).catch(() => {});
        }
    }, [expoPushToken, session]);

    // No signout limpar o token local: evita reenviar um token stale ao /auth/device
    // caso outra conta faça login a seguir (força re-registo limpo).
    useEffect(() => {
        if (!session) {
            setExpoPushToken('');
        }
    }, [session]);

    function handleNotificationResponse(response: Notifications.NotificationResponse) {
        const data = response.notification.request.content.data as {
            campaign_log_id?: number;
            open_type?: string;
            open_id?: number;
        } | undefined;

        const campaignLogId = data?.campaign_log_id;
        const openType = data?.open_type;
        const openId = data?.open_id;
        const currentApi = apiRef.current;
        const currentSession = sessionRef.current;

        track('notification_opened', {
            campaign_log_id: campaignLogId,
            open_type: openType,
            open_id: openId,
        });

        const authHeaders = currentSession ? { Authorization: `Bearer ${currentSession}` } : undefined;

        if (campaignLogId && authHeaders && currentApi) {
            currentApi.post(API_ROUTES.CAMPAIGN_LOG_OPEN(campaignLogId), {}, { headers: authHeaders }).catch(() => {});
        }

        if (openType && openId) {
            if (openType === 'ServicesType') {
                router.push(`/(app)/(modals)/(services)/(request)/select-vendor/${openId}`);
            } else if (openType === 'OperationArea') {
                router.push(`/(app)/(modals)/(services)/(request)/select-service-type/${openId}`);
            }

            if (campaignLogId && authHeaders && currentApi) {
                currentApi.post(API_ROUTES.CAMPAIGN_LOG_CLICK(campaignLogId), {}, { headers: authHeaders }).catch(() => {});
            }

            if (campaignLogId) {
                setCampaignLogId(campaignLogId);
            }
        }
    }

    async function registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (!Device.isDevice) return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) return;
            return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch {
            return;
        }
    }

    return (
        <NotificationsContext.Provider value={{}}>
            {children}
        </NotificationsContext.Provider>
    );
}