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
  X
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch } from 'react-redux';
import { updateOrderStatus } from '@/store/slices/ordersSlice';
import { apiService } from '@/services/api';
import { Order } from '@/types/order';

// Helper function to safely get status config with fallback
const getStatusConfig = (status: string) => {
  const statusLower = status.toLowerCase();
  
  // Map of all possible status values from the API to our config
  const statusMap: Record<string, { icon: any; color: string; label: string }> = {
    'pending': { icon: Clock, color: '#f59e0b', label: 'Order Pending' },
    'processing': { icon: Package, color: '#3b82f6', label: 'Processing' },
    'shipped': { icon: Truck, color: '#8b5cf6', label: 'Shipped' },
    'delivered': { icon: CheckCircle, color: '#10b981', label: 'Delivered' },
    'cancelled': { icon: XCircle, color: '#ef4444', label: 'Cancelled' },
    // Map any other possible statuses from the API
    'completed': { icon: CheckCircle, color: '#10b981', label: 'Completed' },
    'refunded': { icon: XCircle, color: '#ef4444', label: 'Refunded' },
    'failed': { icon: XCircle, color: '#ef4444', label: 'Failed' },
  };
  
  // Return the status config or a default one if status is not recognized
  return statusMap[statusLower] || { 
    icon: Package, 
    color: '#6b7280', 
    label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
  };
};

