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
} from "react-native"

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
}

export const SellerBalanceScreen: React.FC<SellerBalanceScreenProps> = ({ sellerId, onRequestPayout }) => {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchBalance()
  }, [sellerId])

  const fetchBalance = async () => {
    try {
      // API Call: GET /api/stripe/balance
      const response = await fetch(`/api/stripe/balance?sellerId=${sellerId}`)
      const data = await response.json()
      setBalance(data)
    } catch (error: any) {
      Alert.alert("Error", "Failed to fetch balance")
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchBalance()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!balance) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load balance</Text>
      </View>
    )
  }

  const isPayoutReady = balance.chargesEnabled && balance.isVerified

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Account Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Account Status</Text>
          <View style={[styles.statusBadge, isPayoutReady ? styles.statusBadgeActive : styles.statusBadgePending]}>
            <Text style={styles.statusBadgeText}>{isPayoutReady ? "Active" : "Pending"}</Text>
          </View>
        </View>
        <Text style={styles.statusDescription}>
          {isPayoutReady
            ? "Your account is fully verified and ready to receive payments."
            : "Complete Stripe verification to start receiving payments."}
        </Text>
      </View>

      {/* Current Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>${(balance.currentBalance / 100).toFixed(2)}</Text>
        <Text style={styles.balanceNote}>Ready to withdraw to your bank</Text>

        {balance.currentBalance > 0 && (
          <TouchableOpacity style={styles.withdrawButton} onPress={onRequestPayout}>
            <Text style={styles.withdrawButtonText}>Request Payout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending Transactions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending Transactions</Text>
        <View style={styles.pendingRow}>
          <View>
            <Text style={styles.pendingLabel}>Processing Amount</Text>
            <Text style={styles.pendingAmount}>${(balance.pendingAmount / 100).toFixed(2)}</Text>
          </View>
          <View style={styles.processingBadge}>
            <Text style={styles.processingText}>Processing</Text>
          </View>
        </View>
        <Text style={styles.pendingNote}>These funds will be available in 1-2 business days</Text>
      </View>

      {/* Payout Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payout Schedule</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <View>
            <Text style={styles.infoLabel}>Last Payout</Text>
            <Text style={styles.infoValue}>{balance.lastPayoutDate}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <View>
            <Text style={styles.infoLabel}>Next Payout</Text>
            <Text style={styles.infoValue}>{balance.nextPayoutDate}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <View>
            <Text style={styles.infoLabel}>Payout Method</Text>
            <Text style={styles.infoValue}>Direct Bank Transfer</Text>
          </View>
        </View>
      </View>

      {/* Fee Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fees & Earnings</Text>
        <Text style={styles.feeDescription}>
          For each sale, you earn 92% of the sale price. We keep 8% as our platform fee.
        </Text>

        <View style={styles.exampleContainer}>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleLabel}>Customer Pays</Text>
            <Text style={styles.exampleValue}>$100.00</Text>
          </View>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleLabel}>Platform Fee (8%)</Text>
            <Text style={[styles.exampleValue, styles.feeValue]}>-$8.00</Text>
          </View>
          <View style={[styles.exampleRow, styles.exampleTotal]}>
            <Text style={styles.exampleLabel}>You Earn</Text>
            <Text style={[styles.exampleValue, styles.earningValue]}>$92.00</Text>
          </View>
        </View>
      </View>

      {/* Help & Support */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Need Help?</Text>
        <TouchableOpacity style={styles.supportLink}>
          <Text style={styles.supportLinkText}>View Payout History →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportLink}>
          <Text style={styles.supportLinkText}>Contact Support →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  statusCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
    color: "#000",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: "#dcfce7",
  },
  statusBadgePending: {
    backgroundColor: "#fef08a",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
    color: "#166534",
  },
  statusDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  balanceCard: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    fontFamily: 'Inter_700Bold',
    color: "#fff",
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 16,
  },
  withdrawButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  withdrawButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
    color: "#000",
    marginBottom: 12,
  },
  pendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 12,
  },
  pendingLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  pendingAmount: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
    color: "#000",
  },
  processingBadge: {
    backgroundColor: "#fef08a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processingText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: 'Inter_500Medium',
    color: "#92400e",
  },
  pendingNote: {
    fontSize: 12,
    color: "#999",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#007AFF",
    marginRight: 12,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: 'Inter_500Medium',
    color: "#000",
  },
  feeDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  exampleContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  exampleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  exampleLabel: {
    fontSize: 12,
    color: "#666",
  },
  exampleValue: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: 'Inter_500Medium',
    color: "#000",
  },
  feeValue: {
    color: "#ef4444",
  },
  exampleTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  earningValue: {
    color: "#22c55e",
    fontWeight: "600",
    fontFamily: 'Inter_600SemiBold',
  },
  supportLink: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  supportLinkText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "500",
    fontFamily: 'Inter_500Medium',
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    fontWeight: "500",
    fontFamily: 'Inter_500Medium',
  },
})
