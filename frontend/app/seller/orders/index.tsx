import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Truck, CircleCheck as CheckCircle, Clock, Circle as XCircle, Filter, MessageCircle, Edit } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { setOrders, setLoading } from '@/store/slices/ordersSlice';
import { apiService } from '@/services/api';

// Helper function to safely get status config with fallback
const getStatusConfig = (status: string) => {
  const statusLower = status.toLowerCase();
  
  // Map of all possible status values from the API to our config
  const statusMap: Record<string, { icon: any; color: string; label: string }> = {
    'pending': { icon: Clock, color: '#f59e0b', label: 'Pending' },
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

// For backward compatibility
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
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loading } = useSelector((state: RootState) => state.orders);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const fetchOrders = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
      } else if (page === 1) {
        // Only set loading for initial load, not for pagination
        dispatch(setLoading(true));
      }

      const status = selectedFilter !== 'All' ? selectedFilter.toUpperCase() : undefined;
      const response = await apiService.getSellerOrders({
        status,
        page: isRefreshing ? 1 : page,
        limit,
      });

      const newOrders = response.data || [];
      
      if (isRefreshing || page === 1) {
        dispatch(setOrders(newOrders));
      } else {
        dispatch(setOrders([...orders, ...newOrders]));
      }

      setHasMore(newOrders.length === limit);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      } else if (page === 1) {
        // Only reset loading for initial load, not for pagination
        dispatch(setLoading(false));
      }
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, selectedFilter]);

  const handleRefresh = () => {
    fetchOrders(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const filteredOrders = selectedFilter === 'All' 
    ? orders 
    : orders.filter(order => {
        const orderStatus = (order.status || '').toLowerCase();
        const filterStatus = selectedFilter.toLowerCase();
        return orderStatus === filterStatus;
      });

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading && page === 1) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading orders...
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Package size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {error ? 'Failed to load orders' : 'No orders found'}
        </Text>
        {error && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleRefresh}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const OrderCard = ({ order }: { order: any }) => {
    // Use the safe status config getter
    const statusConfig = getStatusConfig(order.status || 'pending');
    const StatusIcon = statusConfig.icon;
    const statusColor = statusConfig.color;
    const statusLabel = statusConfig.label;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/seller/orders/${order.id}`)}
        style={[styles.orderCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={[styles.orderId, { color: theme.colors.text }]}>
              Order #{order.orderNumber}
            </Text>
            <Text style={[styles.customerName, { color: theme.colors.primary }]}>
              {order.user.name || 'Guest User'}
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
            {order.items.length} items • Rs. {order.total.toFixed(2)}
          </Text>
          {order.paymentMethod === 'card' ? (
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
        <View style={{ width: 24 }} />
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
      <FlatList
        data={filteredOrders}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
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
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  orderDate: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  summaryText: {
    fontSize: 14,
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
    justifyContent: 'center',
  },
  paidText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sellerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
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
  ordersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});