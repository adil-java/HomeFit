import { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Linking, 
  Platform, 
  TouchableOpacity,
  ScrollView
} from "react-native";
import { WebView } from "react-native-webview";
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

// Add deep linking configuration for mobile
const DEEP_LINKING_URL = 'yourapp://' // Replace with your app's deep link scheme

const handleDeepLink = async (event: { url: string }) => {
  if (event.url.includes('onboarding=success')) {
    // Just refresh the status instead of redirecting
    const status = await checkOnboardingStatus();
    if (status) {
      setOnboardingStatus(status);
    }
  } else if (event.url.includes('error=callback_failed')) {
    Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
  }
};

type OnboardingStatus = {
  isOnboarded: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requirements?: any[];
  currentDeadline?: number;
};

type OnboardingData = {
  onboardingUrl?: string;
  isMobile: boolean;
  requiresOnboarding: boolean;
  status?: OnboardingStatus;
} | null;

export default function OnboardingPage() {
  const { user } = useAuth();
  const sellerId = user?.id || '';
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    // Set up deep linking listener
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL in case app was opened from a deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    // Check onboarding status first
    const checkStatus = async () => {
      setLoading(true);
      try {
        const status = await checkOnboardingStatus();
        // Only start onboarding if not already onboarded
        if (!status?.isOnboarded || !status.chargesEnabled) {
          // Don't auto-start the process, just show the status
          setOnboardingStatus(status);
        }
      } catch (error) {
        console.error('Error checking status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      subscription.remove();
    };
  }, []);

  const checkOnboardingStatus = async (): Promise<OnboardingStatus | null> => {
    if (!sellerId) return null;
    
    try {
      const status = await apiService.getSellerStatus(sellerId);
      setOnboardingStatus(status);
      
      setOnboardingData(prev => ({
        ...(prev || {}),
        isMobile: prev?.isMobile || false,
        requiresOnboarding: !(status.isOnboarded && status.chargesEnabled),
        status
      }));
      
      return status;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return null;
    }
  };

  const startOnboardingProcess = async () => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setLoading(true);
    try {
      // First check current status
      const status = await checkOnboardingStatus();
      
      // If already onboarded, no need to start again
      if (status?.isOnboarded && status.chargesEnabled) {
        setLoading(false);
        return;
      }

      // Start onboarding process
      const response = await apiService.startSellerOnboarding(
        user.name || "My Store",
        user.email || ""
      );

      if (response.onboardingUrl) {
        const newData = {
          onboardingUrl: response.onboardingUrl,
          isMobile: response.isMobile || false,
          requiresOnboarding: response.requiresOnboarding,
          status: response.status || status
        };
        
        setOnboardingData(newData);
        setOnboardingStatus(response.status || status);

        // Open in external browser for better UX on mobile
        if (Platform.OS !== 'web') {
          const supported = await Linking.canOpenURL(response.onboardingUrl);
          if (supported) {
            await WebBrowser.openBrowserAsync(response.onboardingUrl, {
              toolbarColor: '#ffffff',
              controlsColor: '#007AFF',
              dismissButtonStyle: 'close',
            });
            // After returning from browser, check status
            await checkOnboardingStatus();
          }
        }
      } else if (response.isOnboarded) {
        // Already onboarded
        setOnboardingData({
          isMobile: false,
          requiresOnboarding: false,
          status: response
        });
        setOnboardingStatus(response);
      } else {
        throw new Error("No onboarding URL received from server");
      }
    } catch (error: any) {
      console.error("Onboarding error:", error);
      Alert.alert("Error", error.message || "Failed to start onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderOnboardingStatus = () => {
    if (!onboardingStatus) return null;
    console.log('Onboarding Status:', onboardingStatus);
    
    // Determine the actual onboarding status based on all available flags
    const isFullyOnboarded = onboardingStatus.isOnboarded && onboardingStatus.chargesEnabled;
    const isPartiallyOnboarded = onboardingStatus.isOnboarded && !onboardingStatus.chargesEnabled;
    
    // Detailed status information
    const statusDetails = [
      { 
        label: 'Account Status', 
        value: isFullyOnboarded ? 'Active' : 
              isPartiallyOnboarded ? 'Pending Activation' : 'Inactive', 
        icon: 'person' 
      },
      { 
        label: 'Payments', 
        value: onboardingStatus.chargesEnabled ? 'Enabled' : 'Disabled', 
        icon: 'card',
        status: onboardingStatus.chargesEnabled ? 'success' : 'warning'
      },
      { 
        label: 'Payouts', 
        value: onboardingStatus.payoutsEnabled ? 'Enabled' : 'Disabled', 
        icon: 'cash',
        status: onboardingStatus.payoutsEnabled ? 'success' : 'warning'
      },
      { 
        label: 'Verification', 
        value: onboardingStatus.detailsSubmitted ? 'Completed' : 'Pending', 
        icon: 'document-text',
        status: onboardingStatus.detailsSubmitted ? 'success' : 'warning'
      },
      ...(onboardingStatus.currentDeadline ? [
        { 
          label: 'Verification Deadline', 
          value: new Date(onboardingStatus.currentDeadline * 1000).toLocaleDateString(), 
          icon: 'calendar' 
        }
      ] : []),
      ...(onboardingStatus.status ? [
        { 
          label: 'Status', 
          value: onboardingStatus.status.replace(/_/g, ' '),
          icon: 'information-circle'
        }
      ] : [])
    ];

    if (isFullyOnboarded) {
      return (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" style={styles.statusIcon} />
          <Text style={styles.statusTitle}>Onboarding Complete!</Text>
          <Text style={styles.statusText}>
            Your Stripe account is fully set up and ready to accept payments.
          </Text>
          
          {/* Detailed Status */}
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Account Details:</Text>
            {statusDetails.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <Ionicons name={detail.icon} size={20} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>{detail.label}: </Text>
                <Text style={[
                  styles.detailValue,
                  detail.value === 'Yes' || detail.value === 'Active' ? styles.positiveStatus : 
                  detail.value === 'No' || detail.value === 'Inactive' ? styles.negativeStatus : {}
                ]}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity 
            style={[styles.button, { marginTop: 16 }]}
            onPress={() => router.push('/seller/dashboard')}
          >
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isPartiallyOnboarded) {
      return (
        <View style={styles.statusContainer}>
          <Ionicons name="time" size={64} color="#FFA000" style={styles.statusIcon} />
          <Text style={styles.statusTitle}>Verification in Progress</Text>
          <Text style={styles.statusText}>
            {onboardingStatus.status === 'PENDING_VERIFICATION' 
              ? 'Your account is being verified by our team. This usually takes 1-2 business days.'
              : 'Your account needs additional verification to enable payments. Please complete the required steps.'
            }
          </Text>
          
          {/* Detailed Status */}
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Current Status:</Text>
            {statusDetails.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <Ionicons name={detail.icon} size={20} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>{detail.label}: </Text>
                <Text style={[
                  styles.detailValue,
                  detail.value === 'Yes' || detail.value === 'Active' ? styles.positiveStatus : 
                  detail.value === 'No' || detail.value === 'Inactive' ? styles.negativeStatus : {}
                ]}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>
          
          {onboardingStatus.requirements?.length > 0 && (
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Additional information needed:</Text>
              {onboardingStatus.requirements.map((req, index) => (
                <View key={index} style={styles.requirementItem}>
                  <Ionicons name="alert-circle" size={16} color="#d97706" style={styles.requirementIcon} />
                  <Text style={styles.requirementText}>{req}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* <TouchableOpacity 
            style={[styles.button, styles.outlineButton, { marginTop: 16 }]}
            onPress={startOnboardingProcess}
          >
            <Text style={[styles.buttonText, { color: '#0066CC' }]}>
              Update Information
            </Text>
          </TouchableOpacity> */}
        </View>
      );
    }

    return null;
  };

  const handleStartOnboarding = async () => {
    try {
      setLoading(true);
      await startOnboardingProcess();
    } catch (error) {
      console.error('Error starting onboarding:', error);
      Alert.alert('Error', 'Failed to start onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Connect Your Bank Account</Text>
        <Text style={styles.subtitle}>
          Get paid directly to your bank account. Complete the verification to start accepting payments.
        </Text>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>What you get:</Text>
        <View style={styles.benefitItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.benefitText}>Accept credit and debit cards</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.benefitText}>Instant verification with identity check</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.benefitText}>Get paid directly to your bank</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.benefitText}>Transparent fees with no hidden charges</Text>
        </View>
      </View>

      {/* Requirements */}
      <View style={styles.requirementsCard}>
        <Text style={styles.requirementsTitle}>You'll need:</Text>
        <View style={styles.requirementItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.requirementText}>Valid government ID</Text>
        </View>
        <View style={styles.requirementItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.requirementText}>Business bank account details</Text>
        </View>
        <View style={styles.requirementItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.requirementText}>Business tax information</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Estimated timeline</Text>
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineStep}>Step 1: Identity Verification</Text>
            <Text style={styles.timelineDuration}>~2-5 minutes</Text>
          </View>
        </View>
        <View style={[styles.timelineItem, { opacity: 0.6 }]}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineStep}>Step 2: Bank Connection</Text>
            <Text style={styles.timelineDuration}>~3-5 minutes</Text>
          </View>
        </View>
        <View style={[styles.timelineItem, { opacity: 0.6 }]}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineStep}>Step 3: Business Setup</Text>
            <Text style={styles.timelineDuration}>~2-3 minutes</Text>
          </View>
        </View>
      </View>

      {/* Info Alert */}
      <View style={styles.infoAlert}>
        <Text style={styles.infoBullet}>ℹ</Text>
        <Text style={styles.infoText}>
          Your data is encrypted and secured with bank-level security. Stripe is trusted by millions of businesses
          worldwide.
        </Text>
      </View>

      
      {/* Status Display */}
      {renderOnboardingStatus()}
      
      {/* Only show onboarding CTA if not already onboarded */}
      {(!onboardingStatus?.isOnboarded || !onboardingStatus?.chargesEnabled) && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => router.back()} 
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.primaryButton,
              loading && styles.disabledButton
            ]}
            onPress={handleStartOnboarding}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Start Verification</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Security Info */}
      <View style={styles.securityInfo}>
        <Text style={styles.securityText}>
          🔒 Your information is secured with bank-level encryption. We use Stripe to handle all payments securely.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
  benefitsCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  checkmark: {
    fontSize: 16,
    color: "#22c55e",
    marginRight: 10,
    fontWeight: "600",
  },
  benefitText: {
    fontSize: 13,
    color: "#166534",
    flex: 1,
  },
  requirementsCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bullet: {
    fontSize: 16,
    color: "#999",
    marginRight: 10,
    fontWeight: "600",
  },
  requirementText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  timelineCard: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStep: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  timelineDuration: {
    fontSize: 12,
    color: "#999",
  },
  infoAlert: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  infoBullet: {
    fontSize: 16,
    color: "#0284c7",
    marginRight: 10,
    fontWeight: "600",
  },
  infoText: {
    fontSize: 12,
    color: "#0c4a6e",
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#f0f0f0",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  securityInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  securityText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  statusContainer: {
    flex: 1,
    marginTop:-28,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusIcon: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    marginLeft:-60,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'left',
  },
  statusText: {
    fontSize: 16,
    marginLeft:-12,
    color: '#666',
    textAlign: 'left',
    marginBottom: 24,
    lineHeight: 24,
  },
  requirementsContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
   detailsContainer: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginRight:38,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
    color: '#6b7280',
  },
  detailLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  positiveStatus: {
    color: '#16a34a', // green
  },
  negativeStatus: {
    color: '#dc2626', // red
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#92400e',
  },
});
