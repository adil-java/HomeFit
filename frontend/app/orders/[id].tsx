import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
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

const statusConfig = {
  pending: { icon: Clock, color: '#f59e0b', label: 'Order Pending' },
  processing: { icon: Package, color: '#3b82f6', label: 'Processing' },
  shipped: { icon: Truck, color: '#8b5cf6', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: '#10b981', label: 'Delivered' },
  cancelled: { icon: XCircle, color: '#ef4444', label: 'Cancelled' },
};

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId: string;
  options?: {
    imageUrl?: string;
    [key: string]: any;
  };
}

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
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
  };
  paymentMethod: string;
  createdAt: string;
  statusHistory?: OrderStatusHistory[];
  shippingFee?: number;
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Log the params to see what we're getting
  React.useEffect(() => {
    console.log('Route params:', params);
  }, [params]);

  // Ensure id is always a string and handle array case
  const orderId = React.useMemo(() => {
    if (!params?.id) return null;
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params?.id]);

  const fetchOrderDetails = async () => {
    if (!orderId) {
      console.error('No order ID available for fetching');
      setError('Order ID is missing');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching order with ID:', orderId);
      setLoading(true);
      setError(null);
      
      const orderData = await apiService.getOrderDetails(orderId);
      console.log('Order data received:', orderData);
      
      if (!orderData) {
        throw new Error('No order data received');
      }
      
      setOrder(orderData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load order';
      console.error('Failed to fetch order:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (orderId) {
      console.log('Order ID changed, fetching details...');
      fetchOrderDetails();
    } else {
      console.error('No order ID provided in route params');
      setError('Order ID is missing');
      setLoading(false);
    }
  }, [orderId]);

  if (loading || !order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View style={[styles.statusSection, { backgroundColor: statusColor + '10' }]}>
          <View style={styles.statusHeader}>
            <StatusIcon size={32} color={statusColor} />
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: statusColor }]}>
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
          
          {order.status === 'shipped' && (
            <TouchableOpacity 
              style={[styles.trackButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/track-order')}
            >
              <Truck size={16} color="#fff" />
              <Text style={styles.trackButtonText}>Track Package</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Items ({totalItems})
          </Text>
          
          {order.items.map((item, index) => (
            <View
              key={item.id || index}
              style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Image 
                source={{ uri: item.options?.imageUrl || 'https://via.placeholder.com/60' }} 
                style={styles.itemImage} 
              />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemPrice, { color: theme.colors.text }]}>
                  {order.currency} {item.price.toFixed(2)} × {item.quantity}
                </Text>
                <Text style={[styles.itemTotal, { color: theme.colors.textSecondary }]}>
                  Total: {order.currency} {(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Shipping Address
          </Text>
          
          <View style={[styles.addressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <MapPin size={20} color={theme.colors.primary} />
            <View style={styles.addressInfo}>
              <Text style={[styles.addressName, { color: theme.colors.text }]}>
                {order.shippingAddress.name}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                {order.shippingAddress.street}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                {order.shippingAddress.city}, {order.shippingAddress.postalCode}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                {order.shippingAddress.country}
              </Text>
              <Text style={[styles.addressPhone, { color: theme.colors.primary }]}>
                {order.shippingAddress.phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Payment Information
          </Text>
          
          <View style={[styles.paymentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <CreditCard size={20} color={theme.colors.primary} />
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentMethod, { color: theme.colors.text }]}>
                {order.paymentMethod}
              </Text>
              <Text style={[styles.paymentStatus, { color: theme.colors.success }]}>
                Payment Successful
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Summary
          </Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Subtotal ({totalItems} items)
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {order.currency} {order.total.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Shipping
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {order.shippingFee ? `${order.currency} ${order.shippingFee.toFixed(2)}` : 'Free'}
              </Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                {order.currency} {(order.total + (order.shippingFee || 0)).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Support Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Need Help?
          </Text>
          
          <View style={styles.supportActions}>
            <TouchableOpacity 
              style={[styles.supportButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/support')}
            >
              <Phone size={20} color={theme.colors.primary} />
              <Text style={[styles.supportButtonText, { color: theme.colors.text }]}>
                Call Support
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.supportButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/support')}
            >
              <MessageCircle size={20} color={theme.colors.primary} />
              <Text style={[styles.supportButtonText, { color: theme.colors.text }]}>
                Live Chat
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    fontSize: 20,
    fontWeight: '700',
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
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
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
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
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
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 12,
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
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    marginBottom: 2,
  },
  addressPhone: {
    fontSize: 14,
    fontWeight: '500',
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
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '500',
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
  supportActions: {
    flexDirection: 'row',
    gap: 12,
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
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});