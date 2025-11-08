import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Truck, CircleCheck as CheckCircle, Clock, Circle as XCircle, Filter, MessageCircle, Edit } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { BackHandler } from 'react-native';
import { useEffect } from 'react';

const statusConfig = {
  pending: { icon: Clock, color: '#f59e0b', label: 'Pending' },
  processing: { icon: Package, color: '#3b82f6', label: 'Processing' },
  shipped: { icon: Truck, color: '#8b5cf6', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: '#10b981', label: 'Delivered' },
  cancelled: { icon: XCircle, color: '#ef4444', label: 'Cancelled' },
};

const filterOptions = [
  { key: 'All', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Processing', label: 'Processing' },
  { key: 'Shipped', label: 'Shipped' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled' },
];

export default function OrdersScreen() {
  const { theme } = useTheme();
  const { orders } = useSelector((state: RootState) => state.orders);

  // Mock orders fallback for Manage Orders
  const mockOrders = [
    {
      id: '1001',
      status: 'pending',
      createdAt: new Date().toISOString(),
      customerName: 'Ali Khan',
      customerEmail: 'ali.khan@example.com',
      items: [
        { name: 'Modern Sofa', price: 499.99, quantity: 1, image: 'https://picsum.photos/seed/sofa/200/200' },
        { name: 'Side Table', price: 89.99, quantity: 2, image: 'https://picsum.photos/seed/table/200/200' },
      ],
      paymentStatus: 'paid',
      paymentMethod: 'Credit Card',
      subtotal: 679.97,
      shippingCost: 0,
      discount: 20,
      total: 659.97,
    },
    {
      id: '1002',
      status: 'processing',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      customerName: 'Sara Ahmed',
      customerEmail: 's.ahmed@example.com',
      items: [
        { name: 'Dining Set', price: 899.0, quantity: 1, image: 'https://picsum.photos/seed/dining/200/200' },
      ],
      paymentStatus: 'unpaid',
      paymentMethod: 'Cash on Delivery',
      subtotal: 899.0,
      shippingCost: 10,
      discount: 0,
      total: 909.0,
    },
    {
      id: '1003',
      status: 'delivered',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      customerName: 'John Doe',
      customerEmail: 'john.doe@example.com',
      items: [
        { name: 'Office Chair', price: 129.99, quantity: 2, image: 'https://picsum.photos/seed/chair/200/200' },
      ],
      paymentStatus: 'paid',
      paymentMethod: 'PayPal',
      subtotal: 259.98,
      shippingCost: 0,
      discount: 0,
      total: 259.98,
    },
  ];
  const dataSource = orders && orders.length ? orders : mockOrders;
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filteredOrders = dataSource.filter(order => 
    selectedFilter === 'All' || order.status === selectedFilter.toLowerCase()
  );

  const OrderCard = ({ order }: { order: any }) => {
    const StatusIcon = statusConfig[order.status as keyof typeof statusConfig].icon;
    const statusColor = statusConfig[order.status as keyof typeof statusConfig].color;
    const statusLabel = statusConfig[order.status as keyof typeof statusConfig].label;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/seller/orders/${order.id}`)}
        style={[styles.orderCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={[styles.orderId, { color: theme.colors.text }]}>
              Order #{order.id}
            </Text>
            <Text style={[styles.customerName, { color: theme.colors.primary }]}>
              {order.customerName || 'Guest User'}
            </Text>
            <Text style={[styles.orderDate, { color: theme.colors.textSecondary }]}>
              {new Date(order.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <StatusIcon size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <View style={styles.orderSummary}>
          <Text style={[styles.summaryText, { color: theme.colors.text }]}>
            {order.items.length} items • ${order.total.toFixed(2)}
          </Text>
          {order.paymentStatus === 'paid' ? (
            <View style={[styles.paidBadge, { backgroundColor: '#10b98120' }]}>
              <Text style={[styles.paidText, { color: '#10b981' }]}>Paid</Text>
            </View>
          ) : (
            <View style={[styles.paidBadge, { backgroundColor: '#ef444420' }]}>
              <Text style={[styles.paidText, { color: '#ef4444' }]}>Unpaid</Text>
            </View>
          )}
        </View>
        <View style={styles.sellerActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              // Handle contact customer
            }}
          >
            <MessageCircle size={16} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              Contact
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: theme.colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              // Handle update status
            }}
          >
            <Edit size={16} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              Update Status
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)')}
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Manage Orders</Text>
        <TouchableOpacity>
          <Filter size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setSelectedFilter(filter.key)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: selectedFilter === filter.key 
                    ? theme.colors.primary 
                    : 'transparent',
                  borderColor: selectedFilter === filter.key 
                    ? theme.colors.primary 
                    : theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: selectedFilter === filter.key 
                      ? '#fff' 
                      : theme.colors.text,
                    fontWeight: selectedFilter === filter.key ? '600' : '400',
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={[styles.resultsText, { color: theme.colors.textSecondary }]}>
          {filteredOrders.length} orders found
        </Text>
      </View>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={80} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No orders found
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {selectedFilter === 'All' 
              ? 'No orders have been placed yet'
              : `No ${selectedFilter.toLowerCase()} orders found`
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={({ item }) => <OrderCard order={item} />}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.ordersList}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterContent: {
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  ordersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  orderDate: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sellerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});