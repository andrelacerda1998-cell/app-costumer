import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,

        animation: "ios_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="select-technician/[serviceId]" />
      <Stack.Screen name="schedule/schedule-service" />
    </Stack>
  );
}
