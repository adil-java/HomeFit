import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Text, View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { store } from '@/store/store';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { StripeProvider } from '@stripe/stripe-react-native';
import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';

// Prevent the native splash from auto-hiding so we can transition smoothly
SplashScreen.preventAutoHideAsync().catch(() => {});

// Map fontWeight values to their corresponding Inter font family names
const INTER_WEIGHT_MAP: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
};

// Helper: extract the last fontWeight from a style prop (style can be nested arrays / objects)
function extractFontWeight(style: any): string | undefined {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    let weight: string | undefined;
    for (const s of style) {
      const w = extractFontWeight(s);
      if (w !== undefined) weight = w;
    }
    return weight;
  }
  if (typeof style === 'object' && style.fontWeight !== undefined) {
    return String(style.fontWeight);
  }
  return undefined;
}

// Set Inter as the default font for ALL Text components app-wide,
// automatically mapping fontWeight → correct Inter variant.
const originalRender = (Text as any).render;
if (originalRender) {
  (Text as any).render = function (...args: any[]) {
    const origin = originalRender.call(this, ...args);
    const weight = extractFontWeight(origin.props.style);
    const interFamily = INTER_WEIGHT_MAP[weight ?? '400'] ?? 'Inter_400Regular';
    return {
      ...origin,
      props: {
        ...origin.props,
        style: [
          { fontFamily: interFamily },
          origin.props.style,
          { fontFamily: interFamily },  // override again after user styles to enforce Inter
        ],
      },
    };
  };
}

export default function RootLayout() {
  useFrameworkReady();
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Load Inter font weights
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { publishableKey } = await apiService.stripeGetKeys();
        if (mounted) setPublishableKey(publishableKey);
      } catch (e) {
        console.warn('Failed to load Stripe publishable key', e);
      } finally {
        // App is ready to render, even if Stripe key failed
        if (mounted) setAppReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Hide the native splash once our layout is rendered
  const onLayoutReady = useCallback(async () => {
    if (appReady && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [appReady, fontsLoaded]);

  // Don't render anything until the app and fonts are ready
  if (!appReady || !fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutReady}>
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

      {/* Animated splash overlay — renders on top, then fades out */}
      {!splashDone && (
        <AnimatedSplashScreen onFinish={() => setSplashDone(true)} />
      )}
    </View>
  );
}