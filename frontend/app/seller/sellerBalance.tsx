import type React from "react"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
}

type Earnings = Awaited<ReturnType<typeof apiService.getSellerEarnings>>

interface BalanceData {
  earnings: Earnings
  // Seller's own Stripe account (in Stripe's currency, minor units)
  stripeAvailable: number
  stripePending: number
  stripeCurrency?: string
  chargesEnabled: boolean
  isVerified: boolean
}

const ERROR_COPY = {
  offline: { title: "You're offline", text: "Check your internet connection, then try again." },
  auth: { title: "Sign in as a seller", text: "Please sign in with your seller account to see your earnings." },
  server: { title: "Earnings aren't available right now", text: "Our server didn't respond. Please try again in a minute." },
} as const

const EMPTY_EARNINGS: Earnings = { currency: "pkr", feePercent: 8, paid: 0, onHold: 0, recent: [] }

export const SellerBalanceScreen: React.FC<SellerBalanceScreenProps> = ({ sellerId }) => {
  const { width } = useWindowDimensions()
  const { theme } = useTheme()
  const c = theme.colors
  const compact = width < 360
  const pad = compact ? 14 : 20
  // Last loaded balance (kept in Redux while the app is open) → instant on revisit
  const [cachedBalance, saveCachedBalance] = useScreenCache<BalanceData>(sellerId ? `sellerBalance:v2:${sellerId}` : null)
  const [balance, setBalance] = useState<BalanceData | null>(() => cachedBalance ?? null)
  const [loading, setLoading] = useState(() => !cachedBalance)
  const [refreshing, setRefreshing] = useState(false)
  const [errorKind, setErrorKind] = useState<"offline" | "auth" | "server" | null>(null)

  useEffect(() => {
    fetchBalance()
  }, [sellerId])

  const fetchBalance = async () => {
    try {
      if (!sellerId) {
        setBalance({ earnings: EMPTY_EARNINGS, stripeAvailable: 0, stripePending: 0, chargesEnabled: false, isVerified: false })
        return
      }
      // Stripe balance fails with "not connected" until setup is done → zeros
      const [earnings, balanceRes, status] = await Promise.all([
        apiService.getSellerEarnings(),
        apiService.getSellerBalance().catch(() => null),
        apiService.getSellerStatus(sellerId).catch(() => null),
      ])
      const amounts = balanceRes?.data || {}
      const next: BalanceData = {
        earnings,
        stripeAvailable: amounts.available || 0,
        stripePending: amounts.pending || 0,
        stripeCurrency: amounts.currency,
        chargesEnabled: !!status?.chargesEnabled,
        isVerified: !!(status?.detailsSubmitted ?? status?.isOnboarded),
      }
      setBalance(next)
      saveCachedBalance(next)
      setErrorKind(null)
    } catch (error: any) {
      setErrorKind(error?.kind === "offline" || error?.kind === "auth" ? error.kind : "server")
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
      <Text style={[styles.headerTitle, { color: c.text }]}>Earnings</Text>
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
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.errorTitle, { color: c.text }]}>{ERROR_COPY[errorKind || "server"].title}</Text>
              <Text style={[styles.muted, { color: c.textSecondary }]}>{ERROR_COPY[errorKind || "server"].text}</Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: c.primary, paddingHorizontal: 24 }]}
                onPress={() => {
                  setLoading(true)
                  fetchBalance()
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    )
  }

  const isPayoutReady = balance.chargesEnabled && balance.isVerified
  const { earnings } = balance
  const stripeMoney = (minor: number) => formatMoney(minor / 100, balance.stripeCurrency)
  const statusStyle = {
    paid: { label: "Paid", color: c.success },
    on_hold: { label: "On hold", color: c.warning },
    cancelled: { label: "Cancelled", color: c.textSecondary },
  } as const

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={["top"]}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.label, { color: c.textSecondary }]}>Paid to you</Text>
          <Text style={[styles.amount, compact && styles.amountCompact, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatPKR(earnings.paid)}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: isPayoutReady ? c.success : c.warning }]} />
            <Text style={[styles.statusText, { color: c.textSecondary }]}>
              {isPayoutReady
                ? "Your share is sent automatically when a buyer pays"
                : "Finish payment setup to receive your earnings"}
            </Text>
          </View>
          {!isPayoutReady && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: c.primary }]}
              onPress={() => router.navigate("/seller/onboarding")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Go to payment setup</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* On hold */}
        {earnings.onHold > 0 && (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.textSecondary }]}>On hold</Text>
                <Text style={[styles.amountSmall, { color: c.text }]}>{formatPKR(earnings.onHold)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: c.warning + "22" }]}>
                <Text style={[styles.pillText, { color: c.warning }]}>Waiting</Text>
              </View>
            </View>
            <Text style={[styles.note, { color: c.textSecondary }]}>
              {isPayoutReady
                ? "Being sent to your account now. Pull down to refresh."
                : "Kept safe for you. It's sent automatically as soon as your payment setup is complete."}
            </Text>
          </View>
        )}

        {/* Recent sales */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>RECENT SALES</Text>
        <View style={[styles.card, styles.listCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {earnings.recent.length === 0 ? (
            <Text style={[styles.note, { color: c.textSecondary, padding: 16, marginTop: 0 }]}>
              Your earnings from paid orders will appear here.
            </Text>
          ) : (
            earnings.recent.map((row, i, arr) => {
              const st = statusStyle[row.status]
              return (
                <View
                  key={row.id}
                  style={[styles.listRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listValue, { color: c.text }]} numberOfLines={1}>
                      {row.orderNumber ? `Order ${row.orderNumber}` : "Order"}
                    </Text>
                    <Text style={[styles.listSub, { color: c.textSecondary }]}>
                      {new Date(row.date).toLocaleDateString()} · <Text style={{ color: st.color }}>{st.label}</Text>
                    </Text>
                  </View>
                  <Text style={[styles.listValue, { color: row.status === "cancelled" ? c.textSecondary : c.text }]}>
                    {formatPKR(row.amount)}
                  </Text>
                </View>
              )
            })
          )}
        </View>

        {/* Stripe account */}
        {isPayoutReady && (
          <>
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>IN YOUR STRIPE ACCOUNT</Text>
            <View style={[styles.card, styles.listCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              {[
                { label: "Available", value: stripeMoney(balance.stripeAvailable) },
                { label: "Arriving soon", value: stripeMoney(balance.stripePending) },
              ].map((row, i, arr) => (
                <View
                  key={row.label}
                  style={[styles.listRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
                >
                  <Text style={[styles.listLabel, { color: c.textSecondary }]}>{row.label}</Text>
                  <Text style={[styles.listValue, { color: c.text }]}>{row.value}</Text>
                </View>
              ))}
              <Text style={[styles.note, { color: c.textSecondary, paddingHorizontal: 16, paddingBottom: 14 }]}>
                Stripe pays this out to your bank account automatically. Amounts are shown in your Stripe account's currency.
              </Text>
            </View>
          </>
        )}

        {/* Fees */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>FEES</Text>
        <View style={[styles.card, styles.listCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.note, { color: c.textSecondary, paddingHorizontal: 16, paddingTop: 14, marginTop: 0 }]}>
            You keep {100 - earnings.feePercent}% of the price of your items. HomeFit keeps {earnings.feePercent}% as a platform fee.
          </Text>
          {[
            { label: "Your items sell for", value: formatPKR(10000) },
            { label: `Platform fee (${earnings.feePercent}%)`, value: `−${formatPKR(earnings.feePercent * 100)}`, tone: c.error },
            { label: "You earn", value: formatPKR(10000 - earnings.feePercent * 100), tone: c.success, bold: true },
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
    <SellerBalanceScreen sellerId={user?.uid || user?.id || ""} />
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
  muted: { fontSize: 14, lineHeight: 20, textAlign: "center", fontFamily: "Manrope_500Medium" },
  errorTitle: { fontSize: 17, fontFamily: "Manrope_700Bold", textAlign: "center", marginBottom: 6 },

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
  listSub: { fontSize: 12, fontFamily: "Manrope_500Medium", marginTop: 2 },
})
