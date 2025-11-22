import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CircleCheck as CheckCircle, 
  Clock, 
  Circle as XCircle, 
  Filter,
  AlertCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/services/api';
import { format } from 'date-fns';

const statusConfig = {
  PENDING: { icon: Clock, color: '#f59e0b', label: 'Pending' },
  PROCESSING: { icon: Package, color: '#3b82f6', label: 'Processing' },
  SHIPPED: { icon: Truck, color: '#8b5cf6', label: 'Shipped' },
  DELIVERED: { icon: CheckCircle, color: '#10b981', label: 'Delivered' },
  CANCELLED: { icon: XCircle, color: '#ef4444', label: 'Cancelled' },
  REFUNDED: { icon: AlertCircle, color: '#8b5cf6', label: 'Refunded' },
};

const filterOptions = [
  { key: 'All', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'REFUNDED', label: 'Refunded' },
];

const ITEMS_PER_PAGE = 10;

export default function OrdersScreen() {
  const { theme } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    limit: ITEMS_PER_PAGE,
    totalPages: 1,
  });

  const fetchOrders = useCallback(async (page: number = 1, isRefreshing = false) => {
    try {
      setLoading(true);
      if (!isRefreshing) {
        setRefreshing(true);
      }
      
      const status = selectedFilter === 'All' ? undefined : selectedFilter;
      const response = await apiService.getUserOrders({
        status,
        page,
        limit: ITEMS_PER_PAGE,
      });

      setPagination({
        page: response.page || 1,
        total: response.total || 0,
        limit: response.limit || ITEMS_PER_PAGE,
        totalPages: response.totalPages || 1,
      });

      setOrders(prev => (page === 1 ? response.data : [...prev, ...response.data]));
      setError(null);
      setHasMore(response.totalPages > page);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleRefresh = () => {
    fetchOrders(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.page < pagination.totalPages) {
      fetchOrders(pagination.page + 1);
    }
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Package size={48} color={theme.colors.text} />
      <Text style={[styles.emptyText, { color: theme.colors.text }]}>
        {error || 'No orders found'}
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

  const OrderCard = ({ order }: { order: any }) => {
    const statusKey = order.status as keyof typeof statusConfig;
    const statusInfo = statusConfig[statusKey] || { icon: Package, color: '#6b7280', label: order.status };
    const StatusIcon = statusInfo.icon;
    const statusColor = statusInfo.color;
    const statusLabel = statusInfo.label;
    
    const firstItem = order.items?.[0];
    const itemCount = order.items?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: theme.colors.card }]}
        onPress={() => router.push(`/orders/${order.id}`)}
      >
        <View style={styles.orderHeader}>
          <Text style={[styles.orderId, { color: theme.colors.text }]}>
            Order #{order.orderNumber}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <StatusIcon size={14} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.orderItem}>
          {firstItem?.product?.images?.[0] ? (
            <Image
              source={{ uri: firstItem.product.images[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, { backgroundColor: theme.colors.border }]} />
          )}
          <View style={styles.orderItemDetails}>
            <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
              {firstItem?.productName || 'Product'}
            </Text>
            <Text style={[styles.productPrice, { color: theme.colors.text }]}>
              ${firstItem?.price?.toFixed(2) || '0.00'} × {firstItem?.quantity || 1}
            </Text>
            {itemCount > 1 && (
              <Text style={[styles.additionalItems, { color: theme.colors.text }]}>
                +{itemCount - 1} more item{itemCount > 2 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={[styles.orderDate, { color: theme.colors.text }]}>
              {format(new Date(order.createdAt), 'MMM d, yyyy')}
            </Text>
            <Text style={[styles.orderTotal, { color: theme.colors.text }]}>
              Total: ${order.total.toFixed(2)}
            </Text>
          </View>
          <Text style={[styles.viewDetails, { color: theme.colors.primary }]}>
            View Details
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && orders.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          data={filterOptions}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (selectedFilter !== item.key) {
                  setSelectedFilter(item.key);
                  setOrders([]);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }
              }}
              style={[
                styles.filterTab,
                {
                  backgroundColor: selectedFilter === item.key ? theme.colors.primary : 'transparent',
                  borderColor: selectedFilter === item.key ? theme.colors.primary : theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: selectedFilter === item.key ? '#fff' : theme.colors.text,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={[
          styles.ordersList,
          loading && orders.length === 0 && { flex: 1, justifyContent: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={!loading && hasMore ? renderFooter : null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
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
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  orderItemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
  },
  additionalItems: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 52,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '600',
  },
});