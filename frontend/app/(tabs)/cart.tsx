import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateQuantity, removeFromCart, fetchCart } from '@/store/slices/cartSlice';
import { CartItem } from '@/components/CartItem';
import Toast from 'react-native-toast-message';

export default function CartScreen() {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();
  const { items, total, itemCount, loading, error, isInitialized } = useAppSelector((state) => state.cart);

  // Fetch cart on initial load if not already initialized
  useEffect(() => {
    if (!isInitialized) {
      dispatch(fetchCart());
    }
  }, [dispatch, isInitialized]);

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Toast.show({ type: 'error', text1: error, position: 'bottom' });
    }
  }, [error]);

  const handleRemoveItem = (id: string) => {
    dispatch(removeFromCart(id));
    Toast.show({
      type: 'info',
      text1: 'Item removed from cart',
      position: 'top',
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    dispatch(updateQuantity({ id, quantity }));
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Cart is empty',
        text2: 'Add some items to your cart first',
        position: 'top',
      });
      return;
    }
    router.push('/checkout');
  };

  // Show loading state only on initial load
  if (!isInitialized && loading) {
    return (
      <SafeAreaView style={[styles.container, { 
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }]}> 
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Your cart is empty
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
            Browse our products and add some items to your cart
          </Text>
          <TouchableOpacity
            style={[styles.continueShoppingButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.continueShoppingText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => {
              const optionKey = Object.keys(item.options || {})
                .map(k => k.trim().toLowerCase())
                .sort()
                .map(k => `${k}:${String((item.options as any)[k]).trim().toLowerCase()}`)
                .join('|');
              return item.cartItemId || `${item.id}::${optionKey}`;
            }}
            renderItem={({ item }) => (
              <CartItem
                item={item}
                onRemove={handleRemoveItem}
                onUpdateQuantity={handleUpdateQuantity}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading && isInitialized}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          />
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <View style={styles.totalContainer}>
              <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                Total ({itemCount} {itemCount === 1 ? 'item' : 'items'}):
              </Text>
              <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
                Rs. {total.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  continueShoppingButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueShoppingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  totalContainer: {
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});