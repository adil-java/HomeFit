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
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OnboardingStatus = {
  isOnboarded: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requirements?: any[];
  currentDeadline?: number;
  status?: string;
};

type OnboardingData = {
  onboardingUrl?: string;
  isMobile: boolean;
  requiresOnboarding: boolean;
  status?: OnboardingStatus;
} | null;

export default function OnboardingPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const sellerId = user?.id || '';
  
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);

    // Handle hardware back button press
    useEffect(() => {
      const backAction = () => {
        router.replace('/(tabs)');
        return true;
      };
    
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );
    
      return () => backHandler.remove();
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

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url.includes('onboarding=success')) {
        const status = await checkOnboardingStatus();
        if (status) {
          setOnboardingStatus(status);
        }
      } else if (event.url.includes('error=callback_failed')) {
        Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    const checkStatus = async () => {
      setLoading(true);
      try {
        const status = await checkOnboardingStatus();
        if (!status?.isOnboarded || !status.chargesEnabled) {
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
  }, [sellerId]);

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
    // console.log('Onboarding Status:', onboardingStatus);
    
    // Determine the actual onboarding status based on all available flags
    const isFullyOnboarded = onboardingStatus.isOnboarded && onboardingStatus.chargesEnabled;
    const isPartiallyOnboarded = onboardingStatus.isOnboarded && !onboardingStatus.chargesEnabled;
    const pendingRequirements = onboardingStatus.requirements ?? [];
    
    // Detailed status information
    const statusDetails: Array<{ label: string; value: string; icon: string; status?: string }> = [
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
                <Ionicons name={detail.icon as keyof typeof Ionicons.glyphMap} size={20} color="#666" style={styles.detailIcon} />
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
                <Ionicons name={detail.icon as keyof typeof Ionicons.glyphMap} size={20} color="#666" style={styles.detailIcon} />
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
          
          {pendingRequirements.length > 0 && (
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Additional information needed:</Text>
              {pendingRequirements.map((req, index) => (
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
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background }]}> 
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: theme.colors.text }]}>Payment Setup</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Connect Your Bank Account</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}> 
            Get paid directly to your bank account. Complete verification to start accepting payments.
          </Text>
        </View>

        <View style={[styles.benefitsCard, { backgroundColor: theme.dark ? '#17352A' : '#ECFDF3', borderLeftColor: theme.colors.success }]}> 
          <Text style={[styles.benefitsTitle, { color: theme.dark ? '#86EFAC' : '#15803D' }]}>What you get</Text>
          <View style={styles.benefitItem}>
            <Text style={[styles.checkmark, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.benefitText, { color: theme.dark ? '#D1FAE5' : '#166534' }]}>Accept credit and debit cards</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={[styles.checkmark, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.benefitText, { color: theme.dark ? '#D1FAE5' : '#166534' }]}>Instant verification with identity check</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={[styles.checkmark, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.benefitText, { color: theme.dark ? '#D1FAE5' : '#166534' }]}>Get paid directly to your bank</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={[styles.checkmark, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.benefitText, { color: theme.dark ? '#D1FAE5' : '#166534' }]}>Transparent fees with no hidden charges</Text>
          </View>
        </View>

        <View style={[styles.requirementsCard, { backgroundColor: theme.colors.surface }]}> 
          <Text style={[styles.requirementsCardTitle, { color: theme.colors.text }]}>You'll need</Text>
          <View style={styles.requirementItem}>
            <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
            <Text style={[styles.requirementsCardText, { color: theme.colors.textSecondary }]}>Valid government ID</Text>
          </View>
          <View style={styles.requirementItem}>
            <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
            <Text style={[styles.requirementsCardText, { color: theme.colors.textSecondary }]}>Business bank account details</Text>
          </View>
          <View style={styles.requirementItem}>
            <Text style={[styles.bullet, { color: theme.colors.textSecondary }]}>•</Text>
            <Text style={[styles.requirementsCardText, { color: theme.colors.textSecondary }]}>Business tax information</Text>
          </View>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: theme.colors.surface }]}> 
          <Text style={[styles.timelineTitle, { color: theme.colors.text }]}>Estimated timeline</Text>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineStep, { color: theme.colors.text }]}>Step 1: Identity Verification</Text>
              <Text style={[styles.timelineDuration, { color: theme.colors.textSecondary }]}>~2-5 minutes</Text>
            </View>
          </View>
          <View style={[styles.timelineItem, { opacity: 0.7 }]}>
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineStep, { color: theme.colors.text }]}>Step 2: Bank Connection</Text>
              <Text style={[styles.timelineDuration, { color: theme.colors.textSecondary }]}>~3-5 minutes</Text>
            </View>
          </View>
          <View style={[styles.timelineItem, { opacity: 0.7 }]}>
            <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineStep, { color: theme.colors.text }]}>Step 3: Business Setup</Text>
              <Text style={[styles.timelineDuration, { color: theme.colors.textSecondary }]}>~2-3 minutes</Text>
            </View>
          </View>
        </View>

        <View style={[styles.infoAlert, { backgroundColor: theme.dark ? '#1A2B3A' : '#EFF6FF', borderLeftColor: theme.colors.primary }]}> 
          <Text style={[styles.infoBullet, { color: theme.colors.primary }]}>ℹ</Text>
          <Text style={[styles.infoText, { color: theme.dark ? '#BFDBFE' : '#0C4A6E' }]}> 
            Your data is encrypted and secured with bank-level security. Stripe is trusted by millions of businesses worldwide.
          </Text>
        </View>

        {renderOnboardingStatus()}

        {(!onboardingStatus?.isOnboarded || !onboardingStatus?.chargesEnabled) && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.replace('/(tabs)')}
              disabled={loading}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>Maybe Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleStartOnboarding}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Start Verification</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.securityInfo, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.primary }]}> 
          <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}> 
            🔒 Your information is secured with bank-level encryption. We use Stripe to handle all payments securely.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  topBarSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  benefitsCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 3,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 14,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 16,
    marginRight: 10,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  requirementsCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  requirementsCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bullet: {
    fontSize: 14,
    marginRight: 10,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  requirementsCardText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  timelineCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
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
    fontSize: 14,
    fontWeight: "500",
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  timelineDuration: {
    fontSize: 12,
  },
  infoAlert: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
  },
  infoBullet: {
    fontSize: 16,
    marginRight: 10,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
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
    fontFamily: 'Inter_600SemiBold',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  securityInfo: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  securityText: {
    fontSize: 13,
    lineHeight: 20,
  },
  statusContainer: {
    width: '100%',
    marginTop: 8,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  statusIcon: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    textAlign: 'left',
  },
  statusText: {
    fontSize: 16,
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
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
   detailsContainer: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailIcon: {
    marginRight: 8,
    color: '#6b7280',
  },
  detailLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
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
    flex: 1,
    lineHeight: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
