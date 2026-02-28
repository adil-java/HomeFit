import { Stack } from 'expo-router';

export default function ProductLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="model-viewer" />
      <Stack.Screen name="ar" />
    </Stack>
  );
}