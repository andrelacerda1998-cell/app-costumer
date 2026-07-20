import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (appStateStatus === "active" && session) {
      getOpenService();
      getPendingService();
      getHistoryServices(0);
      if (!userData?.email_verified_at || !userData?.phone_number_verified_at) {
        fetchAndSaveUserData();
      }
    }
  }, [appStateStatus, session])

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
    </Stack>
  );
}