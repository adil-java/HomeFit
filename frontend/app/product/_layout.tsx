import { Stack } from 'expo-router';
import { stackScreenOptions, fadeScreenOptions } from '@/constants/navigation';

export default function ProductLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="model-viewer" options={fadeScreenOptions} />
      <Stack.Screen name="ar" options={fadeScreenOptions} />
    </Stack>
  );
}