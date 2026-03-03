import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Formik } from 'formik';
import * as Yup from 'yup';

const { width } = Dimensions.get('window');

const loginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export default function LoginScreen() {

  const { theme, isDark } = useTheme();
  const { login,token} = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Clear error message after 4 seconds
  useEffect(() => {
    if (loginError) {
      const timer = setTimeout(() => {
        setLoginError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [loginError]);

  const handleLogin = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    setLoginError(''); // Clear any previous errors
    try {
      await login(values.email, values.password);
    } catch (error) {
      setLoginError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with Logo */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
            >
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            
            {/* Logo */}
            <View style={[styles.logoContainer, { backgroundColor: isDark ? theme.colors.surface : '#2D3748' }]}>
              <Image 
                source={require('@/assets/images/LOGO.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            
            <Text style={[styles.title, { color: theme.colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Sign in to continue shopping
            </Text>
          </View>

          {/* Form */}
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleLogin}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Mail size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="Enter your email"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {touched.email && errors.email && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {errors.email}
                    </Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Password</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Lock size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passwordInput, { color: theme.colors.text }]}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={theme.colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={theme.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {errors.password}
                    </Text>
                  )}
                  {loginError ? (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {loginError}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSubmit as any}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/auth/register')}>
                    <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>

          {/* Demo Credentials */}
          {/* <View style={[styles.demoContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.demoTitle, { color: theme.colors.text }]}>Demo Credentials</Text>
            <Text style={[styles.demoText, { color: theme.colors.textSecondary }]}>
              Customer: customer@example.com / password
            </Text>
            <Text style={[styles.demoText, { color: theme.colors.textSecondary }]}>
              Seller: seller@example.com / password
            </Text>
          </View> */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 16,
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    padding: 24,
    paddingTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  errorText: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  demoContainer: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    marginBottom: 4,
  },
});