import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Text, TextInput, View } from 'react-native';
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
const applyInterFontRenderPatch = (Component: any) => {
  if (!Component || !Component.render || Component.__interFontPatched) return;

  const originalRender = Component.render;
  Component.render = function (...args: any[]) {
    const origin = originalRender.call(this, ...args);
    const weight = extractFontWeight(origin?.props?.style);
    const interFamily = INTER_WEIGHT_MAP[weight ?? '400'] ?? 'Inter_400Regular';

    return {
      ...origin,
      props: {
        ...origin.props,
        style: [{ fontFamily: interFamily }, origin.props.style, { fontFamily: interFamily }],
      },
    };
  };

  Component.__interFontPatched = true;
};

applyInterFontRenderPatch(Text as any);
applyInterFontRenderPatch(TextInput as any);

const paperFontConfig = {
  displayLarge: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  displayMedium: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  displaySmall: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  headlineLarge: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  headlineMedium: { fontFamily: 'Inter_700Bold', fontWeight: '700' as const },
  headlineSmall: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  titleLarge: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  titleSmall: { fontFamily: 'Inter_600SemiBold', fontWeight: '600' as const },
  bodyLarge: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  bodySmall: { fontFamily: 'Inter_400Regular', fontWeight: '400' as const },
  labelLarge: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  labelMedium: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
  labelSmall: { fontFamily: 'Inter_500Medium', fontWeight: '500' as const },
};

const paperTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: paperFontConfig }),
};

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
    const startupFallbackTimer = setTimeout(() => {
      if (mounted) setAppReady(true);
    }, 1500);

    (async () => {
      try {
        const { publishableKey } = await apiService.stripeGetKeys();
        if (mounted) setPublishableKey(publishableKey);
      } catch (e) {
        console.warn('Failed to load Stripe publishable key', e);
      } finally {
        if (mounted) {
          clearTimeout(startupFallbackTimer);
          setAppReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(startupFallbackTimer);
    };
  }, []);

  // Hide native splash as soon as JS root mounts so our animated splash is visible quickly
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const appCanRender = appReady && fontsLoaded;

  return (
    <View style={{ flex: 1 }}>
      {appCanRender && (
        <Provider store={store}>
          <ThemeProvider>
            <AuthProvider>
              <PaperProvider theme={paperTheme}>
                <StripeProvider publishableKey={publishableKey || ''}>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                    <Stack.Screen name="product" options={{ headerShown: false }} />
                    <Stack.Screen name="checkout" options={{ headerShown: false }} />
                    <Stack.Screen name="seller" options={{ headerShown: false }} />
                    <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <StatusBar style="auto" />
                  <Toast />
                </StripeProvider>
              </PaperProvider>
            </AuthProvider>
          </ThemeProvider>
        </Provider>
      )}

      {/* Animated splash overlay — renders on top, then fades out */}
      {!splashDone && (
        <AnimatedSplashScreen
          readyToHide={appCanRender}
          onFinish={() => setSplashDone(true)}
        />
      )}
    </View>
  );
}