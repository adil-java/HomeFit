import { SUPPORT_PHONE, SUPPORT_EMAIL } from '@/constants/support';
import { friendlyError } from '@/utils/errorMessages';
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Clock, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  CreditCard, 
  MessageCircle, 
  ArrowLeft,
  Phone,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenCache } from '@/hooks/useScreenCache';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import { logger } from '@/utils/logger';
import { formatPKR } from '@/constants/pricing';

const statusConfig = {
  pending: { icon: Clock, color: '#C98A12', label: 'Order Pending' },
  processing: { icon: Package, color: '#5576B5', label: 'Processing' },
  shipped: { icon: Truck, color: '#4F8A8B', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: '#3E9A6A', label: 'Delivered' },
  cancelled: { icon: XCircle, color: '#D2504A', label: 'Cancelled' },
};

interface OrderItem {
  id: string;
  productName?: string;
  name?: string;
  price: number;
  quantity: number;
  productId: string;
  options?: {
    imageUrl?: string;
    [key: string]: any;
  };
  product?: { id: string; name?: string; images?: string[] | string };
}

const money = (n: unknown) => formatPKR(Number(n) || 0);

const firstImage = (item: OrderItem): string | null => {
  const imgs = item.product?.images;
  const list = Array.isArray(imgs) ? imgs : typeof imgs === 'string' ? [imgs] : [];
  return list.find((u) => typeof u === 'string' && u) || item.options?.imageUrl || null;
};

// Chosen options saved with the item ("color: Walnut · size: King")
const optionText = (item: OrderItem) =>
  Object.entries(item.options || {})
    .filter(([k, v]) => k !== 'imageUrl' && v !== undefined && v !== null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
    .join(' · ');

const PAYMENT_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  PAID: { label: 'Paid', tone: 'success' },
  PENDING: { label: 'Payment pending', tone: 'warning' },
  FAILED: { label: 'Payment failed', tone: 'error' },
  REFUNDED: { label: 'Refunded', tone: 'warning' },
  PARTIALLY_REFUNDED: { label: 'Partly refunded', tone: 'warning' },
};

