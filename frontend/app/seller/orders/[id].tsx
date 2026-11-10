import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  XCircle,
  MapPin,
  CreditCard,
  MessageCircle,
  Edit,
  Printer,
  X,
  Phone,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch } from 'react-redux';
import { setOrderStatus } from '@/store/slices/ordersSlice';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useScreenCache } from '@/hooks/useScreenCache';
import { formatPKR } from '@/constants/pricing';

// Order as returned by GET /api/orders/:id
type Order = any;
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import { logger } from '@/utils/logger';

// Helper function to safely get status config with fallback
const getStatusConfig = (status: string) => {
  const statusLower = status.toLowerCase();
  
  // Map of all possible status values from the API to our config
  const statusMap: Record<string, { icon: any; color: string; label: string }> = {
    'pending': { icon: Clock, color: '#C98A12', label: 'Order Pending' },
    'processing': { icon: Package, color: '#5576B5', label: 'Processing' },
    'shipped': { icon: Truck, color: '#4F8A8B', label: 'Shipped' },
    'delivered': { icon: CheckCircle, color: '#3E9A6A', label: 'Delivered' },
    'cancelled': { icon: XCircle, color: '#D2504A', label: 'Cancelled' },
    // Map any other possible statuses from the API
    'completed': { icon: CheckCircle, color: '#3E9A6A', label: 'Completed' },
    'refunded': { icon: XCircle, color: '#D2504A', label: 'Refunded' },
    'failed': { icon: XCircle, color: '#D2504A', label: 'Failed' },
  };
  
  // Return the status config or a default one if status is not recognized
  return statusMap[statusLower] || { 
    icon: Package, 
    color: '#8A867F', 
    label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  };
};

// Statuses a seller can set (the server expects these exact values)
const STATUS_OPTIONS = [
  { value: 'PENDING', icon: Clock, color: '#C98A12', label: 'Order Pending' },
  { value: 'PROCESSING', icon: Package, color: '#5576B5', label: 'Processing' },
  { value: 'SHIPPED', icon: Truck, color: '#4F8A8B', label: 'Shipped' },
  { value: 'DELIVERED', icon: CheckCircle, color: '#3E9A6A', label: 'Delivered' },
  { value: 'CANCELLED', icon: XCircle, color: '#D2504A', label: 'Cancelled' },
];

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  PAID: { label: 'PAID', color: '#3E9A6A' },
  PENDING: { label: 'PAYMENT PENDING', color: '#C98A12' },
  FAILED: { label: 'PAYMENT FAILED', color: '#D2504A' },
  REFUNDED: { label: 'REFUNDED', color: '#8A867F' },
  PARTIALLY_REFUNDED: { label: 'PARTLY REFUNDED', color: '#8A867F' },
};

const firstImage = (item: any): string | null => {
  const imgs = item?.product?.images;
  const list = Array.isArray(imgs) ? imgs : typeof imgs === 'string' ? [imgs] : [];
  return list.find((u: unknown) => typeof u === 'string' && u) || null;
};

