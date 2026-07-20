
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="edit-profile"
      />
      <Stack.Screen
        name="edit-payment-method"
      />
      <Stack.Screen
        name="delete-account"
      />
    </Stack>
  );
}
