import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function CheckoutLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" />
    </Stack>
  );
}