const optionText = (item: any) =>
  Object.entries(item?.options || {})
    .filter(([k, v]) => k !== 'imageUrl' && v !== undefined && v !== null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
    .join(' · ');

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const horizontalPadding = compact ? 14 : 20;
  const dispatch = useDispatch();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { user } = useAuth();
  // Last loaded copy of this order (kept in Redux while the app is open)
  const [cachedOrder, saveCachedOrder] = useScreenCache<Order>(
    user?.uid && id ? `sellerOrder:${user.uid}:${id}` : null
  );
  const [isLoading, setIsLoading] = useState(() => !cachedOrder);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(() => cachedOrder ?? null);

  // Fetch order details when component mounts or ID changes
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) return;
      
      try {
        // With a cached copy on screen, refresh behind it (no spinner)
        if (!cachedOrder) setIsLoading(true);
        const orderData = await apiService.getSellerOrderDetails(id as string);
        setOrder(orderData);
        saveCachedOrder(orderData);
      } catch (err) {
        logger.error('Error fetching order details:', err);
        if (!cachedOrder) setError('Failed to load order details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    
    try {
      setIsUpdating(true);
      setError('');
      
      // Update the order status via API
      await apiService.updateOrderStatus(order.id, newStatus);
      
      // Keep the seller order list (Redux) in sync so going back shows the new status
      dispatch(setOrderStatus({ orderId: order.id, status: newStatus }));

      // Update local state (and the cached copy)
      const updated = {
        ...order,
        status: newStatus,
        updatedAt: new Date().toISOString()
      } as Order;
      setOrder(updated);
      saveCachedOrder(updated);
      
      setShowStatusModal(false);
    } catch (err) {
      logger.error('Failed to update status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}> 
          <HeaderBackButton onPress={() => router.back()} size={24} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order Details</Text>
        </View>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}> 
          <HeaderBackButton onPress={() => router.back()} size={24} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order Details</Text>
        </View>
        <View style={styles.centeredContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use the safe status config getter
  const current = getStatusConfig(order.status || 'pending');
  const StatusIcon = current.icon;
  const statusColor = current.color;
  const statusLabel = current.label;
  const orderStatus = String(order.status || 'PENDING').toUpperCase();

  // Only this seller's items (an order can include other sellers' products)
  const allItems: any[] = Array.isArray(order.items) ? order.items : [];
  const myItems = allItems.filter((i) => !i?.product?.sellerId || i.product.sellerId === user?.uid);
  const hasOtherSellers = myItems.length < allItems.length;
  const myItemsValue = myItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const shippingFee = Number(order.shipping) || 0;
  const tax = Number(order.tax) || 0;
  const discount = Number(order.discount) || 0;
  const payment = PAYMENT_STATUS[String(order.paymentStatus || '').toUpperCase()] || PAYMENT_STATUS.PENDING;
  const customer = order.shippingAddress || order.billingAddress || {};
  const customerName = customer.name || order.user?.name || 'Customer';
  const customerEmail = customer.email || order.user?.email;
  const customerPhone = customer.phone;
  const addressLine = (a: any) => a?.street || a?.address;
  const cityLine = (a: any) => [a?.city, a?.state, a?.postalCode || a?.zipCode].filter(Boolean).join(', ');

  const contactCustomer = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' }[] = [];
    if (customerPhone) options.push({ text: `Call ${customerPhone}`, onPress: () => Linking.openURL(`tel:${customerPhone}`).catch(() => {}) });
    if (customerEmail)
      options.push({
        text: 'Send email',
        onPress: () =>
          Linking.openURL(`mailto:${customerEmail}?subject=${encodeURIComponent(`Your HomeFit order #${order.orderNumber}`)}`).catch(() => {}),
      });
    if (!options.length) {
      Alert.alert('No contact details', "This customer didn't leave a phone number or email.");
      return;
    }
    Alert.alert('Contact customer', customerName, [...options, { text: 'Cancel', style: 'cancel' }]);
  };

  // Timeline from the saved status changes
  const history: any[] = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const reachedAt = (status: string) =>
    history.filter((h) => String(h.status).toUpperCase() === status).map((h) => h.createdAt).sort()[0];
  const rank: Record<string, number> = { PENDING: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3 };
  const currentRank = rank[orderStatus] ?? -1;
  const timeline = [
    { key: 'placed', label: 'Order placed', date: order.createdAt, done: true },
    {
      key: 'paid',
      label: 'Payment confirmed',
      date: order.paymentConfirmedAt || (String(order.paymentStatus).toUpperCase() === 'PAID' ? order.createdAt : null),
      done: String(order.paymentStatus).toUpperCase() === 'PAID',
    },
    { key: 'processing', label: 'Processing', date: reachedAt('PROCESSING'), done: currentRank >= 1 },
    { key: 'shipped', label: 'Shipped', date: reachedAt('SHIPPED'), done: currentRank >= 2 },
    { key: 'delivered', label: 'Delivered', date: reachedAt('DELIVERED'), done: currentRank >= 3 },
    ...(orderStatus === 'CANCELLED' ? [{ key: 'cancelled', label: 'Cancelled', date: reachedAt('CANCELLED'), done: true }] : []),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isUpdating && setShowStatusModal(false)}
      >
        <TouchableWithoutFeedback 
          onPress={() => {
            if (!isUpdating) setShowStatusModal(false);
          }}
          disabled={isUpdating}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    Update Order Status
                  </Text>
                  <TouchableOpacity 
                    onPress={() => !isUpdating && setShowStatusModal(false)}
                    disabled={isUpdating}
                  >
                    <X size={24} color={isUpdating ? theme.colors.textSecondary : theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                  </View>
                ) : null}
                
                <View style={styles.statusOptions}>
                  {STATUS_OPTIONS.map(({ value: status, ...config }) => {
                    const isCurrentStatus = orderStatus === status;
                    const isDisabled = isUpdating || isCurrentStatus;
                    
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          {
                            borderColor: isCurrentStatus 
                              ? config.color 
                              : theme.colors.border,
                            backgroundColor: isCurrentStatus 
                              ? `${config.color}20` 
                              : 'transparent',
                            opacity: isDisabled ? 0.6 : 1,
                          }
                        ]}
                        onPress={() => handleStatusUpdate(status)}
                        disabled={isDisabled}
                      >
                        <config.icon 
                          size={20} 
                          color={isCurrentStatus ? config.color : theme.colors.textSecondary} 
                        />
                        <Text 
                          style={[
                            styles.statusOptionText, 
                            { 
                              color: isCurrentStatus 
                                ? theme.colors.text 
                                : theme.colors.textSecondary 
                            }
                          ]}
                        >
                          {config.label}
                        </Text>
                        {isCurrentStatus && (
                          <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
                            <Text style={styles.statusBadgeText}>
                              {isUpdating ? 'Updating...' : 'Current'}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {isUpdating && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}> 
        <HeaderBackButton onPress={() => router.back()} size={24} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order #{order.orderNumber}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        {/* Order Status */}
        <TouchableOpacity 
          style={[styles.statusSection, { backgroundColor: statusColor + '10', marginHorizontal: horizontalPadding, padding: compact ? 14 : 20 }]}
          onPress={() => setShowStatusModal(true)}
        >
          <View style={styles.statusHeader}>
            <StatusIcon size={32} color={statusColor} />
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: statusColor }]}>
                {statusLabel}
              </Text>
              <Text style={[styles.orderDate, { color: theme.colors.textSecondary }]}>
                Tap to update status
              </Text>
              <Text style={[styles.customerInfo, { color: theme.colors.text }]}>
                Customer: {customerName}{customerEmail ? ` • ${customerEmail}` : ''}
              </Text>
            </View>
          </View>
          
          <View style={styles.sellerStatusActions}>
            <TouchableOpacity 
              style={[styles.statusActionButton, compact && styles.statusActionButtonCompact, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowStatusModal(true)}
            >
              <Edit size={16} color="#fff" />
              <Text style={styles.statusActionText}>Update Status</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statusActionButton, compact && styles.statusActionButtonCompact, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
              onPress={contactCustomer}
            >
              <MessageCircle size={16} color={theme.colors.primary} />
              <Text style={[styles.statusActionText, { color: theme.colors.primary }]}>Contact</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Order Summary */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Summary
          </Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {myItems.map((item: any, index: number) => {
              const image = firstImage(item);
              const opts = optionText(item);
              return (
                <View key={item.id || index} style={styles.orderItem}>
                  {image ? (
                    <Image source={{ uri: image }} style={[styles.itemImage, compact && styles.itemImageCompact]} />
                  ) : (
                    <View style={[styles.itemImage, compact && styles.itemImageCompact, { backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }]}>
                      <Package size={20} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={2}>
                      {item.productName || item?.product?.name || 'Product'}
                    </Text>
                    {!!opts && (
                      <Text style={[styles.itemDetails, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {opts}
                      </Text>
                    )}
                    <Text style={[styles.itemDetails, { color: theme.colors.textSecondary }]}>
                      Qty: {item.quantity} × {formatPKR(item.price)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.colors.text }]}>
                    {formatPKR((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                  </Text>
                </View>
              );
            })}

            {hasOtherSellers && (
              <Text style={[styles.itemDetails, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                This order also has items from other sellers. Only your items are shown.
              </Text>
            )}

            <View style={styles.divider} />

            {(hasOtherSellers
              ? [{ label: 'Your items', value: formatPKR(myItemsValue) }]
              : [
                  { label: 'Subtotal', value: formatPKR(Number(order.subtotal) || myItemsValue) },
                  { label: 'Shipping', value: shippingFee > 0 ? formatPKR(shippingFee) : 'Free' },
                  ...(tax > 0 ? [{ label: 'Tax', value: formatPKR(tax) }] : []),
                  ...(discount > 0 ? [{ label: 'Discount', value: `−${formatPKR(discount)}` }] : []),
                ]
            ).map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{row.value}</Text>
              </View>
            ))}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                {hasOtherSellers ? 'Order total (all sellers)' : 'Total'}
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                {formatPKR(order.total)}
              </Text>
            </View>

            <View style={[styles.paymentStatus, { backgroundColor: payment.color + '10' }]}>
              <Text style={[styles.paymentStatusText, { color: payment.color }]}>
                {payment.label}
              </Text>
              <Text style={[styles.paymentMethod, { color: theme.colors.textSecondary }]}>
                {/card/i.test(order.paymentMethod || '') ? 'Card' : order.paymentMethod || 'Card'}
                {String(order.paymentStatus).toUpperCase() === 'PAID'
                  ? ` • Paid on ${new Date(order.paymentConfirmedAt || order.createdAt).toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Customer Information
          </Text>
          
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Name</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{customerName}</Text>
            </View>
            {!!customerEmail && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: theme.colors.primary }]}>{customerEmail}</Text>
              </View>
            )}
            {!!customerPhone && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{customerPhone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Shipping & Billing */}
        <View style={[styles.twoColumnSection, compact && styles.twoColumnSectionCompact, { paddingHorizontal: horizontalPadding }]}> 
          <View style={[styles.column, { marginRight: 8 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Shipping Address
            </Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.addressName, { color: theme.colors.text }]}>
                {order.shippingAddress?.name || 'No name'}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.text }]}>
                {addressLine(order.shippingAddress) || 'No street address'}
              </Text>
              {!!cityLine(order.shippingAddress) && (
                <Text style={[styles.addressText, { color: theme.colors.text }]}>{cityLine(order.shippingAddress)}</Text>
              )}
              <Text style={[styles.addressText, { color: theme.colors.text }]}>
                {order.shippingAddress?.country}
              </Text>
              {!!order.shippingAddress?.phone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Phone size={13} color={theme.colors.textSecondary} />
                  <Text style={[styles.addressText, { color: theme.colors.text }]}>{order.shippingAddress.phone}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={[styles.column, { marginLeft: 8 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Billing Address
            </Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {order.billingAddress ? (
                <>
                  <Text style={[styles.addressName, { color: theme.colors.text }]}>
                    {order.billingAddress.name || 'No name'}
                  </Text>
                  {!!addressLine(order.billingAddress) && (
                    <Text style={[styles.addressText, { color: theme.colors.text }]}>{addressLine(order.billingAddress)}</Text>
                  )}
                  {!!cityLine(order.billingAddress) && (
                    <Text style={[styles.addressText, { color: theme.colors.text }]}>{cityLine(order.billingAddress)}</Text>
                  )}
                  <Text style={[styles.addressText, { color: theme.colors.text }]}>
                    {order.billingAddress.country}
                  </Text>
                  {!!order.billingAddress.phone && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Phone size={13} color={theme.colors.textSecondary} />
                      <Text style={[styles.addressText, { color: theme.colors.text }]}>{order.billingAddress.phone}</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={[styles.addressText, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
                  Same as shipping address
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Order Notes (only when there are any) */}
        {Array.isArray(order.notes) && order.notes.length > 0 && (
          <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Order Notes</Text>
            <View style={[styles.notesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {order.notes.map((note: any, index: number) => (
                <View key={note.id || index} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <Text style={[styles.noteAuthor, { color: theme.colors.text }]}>{note.author || 'Note'}</Text>
                    {!!(note.createdAt || note.date) && (
                      <Text style={[styles.noteDate, { color: theme.colors.textSecondary }]}>
                        {new Date(note.createdAt || note.date).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.noteContent, { color: theme.colors.text }]}>{note.content}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Order Timeline */}
        <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}> 
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Timeline
          </Text>
          
          <View style={[styles.timelineCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {timeline.map((step) => (
              <View key={step.key} style={styles.timelineStep}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: step.done ? (step.key === 'cancelled' ? '#D2504A' : theme.colors.primary) : theme.colors.border },
                  ]}
                />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, { color: step.done ? theme.colors.text : theme.colors.textSecondary }]}>
                    {step.label}
                  </Text>
                  <Text style={[styles.timelineDate, { color: theme.colors.textSecondary }]}>
                    {step.date ? new Date(step.date).toLocaleString() : step.done ? 'Done' : 'Not yet'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, compact && styles.bottomActionsCompact, { borderTopColor: theme.colors.border, paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity 
          style={[styles.actionButton, compact && styles.actionButtonCompact, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
          onPress={contactCustomer}
        >
          <Phone size={20} color={theme.colors.primary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
            Contact customer
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, compact && styles.actionButtonCompact, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowStatusModal(true)}
        >
          <Truck size={20} color="#fff" />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>
            Update status
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
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
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
    fontFamily: 'Manrope_600SemiBold',
  },
  sellerStatusActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  statusActionButtonCompact: {
    flex: 1,
    paddingHorizontal: 10,
  },
  statusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    color: '#fff',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.22)',
  },
  itemDetails: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.22)',
    marginVertical: 12,
  },
  customerInfo: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    marginBottom: 2,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  twoColumnSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  twoColumnSectionCompact: {
    flexDirection: 'column',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addNoteText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  notesCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.22)',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteAuthor: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  noteDate: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  noteContent: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  emptyNotes: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  timelineCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.22)',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    gap: 8,
  },
  bottomActionsCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonCompact: {
    width: '100%',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  paymentStatus: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  paymentStatusText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  statusOptions: {
    gap: 10,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D2504A',
  },
  errorText: {
    color: '#D2504A',
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
});