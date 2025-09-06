import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Wallet,
  Plus,
  Check
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { clearCart } from '@/store/slices/cartSlice';
import { addOrder } from '@/store/slices/ordersSlice';
import Toast from 'react-native-toast-message';

const mockAddresses = [
  {
    id: '1',
    name: 'John Doe',
    address: '123 Main Street, Apt 4B',
    city: 'New York',
    zipCode: '10001',
    country: 'United States',
    isDefault: true,
  },
  {
    id: '2',
    name: 'John Doe',
    address: '456 Oak Avenue',
    city: 'Brooklyn',
    zipCode: '11201',
    country: 'United States',
    isDefault: false,
  },
];

const paymentMethods = [
  { id: 'wallet', name: 'Wallet', balance: 250.00, icon: Wallet },
  { id: 'jazzcash', name: 'JazzCash', icon: CreditCard },
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
];

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { items, total } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth || {});
  
  const [selectedAddress, setSelectedAddress] = useState(mockAddresses[0].id);
  const [selectedPayment, setSelectedPayment] = useState('wallet');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const shippingCost = 0; // Free shipping
  const discount = appliedCoupon?.discount || 0;
  const finalTotal = total - discount + shippingCost;

  const applyCoupon = () => {
    // Mock coupon validation
    const validCoupons = {
      'SAVE10': 10,
      'WELCOME20': 20,
      'FIRST50': 50,
    };

    if (validCoupons[couponCode.toUpperCase() as keyof typeof validCoupons]) {
      setAppliedCoupon({
        code: couponCode.toUpperCase(),
        discount: validCoupons[couponCode.toUpperCase() as keyof typeof validCoupons],
      });
      Toast.show({
        type: 'success',
        text1: 'Coupon applied!',
        text2: `You saved $${validCoupons[couponCode.toUpperCase() as keyof typeof validCoupons]}`,
        position: 'bottom',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Invalid coupon code',
        position: 'bottom',
      });
    }
    setCouponCode('');
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    Toast.show({
      type: 'info',
      text1: 'Coupon removed',
      position: 'bottom',
    });
  };

  const placeOrder = async () => {
    if (items.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Cart is empty',
        position: 'bottom',
      });
      return;
    }

    if (selectedPayment === 'wallet' && finalTotal > 250) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient wallet balance',
        text2: 'Please select another payment method',
        position: 'bottom',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const selectedAddr = mockAddresses.find(addr => addr.id === selectedAddress);
      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPayment);

      const order = {
        id: Date.now().toString(),
        userId: user?.id || '1',
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        total: finalTotal,
        status: 'pending' as const,
        shippingAddress: selectedAddr!,
        paymentMethod: paymentMethod!.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch(addOrder(order));
      dispatch(clearCart());

      Toast.show({
        type: 'success',
        text1: 'Order placed successfully!',
        text2: `Order #${order.id}`,
        position: 'bottom',
      });

      router.replace(`/orders/${order.id}`);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Order failed',
        text2: 'Please try again',
        position: 'bottom',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Checkout</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            No items to checkout
          </Text>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/search')}
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Checkout</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Shipping Address
            </Text>
            <TouchableOpacity>
              <Plus size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {mockAddresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              onPress={() => setSelectedAddress(address.id)}
              style={[
                styles.addressCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selectedAddress === address.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <View style={styles.addressContent}>
                <View style={styles.addressHeader}>
                  <MapPin size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.addressName, { color: theme.colors.text }]}>
                    {address.name}
                  </Text>
                  {address.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.colors.success }]}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                  {address.address}
                </Text>
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                  {address.city}, {address.zipCode}
                </Text>
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                  {address.country}
                </Text>
              </View>
              {selectedAddress === address.id && (
                <View style={[styles.selectedIcon, { backgroundColor: theme.colors.primary }]}>
                  <Check size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Payment Method
          </Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => setSelectedPayment(method.id)}
              style={[
                styles.paymentCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selectedPayment === method.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <View style={styles.paymentContent}>
                <method.icon size={20} color={theme.colors.primary} />
                <Text style={[styles.paymentName, { color: theme.colors.text }]}>
                  {method.name}
                </Text>
                {method.id === 'wallet' && (
                  <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                    Balance: ${method.balance.toFixed(2)}
                  </Text>
                )}
              </View>
              {selectedPayment === method.id && (
                <View style={[styles.selectedIcon, { backgroundColor: theme.colors.primary }]}>
                  <Check size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Coupon Code */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Coupon Code
          </Text>
          
          {appliedCoupon ? (
            <View style={[styles.appliedCoupon, { backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success }]}>
              <View>
                <Text style={[styles.couponCode, { color: theme.colors.success }]}>
                  {appliedCoupon.code}
                </Text>
                <Text style={[styles.couponDiscount, { color: theme.colors.textSecondary }]}>
                  You saved ${appliedCoupon.discount}
                </Text>
              </View>
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={[styles.removeButton, { color: theme.colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInput}>
              <TextInput
                style={[
                  styles.couponField,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Enter coupon code"
                placeholderTextColor={theme.colors.textSecondary}
                value={couponCode}
                onChangeText={setCouponCode}
              />
              <TouchableOpacity
                onPress={applyCoupon}
                style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
                disabled={!couponCode.trim()}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Summary
          </Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Shipping
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
              </Text>
            </View>
            
            {appliedCoupon && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>
                  Discount ({appliedCoupon.code})
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                  -${appliedCoupon.discount.toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                ${finalTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={[styles.bottomSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={placeOrder}
          style={[
            styles.placeOrderButton,
            { 
              backgroundColor: isProcessing ? theme.colors.textSecondary : theme.colors.primary,
            },
          ]}
          disabled={isProcessing}
        >
          <Text style={styles.placeOrderText}>
            {isProcessing ? 'Processing...' : `Place Order • $${finalTotal.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  addressCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  addressText: {
    fontSize: 14,
    marginBottom: 2,
  },
  selectedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 14,
    marginLeft: 'auto',
  },
  appliedCoupon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: '700',
  },
  couponDiscount: {
    fontSize: 14,
  },
  removeButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  couponInput: {
    flexDirection: 'row',
    gap: 12,
  },
  couponField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  placeOrderButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});