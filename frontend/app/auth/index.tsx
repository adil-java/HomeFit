import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, UserPlus, LogIn } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function AuthIndex() {
  const { theme, isDark } = useTheme();
  const { user, isLoading, loginWithGoogle } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
      </View>
    );
  }

  // Theme-aware colors
  const gradientColors = isDark
    ? [theme.colors.background, theme.colors.surface] as const
    : ['#f8f9fc', '#eef1f8'] as const;

  const cardBg = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.02)';

  const primaryBtnBg = theme.colors.primary;
  const secondaryBtnBg = isDark
    ? 'transparent'
    : '#FFFFFF';
  const secondaryBtnBorder = isDark
    ? 'rgba(255, 255, 255, 0.2)'
    : theme.colors.border;
  const secondaryBtnText = isDark
    ? '#FFFFFF'
    : theme.colors.primary;

  const googleBtnBg = isDark
    ? 'transparent'
    : '#FFFFFF';
  const googleBtnBorder = isDark
    ? 'rgba(255, 255, 255, 0.2)'
    : '#E0E0E0';
  const googleBtnText = isDark
    ? '#FFFFFF'
    : '#333333';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Top section — Logo + Text */}
            <View style={styles.topSection}>
              {/* Logo */}
              <View style={[styles.logoContainer, { backgroundColor: cardBg }]}>
                <Image 
                  source={require('@/assets/images/LOGO.png')} 
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
                  Experience your dream furniture in AR before you buy. 
                  Modern design, premium style, seamless shopping.
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
                <LogIn size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <View style={styles.buttonIcon} />
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
                <UserPlus size={20} color={secondaryBtnText} style={styles.buttonIcon} />
                <Text style={[styles.secondaryButtonText, { color: secondaryBtnText }]}>
                  Create Account
                </Text>
                <View style={styles.buttonIcon} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }]} />
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
                  !isDark && styles.buttonShadow,
                ]}
                onPress={loginWithGoogle}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1762603041/google-icon_vqmcjy.png' }}
                  style={styles.googleIcon}
                  resizeMode="contain"
                />
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
          </View>
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
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: height * 0.05,
  },
  logoContainer: {
    width: width * 0.4,
    height: width * 0.4,
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
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
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
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_500Medium',
  },
  googleIcon: {
    width: 20,      
    height: 20,    
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: height * 0.45,
  },
});