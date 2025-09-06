import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
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
  Phone,
  MessageCircle
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

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
  const order = useSelector((state: RootState) => 
    state.orders.orders.find(o => o.id === id)
  );

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

  const StatusIcon = statusConfig[order.status as keyof typeof statusConfig].icon;
  const statusColor = statusConfig[order.status as keyof typeof statusConfig].color;
  const statusLabel = statusConfig[order.status as keyof typeof statusConfig].label;

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
                Order #{order.id}
              </Text>
              <Text style={[styles.orderDate, { color: theme.colors.textSecondary }]}>
                Placed on {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          {order.status === 'shipped' && (
            <TouchableOpacity style={[styles.trackButton, { backgroundColor: theme.colors.primary }]}>
              <Truck size={16} color="#fff" />
              <Text style={styles.trackButtonText}>Track Package</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Items ({order.items.length})
          </Text>
          
          {order.items.map((item, index) => (
            <View
              key={index}
              style={[styles.itemCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Image source={{ uri: item.image }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemPrice, { color: theme.colors.text }]}>
                  ${item.price} × {item.quantity}
                </Text>
                <Text style={[styles.itemTotal, { color: theme.colors.textSecondary }]}>
                  Total: ${(item.price * item.quantity).toFixed(2)}
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
                {order.shippingAddress.address}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                {order.shippingAddress.city}, {order.shippingAddress.zipCode}
              </Text>
              <Text style={[styles.addressText, { color: theme.colors.textSecondary }]}>
                {order.shippingAddress.country}
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
                Subtotal
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                ${order.total.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Shipping
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                Free
              </Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: theme.colors.text }]}>
                ${order.total.toFixed(2)}
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
            <TouchableOpacity style={[styles.supportButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Phone size={20} color={theme.colors.primary} />
              <Text style={[styles.supportButtonText, { color: theme.colors.text }]}>
                Call Support
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.supportButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
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