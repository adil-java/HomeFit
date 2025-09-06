import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, CreditCard, CreditCard as Edit3, Trash2, X, Check, Smartphone, Building, Wallet } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

interface PaymentMethod {
  id: string;
  type: 'card' | 'jazzcash' | 'bank' | 'wallet';
  name: string;
  details: string;
  isDefault: boolean;
  lastFour?: string;
  expiryDate?: string;
  cardType?: 'visa' | 'mastercard' | 'amex';
}

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'card',
    name: 'Visa ending in 4242',
    details: '**** **** **** 4242',
    lastFour: '4242',
    expiryDate: '12/25',
    cardType: 'visa',
    isDefault: true,
  },
  {
    id: '2',
    type: 'jazzcash',
    name: 'JazzCash',
    details: '+92 300 1234567',
    isDefault: false,
  },
];

export default function PaymentMethodsScreen() {
  const { theme } = useTheme();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [selectedType, setSelectedType] = useState<'card' | 'jazzcash' | 'bank' | 'wallet'>('card');
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    phoneNumber: '',
    accountNumber: '',
    bankName: '',
  });

  const paymentTypes = [
    { key: 'card', label: 'Credit/Debit Card', icon: CreditCard },
    { key: 'jazzcash', label: 'JazzCash', icon: Smartphone },
    { key: 'bank', label: 'Bank Account', icon: Building },
    { key: 'wallet', label: 'Digital Wallet', icon: Wallet },
  ];

  const handleAddPaymentMethod = () => {
    let name = '';
    let details = '';

    switch (selectedType) {
      case 'card':
        if (!formData.cardNumber || !formData.expiryDate || !formData.cvv) {
          Alert.alert('Error', 'Please fill in all card details');
          return;
        }
        name = `Card ending in ${formData.cardNumber.slice(-4)}`;
        details = `**** **** **** ${formData.cardNumber.slice(-4)}`;
        break;
      case 'jazzcash':
        if (!formData.phoneNumber) {
          Alert.alert('Error', 'Please enter phone number');
          return;
        }
        name = 'JazzCash';
        details = formData.phoneNumber;
        break;
      case 'bank':
        if (!formData.accountNumber || !formData.bankName) {
          Alert.alert('Error', 'Please fill in bank details');
          return;
        }
        name = formData.bankName;
        details = `Account ending in ${formData.accountNumber.slice(-4)}`;
        break;
      case 'wallet':
        name = 'Digital Wallet';
        details = 'Connected wallet';
        break;
    }

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: selectedType,
      name,
      details,
      isDefault: paymentMethods.length === 0,
      ...(selectedType === 'card' && {
        lastFour: formData.cardNumber.slice(-4),
        expiryDate: formData.expiryDate,
      }),
    };

    setPaymentMethods([...paymentMethods, newMethod]);
    setShowAddModal(false);
    resetForm();
    Alert.alert('Success', 'Payment method added successfully');
  };

  const handleDeleteMethod = (id: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(paymentMethods.filter(method => method.id !== id));
          },
        },
      ]
    );
  };

  const handleSetDefault = (id: string) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id,
    }));
    setPaymentMethods(updatedMethods);
  };

  const resetForm = () => {
    setFormData({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      phoneNumber: '',
      accountNumber: '',
      bankName: '',
    });
    setSelectedType('card');
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card':
        return CreditCard;
      case 'jazzcash':
        return Smartphone;
      case 'bank':
        return Building;
      case 'wallet':
        return Wallet;
      default:
        return CreditCard;
    }
  };

  const PaymentMethodCard = ({ method }: { method: PaymentMethod }) => {
    const Icon = getPaymentIcon(method.type);

    return (
      <View style={[styles.methodCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.methodHeader}>
          <View style={styles.methodInfo}>
            <Icon size={24} color={theme.colors.primary} />
            <View style={styles.methodDetails}>
              <Text style={[styles.methodName, { color: theme.colors.text }]}>
                {method.name}
              </Text>
              <Text style={[styles.methodSubtext, { color: theme.colors.textSecondary }]}>
                {method.details}
              </Text>
              {method.expiryDate && (
                <Text style={[styles.methodSubtext, { color: theme.colors.textSecondary }]}>
                  Expires {method.expiryDate}
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.methodActions}>
            <TouchableOpacity
              onPress={() => handleDeleteMethod(method.id)}
              style={[styles.actionButton, { backgroundColor: theme.colors.error + '20' }]}
            >
              <Trash2 size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.methodFooter}>
          {method.isDefault ? (
            <View style={[styles.defaultBadge, { backgroundColor: theme.colors.success }]}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => handleSetDefault(method.id)}
              style={[styles.setDefaultButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.setDefaultText, { color: theme.colors.primary }]}>
                Set as Default
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'card':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Card Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.cardNumber}
                onChangeText={(text) => setFormData({ ...formData, cardNumber: text })}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Expiry Date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="MM/YY"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.expiryDate}
                  onChangeText={(text) => setFormData({ ...formData, expiryDate: text })}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>CVV *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                  placeholder="123"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={formData.cvv}
                  onChangeText={(text) => setFormData({ ...formData, cvv: text })}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Cardholder Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="John Doe"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.cardholderName}
                onChangeText={(text) => setFormData({ ...formData, cardholderName: text })}
              />
            </View>
          </>
        );

      case 'jazzcash':
        return (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Phone Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder="+92 300 1234567"
              placeholderTextColor={theme.colors.textSecondary}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              keyboardType="phone-pad"
            />
          </View>
        );

      case 'bank':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Bank Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Bank Name"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.bankName}
                onChangeText={(text) => setFormData({ ...formData, bankName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Account Number *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="1234567890"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.accountNumber}
                onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                keyboardType="numeric"
              />
            </View>
          </>
        );

      case 'wallet':
        return (
          <View style={styles.walletInfo}>
            <Wallet size={48} color={theme.colors.primary} />
            <Text style={[styles.walletText, { color: theme.colors.text }]}>
              Connect your digital wallet
            </Text>
            <Text style={[styles.walletSubtext, { color: theme.colors.textSecondary }]}>
              This will link your existing digital wallet for payments
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payment Methods</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Plus size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {paymentMethods.map((method) => (
          <PaymentMethodCard key={method.id} method={method} />
        ))}

        {paymentMethods.length === 0 && (
          <View style={styles.emptyContainer}>
            <CreditCard size={80} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No payment methods
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Add a payment method to make purchases
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Payment Method Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAddModal(false);
              resetForm();
            }}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Add Payment Method
            </Text>
            <TouchableOpacity onPress={handleAddPaymentMethod}>
              <Check size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Payment Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Payment Type</Text>
              <View style={styles.typeGrid}>
                {paymentTypes.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    onPress={() => setSelectedType(type.key as any)}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: selectedType === type.key ? theme.colors.primary : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <type.icon 
                      size={24} 
                      color={selectedType === type.key ? '#fff' : theme.colors.primary} 
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: selectedType === type.key ? '#fff' : theme.colors.text,
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dynamic Form Fields */}
            {renderFormFields()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  methodCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodSubtext: {
    fontSize: 14,
    marginBottom: 2,
  },
  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodFooter: {
    alignItems: 'flex-start',
  },
  defaultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  setDefaultButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  setDefaultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  addButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  walletInfo: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  walletText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  walletSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});