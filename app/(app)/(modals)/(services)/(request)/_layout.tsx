import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View, Modal } from 'react-native';
import { Redirect, SplashScreen, Stack, Tabs, useNavigation } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // presentation: 'modal',
        // animationEnabled: true,
        animation: 'ios_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="start/index"/>
      <Stack.Screen name="select-service-type/[operationAreaId]"/>
      <Stack.Screen name="select-service-type/info"/>
      <Stack.Screen name="select-vendor/[serviceId]"/>
      <Stack.Screen name="wait-accept/[serviceId]"/>
      <Stack.Screen name="checkout/[serviceId]"/>
      <Stack.Screen name="checkout/mb-way/waiting"/>
      <Stack.Screen name="checkout/mb-way/confirmed"/>
      <Stack.Screen name="checkout/card/waiting"/>
      <Stack.Screen name="checkout/card/confirmed"/>
      <Stack.Screen name="checkout/card/denied"/>

    </Stack>
  );
}
