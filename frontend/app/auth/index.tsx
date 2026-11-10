import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, UserPlus, LogIn } from 'lucide-react-native';
import GoogleLogo from '@/components/Shared/GoogleLogo';

export default function AuthIndex() {
  const { theme, isDark } = useTheme();
  // Live screen size (was read once at file load and never updated)
  const { width, height } = useWindowDimensions();
  // Logo: 40% of width, but never so tall that it pushes the buttons off short
  // phones, and not oversized on tablets.
  const logoSize = Math.round(Math.min(width * 0.4, height * 0.22, 220));
  const { user, isLoading, loginWithGoogle, authBusy } = useAuth();
  // True from the tap until the account picker closes; after that the app-wide
  // "Signing you in…" loader takes over (see AuthBusyOverlay).
  const [isGooglePickerOpen, setIsGooglePickerOpen] = useState(false);
  const googleBusy = isGooglePickerOpen || !!authBusy;

  const handleGoogleLogin = async () => {
    if (googleBusy) return;
    try {
      setIsGooglePickerOpen(true);
      await loginWithGoogle();
    } finally {
      setIsGooglePickerOpen(false);
    }
  };

  // Already signed in (e.g. app opened on this screen) → go Home.
  // Not while a sign-in is running: that flow navigates once it's done.
  useEffect(() => {
    if (!isLoading && user && !authBusy) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, authBusy]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  // Theme-aware colors
  // Flat page colour (the cool blue-tinted gradient clashed with the warm theme)
  const gradientColors = [theme.colors.background, theme.colors.background] as const;

  const cardBg = '#2F3B4B'; // matches the logo image background

  const primaryBtnBg = theme.colors.primary;
  const secondaryBtnBg = theme.colors.surface;
  const secondaryBtnBorder = theme.colors.border;
  const secondaryBtnText = theme.colors.text;

  const googleBtnBg = theme.colors.surface;
  const googleBtnBorder = theme.colors.border;
  const googleBtnText = theme.colors.text;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Scrolls only when the screen is too short (small phones, large font
              size, split-screen); otherwise fills the screen as before. */}
          <ScrollView
            contentContainerStyle={[styles.content, { flexGrow: 1 }]}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Top section — Logo + Text */}
            <View style={[styles.topSection, { paddingTop: height * 0.05 }]}>
              {/* Logo */}
              <View style={[styles.logoContainer, { backgroundColor: cardBg, width: logoSize, height: logoSize }]}>
                <Image 
                  source={require('@/assets/images/logo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Header text */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  Welcome to{' '}
                  <Text style={{ color: theme.colors.primary }}>HomeFit</Text>
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Furniture you can place in your own room with AR, before you buy.
                </Text>
              </View>
            </View>

            {/* Bottom section — Buttons */}
            <View style={styles.bottomSection}>
              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: primaryBtnBg },
                  !isDark && styles.buttonShadow,
                ]}
                onPress={() => router.push('/auth/login')}
                activeOpacity={0.85}
              >
                <LogIn size={20} color="#fff" style={styles.buttonIconLeading} />
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>

              {/* Create Account Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: secondaryBtnBg,
                    borderWidth: 1.5,
                    borderColor: secondaryBtnBorder,
                  },
                  !isDark && styles.buttonShadow,
                ]}
                onPress={() => router.push('/auth/register')}
                activeOpacity={0.85}
              >
                <UserPlus size={20} color={secondaryBtnText} style={styles.buttonIconLeading} />
                <Text style={[styles.secondaryButtonText, { color: secondaryBtnText }]}>
                  Create Account
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              </View>

              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: googleBtnBg,
                    borderWidth: 1,
                    borderColor: googleBtnBorder,
                  },
                  googleBusy && styles.googleButtonDisabled,
                  !isDark && styles.buttonShadow,
                ]}
                onPress={handleGoogleLogin}
                activeOpacity={0.85}
                disabled={googleBusy}
              >
                {isGooglePickerOpen ? (
                  <ActivityIndicator size="small" color={googleBtnText} style={styles.googleIconSlot} />
                ) : (
                  <View style={styles.googleIconSlot}>
                    <GoogleLogo size={20} />
                  </View>
                )}
                <Text style={[styles.googleButtonText, { color: googleBtnText }]}>
                  Continue with Google
                </Text>
                <ArrowRight size={18} color={googleBtnText} style={styles.buttonIcon} />
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>

      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    justifyContent: 'space-between',
    padding: 24,
    // Keep buttons a comfortable width on tablets
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  topSection: {
    alignItems: 'center',
  },
  logoContainer: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 320,
    letterSpacing: 0.1,
  },
  bottomSection: {
    gap: 14,
    paddingBottom: 8,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconLeading: {
    marginRight: 10,
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonIcon: {
    width: 20,
    marginHorizontal: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    textAlign: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    marginHorizontal: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  googleIcon: {
    width: 20,      
    height: 20,    
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  googleButtonDisabled: {
    opacity: 0.75,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  googleIconSlot: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, // (StyleSheet.absoluteFillObject was removed in this RN version)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingCard: {
    minWidth: 200,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  loadingTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
});