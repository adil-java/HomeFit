import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Truck, CircleCheck as CheckCircle, Clock, Circle as XCircle, MessageCircle, Edit } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { setOrders, setLoading } from '@/store/slices/ordersSlice';
import { apiService } from '@/services/api';
import { BackHandler } from 'react-native';

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

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersScreen() {
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loading } = useSelector((state: RootState) => state.orders);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 10;

  // Set initial loading state and fetch orders on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        dispatch(setLoading(true));
        await fetchOrders(false, 1);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        if (isMounted) {
          dispatch(setLoading(false));
        }
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      router.replace('/(tabs)');
      return true;
    };
  
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
  
    return () => backHandler.remove();
  }, []);

  const fetchOrders = async (isRefreshing = false, currentPage = page) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (currentPage === 1) {
        dispatch(setLoading(true));
      } else {
        setIsLoadingMore(true);
      }

      const status = selectedFilter !== 'all' ? selectedFilter.toUpperCase() : undefined;
      const response = await apiService.getSellerOrders({
        status,
        page: currentPage,
        limit,
      });

      const newOrders = response.data || [];
      
      if (isRefreshing || currentPage === 1) {
        dispatch(setOrders(newOrders));
      } else {
        // Append new orders for pagination
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
      } else if (currentPage === 1) {
        dispatch(setLoading(false));
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Reset pagination and fetch when filter changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchOrders(false, 1);
  }, [selectedFilter]);

  // Fetch more when page changes (but not on initial mount or filter change)
  useEffect(() => {
    if (page > 1) {
      fetchOrders(false, page);
    }
  }, [page]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setPage(1);
      setHasMore(true);
      
      const status = selectedFilter !== 'all' ? selectedFilter.toUpperCase() : undefined;
      const response = await apiService.getSellerOrders({
        status,
        page: 1,
        limit,
      });
      
      const newOrders = response.data || [];
      dispatch(setOrders(newOrders));
      setHasMore(newOrders.length === limit);
      setError(null);
    } catch (err) {
      console.error('Error refreshing orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh orders');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !isLoadingMore && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };
  
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
              {order.user?.name || 'Guest User'}
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
            {order.items?.length || 0} items • Rs. {order.total?.toFixed(2) || '0.00'}
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
              openStatusModal(order);
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

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !selectedStatus) return;
    
    try {
      setIsUpdating(true);
      // Call the API with the selected status
      await apiService.updateOrderStatus(selectedOrder.id, selectedStatus, '');
      
      // Close modal first
      setIsStatusModalVisible(false);
      
      // Reset pagination and refresh orders
      setPage(1);
      setHasMore(true);
      await fetchOrders(false, 1);
      
      Alert.alert('Success', 'Order status updated successfully');
    } catch (error: any) {
      console.error('Update status error:', error);
      Alert.alert('Error', error?.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const openStatusModal = (order: any) => {
    setSelectedOrder(order);
    // Convert current status to uppercase to match the options
    setSelectedStatus((order.status || 'PENDING').toUpperCase());
    setIsStatusModalVisible(true);
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
                    fontFamily: 'Inter_400Regular',
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
          {orders.length} orders found
        </Text>
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
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
      
      {/* Status Update Modal */}
      <Modal
        visible={isStatusModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isUpdating && setIsStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Update Order Status
            </Text>
            
            <ScrollView style={styles.statusOptionsContainer}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    selectedStatus === option.value && { 
                      backgroundColor: `${theme.colors.primary}20`,
                      borderColor: theme.colors.primary,
                    },
                    { borderColor: theme.colors.border }
                  ]}
                  onPress={() => setSelectedStatus(option.value)}
                  disabled={isUpdating}
                >
                  <Text style={[styles.statusOptionText, { color: theme.colors.text }]}>
                    {option.label}
                  </Text>
                  {selectedStatus === option.value && (
                    <View style={[styles.statusSelected, { backgroundColor: theme.colors.primary }]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsStatusModalVisible(false)}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.updateButton, 
                  { backgroundColor: theme.colors.primary },
                  (isUpdating || !selectedStatus) && { opacity: 0.5 }
                ]}
                onPress={handleUpdateStatus}
                disabled={isUpdating || !selectedStatus}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.updateButtonText}>Update Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
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
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_500Medium',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
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
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_500Medium',
    marginLeft: 8,
  },
  ordersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOptionsContainer: {
    maxHeight: 300,
  },
  statusOption: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 16,
  },
  statusSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
});