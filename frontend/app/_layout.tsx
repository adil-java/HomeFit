import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Text, TextInput, View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { store } from '@/store/store';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { StripeProvider } from '@stripe/stripe-react-native';
import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';
import { stackScreenOptions, fadeScreenOptions } from '@/constants/navigation';
import NavigationThemeBridge from '@/components/NavigationThemeBridge';
import AuthBusyOverlay from '@/components/AuthBusyOverlay';
import { toastConfig } from '@/components/AppToast';
import { logger } from '@/utils/logger';

// Prevent the native splash from auto-hiding so we can transition smoothly
SplashScreen.preventAutoHideAsync().catch(() => {});

// Fonts: Manrope everywhere. Styles name the family explicitly
// (fontFamily: 'Manrope_600SemiBold'); React Native has no global default font.


const paperFontConfig = {
  displayLarge: { fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  displayMedium: { fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  displaySmall: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
  headlineLarge: { fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  headlineMedium: { fontFamily: 'Manrope_700Bold', fontWeight: '700' as const },
  headlineSmall: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
  titleLarge: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
  titleSmall: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' as const },
  bodyLarge: { fontFamily: 'Manrope_400Regular', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'Manrope_400Regular', fontWeight: '400' as const },
  bodySmall: { fontFamily: 'Manrope_400Regular', fontWeight: '400' as const },
  labelLarge: { fontFamily: 'Manrope_500Medium', fontWeight: '500' as const },
  labelMedium: { fontFamily: 'Manrope_500Medium', fontWeight: '500' as const },
  labelSmall: { fontFamily: 'Manrope_500Medium', fontWeight: '500' as const },
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
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
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
        logger.warn('Failed to load Stripe publishable key', e);
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
            <NavigationThemeBridge>
            <AuthProvider>
              <PaperProvider theme={paperTheme}>
                <StripeProvider publishableKey={publishableKey || ''}>
                  <Stack screenOptions={stackScreenOptions}>
                    {/* Signing in/out swaps these two sections → fade instead of slide */}
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, ...fadeScreenOptions }} />
                    <Stack.Screen name="auth" options={{ headerShown: false, ...fadeScreenOptions }} />
                    <Stack.Screen name="product" options={{ headerShown: false }} />
                    <Stack.Screen name="checkout" options={{ headerShown: false }} />
                    <Stack.Screen name="seller" options={{ headerShown: false }} />
                    <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <AuthBusyOverlay />
                  <Toast config={toastConfig} topOffset={56} />
                </StripeProvider>
              </PaperProvider>
            </AuthProvider>
            </NavigationThemeBridge>
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