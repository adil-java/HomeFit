import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export default function AuthLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}