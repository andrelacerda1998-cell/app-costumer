import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View, Modal } from 'react-native';
import { Redirect, SplashScreen, Stack, Tabs, useNavigation } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import BackHeader from '@/components/app/BackHeader';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}