import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { ONBOARDING_SEEN_KEY } from './onboarding';

export default function Index() {
  // undefined = a verificar; true/false = já sabemos se o onboarding foi visto.
  const [seen, setSeen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((value) => setSeen(value === 'true'))
      .catch(() => setSeen(true)); // fail-open: não bloqueia o utilizador
  }, []);

  if (seen === undefined) {
    // Leitura muito rápida do AsyncStorage; ecrã da marca para não piscar.
    return <View style={{ flex: 1, backgroundColor: Colors.primary }} />;
  }

  return <Redirect href={seen ? '/(app)/(tabs)/home' : '/onboarding'} />;
}
