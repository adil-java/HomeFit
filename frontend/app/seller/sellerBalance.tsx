import type React from "react"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
} from "react-native"
import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/services/api"
import { useScreenCache } from "@/hooks/useScreenCache"
import { useTheme } from "@/contexts/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import HeaderBackButton from "@/components/Shared/HeaderBackButton"
import { formatPKR, formatPrice } from "@/constants/pricing"

// Stripe reports the account currency; PKR uses the app's "Rs." format.
const formatMoney = (amount: number, currency?: string) =>
  !currency || currency.toLowerCase() === "pkr"
    ? formatPKR(amount)
    : `${currency.toUpperCase()} ${amount.toFixed(2)}`

interface SellerBalanceScreenProps {
  sellerId: string
  onRequestPayout: () => void
}

interface BalanceData {
  currentBalance: number
  pendingPayout: number
  pendingAmount: number
  lastPayoutDate: string
  nextPayoutDate: string
  chargesEnabled: boolean
  isVerified: boolean
  currency?: string
}

export const SellerBalanceScreen: React.FC<SellerBalanceScreenProps> = ({ sellerId, onRequestPayout }) => {
  const { width } = useWindowDimensions()
  const { theme } = useTheme()
  const c = theme.colors
  const compact = width < 360
  const pad = compact ? 14 : 20
  // Last loaded balance (kept in Redux while the app is open) → instant on revisit
  const [cachedBalance, saveCachedBalance] = useScreenCache<BalanceData>(sellerId ? `sellerBalance:${sellerId}` : null)
  const [balance, setBalance] = useState<BalanceData | null>(() => cachedBalance ?? null)
  const [loading, setLoading] = useState(() => !cachedBalance)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchBalance()
  }, [sellerId])

  const fetchBalance = async () => {
    try {
      if (!sellerId) {
        setBalance({
          currentBalance: 0,
          pendingPayout: 0,
          pendingAmount: 0,
          lastPayoutDate: "N/A",
          nextPayoutDate: "N/A",
          chargesEnabled: false,
          isVerified: false,
        })
        return
      }

      // Previously this called a relative URL (no server address, no auth token),
      // so it always failed. Use the shared API client instead.
      // Balance fails with "not connected to Stripe" until onboarding is done → show zeros.
      const [balanceRes, status] = await Promise.all([
        apiService.getSellerBalance().catch(() => null),
        apiService.getSellerStatus(sellerId).catch(() => null),
      ])
      const amounts = balanceRes?.data || {}
      const next: BalanceData = {
        currentBalance: amounts.available || 0,
        pendingAmount: amounts.pending || 0,
        pendingPayout: 0,
        lastPayoutDate: "N/A",
        nextPayoutDate: "N/A",
        chargesEnabled: !!status?.chargesEnabled,
        isVerified: !!(status?.detailsSubmitted ?? status?.isOnboarded),
        currency: amounts.currency,
      }
      setBalance(next)
      saveCachedBalance(next)
    } catch (error: any) {
      // Keep showing cached data if we have it
      // Keeps cached data; the screen shows a retry hint when there is none
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchBalance()
    setRefreshing(false)
  }

  const header = (
    <View style={[styles.header, { paddingHorizontal: pad, borderBottomColor: c.border }]}>
      <HeaderBackButton onPress={() => (router.canGoBack() ? router.back() : router.dismissTo("/(tabs)"))} />
      <Text style={[styles.headerTitle, { color: c.text }]}>Balance</Text>
      <View style={{ width: 40 }} />
    </View>
  )

  if (loading || !balance) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top"]}>
        {header}
        <View style={styles.centered}>
          {loading ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <Text style={[styles.muted, { color: c.textSecondary }]}>Could not load your balance. Pull down to try again.</Text>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const isPayoutReady = balance.chargesEnabled && balance.isVerified
  const money = (minor: number) => formatMoney(minor / 100, balance.currency)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top"]}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Available balance */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Available to withdraw</Text>
          <Text style={[styles.amount, compact && styles.amountCompact, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(balance.currentBalance)}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: isPayoutReady ? c.success : c.warning }]} />
            <Text style={[styles.statusText, { color: c.textSecondary }]}>
              {isPayoutReady ? "Payouts are active" : "Finish payment setup to receive payouts"}
            </Text>
          </View>
          {isPayoutReady ? (
            balance.currentBalance > 0 && (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: c.primary }]} onPress={onRequestPayout} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Request payout</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: c.primary }]}
              onPress={() => router.navigate("/seller/onboarding")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Go to payment setup</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pending */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>On the way</Text>
              <Text style={[styles.amountSmall, { color: c.text }]}>{money(balance.pendingAmount)}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: c.warning + "22" }]}>
              <Text style={[styles.pillText, { color: c.warning }]}>Processing</Text>
            </View>
          </View>
          <Text style={[styles.note, { color: c.textSecondary }]}>Recent sales become available in 1–2 business days.</Text>
        </View>

        {/* Payouts */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>PAYOUTS</Text>
        <View style={[styles.card, styles.listCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {[
            { label: "Last payout", value: balance.lastPayoutDate },
            { label: "Next payout", value: balance.nextPayoutDate },
            { label: "Method", value: "Bank transfer" },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.listRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
            >
              <Text style={[styles.listLabel, { color: c.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.listValue, { color: c.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Fees */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>FEES</Text>
        <View style={[styles.card, styles.listCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.note, { color: c.textSecondary, paddingHorizontal: 16, paddingTop: 14, marginTop: 0 }]}>
            You keep 92% of every sale. HomeFit keeps 8% as a platform fee.
          </Text>
          {[
            { label: "Customer pays", value: formatPKR(10000) },
            { label: "Platform fee (8%)", value: `−${formatPKR(800)}`, tone: c.error },
            { label: "You earn", value: formatPKR(9200), tone: c.success, bold: true },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.listRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
            >
              <Text style={[styles.listLabel, { color: row.bold ? c.text : c.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.listValue, { color: row.tone || c.text }, row.bold && { fontFamily: "Manrope_800ExtraBold" }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default function SellerBalanceRoute() {
  const { user } = useAuth()

  return (
    <SellerBalanceScreen
      sellerId={user?.uid || user?.id || ""}
      onRequestPayout={() => Alert.alert("Coming soon", "Payout requests will be available soon.")}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold' },
  content: { paddingTop: 16, paddingBottom: 32, width: "100%", maxWidth: 640, alignSelf: "center" },
  muted: { fontSize: 14, textAlign: "center", fontFamily: "Manrope_500Medium" },

  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 16 },
  listCard: { padding: 0, overflow: "hidden" },
  label: { fontSize: 13, fontFamily: "Manrope_600SemiBold" },
  amount: { fontSize: 34, fontFamily: "Manrope_800ExtraBold", letterSpacing: -1, marginTop: 4 },
  amountCompact: { fontSize: 28 },
  amountSmall: { fontSize: 22, fontFamily: "Manrope_800ExtraBold", letterSpacing: -0.5, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { flex: 1, fontSize: 13, fontFamily: "Manrope_500Medium" },
  primaryButton: { marginTop: 16, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontSize: 15, fontFamily: "Manrope_700Bold" },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontFamily: "Manrope_700Bold" },
  note: { fontSize: 13, lineHeight: 18, marginTop: 10, fontFamily: "Manrope_400Regular" },
  sectionLabel: { fontSize: 12, fontFamily: "Manrope_700Bold", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  listLabel: { fontSize: 14, fontFamily: "Manrope_500Medium" },
  listValue: { fontSize: 14, fontFamily: "Manrope_700Bold" },
})
