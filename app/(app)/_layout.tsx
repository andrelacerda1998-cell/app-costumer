import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router, SplashScreen, Stack, Tabs, useNavigation } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { useService } from "@/contexts/ServiceContext";
import { useAppStateStatus } from "@/contexts/AppStateStatusContext";
import { useGuestSession } from '@/contexts/GuestSessionContext';

export default function AppLayout() {
  const { appStateStatus } = useAppStateStatus();
  const { session, isLoading, signOut, userData, fetchAndSaveUserData } = useSession();
  const { getOpenService, getPendingService, getHistoryServices } = useService();
  const { clearGuestSession } = useGuestSession();
  const prevSessionRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prevSessionRef.current && !session) {
      clearGuestSession();
    }
    prevSessionRef.current = session;
  }, [session]);

  const carregarServicos = useCallback(() => {
    getOpenService();
    getPendingService();
    getHistoryServices(0);
    if (!userData?.email_verified_at || !userData?.phone_number_verified_at) {
      fetchAndSaveUserData();
    }
  }, [userData?.email_verified_at, userData?.phone_number_verified_at]);

  // Arranque e login.
  //
  // Isto NAO estava aqui, e a falta dele dava um sintoma estranho: quem
  // abrisse a app de raiz durante um servico a decorrer nao via a faixa do
  // "tecnico a caminho" — so aparecia depois de mandar a app para segundo
  // plano e voltar. A causa e o `AppState.currentState`: num arranque a frio
  // no iOS pode vir `unknown` ou `inactive`, e se a app ja estiver activa
  // quando o listener e montado nao ha mudanca nenhuma para ele ouvir. O
  // efeito de baixo, que so reage a transicoes, nunca chegava a correr.
  useEffect(() => {
    if (! session) return;
    carregarServicos();
  }, [session, carregarServicos]);

  // Regresso ao primeiro plano.
  //
  // So em transicoes REAIS para activo: comparar com o estado anterior evita
  // disparar tambem na montagem e duplicar os pedidos do arranque.
  const estadoAnterior = useRef(appStateStatus);
  useEffect(() => {
    const voltouAoEcra = estadoAnterior.current !== "active" && appStateStatus === "active";
    estadoAnterior.current = appStateStatus;

    if (! session || ! voltouAoEcra) return;
    carregarServicos();
  }, [appStateStatus, session, carregarServicos]);

  if (isLoading) {
    SplashScreen.preventAutoHideAsync();
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="(tabs)"
      />
      <Stack.Screen
        name="(modals)"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(pages)"
      />
      <Stack.Screen
        name="(bottom-sheets)/new-payment-method/index"
        options={{
          presentation: 'containedTransparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(bottom-sheets)/failed/index"
        options={{
          presentation: 'containedTransparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(bottom-sheets)/(services)/rate/[serviceId]"
        options={{
          presentation: 'containedTransparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(bottom-sheets)/(services)/service-details/index"
        options={{
          presentation: 'containedTransparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(bottom-sheets)/(services)/extra-request/[extraId]"
        options={{
          presentation: 'containedTransparentModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}