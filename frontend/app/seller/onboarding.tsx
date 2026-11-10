import { friendlyError } from '@/utils/errorMessages';
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  BackHandler,
  AppState,
} from "react-native";
import * as ExpoLinking from 'expo-linking';
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { router, useFocusEffect } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import { logger } from '@/utils/logger';

type OnboardingStatus = {
  isOnboarded: boolean;      // details submitted to Stripe
  chargesEnabled: boolean;   // can accept payments
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requirements?: string[];
  currentDeadline?: number;
  status?: string;
};

type Stage = 'not_started' | 'in_review' | 'payouts_pending' | 'active';

const stageOf = (s: OnboardingStatus | null): Stage => {
  if (s?.chargesEnabled) return s.payoutsEnabled ? 'active' : 'payouts_pending';
  return s?.detailsSubmitted ? 'in_review' : 'not_started';
};

// Stripe's requirement codes ("individual verification document") → plain words
const REQUIREMENT_LABELS: [RegExp, string][] = [
  [/verification document|verification additional document/, 'A photo of your ID'],
  [/external account/, 'Your bank account'],
  [/dob/, 'Date of birth'],
  [/address/, 'Home address'],
  [/id number|ssn/, 'ID number'],
  [/tos acceptance/, "Accept Stripe's terms"],
  [/business profile|mcc|url/, 'Business details'],
  [/phone/, 'Phone number'],
  [/first name|last name/, 'Your name'],
  [/email/, 'Email address'],
];
const friendlyRequirements = (list: string[]) => {
  const out: string[] = [];
  for (const raw of list) {
    const r = raw.toLowerCase();
    const label = REQUIREMENT_LABELS.find(([re]) => re.test(r))?.[1] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!out.includes(label)) out.push(label);
  }
  return out;
};

