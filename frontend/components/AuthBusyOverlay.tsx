import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Full-screen loader while signing in or out. Rendered once at the app root,
 * so it stays visible while the app moves from the sign-in screen to Home, and
 * it swallows taps so buttons can't be pressed twice.
 */
export default function AuthBusyOverlay() {
  const { authBusy } = useAuth();
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState<string | null>(authBusy);
  const [mounted, setMounted] = useState(!!authBusy);

  useEffect(() => {
    if (authBusy) {
      setMessage(authBusy);
      setMounted(true);
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [authBusy, opacity]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: theme.colors.background, opacity }]}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{message}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>This only takes a moment</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  title: { marginTop: 18, fontSize: 17, fontFamily: 'Manrope_700Bold', letterSpacing: -0.2 },
  subtitle: { marginTop: 6, fontSize: 14, fontFamily: 'Manrope_400Regular' },
});
