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
import { router } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Formik } from 'formik';
import * as Yup from 'yup';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';

const { width } = Dimensions.get('window');

const registerSchema = Yup.object().shape({
  name: Yup.string().min(2, 'Name must be at least 2 characters').required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

export default function RegisterScreen() {
  const { theme, isDark } = useTheme();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Clear error message after 4 seconds
  useEffect(() => {
    if (registerError) {
      const timer = setTimeout(() => {
        setRegisterError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [registerError]);

  const handleRegister = async (values: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setIsLoading(true);
    setRegisterError(''); // Clear any previous errors
    try {
      await register(values.email, values.password, values.name);
    } catch (error) {
      setRegisterError('Unable to create account. Account already exists.');
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
            <HeaderBackButton onPress={() => router.back()} size={24} style={styles.backButton} />
            
            {/* Logo */}
            <View style={[styles.logoContainer, { backgroundColor: isDark ? theme.colors.surface : '#2D3748' }]}>
              <Image 
                source={require('@/assets/images/LOGO.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            
            <Text style={[styles.title, { color: theme.colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Join us and start shopping
            </Text>
          </View>

          {/* Form */}
          <Formik
            initialValues={{ name: '', email: '', password: '', confirmPassword: '' }}
            validationSchema={registerSchema}
            onSubmit={handleRegister}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Full Name</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <User size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="Enter your full name"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={values.name}
                      onChangeText={handleChange('name')}
                      onBlur={handleBlur('name')}
                    />
                  </View>
                  {touched.name && errors.name && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {errors.name}
                    </Text>
                  )}
                </View>

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
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Confirm Password</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <Lock size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.passwordInput, { color: theme.colors.text }]}
                      placeholder="Confirm your password"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={values.confirmPassword}
                      onChangeText={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color={theme.colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={theme.colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {errors.confirmPassword}
                    </Text>
                  )}
                </View>

                {registerError ? (
                  <Text style={[styles.errorText, { color: theme.colors.error, marginBottom: 20, textAlign: 'center' }]}>
                    {registerError}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.registerButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSubmit as any}
                  disabled={isLoading}
                >
                  <Text style={styles.registerButtonText}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/auth/login')}>
                    <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>
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
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    padding: 24,
    paddingTop: 8,
  },
  inputContainer: {
    marginBottom: 18,
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
  registerButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
});