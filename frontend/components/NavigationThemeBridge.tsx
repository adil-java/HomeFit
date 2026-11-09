import React, { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Connects the app's own light/dark theme (ThemeContext) to the navigation
 * library and the native window.
 *
 * Without this, every navigator (tabs, stacks, drawer) uses the library's
 * default *light* theme, so during tab/screen transitions a near-white
 * background shows through, which is very visible in dark mode.
 */
export default function NavigationThemeBridge({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background, // behind every screen during transitions
        card: theme.colors.background,       // headers / tab bar default
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.error,
      },
    };
  }, [isDark, theme]);

  // Native window background (visible for a frame while screens mount/animate)
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => {});
  }, [theme.colors.background]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      {children}
      {/* Status bar icons follow the app theme, not the phone's system setting */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}
