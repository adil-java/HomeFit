import { friendlyError } from '@/utils/errorMessages';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Wallet,
  Plus,
  Check,
  Lock
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { clearCart } from '@/store/slices/cartSlice';
import { fetchAddresses } from '@/store/slices/addressesSlice';
import Toast from 'react-native-toast-message';
import { useStripe } from '@stripe/stripe-react-native';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import { TAX_RATE, formatPKR } from '@/constants/pricing';
import { logger } from '@/utils/logger';


const paymentMethods = [
  // { id: 'wallet', name: 'Wallet', balance: 250.00, icon: Wallet },
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
];

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const dispatch = useDispatch();
  const { items, total } = useSelector((state: RootState) => state.cart);
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const { items: addresses, loaded: addressesLoaded, loading: addressesLoading, error: addressesError } =
    useSelector((state: RootState) => state.addresses);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  // Load saved addresses (kept in Redux, so returning from "Add address" is instant)
  useEffect(() => {
    if (!addressesLoaded) dispatch(fetchAddresses() as any);
  }, [addressesLoaded, dispatch]);

  // Pick the default address, or keep the user's choice if it still exists
  useEffect(() => {
    if (selectedAddress && addresses.some(a => a.id === selectedAddress)) return;
    const preferred = addresses.find(a => a.isDefault) || addresses[0];
    setSelectedAddress(preferred ? preferred.id : null);
  }, [addresses, selectedAddress]);

  const goAddAddress = () => router.push({ pathname: '/profile/addresses', params: { add: '1' } });
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSheetInitialized, setPaymentSheetInitialized] = useState(false);
  const compact = screenWidth < 360;
  const horizontalPadding = compact ? 14 : 20;

  // Same calculation the server charges (subtotal + tax + shipping).
  // Coupons were mock-only (never applied to the charge), so they're hidden
  // until the server supports them.
  const shippingCost = 0; // Free shipping
  const taxAmount = total * TAX_RATE;
  const finalTotal: number = Number(total + taxAmount + shippingCost);

  const placeOrder = async () => {
    if (items.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Cart is empty',
        position: 'top',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const selectedAddr = addresses.find(addr => addr.id === selectedAddress);
      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPayment);

      // Checked before taking any payment
      if (!selectedAddr) {
        Toast.show({ type: 'info', text1: 'Add a delivery address', text2: 'We need to know where to deliver your order', position: 'top' });
        goAddAddress();
        return;
      }
      if (!selectedAddr.phone) {
        Toast.show({ type: 'info', text1: 'Add a phone number', text2: 'Edit your address so the courier can reach you', position: 'top' });
        router.push('/profile/addresses');
        return;
      }

      if (!paymentMethod) {
        throw new Error('Please select a payment method');
      }

      // The server re-reads this saved address by id; the copy is for display
      const address = {
        name: user?.name || 'Customer',
        email: user?.email,
        phone: selectedAddr.phone,
        street: selectedAddr.street,
        city: selectedAddr.city,
        state: selectedAddr.state || '',
        postalCode: selectedAddr.postalCode,
        country: selectedAddr.country,
        isDefault: selectedAddr.isDefault,
      };

      // Prepare order data for the backend
      const orderData = {
  items: items.map(item => ({
    productId: item.id,
    quantity: item.quantity,
    options: item.options || {},
    price: item.price,
    name: item.name
  })),
  addressId: selectedAddr.id,
  shippingAddress: address,
  billingAddress: address, // Using same address for billing and shipping
  paymentMethod: selectedPayment,
  notes: '',
  currency: 'PKR'
};

      // 1. Pay first (card). The server prices the cart itself, and checks
      //    this payment again when the order is created.
      let paymentIntentId: string | undefined;

      if (selectedPayment === 'card') {
        const paymentIntentResponse = await apiService.createPaymentIntentnew(
          items.map(item => ({ productId: item.id, quantity: item.quantity })),
          'PKR'
        );
        const clientSecret = paymentIntentResponse.paymentIntent;
        if (!clientSecret) {
          throw new Error('Could not start the payment. Please try again.');
        }
        paymentIntentId = paymentIntentResponse.paymentIntentId || clientSecret.split('_secret_')[0];

        const initRes = await initPaymentSheet({
          merchantDisplayName: 'HomeFit',
          customerId: paymentIntentResponse.customer,
          customerEphemeralKeySecret: paymentIntentResponse.ephemeralKey,
          paymentIntentClientSecret: clientSecret,
          defaultBillingDetails: {
            name: user?.name || user?.email || 'Customer',
            email: user?.email || undefined,
          },
          allowsDelayedPaymentMethods: true,
        });
        if (initRes.error) {
          throw new Error(initRes.error.message);
        }

        const presentRes = await presentPaymentSheet();
        if (presentRes.error) {
          if (presentRes.error.code === 'Canceled') {
            // User closed the payment sheet — not an error, nothing was charged
            Toast.show({ type: 'info', text1: 'Payment cancelled', text2: 'You have not been charged', position: 'top' });
            return;
          }
          throw new Error(presentRes.error.message);
        }
      }

      // 2. Create the order in the backend after successful payment
      const createOrderResponse = await apiService.createOrder({
        ...orderData,
        paymentIntentId,
      });
      
      // Extract order from response - handle both nested and direct response formats
      const responseData = createOrderResponse.data || createOrderResponse;
      
      if (!responseData) {
        logger.error('No order data in response:', createOrderResponse);
        throw new Error('Failed to create order: No order data received');
      }

      // The order data might be nested under an 'order' property or be the root object
      const createdOrder = responseData.order || responseData;
      
      if (!createdOrder) {
        logger.error('Invalid order data structure:', responseData);
        throw new Error('Failed to create order: Invalid order data structure');
      }

      // Ensure we have a valid order ID
      const orderId = createdOrder.id || responseData.id;
      if (!orderId) {
        logger.error('Invalid order ID in response:', { order: createdOrder, response: createOrderResponse });
        throw new Error('Failed to create order: Invalid order ID received');
      }
      
      // Make sure the order object has the ID
      createdOrder.id = orderId;

      // Update local state with the order from the backend
      const orderWithItems = {
        ...createdOrder,
        items: items.map(item => ({
          id: item.productId || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          productId: item.productId || item.id
        })),
        shippingAddress: selectedAddr,
        paymentMethod: paymentMethod.name,
      };

      // Note: not added to `state.orders` — that list is the *seller's* orders.
      // The customer's "My Orders" screen fetches its own list.
      
      // Show success message with order number if available
      const orderNumber = createdOrder.orderNumber || createdOrder.id?.substring(0, 8) || '';
      Toast.show({
        type: 'success',
        text1: 'Order placed successfully!',
        text2: orderNumber ? `Order #${orderNumber}` : 'Your order has been received',
        position: 'top',
      });

      // Clear the cart after successful order
      dispatch(clearCart());
      
      // Navigate to order details with the order ID
      // logger.log('Navigating to order:', createdOrder.id);
      router.replace(`/orders/${createdOrder.id}`);
    } catch (error) {
      logger.error('Order error:', error);
      Toast.show({
        type: 'error',
        text1: 'Order failed',
        text2: friendlyError(error, 'Please try again'),
        position: 'top',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}> 
          <HeaderBackButton onPress={() => router.back()} size={24} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Checkout</Text>
        </View>
        <View style={[styles.emptyContainer, { paddingHorizontal: compact ? 24 : 40 }]}> 
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
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}> 
        <HeaderBackButton onPress={() => router.back()} size={24} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Checkout</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Shipping Address */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Shipping Address
            </Text>
            <TouchableOpacity onPress={goAddAddress} hitSlop={10} accessibilityLabel="Add address">
              <Plus size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {!addressesLoaded && addressesLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 20 }} />
          ) : addresses.length === 0 ? (
            <TouchableOpacity
              onPress={addressesError ? () => dispatch(fetchAddresses() as any) : goAddAddress}
              style={[styles.addressCard, styles.addAddressCard, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '0D' }]}
            >
              <MapPin size={18} color={theme.colors.primary} />
              <Text style={[styles.addressName, { color: theme.colors.primary, flex: 1 }]}>
                {addressesError ? `${addressesError}. Tap to retry.` : 'Add a delivery address'}
              </Text>
              {!addressesError && <Plus size={18} color={theme.colors.primary} />}
            </TouchableOpacity>
          ) : (
            addresses.map((address) => (
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
                    {address.type === 'work' ? 'Work' : address.type === 'other' ? 'Other' : 'Home'}
                  </Text>
                  {address.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.colors.success }]}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                  {address.street}
                </Text>
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                  {[address.city, address.state].filter(Boolean).join(', ')} {address.postalCode}
                </Text>
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                  {address.country}{address.phone ? ` · ${address.phone}` : ''}
                </Text>
              </View>
              {selectedAddress === address.id && (
                <View style={[styles.selectedIcon, { backgroundColor: theme.colors.primary }]}>
                  <Check size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))
          )}
        </View>

        {/* Payment Method */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
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
                <Text style={[styles.paymentName, { color: theme.colors.text }]} numberOfLines={1}> 
                  {method.name}
                </Text>
                {method.id === 'wallet' && typeof (method as any).balance === 'number' && (
                  <Text style={[styles.walletBalance, { color: theme.colors.textSecondary }]}>
                    Balance: Rs. {((method as any).balance as number).toFixed(2)}
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

        {/* Order Summary */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Summary
          </Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {formatPKR(total)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Shipping
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {shippingCost === 0 ? 'Free' : `Rs. ${shippingCost.toFixed(2)}`}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Tax ({Math.round(TAX_RATE * 100)}%)
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {formatPKR(taxAmount)}
              </Text>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                {formatPKR(finalTotal)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={[styles.bottomSection, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, paddingHorizontal: horizontalPadding }]}> 
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
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Lock size={16} color="#fff" />
              <Text style={styles.placeOrderText}>{`Pay ${formatPKR(finalTotal)}`}</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={styles.secureNote}>
          <Lock size={11} color={theme.colors.textSecondary} />
          <Text style={[styles.secureNoteText, { color: theme.colors.textSecondary }]}>
            Payments are processed securely by Stripe
          </Text>
        </View>
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
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
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
    fontFamily: 'Manrope_600SemiBold',
    color: '#fff',
  },
  section: {
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
    fontFamily: 'Manrope_700Bold',
    marginBottom: 12,
  },
  addAddressCard: {
    alignItems: 'center',
    gap: 10,
    borderStyle: 'dashed',
  },
  addressCard: {
    borderWidth: 1.5,
    borderRadius: 16,
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
    fontFamily: 'Manrope_600SemiBold',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    color: '#fff',
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
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
    borderWidth: 1.5,
    borderRadius: 16,
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
    fontFamily: 'Manrope_600SemiBold',
  },
  walletBalance: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
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
    fontFamily: 'Manrope_700Bold',
  },
  couponDiscount: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  removeButton: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  couponInput: {
    flexDirection: 'row',
    gap: 12,
  },
  couponInputCompact: {
    flexDirection: 'column',
    gap: 10,
  },
  couponField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
  },
  couponFieldCompact: {
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonCompact: {
    width: '100%',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    color: '#fff',
  },
  summaryCard: {
    borderWidth: 1.5,
    borderRadius: 16,
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
    fontFamily: 'Manrope_400Regular',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.22)',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  bottomSection: {
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  placeOrderButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  secureNoteText: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
});