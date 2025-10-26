import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { store } from '@/store/store';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { useState } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  useFrameworkReady();
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { publishableKey } = await apiService.stripeGetKeys();
        if (mounted) setPublishableKey(publishableKey);
      } catch (e) {
        console.warn('Failed to load Stripe publishable key', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <PaperProvider>
            <StripeProvider publishableKey={publishableKey || ''}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="product" options={{ headerShown: false }} />
                <Stack.Screen name="checkout" options={{ headerShown: false }} />
                <Stack.Screen name="seller" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
              <Toast />
            </StripeProvider>
          </PaperProvider>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}