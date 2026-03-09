import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, ShoppingCart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { fetchWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';
import { WishlistItem } from '@/components/WishlistItem';
import Toast from 'react-native-toast-message';

export default function WishlistScreen() {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { 
    items, 
    loading, 
    error, 
    isInitialized 
  } = useAppSelector((state: RootState) => state.wishlist);
  const horizontalPadding = screenWidth < 360 ? 12 : 20;
  const emptyHorizontalPadding = screenWidth < 360 ? 24 : 40;

  // Fetch wishlist on initial load if not already initialized
  useEffect(() => {
    if (!isInitialized) {
      dispatch(fetchWishlist({ forceRefresh: true }));
    }
  }, [dispatch, isInitialized]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    dispatch(fetchWishlist({ forceRefresh: true }));
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: error,
        position: 'top',
      });
    }
  }, [error]);

  const handleRemoveFromWishlist = (id: string) => {
    dispatch(removeFromWishlist(id))
      .unwrap()
      .catch(() => {
        // Error is already handled by the thunk
      });
  };

  const handleAddToCart = (item: any) => {
    router.push(`/product/${item.id}`);
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

  // Show empty state
  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.emptyContainer, { paddingHorizontal: emptyHorizontalPadding }]}>
          <Heart size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Your wishlist is empty
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
            Save items you love to your wishlist
          </Text>
          <TouchableOpacity
            style={[styles.continueShoppingButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/(tabs)/')}
          >
            <Text style={styles.continueShoppingText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WishlistItem
            item={item}
            onRemove={handleRemoveFromWishlist}
            onAddToCart={handleAddToCart}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
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
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
});