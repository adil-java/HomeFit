import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  CreditCard,
  Smartphone,
  Building
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

const mockTransactions = [
  {
    id: '1',
    type: 'credit',
    amount: 100.00,
    description: 'Wallet Top-up',
    date: '2024-01-15T10:30:00Z',
    method: 'Credit Card',
  },
  {
    id: '2',
    type: 'debit',
    amount: 45.99,
    description: 'Order Payment #12345',
    date: '2024-01-14T15:45:00Z',
    method: 'Wallet',
  },
  {
    id: '3',
    type: 'credit',
    amount: 50.00,
    description: 'Refund for Order #12340',
    date: '2024-01-13T09:20:00Z',
    method: 'Wallet',
  },
  {
    id: '4',
    type: 'debit',
    amount: 89.99,
    description: 'Order Payment #12344',
    date: '2024-01-12T14:15:00Z',
    method: 'Wallet',
  },
];

const topUpMethods = [
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
  { id: 'jazzcash', name: 'JazzCash', icon: Smartphone },
  { id: 'bank', name: 'Bank Transfer', icon: Building },
];

export default function WalletScreen() {
  const { theme } = useTheme();
  const [walletBalance, setWalletBalance] = useState(250.00);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [showTopUp, setShowTopUp] = useState(false);

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid amount',
        text2: 'Please enter a valid amount',
        position: 'bottom',
      });
      return;
    }

    if (amount > 1000) {
      Toast.show({
        type: 'error',
        text1: 'Amount too high',
        text2: 'Maximum top-up amount is $1000',
        position: 'bottom',
      });
      return;
    }

    // Simulate payment processing
    setTimeout(() => {
      setWalletBalance(prev => prev + amount);
      setTopUpAmount('');
      setShowTopUp(false);
      
      Toast.show({
        type: 'success',
        text1: 'Top-up successful!',
        text2: `$${amount.toFixed(2)} added to your wallet`,
        position: 'bottom',
      });
    }, 1000);
  };

  const TransactionItem = ({ transaction }: { transaction: any }) => {
    const isCredit = transaction.type === 'credit';
    const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
    const iconColor = isCredit ? theme.colors.success : theme.colors.error;

    return (
      <View style={[styles.transactionItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={[styles.transactionIcon, { backgroundColor: iconColor + '20' }]}>
          <Icon size={20} color={iconColor} />
        </View>
        
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>
            {transaction.description}
          </Text>
          <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
            {new Date(transaction.date).toLocaleDateString()} • {transaction.method}
          </Text>
        </View>
        
        <Text style={[
          styles.transactionAmount,
          { color: isCredit ? theme.colors.success : theme.colors.error }
        ]}>
          {isCredit ? '+' : '-'}${transaction.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Wallet Balance Card */}
        <View style={styles.balanceSection}>
          <LinearGradient
            colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <Wallet size={32} color="#fff" />
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
            </View>
            
            <Text style={styles.balanceAmount}>
              ${walletBalance.toFixed(2)}
            </Text>
            
            <TouchableOpacity
              onPress={() => setShowTopUp(true)}
              style={styles.topUpButton}
            >
              <Plus size={20} color={theme.colors.primary} />
              <Text style={[styles.topUpButtonText, { color: theme.colors.primary }]}>
                Top Up
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Actions
          </Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity
              onPress={() => setShowTopUp(true)}
              style={[styles.quickAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.success + '20' }]}>
                <Plus size={24} color={theme.colors.success} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Add Money
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <ArrowUpRight size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Send Money
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                <CreditCard size={24} color={theme.colors.warning} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Pay Bills
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Transactions
            </Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={mockTransactions}
            renderItem={({ item }) => <TransactionItem transaction={item} />}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {/* Top Up Modal */}
      {showTopUp && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Top Up Wallet
              </Text>
              <TouchableOpacity onPress={() => setShowTopUp(false)}>
                <Text style={[styles.cancelButton, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Amount
                </Text>
                <TextInput
                  style={[
                    styles.amountInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={topUpAmount}
                  onChangeText={setTopUpAmount}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Payment Method
                </Text>
                {topUpMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    onPress={() => setSelectedMethod(method.id)}
                    style={[
                      styles.methodOption,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: selectedMethod === method.id ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <method.icon size={20} color={theme.colors.primary} />
                    <Text style={[styles.methodText, { color: theme.colors.text }]}>
                      {method.name}
                    </Text>
                    {selectedMethod === method.id && (
                      <View style={[styles.selectedDot, { backgroundColor: theme.colors.primary }]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleTopUp}
                style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.confirmButtonText}>
                  Add ${topUpAmount || '0.00'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  balanceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    gap: 12,
  },
  methodText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  selectedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});