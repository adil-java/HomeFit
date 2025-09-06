import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Heart, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { addToCart } from '@/store/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';
import { Product } from '@/store/slices/productsSlice';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  showAddToCart = false 
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const wishlist = useSelector((state: RootState) => state.wishlist.items);
  
  const isInWishlist = wishlist.some(item => item.id === product.id);

  const handleProductPress = () => {
    router.push(`/product/${product.id}`);
  };

  const handleWishlistPress = () => {
    if (isInWishlist) {
      dispatch(removeFromWishlist(product.id));
      Toast.show({
        type: 'info',
        text1: 'Removed from wishlist',
        position: 'bottom',
      });
    } else {
      dispatch(addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        rating: product.rating,
      }));
      Toast.show({
        type: 'success',
        text1: 'Added to wishlist',
        position: 'bottom',
      });
    }
  };

  const handleAddToCart = () => {
    dispatch(addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    }));
    Toast.show({
      type: 'success',
      text1: 'Added to cart',
      position: 'bottom',
    });
  };

  return (
    <TouchableOpacity
      onPress={handleProductPress}
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        showAddToCart ? styles.fullWidth : { width: cardWidth }
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        <TouchableOpacity
          onPress={handleWishlistPress}
          style={[styles.wishlistButton, { backgroundColor: theme.colors.background }]}
        >
          <Heart
            size={18}
            color={isInWishlist ? theme.colors.accent : theme.colors.textSecondary}
            fill={isInWishlist ? theme.colors.accent : 'transparent'}
          />
        </TouchableOpacity>
        {product.originalPrice && (
          <View style={[styles.discountBadge, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.discountText}>
              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
          <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
            {product.rating} ({product.reviews})
          </Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: theme.colors.text }]}>
            ${product.price}
          </Text>
          {product.originalPrice && (
            <Text style={[styles.originalPrice, { color: theme.colors.textSecondary }]}>
              ${product.originalPrice}
            </Text>
          )}
        </View>
        
        {showAddToCart && (
          <TouchableOpacity
            onPress={handleAddToCart}
            style={[styles.addToCartButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
    marginRight: 0,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 12,
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});