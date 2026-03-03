import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import Toast from 'react-native-toast-message';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';

export default function SellerApplicationScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [existingApplication, setExistingApplication] = useState(null);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    description: '',
    phone: '',
    address: '',
    website: '',
    taxId: '',
    businessLicense: '',
  });

  useEffect(() => {
    checkApplicationStatus();
  }, []);

  const checkApplicationStatus = async () => {
    try {
      const response = await apiService.getSellerApplicationStatus();
      if (response.success && response.application) {
        setExistingApplication(response.application);
        
        // If there's an existing application with status PENDING or APPROVED, show the status
        if (['PENDING', 'APPROVED', 'REJECTED'].includes(response.application.status)) {
          // Show toast with the status message
          Toast.show({
            type: response.application.status === 'APPROVED' ? 'success' : 
                  response.application.status === 'REJECTED' ? 'error' : 'info',
            text1: response.application.status === 'PENDING' ? 'Application Under Review' : 
                   response.application.status === 'APPROVED' ? 'Application Approved' : 'Application Status',
            text2: response.message || `Your application is ${response.application.status.toLowerCase()}`,
            visibilityTime: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Error checking application status:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to check application status. Please try again.',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.businessName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your business name',
      });
      return;
    }
    if (!formData.businessType.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your business type',
      });
      return;
    }
    if (!formData.description.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a business description',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.applyForSeller({
        businessName: formData.businessName.trim(),
        businessType: formData.businessType.trim(),
        description: formData.description.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        website: formData.website.trim(),
        taxId: formData.taxId.trim(),
        businessLicense: formData.businessLicense.trim()
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Application Submitted!',
          text2: 'Your seller application has been submitted successfully.',
          visibilityTime: 4000,
          onHide: () => router.replace('/(tabs)')
        });
      } else {
        throw new Error(response.error || 'Failed to submit application');
      }
    } catch (error: any) {
      console.error('Submit application error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to submit application. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#FFA500';
      case 'APPROVED': return '#4CAF50';
      case 'REJECTED': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return 'Under Review';
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      default: return 'Unknown';
    }
  };

  if (isCheckingStatus) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <HeaderBackButton onPress={() => router.back()} size={24} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Become a Seller</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Checking application status...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (existingApplication) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <HeaderBackButton onPress={() => router.back()} size={24} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Application Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            <View style={[styles.statusCard, { backgroundColor: theme.colors.surface, borderColor: getStatusColor(existingApplication.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(existingApplication.status) }]}>
                Status: {getStatusText(existingApplication.status)}
              </Text>

              {existingApplication.status === 'PENDING' && (
                <Text style={[styles.statusMessage, { color: theme.colors.text, opacity: 0.7 }]}>
                  Your application is being reviewed. We'll notify you once a decision is made.
                </Text>
              )}

              {existingApplication.status === 'APPROVED' && (
                <Text style={[styles.statusMessage, { color: theme.colors.text, opacity: 0.7 }]}>
                  Congratulations! Your seller application has been approved. You can now start selling on our platform.
                </Text>
              )}

              {existingApplication.status === 'REJECTED' && (
                <Text style={[styles.statusMessage, { color: theme.colors.text, opacity: 0.7 }]}>
                  Unfortunately, your application was not approved. Please contact support for more information.
                </Text>
              )}

              <Text style={[styles.applicationDate, { color: theme.colors.text, opacity: 0.6 }]}>
                Submitted: {new Date(existingApplication.submittedAt).toLocaleDateString()}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.backToHomeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[styles.backButtonText, { color: '#fff' }]}>
                Back to Home
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (user?.role === 'seller') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <HeaderBackButton onPress={() => router.back()} size={24} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Become a Seller</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            You are already a seller!
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text, opacity: 0.7 }]}>
            You can access your seller dashboard from the menu.
          </Text>
          <TouchableOpacity
            style={[styles.backToHomeButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={[styles.backButtonText, { color: '#fff' }]}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <HeaderBackButton onPress={() => router.back()} size={24} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Become a Seller</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Business Name *
              </Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
                placeholder="Enter your business name"
                placeholderTextColor={theme.colors.text + '80'}
                value={formData.businessName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, businessName: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Business Type *
              </Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
                placeholder="e.g., Retail, Wholesale, Manufacturing"
                placeholderTextColor={theme.colors.text + '80'}
                value={formData.businessType}
                onChangeText={(text) => setFormData(prev => ({ ...prev, businessType: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Business Description *
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
                placeholder="Tell us about your business, products, and experience..."
                placeholderTextColor={theme.colors.text + '80'}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Phone Number
              </Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
                placeholder="Enter your business phone number"
                placeholderTextColor={theme.colors.text + '80'}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Business Address
              </Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
                placeholder="Enter your business address"
                placeholderTextColor={theme.colors.text + '80'}
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Website (Optional)
              </Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
                placeholder="https://yourwebsite.com"
                placeholderTextColor={theme.colors.text + '80'}
                value={formData.website}
                onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Tax ID (Optional)
              </Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }]}
                placeholder="Enter your tax identification number"
                placeholderTextColor={theme.colors.text + '80'}
                value={formData.taxId}
                onChangeText={(text) => setFormData(prev => ({ ...prev, taxId: text }))}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.submitButtonText, { color: '#fff' }]}>
                  Submit Application
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    marginTop: 0,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  statusCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  applicationDate: {
    fontSize: 14,
    textAlign: 'center',
  },
  backToHomeButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
});
