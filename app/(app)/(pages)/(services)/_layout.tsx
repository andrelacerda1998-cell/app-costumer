import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View, Modal } from 'react-native';
import { Redirect, router, SplashScreen, Stack, Tabs, useNavigation } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(open)"/>
      <Stack.Screen name="history/[serviceId]"/>
    </Stack>
  );
}