import { Stack } from "expo-router";

/**
 * Suporte: a lista de pedidos e a conversa de cada um.
 *
 * Dois ecrãs e não um: uma conversa precisa de ocupar o ecrã inteiro para se
 * ler, e a lista precisa de continuar a ser uma lista. Empilhados, o gesto de
 * voltar leva da conversa à lista, que é onde se espera cair.
 */
export default function SupportTicketLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[ticketId]" />
    </Stack>
  );
}
