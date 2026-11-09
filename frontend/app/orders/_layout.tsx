import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}