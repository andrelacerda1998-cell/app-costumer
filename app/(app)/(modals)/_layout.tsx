import { Stack } from 'expo-router';

export default function AppLayout() {

  return (
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
  );
}
