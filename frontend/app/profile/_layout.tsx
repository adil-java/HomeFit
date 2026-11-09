import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="settings" />
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="addresses" />
      <Stack.Screen name="payment-methods" />
    </Stack>
  );
}