const statusConfig = {
  pending: { icon: Clock, color: '#f59e0b', label: 'Order Pending' },
  processing: { icon: Package, color: '#3b82f6', label: 'Processing' },
  shipped: { icon: Truck, color: '#8b5cf6', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: '#10b981', label: 'Delivered' },
  cancelled: { icon: XCircle, color: '#ef4444', label: 'Cancelled' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  // Fetch order details when component mounts or ID changes
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const orderData = await apiService.getSellerOrderDetails(id as string);
        setOrder(orderData);
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Failed to load order details. Please try again.');
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
      
      // Update local state
      setOrder({
        ...order,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      setShowStatusModal(false);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order Details</Text>
        </View>
        <View style={styles.centeredContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use the safe status config getter
  const statusConfig = getStatusConfig(order.status || 'pending');
  const StatusIcon = statusConfig.icon;
  const statusColor = statusConfig.color;
  const statusLabel = statusConfig.label;

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
          onPress={() => !isUpdating && setShowStatusModal(false)}
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
                    <X size={24} color={isUpdating ? theme.colors.textDisabled : theme.colors.text} />
                  </TouchableOpacity>
                </View>
                
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                  </View>
                ) : null}
                
                <View style={styles.statusOptions}>
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const isCurrentStatus = order.status === status;
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Order #{order.orderNumber}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <TouchableOpacity 
          style={[styles.statusSection, { backgroundColor: statusColor + '10' }]}
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
                Customer: {order.billingAddress?.name || 'Guest'} • {order.billingAddress?.email || 'No email'}
              </Text>
            </View>
          </View>
          
          <View style={styles.sellerStatusActions}>
            <TouchableOpacity 
              style={[styles.statusActionButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {}}
            >
              <Edit size={16} color="#fff" />
              <Text style={styles.statusActionText}>Update Status</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statusActionButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
              onPress={() => {}}
            >
              <MessageCircle size={16} color={theme.colors.primary} />
              <Text style={[styles.statusActionText, { color: theme.colors.primary }]}>Contact</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Summary
          </Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {order.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <Image source={{ uri: item?.product?.images[0] }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.colors.text }]}>
                    {item?.product?.name}
                  </Text>
                  <Text style={[styles.itemDetails, { color: theme.colors.textSecondary }]}>
                    Qty: {item.quantity} × Rs. {item.price.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.itemTotal, { color: theme.colors.text }]}>
                  Rs. {(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Subtotal
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                Rs. {order.subtotal?.toFixed(2) || order.total.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Shipping
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {order.shippingCost ? `Rs. ${order.shippingCost.toFixed(2)}` : 'Free'}
              </Text>
            </View>
            
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Discount
                </Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  Rs. {order.discount.toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                Rs. {order.total.toFixed(2)}
              </Text>
            </View>
            
            <View style={[styles.paymentStatus, { backgroundColor: order.paymentMethod === 'card' ? '#10b98110' : '#ef444410' }]}>
              <Text style={[styles.paymentStatusText, { color: order.paymentMethod === 'card' ? '#10b981' : '#ef4444' }]}>
                {order.paymentMethod === 'card' ? 'PAID' : 'PENDING PAYMENT'}
              </Text>
              <Text style={[styles.paymentMethod, { color: theme.colors.textSecondary }]}>
                {order.paymentMethod} • {order.paymentMethod === 'card' ? 'Paid on ' + new Date(order.createdAt).toLocaleDateString() : 'Not paid'}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Customer Information
          </Text>
          
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Name</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{order.billingAddress?.name || 'Guest'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.colors.primary }]}>{order.billingAddress?.email || 'No email'}</Text>
            </View>
            {order.billingAddress?.phone && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{order.billingAddress?.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Shipping & Billing */}
        <View style={styles.twoColumnSection}>
          <View style={[styles.column, { marginRight: 8 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Shipping Address
            </Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.addressName, { color: theme.colors.text }]}>
                {order.shippingAddress?.name || 'No name'}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.text }]}>
                {order.shippingAddress?.address || 'No address'}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.text }]}>
                {order.shippingAddress?.city}{order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''} {order.shippingAddress?.zipCode}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.text }]}>
                {order.shippingAddress?.country}
              </Text>
              {order.shippingAddress?.phone && (
                <Text style={[styles.addressText, { color: theme.colors.text, marginTop: 4 }]}>
                  📞 {order.shippingAddress.phone}
                </Text>
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
                  <Text style={[styles.addressText, { color: theme.colors.text }]}>
                    {order.billingAddress.address}
                  </Text>
                  <Text style={[styles.addressText, { color: theme.colors.text }]}>
                    {order.billingAddress.city}{order.billingAddress.state ? `, ${order.billingAddress.state}` : ''} {order.billingAddress.zipCode}
                  </Text>
                  <Text style={[styles.addressText, { color: theme.colors.text }]}>
                    {order.billingAddress.country}
                  </Text>
                  {order.billingAddress.phone && (
                    <Text style={[styles.addressText, { color: theme.colors.text, marginTop: 4 }]}>
                      📞 {order.billingAddress.phone}
                    </Text>
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

        {/* Order Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Order Notes
            </Text>
            <TouchableOpacity>
              <Text style={[styles.addNoteText, { color: theme.colors.primary }]}>
                + Add Note
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.notesCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {order.notes?.length > 0 ? (
              order.notes.map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <Text style={[styles.noteAuthor, { color: theme.colors.text }]}>
                      {note.author}
                    </Text>
                    <Text style={[styles.noteDate, { color: theme.colors.textSecondary }]}>
                      {new Date(note.date).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.noteContent, { color: theme.colors.text }]}>
                    {note.content}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyNotes, { color: theme.colors.textSecondary }]}>
                No notes for this order
              </Text>
            )}
          </View>
        </View>

        {/* Order Timeline */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Order Timeline
          </Text>
          
          <View style={[styles.timelineCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {[
              { status: 'order_placed', label: 'Order Placed', date: order.createdAt },
              { status: 'payment_confirmed', label: 'Payment Confirmed', date: order.paidAt },
              { status: 'order_processed', label: 'Order Processed', date: order.processedAt },
              { status: 'shipped', label: 'Shipped', date: order.shippedAt },
              { status: 'delivered', label: 'Delivered', date: order.deliveredAt },
            ].map((step, index) => (
              <View key={step.status} style={styles.timelineStep}>
                <View style={[styles.timelineDot, { 
                  backgroundColor: index <= (order.statusTimeline || []).indexOf(step.status) 
                    ? theme.colors.primary 
                    : theme.colors.border 
                }]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, { color: theme.colors.text }]}>
                    {step.label}
                  </Text>
                  <Text style={[styles.timelineDate, { color: theme.colors.textSecondary }]}>
                    {step.date ? new Date(step.date).toLocaleString() : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
          onPress={() => {}}
        >
          <Printer size={20} color={theme.colors.primary} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>
            Print
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {}}
        >
          <Truck size={20} color="#fff" />
          <Text style={[styles.actionButtonText, { color: '#fff' }]}>
            Update Shipping
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
    fontFamily: 'Inter_700Bold',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
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
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_700Bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_600SemiBold',
  },
  sellerStatusActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  itemDetails: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 12,
  },
  customerInfo: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
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
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  twoColumnSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 24,
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
    fontFamily: 'Inter_600SemiBold',
  },
  notesCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
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
    fontFamily: 'Inter_600SemiBold',
  },
  noteDate: {
    fontSize: 14,
  },
  noteContent: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  emptyNotes: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
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
    borderBottomColor: '#e5e5e5',
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
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
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
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_600SemiBold',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
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