export default function OnboardingPage() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const horizontalPadding = compact ? 14 : 20;
  const { user } = useAuth();
  // Database user id (user.id is the sign-in id; the server checks the database id)
  const sellerId = user?.uid || user?.id || '';

  const [loading, setLoading] = useState(true);       // first status load
  const [starting, setStarting] = useState(false);    // opening Stripe
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const browserOpenRef = useRef(false);

  // Hardware back goes home — only while this screen is focused
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.dismissTo('/(tabs)');
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  const checkStatus = useCallback(async (): Promise<OnboardingStatus | null> => {
    if (!sellerId) return null;
    try {
      const next = (await apiService.getSellerStatus(sellerId)) as OnboardingStatus;
      setStatus(next);
      setLoadError(null);
      return next;
    } catch (error: any) {
      setLoadError(friendlyError(error, 'Could not load your payment status'));
      return null;
    }
  }, [sellerId]);

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await checkStatus();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [checkStatus]);

  // Coming back to this screen (or back from Stripe's page) → refresh status
  useFocusEffect(
    useCallback(() => {
      if (!loading && !browserOpenRef.current) checkStatus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkStatus])
  );

  // Back in the app after Stripe (even if the browser was closed by hand) → refresh
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !browserOpenRef.current) checkStatus();
    });
    return () => sub.remove();
  }, [checkStatus]);

  // Deep link from Stripe's "done" page (…/seller/onboarding?onboarding=done)
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('onboarding=')) checkStatus();
    });
    return () => sub.remove();
  }, [checkStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
  }, [checkStatus]);

  const startOnboarding = async () => {
    if (!user) {
      Alert.alert("Error", "Please sign in again.");
      return;
    }

    setStarting(true);
    try {
      // Stripe's finish page redirects here, which closes the browser
      // automatically (works in Expo Go and in builds).
      const appReturnUrl = ExpoLinking.createURL('seller/onboarding');

      const response = await apiService.startSellerOnboarding(
        user.name || "My Store",
        user.email || "",
        appReturnUrl
      );

      if (response.isOnboarded && !response.onboardingUrl) {
        // Already fully set up — show the real status
        await checkStatus();
        return;
      }

      if (!response.onboardingUrl) {
        throw new Error("No onboarding link received from the server");
      }

      browserOpenRef.current = true;
      try {
        await WebBrowser.openAuthSessionAsync(response.onboardingUrl, appReturnUrl);
      } finally {
        browserOpenRef.current = false;
      }
      // Whether they finished or closed the browser, show the latest status
      await checkStatus();
    } catch (error: any) {
      logger.error("Onboarding error:", error);
      Alert.alert("Couldn't open setup", friendlyError(error, "Please try again."));
    } finally {
      setStarting(false);
    }
  };

  const stage = stageOf(status);
  const requirements = friendlyRequirements(status?.requirements ?? []);

  // ---------- UI pieces ----------

  const StatusPill = ({ ok, okText, pendingText }: { ok: boolean; okText: string; pendingText: string }) => (
    <View style={[styles.pill, { backgroundColor: (ok ? c.success : c.warning) + '22' }]}>
      <View style={[styles.pillDot, { backgroundColor: ok ? c.success : c.warning }]} />
      <Text style={[styles.pillText, { color: ok ? c.success : c.warning }]}>{ok ? okText : pendingText}</Text>
    </View>
  );

  const heroByStage: Record<Stage, { icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; text: string }> = {
    not_started: {
      icon: 'card-outline',
      tint: c.primary,
      title: 'Get paid for your sales',
      text: 'Connect a bank account through Stripe to receive payouts. It takes about 10 minutes.',
    },
    in_review: {
      icon: 'time-outline',
      tint: c.warning,
      title: requirements.length ? 'A few details needed' : 'Verification in progress',
      text: requirements.length
        ? 'Stripe needs a bit more information before you can accept payments.'
        : 'Stripe is reviewing your details. This usually takes 1–2 business days.',
    },
    payouts_pending: {
      icon: 'shield-checkmark-outline',
      tint: c.warning,
      title: 'One more step',
      text: requirements.length
        ? "You can already sell and earn. Stripe needs a little more before it can send money to your bank."
        : 'You can already sell and earn. Stripe is checking your details before sending money to your bank.',
    },
    active: {
      icon: 'checkmark-circle',
      tint: c.success,
      title: "You're all set",
      text: 'Buyers can pay you, and your earnings are sent to your bank automatically.',
    },
  };
  const hero = heroByStage[stage];

  const primaryLabel = stage === 'not_started' ? 'Start setup' : stage === 'payouts_pending' ? 'Finish in Stripe' : 'Continue setup';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { borderBottomColor: c.border, backgroundColor: c.background, paddingHorizontal: compact ? 12 : 16 }]}>
        <HeaderBackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={[styles.topBarTitle, { color: c.text }]}>Payment Setup</Text>
        <View style={styles.topBarSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
        >
          {loadError && !status && (
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.errorBanner, { backgroundColor: c.error + '18', borderColor: c.error + '55' }]}
            >
              <Ionicons name="cloud-offline-outline" size={18} color={c.error} />
              <Text style={[styles.errorText, { color: c.error }]}>{loadError}. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {/* Status hero */}
          <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.heroIcon, { backgroundColor: hero.tint + '1F' }]}>
              <Ionicons name={hero.icon} size={30} color={hero.tint} />
            </View>
            <Text style={[styles.heroTitle, compact && styles.heroTitleCompact, { color: c.text }]}>{hero.title}</Text>
            <Text style={[styles.heroText, { color: c.textSecondary }]}>{hero.text}</Text>

            {stage !== 'not_started' && (
              <View style={[styles.checklist, { borderTopColor: c.border }]}>
                {[
                  { label: 'Details submitted', ok: !!status?.detailsSubmitted, okText: 'Done', pendingText: 'Pending' },
                  { label: 'Accept payments', ok: !!status?.chargesEnabled, okText: 'Enabled', pendingText: 'Pending' },
                  { label: 'Payouts to bank', ok: !!status?.payoutsEnabled, okText: 'Enabled', pendingText: 'Pending' },
                ].map((row) => (
                  <View key={row.label} style={styles.checkRow}>
                    <Text style={[styles.checkLabel, { color: c.text }]}>{row.label}</Text>
                    <StatusPill ok={row.ok} okText={row.okText} pendingText={row.pendingText} />
                  </View>
                ))}
                {!!status?.currentDeadline && (
                  <Text style={[styles.deadline, { color: c.textSecondary }]}>
                    Complete by {new Date(status.currentDeadline * 1000).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* What Stripe still needs */}
          {(stage === 'in_review' || stage === 'payouts_pending') && requirements.length > 0 && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Still needed</Text>
              {requirements.map((req, index) => (
                <View key={`${req}-${index}`} style={styles.listRow}>
                  <Ionicons name="alert-circle" size={16} color={c.warning} />
                  <Text style={[styles.listText, { color: c.textSecondary }]}>
                    {req.charAt(0).toUpperCase() + req.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Intro content — only before setup */}
          {stage === 'not_started' && (
            <>
              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>What you get</Text>
                {[
                  { icon: 'card-outline', text: 'Accept credit and debit cards' },
                  { icon: 'flash-outline', text: 'Fast identity verification' },
                  { icon: 'business-outline', text: 'Payouts straight to your bank' },
                  { icon: 'receipt-outline', text: 'Clear fees, no hidden charges' },
                ].map((b) => (
                  <View key={b.text} style={styles.listRow}>
                    <View style={[styles.listIcon, { backgroundColor: c.success + '1F' }]}>
                      <Ionicons name={b.icon as keyof typeof Ionicons.glyphMap} size={15} color={c.success} />
                    </View>
                    <Text style={[styles.listText, { color: c.text }]}>{b.text}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>How it works</Text>
                {[
                  { step: '1', title: 'Verify your identity', time: '2–5 min' },
                  { step: '2', title: 'Connect your bank account', time: '3–5 min' },
                  { step: '3', title: 'Add business details', time: '2–3 min' },
                ].map((s, i, arr) => (
                  <View key={s.step} style={styles.stepRow}>
                    <View style={styles.stepRail}>
                      <View style={[styles.stepDot, { backgroundColor: c.primary }]}>
                        <Text style={styles.stepNum}>{s.step}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={[styles.stepLine, { backgroundColor: c.border }]} />}
                    </View>
                    <View style={styles.stepBody}>
                      <Text style={[styles.stepTitle, { color: c.text }]}>{s.title}</Text>
                      <Text style={[styles.stepTime, { color: c.textSecondary }]}>{s.time}</Text>
                    </View>
                  </View>
                ))}
                <Text style={[styles.needs, { color: c.textSecondary }]}>
                  Have ready: a government ID, your bank account details and tax information.
                </Text>
              </View>
            </>
          )}

          {/* Actions */}
          {stage === 'active' || stage === 'payouts_pending' ? (
            <View style={styles.actionStack}>
              {stage === 'payouts_pending' && requirements.length > 0 && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: c.primary }, starting && styles.disabledButton]}
                  onPress={startOnboarding}
                  disabled={starting}
                  activeOpacity={0.85}
                >
                  {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{primaryLabel}</Text>}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  stage === 'payouts_pending' && requirements.length > 0
                    ? [styles.secondaryButton, { borderColor: c.border }]
                    : { backgroundColor: c.primary },
                ]}
                onPress={() => router.navigate('/seller/sellerBalance')}
                activeOpacity={0.85}
              >
                <Text
                  style={
                    stage === 'payouts_pending' && requirements.length > 0
                      ? [styles.secondaryButtonText, { color: c.text }]
                      : styles.primaryButtonText
                  }
                >
                  View earnings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.navigate('/seller/dashboard')} style={styles.linkButton} hitSlop={8}>
                <Text style={[styles.linkText, { color: c.primary }]}>Go to dashboard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.buttonContainer, compact && styles.buttonContainerCompact]}>
              <TouchableOpacity
                style={[styles.button, styles.flexButton, styles.secondaryButton, { borderColor: c.border }]}
                onPress={() => router.dismissTo('/(tabs)')}
                disabled={starting}
              >
                <Text style={[styles.secondaryButtonText, { color: c.text }]}>Maybe later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.flexButton, { backgroundColor: c.primary }, starting && styles.disabledButton]}
                onPress={startOnboarding}
                disabled={starting}
                activeOpacity={0.85}
              >
                {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{primaryLabel}</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.secureRow}>
            <Ionicons name="lock-closed" size={13} color={c.textSecondary} />
            <Text style={[styles.secureText, { color: c.textSecondary }]}>
              Secured by Stripe. HomeFit never sees your bank or ID details.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { marginRight: 8 },
  topBarTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  topBarSpacer: { width: 40 },
  container: { flex: 1 },
  contentContainer: { paddingTop: 20, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium' },

  heroCard: {
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    padding: 22, alignItems: 'center', marginBottom: 16,
  },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 22, letterSpacing: -0.3, fontFamily: 'Manrope_700Bold', fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  heroTitleCompact: { fontSize: 19 },
  heroText: { fontSize: 14, lineHeight: 20, textAlign: 'center', fontFamily: 'Manrope_400Regular' },

  checklist: { alignSelf: 'stretch', marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  checkLabel: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
  deadline: { fontSize: 12, marginTop: 2, fontFamily: 'Manrope_400Regular' },

  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold', fontWeight: '700', marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  listIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  listText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_400Regular' },

  stepRow: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 26 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: '#fff', fontSize: 12, fontFamily: 'Manrope_700Bold', fontWeight: '700' },
  stepLine: { width: 2, flex: 1, minHeight: 14, marginVertical: 3 },
  stepBody: { flex: 1, paddingBottom: 14 },
  stepTitle: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', fontWeight: '600', marginTop: 3 },
  stepTime: { fontSize: 12, marginTop: 2, fontFamily: 'Manrope_400Regular' },
  needs: { fontSize: 13, lineHeight: 19, marginTop: 4, fontFamily: 'Manrope_400Regular' },

  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 4 },
  buttonContainerCompact: { flexDirection: 'column-reverse' },
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  flexButton: { flex: 1 },
  secondaryButton: { borderWidth: 1, backgroundColor: 'transparent' },
  disabledButton: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
  secondaryButtonText: { fontSize: 16, fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
  actionStack: { gap: 12, marginTop: 4 },
  linkButton: { alignSelf: 'center', paddingVertical: 6 },
  linkText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },

  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingHorizontal: 8 },
  secureText: { fontSize: 12, textAlign: 'center', fontFamily: 'Manrope_400Regular' },
});
