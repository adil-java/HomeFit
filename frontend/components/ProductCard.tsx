import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Heart, Star, ShoppingCart } from 'lucide-react-native';
import { router } from 'expo-router';
import { formatPrice } from '@/constants/pricing';
import { useTheme } from '@/contexts/ThemeContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { addToCart } from '@/store/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';
import { Product } from '@/store/slices/productsSlice';
import Toast from 'react-native-toast-message';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';

interface ProductCardProps {
  product?: Product;
  productId?: string;
  showAddToCart?: boolean;
  style?: any;
  /** Exact card width (used by grids). Without it the card sizes itself for horizontal lists. */
  width?: number;
}

const ProductCardComponent: React.FC<ProductCardProps> = ({ 
  product: initialProduct,
  productId,
  showAddToCart = false,
  style,
  width: fixedWidth,
}) => {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const dispatch = useDispatch<AppDispatch>();
  // Only used when the card is given a productId instead of product data.
  // When the parent passes `product`, always use the latest prop (previously it
  // was copied into state once, so refreshed price/stock never reached the card).
  const [fetchedProduct, setFetchedProduct] = useState<Product | null>(null);
  const product = initialProduct ?? fetchedProduct;
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState<string | null>(null);

  // Grids pass an exact width; horizontal lists (e.g. Featured) use a size that
  // shows ~2 cards on phones and stays reasonable on tablets.
  const responsiveCardWidth = fixedWidth ?? Math.max(150, Math.min(220, (screenWidth - 52) / 2));
  const responsiveImageHeight = Math.round(responsiveCardWidth * 1.02);

  useEffect(() => {
    if (productId && !initialProduct) {
      fetchProduct();
    }
  }, [productId]);

  useEffect(() => {
    if (product) {
      const avg1 = (product as any)?.averageRating;
      const avg2 = (product as any)?.averagerating;
      const displayRating = product?.rating ?? avg1 ?? avg2 ?? null;
      const modelUrl = product?.modelUrl ?? (product as any)?.ARModelUrl;
      // logger.log('[ProductCard][Product]', {
      //   id: product.id,
      //   name: product.name,
      //   rating: product.rating,
      //   modelUrl,
      //   averageRating: avg1,
      //   averagerating: avg2,
      //   displayRating,
      // });
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProducts();
      
      if (response.success) {
        if (productId) {
          // If we have a productId, find the specific product
          const foundProduct = response.data.find((p: Product) => p.id === productId);
          if (foundProduct) {
            // Normalize rating so UI can use product.rating
            const normalized = {
              ...foundProduct,
              rating: (foundProduct as any)?.rating ?? (foundProduct as any)?.averageRating ?? (foundProduct as any)?.averagerating ?? 0,
              inStock: (foundProduct as any)?.inStock ?? (((foundProduct as any)?.stock ?? (foundProduct as any)?.quantity ?? 0) > 0),
              modelUrl: foundProduct?.ARModelUrl || foundProduct?.modelUrl || null,
            } as Product;
            setFetchedProduct(normalized);
          } else {
            setError('Product not found');
          }
        } else {
          // If no productId, use the first product
          const first = response.data[0];
          const normalized = first
            ? ({
                ...first,
                rating: (first as any)?.rating ?? (first as any)?.averageRating ?? (first as any)?.averagerating ?? 0,
                inStock: (first as any)?.inStock ?? (((first as any)?.stock ?? (first as any)?.quantity ?? 0) > 0),
                modelUrl: (first as any)?.modelUrl || (first as any)?.ARModelUrl, 
              } as Product)
            : null;
          setFetchedProduct(normalized);
        }
      } else {
        setError(response.error || 'Failed to load product');
      }
    } catch (err) {
      logger.error('Error fetching product:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Hooks must run before any early return (it was after them, which crashes
  // React when `loading` flips from true to false).
  const productIdForWishlist = product?.id;
  const isInWishlist = useSelector((state: RootState) =>
    productIdForWishlist ? state.wishlist.items.some(item => item.id === productIdForWishlist) : false
  );

  if (loading) {
    return (
      // Skeleton in the card's real shape, so the grid doesn't jump when data arrives
      <View style={[styles.container, { width: responsiveCardWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, style]}>
        <View style={{ height: responsiveImageHeight, backgroundColor: theme.colors.border, opacity: 0.45 }} />
        <View style={styles.content}>
          <View style={[styles.skeletonLine, { backgroundColor: theme.colors.border, width: '85%' }]} />
          <View style={[styles.skeletonLine, { backgroundColor: theme.colors.border, width: '55%' }]} />
          <View style={[styles.skeletonLine, { backgroundColor: theme.colors.border, width: '40%', height: 14, marginTop: 10 }]} />
        </View>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.errorContainer, { width: responsiveCardWidth, height: responsiveImageHeight + 96 }, style]}>
        <Text style={{ color: theme.colors.error }}>{error || 'Product not available'}</Text>
      </View>
    );
  }

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
        modelUrl: product.modelUrl,
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

  // Calculate discount percentage if comparePrice is a number
  const numericCompare = typeof (product as any)?.comparePrice === 'number' ? (product as any).comparePrice as number : null;
  const discountPercentage = numericCompare && product.price < numericCompare
    ? Math.round(((numericCompare - product.price) / numericCompare) * 100)
    : 0;

  // Derive rating to display (respect 0)
  const displayRating = (product as any)?.rating ?? (product as any)?.averageRating ?? (product as any)?.averagerating ?? 'N/A';

  return (
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, width: responsiveCardWidth }, style]}>
      <TouchableOpacity onPress={handleProductPress} activeOpacity={0.88}>
        <View style={[styles.imageContainer, { height: responsiveImageHeight }]}>
          <Image 
            source={{ uri: mainImage }} 
            style={styles.image} 
            resizeMode="cover"
            onError={(e) => {
              // logger.log('Failed to load image:', e.nativeEvent.error);
            }}
          />
          <TouchableOpacity
            onPress={handleWishlistPress}
            style={[styles.wishlistButton, { backgroundColor: theme.colors.background + 'E6' }]}
            hitSlop={8}
            accessibilityLabel={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
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
          <Text 
            style={[
              styles.name, 
              { color: theme.colors.text }
            ]} 
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {product.name}
          </Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.ratingContent}>
              <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
              <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
                {displayRating} {Number(product.reviews) > 0 ? `(${Number(product.reviews)})` : ''}
              </Text>
            </View>
            <View style={styles.stockContainer}>
              <View 
                style={[
                  styles.stockIndicator, 
                  { 
                    backgroundColor: product.inStock 
                      ? theme.colors.success 
                      : theme.colors.error 
                  }
                ]} 
              />
              <Text style={[styles.stockText, { color: theme.colors.textSecondary }]}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <View style={styles.priceInfo}>
              <Text style={[styles.price, { color: theme.colors.primary }]}>
                {formatPrice(product.price || 0)}
              </Text>
              <Text
                style={[
                  styles.originalPrice,
                  { color: theme.colors.textSecondary },
                  !(typeof (product as any)?.comparePrice === 'number' && (product as any).comparePrice > product.price) && styles.hiddenOriginalPrice,
                ]}
              >
                {typeof (product as any)?.comparePrice === 'number' && (product as any).comparePrice > product.price
                  ? formatPrice((product as any).comparePrice)
                  : 'Rs. 0.00'}
              </Text>
            </View>
            
            {/* {showAddToCart && product.inStock && (
              <TouchableOpacity
                onPress={handleAddToCart}
                style={[styles.cartButton, { backgroundColor: theme.colors.primary }]}
              >
                <ShoppingCart size={16} color="#fff" />
              </TouchableOpacity>
            )} */}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Memoized: a card re-renders only when its own props change (or its wishlist
// state / theme / screen size), not every time the parent list re-renders.
export const ProductCard = React.memo(ProductCardComponent);

const styles = StyleSheet.create({
  loadingContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  container: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
    opacity: 0.6,
  },
  fullWidth: {
    width: '100%',
    marginRight: 0,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
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
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    marginBottom: 8,
    lineHeight: 18,
    minHeight: 36,
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
    fontFamily: 'Manrope_400Regular',
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
    fontFamily: 'Manrope_500Medium',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  priceInfo: {
    minHeight: 40,
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.2,
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  hiddenOriginalPrice: {
    opacity: 0,
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
});