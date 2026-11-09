import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Small loading dialog while signing in or out. Rendered once at the app root,
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
      style={[styles.overlay, { opacity }]}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Dims the screen and swallows taps; the screen underneath stays visible
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 200,
  },
  title: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
});
