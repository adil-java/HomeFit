import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Heart, ShoppingCart, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { WishlistItem as WishlistItemType } from '@/store/slices/wishlistSlice';

interface WishlistItemProps {
  item: WishlistItemType;
  onRemove: (id: string) => void;
  onAddToCart: (item: WishlistItemType) => void;
}

export const WishlistItem: React.FC<WishlistItemProps> = ({ item, onRemove, onAddToCart }) => {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const compact = screenWidth < 360;
  const imageSize = compact ? 68 : 80;

  const handleProductPress = () => {
    router.push(`/product/${item.id}`);
  };

  return (
    <TouchableOpacity
      onPress={handleProductPress}
      style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <Image source={{ uri: item.image }} style={[styles.image, { width: imageSize, height: imageSize }]} />
      
      <View style={styles.content}>
        <Text style={[styles.name, compact && styles.nameCompact, { color: theme.colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
          <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
            {item.rating}
          </Text>
        </View>
        
        <Text style={[styles.price, compact && styles.priceCompact, { color: theme.colors.text }]}> 
          Rs. {typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onAddToCart(item)}
            style={[styles.addToCartButton, { backgroundColor: theme.colors.primary }]}
          >
            <ShoppingCart size={16} color="#fff" />
            <Text style={[styles.addToCartText, compact && styles.addToCartTextCompact]}>Choose Variant</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            style={[styles.removeButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
          >
            <Heart size={16} color={theme.colors.accent} fill={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
    lineHeight: 20,
  },
  nameCompact: {
    fontSize: 15,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    marginLeft: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  priceCompact: {
    fontSize: 16,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  addToCartTextCompact: {
    fontSize: 13,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});