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
      <Stack.Screen
        name="(chat)"
      />
      <Stack.Screen
        name="progress/[serviceId]"
      />
      <Stack.Screen
        name="status/[serviceId]"
      />
      <Stack.Screen
        name="close/index"
      />
      <Stack.Screen
        name="cancel/[serviceId]"
      />
      <Stack.Screen
        name="vendor-arrived/index"
      />
    </Stack>
  );
}