import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Heart, Star, ShoppingCart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { addToCart } from '@/store/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';
import { Product, setProducts } from '@/store/slices/productsSlice';
import Toast from 'react-native-toast-message';
import { apiService } from '@/services/api';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2;

interface ProductCardProps {
  product?: Product;
  productId?: string;
  showAddToCart?: boolean;
  style?: any;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product: initialProduct,
  productId,
  showAddToCart = false,
  style
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const wishlist = useSelector((state: RootState) => state.wishlist.items);
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId && !initialProduct) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProducts();
      
      if (response.success) {
        if (productId) {
          // If we have a productId, find the specific product
          const foundProduct = response.data.find((p: Product) => p.id === productId);
          if (foundProduct) {
            setProduct(foundProduct);
          } else {
            setError('Product not found');
          }
        } else {
          // If no productId, use the first product
          setProduct(response.data[0]);
        }
      } else {
        setError(response.error || 'Failed to load product');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={{ color: theme.colors.error }}>{error || 'Product not available'}</Text>
      </View>
    );
  }

  const isInWishlist = wishlist.some(item => item.id === product.id);

  const handleProductPress = () => {
    if (!product) return;
    router.push({
      pathname: '/product/[id]',
      params: { 
        id: product.id,
        // Pass initial data for better UX while full data loads
        name: product.name,
        price: product.price,
        image: product.image,
      }
    });
  };

  const handleWishlistPress = () => {
    if (!product) return;
    
    if (isInWishlist) {
      dispatch(removeFromWishlist(product.id));
      Toast.show({
        type: 'info',
        text1: 'Removed from wishlist',
        position: 'top',
      });
    } else {
      dispatch(addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        image: Array.isArray(product.images) ? product.images[0] : product.image,
        rating: product.rating || 0,
      }));
      Toast.show({
        type: 'success',
        text1: 'Added to wishlist',
        position: 'top',
      });
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    dispatch(addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: Array.isArray(product.images) ? product.images[0] : product.image,
      quantity: 1
    }));
    
    Toast.show({
      type: 'success',
      text1: 'Added to cart',
      position: 'top',
    });
  };

  // Get the main image URL, handling both string and array formats
  const mainImage = Array.isArray(product.images) && product.images.length > 0 
    ? product.images[0] 
    : typeof product.images === 'string' 
      ? product.images 
      : product.image || 'https://via.placeholder.com/300';

  // Calculate discount percentage if comparePrice exists
  const discountPercentage = product.comparePrice && product.price < product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <View style={[styles.container, { borderColor: theme.colors.border }, style]}>
      <TouchableOpacity onPress={handleProductPress}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: mainImage }} 
            style={styles.image} 
            resizeMode="cover"
            onError={(e) => {
              console.log('Failed to load image:', e.nativeEvent.error);
            }}
          />
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
          
          {discountPercentage > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.discountText}>
                {discountPercentage}% OFF
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.ratingContent}>
              <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
              <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
                {product.rating || 'N/A'} {product.reviews ? `(${product.reviews})` : ''}
              </Text>
            </View>
            <View style={styles.stockContainer}>
              <View 
                style={[
                  styles.stockIndicator, 
                  { 
                    backgroundColor: product.quantity > 0 
                      ? theme.colors.success 
                      : theme.colors.error 
                  }
                ]} 
              />
              <Text style={[styles.stockText, { color: theme.colors.textSecondary }]}>
                {product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <View>
              <Text style={[styles.price, { color: theme.colors.primary }]}>
                Rs. {product.price?.toFixed(2) || '0.00'}
              </Text>
              {product.comparePrice && product.comparePrice > product.price && (
                <Text style={[styles.originalPrice, { color: theme.colors.textSecondary }]}>
                  Rs. {product.comparePrice.toFixed(2)}
                </Text>
              )}
            </View>
            
            {showAddToCart && product.quantity > 0 && (
              <TouchableOpacity
                onPress={handleAddToCart}
                style={[styles.cartButton, { backgroundColor: theme.colors.primary }]}
              >
                <ShoppingCart size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
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
    resize  : 'cover',
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
    marginBottom: 8,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    marginLeft: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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