import { Stack } from 'expo-router';
import { View } from 'react-native';
import Dialog from '@/components/Dialog';

export default function AppLayout() {

  return (
    // O <Dialog/> da raiz fica POR BAIXO destes ecras: eles sao apresentados
    // com `transparentModal`, ou seja, num modal nativo proprio, e um modal
    // aberto a partir da raiz apresenta-se do view controller de baixo. Era por
    // isso que uma recusa do servidor — "verifica o teu telemovel" — abria um
    // dialogo que ninguem via. Um segundo host aqui dentro apanha os ecras
    // deste grupo, que sao os que pedem e pagam.
    <View className="flex-1">
    <Dialog />
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="(address)"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(profile)"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(payments)"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="(services)"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="confirm-email"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
        <Stack.Screen
            name="complete-profile"
            options={{
                presentation: 'transparentModal',
                animation: 'slide_from_bottom',
            }}
        />
      <Stack.Screen
        name="sms"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="support-ticket"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="blocked-by-zone"
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
    </View>
  );
}
