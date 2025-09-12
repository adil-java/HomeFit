import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, ShoppingCart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { removeFromWishlist } from '@/store/slices/wishlistSlice';
import { addToCart } from '@/store/slices/cartSlice';
import { WishlistItem } from '@/components/WishlistItem';
import Toast from 'react-native-toast-message';

export default function WishlistScreen() {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { items } = useSelector((state: RootState) => state.wishlist);

  const handleRemoveFromWishlist = (id: string) => {
    dispatch(removeFromWishlist(id));
    Toast.show({
      type: 'info',
      text1: 'Removed from wishlist',
      position: 'bottom',
    });
  };

  const handleAddToCart = (item: any) => {
    dispatch(addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    }));
    Toast.show({
      type: 'success',
      text1: 'Added to cart',
      position: 'bottom',
    });
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyContainer}>
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
        renderItem={({ item }) => (
          <WishlistItem
            item={item}
            onRemove={() => handleRemoveFromWishlist(item.id)}
            onAddToCart={() => handleAddToCart(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
});