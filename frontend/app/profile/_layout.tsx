import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="settings" />
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="payment-methods" />
    </Stack>
  );
}