interface OrderStatusHistory {
  status: string;
  timestamp: string;
  message?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  currency: string;
  items: OrderItem[];
  shippingAddress: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    email?: string;
  } | null;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  paymentStatus?: string;
  paymentMethod: string;
  createdAt: string;
  statusHistory?: OrderStatusHistory[];
  shippingFee?: number;
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const horizontalPadding = compact ? 14 : 20;
  const { user } = useAuth();

  // Log the params to see what we're getting
  React.useEffect(() => {
    // logger.log('Route params:', params);
  }, [params]);

  // Ensure id is always a string and handle array case
  const orderId = React.useMemo(() => {
    if (!params?.id) return null;
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params?.id]);

  // Last loaded copy of this order (kept in Redux while the app is open)
  const [cachedOrder, saveCachedOrder] = useScreenCache<Order>(
    user?.uid && orderId ? `order:${user.uid}:${orderId}` : null
  );
  const [order, setOrder] = React.useState<Order | null>(() => cachedOrder ?? null);
  const [loading, setLoading] = React.useState(() => !cachedOrder);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOrderDetails = async () => {
    if (!orderId) {
      logger.error('No order ID available for fetching');
      setError('Order ID is missing');
      setLoading(false);
      return;
    }

    try {
      // logger.log('Fetching order with ID:', orderId);
      // With a cached copy on screen, refresh behind it (no spinner)
      if (!order) setLoading(true);
      setError(null);
      
      const orderData = await apiService.getOrderDetails(orderId);
      // logger.log('Order data received:', orderData);
      
      if (!orderData) {
        throw new Error('No order data received');
      }
      
      setOrder(orderData);
      saveCachedOrder(orderData);
    } catch (err) {
      const errorMessage = friendlyError(err, 'Failed to load order');
      logger.error('Failed to fetch order:', err);
      // Keep showing the cached order if the refresh fails
      if (!order) setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (orderId) {
      // logger.log('Order ID changed, fetching details...');
      fetchOrderDetails();
    } else {
      logger.error('No order ID provided in route params');
      setError('Order ID is missing');
      setLoading(false);
    }
  }, [orderId]);

  if (loading || !order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <HeaderBackButton onPress={() => router.back()} size={24} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order Details</Text>
        </View>
        <View style={styles.centeredContainer}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading order details...
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.errorText, { color: theme.colors.text }]}>
                {error || 'Failed to load order details'}
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                onPress={fetchOrderDetails}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // Convert status to lowercase to match statusConfig keys
  const statusKey = order.status.toLowerCase() as keyof typeof statusConfig;
  const statusInfo = statusConfig[statusKey] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const statusColor = statusInfo.color;
  const statusLabel = statusInfo.label;

  const addr = order.shippingAddress || {};
  const cityLine = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
  const itemsValue = order.items.reduce((sum, item) => sum + (Number(item.price) || 0) * item.quantity, 0);
  const subtotal = Number(order.subtotal) || itemsValue;
  const shipping = Number(order.shipping ?? order.shippingFee) || 0;
  const tax = Number(order.tax) || 0;
  const discount = Number(order.discount) || 0;
  const payment = PAYMENT_STATUS[String(order.paymentStatus || '').toUpperCase()] || PAYMENT_STATUS.PENDING;
  const paymentMethodLabel = /card/i.test(order.paymentMethod || '') ? 'Credit / debit card' : order.paymentMethod || 'Card';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <HeaderBackButton onPress={() => router.back()} size={24} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Order Status */}
        <View style={[styles.statusSection, { backgroundColor: statusColor + '10', marginHorizontal: horizontalPadding, padding: compact ? 14 : 20 }]}> 
          <View style={styles.statusHeader}>
            <StatusIcon size={compact ? 26 : 32} color={statusColor} />
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, compact && styles.statusLabelCompact, { color: statusColor }]}> 
                {statusLabel}
              </Text>
              <Text style={[styles.orderId, { color: theme.colors.text }]}>
                Order #{order.orderNumber || order.id?.substring(0, 8).toUpperCase()}
              </Text>
              <Text style={[styles.orderDate, { color: theme.colors.textSecondary }]}>
                Placed on {formatDate(order.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Items ({totalItems})
          </Text>
          
          {order.items.map((item, index) => {
            const image = firstImage(item);
            const opts = optionText(item);
            const name = item.productName || item.product?.name || item.name || 'Product';
            return (
              <TouchableOpacity
                key={item.id || index}
                activeOpacity={0.7}
                disabled={!item.productId}
                onPress={() => router.push(`/product/${item.productId}`)}
                style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                {image ? (
                  <Image source={{ uri: image }} style={[styles.itemImage, compact && styles.itemImageCompact]} />
                ) : (
                  <View style={[styles.itemImage, compact && styles.itemImageCompact, styles.itemImageEmpty, { backgroundColor: theme.colors.background }]}>
                    <Package size={22} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={2}>
                    {name}
                  </Text>
                  {!!opts && (
                    <Text style={[styles.itemTotal, { color: theme.colors.textSecondary, marginBottom: 2 }]} numberOfLines={1}>
                      {opts}
                    </Text>
                  )}
                  <Text style={[styles.itemPrice, { color: theme.colors.text }]}>
                    {money(item.price)} × {item.quantity}
                  </Text>
                  <Text style={[styles.itemTotal, { color: theme.colors.textSecondary }]}>
                    Total: {money(item.price * item.quantity)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Shipping Address */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Shipping Address
          </Text>
          
          <View style={[styles.addressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: compact ? 12 : 16 }]}> 
            <MapPin size={20} color={theme.colors.primary} />
            <View style={styles.addressInfo}>
              <Text style={[styles.addressName, { color: theme.colors.text }]}>
                {addr.name || 'Delivery address'}
              </Text>
              {!!addr.street && (
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>{addr.street}</Text>
              )}
              {!!cityLine && (
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>{cityLine}</Text>
              )}
              {!!addr.country && (
                <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>{addr.country}</Text>
              )}
              {!!addr.phone && (
                <Text style={[styles.addressPhone, { color: theme.colors.primary }]}>{addr.phone}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Payment Information
          </Text>
          
          <View style={[styles.paymentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: compact ? 12 : 16 }]}> 
            <CreditCard size={20} color={theme.colors.primary} />
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentMethod, { color: theme.colors.text }]}>
                {paymentMethodLabel}
              </Text>
              <Text style={[styles.paymentStatus, { color: theme.colors[payment.tone] }]}>
                {payment.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Summary
          </Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: compact ? 12 : 16 }]}> 
            {[
              { label: `Subtotal (${totalItems} ${totalItems === 1 ? 'item' : 'items'})`, value: money(subtotal) },
              { label: 'Shipping', value: shipping > 0 ? money(shipping) : 'Free' },
              ...(tax > 0 ? [{ label: 'Tax', value: money(tax) }] : []),
              ...(discount > 0 ? [{ label: 'Discount', value: `−${money(discount)}` }] : []),
            ].map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{row.value}</Text>
              </View>
            ))}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                {money(order.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Support Actions (shown only when a support contact is configured) */}
        {(!!SUPPORT_PHONE || !!SUPPORT_EMAIL) && (
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Need Help?
          </Text>
          
          <View style={[styles.supportActions, compact && styles.supportActionsCompact]}>
            {!!SUPPORT_PHONE && (
            <TouchableOpacity 
              style={[styles.supportButton, compact && styles.supportButtonCompact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {})}
            >
              <Phone size={20} color={theme.colors.primary} />
              <Text style={[styles.supportButtonText, { color: theme.colors.text }]}>
                Call Support
              </Text>
            </TouchableOpacity>
            )}
            {!!SUPPORT_EMAIL && (
            <TouchableOpacity 
              style={[styles.supportButton, compact && styles.supportButtonCompact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() =>
                Linking.openURL(
                  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Order #${order.orderNumber || order.id}`)}`
                ).catch(() => {})
              }
            >
              <MessageCircle size={20} color={theme.colors.primary} />
              <Text style={[styles.supportButtonText, { color: theme.colors.text }]}>
                Email Support
              </Text>
            </TouchableOpacity>
            )}
          </View>
        </View>
        )}
      </ScrollView>
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  statusSection: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  statusLabelCompact: {
    fontSize: 16,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemImageEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImageCompact: {
    width: 52,
    height: 52,
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  addressCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    marginTop: 4,
  },
  paymentCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  supportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  supportActionsCompact: {
    flexDirection: 'column',
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  supportButtonCompact: {
    justifyContent: 'flex-start',
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
});