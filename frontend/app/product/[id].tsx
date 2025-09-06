import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Heart, 
  Share, 
  Star, 
  ShoppingCart,
  Plus,
  Minus
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { addToCart } from '@/store/slices/cartSlice';
import { addToWishlist, removeFromWishlist } from '@/store/slices/wishlistSlice';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const product = useSelector((state: RootState) => 
    state.products.products.find(p => p.id === id)
  );
  const wishlist = useSelector((state: RootState) => state.wishlist.items);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const imageScrollRef = useRef<FlatList>(null);
  
  const isInWishlist = wishlist.some(item => item.id === id);

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleWishlistToggle = () => {
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
      quantity,
      color: selectedColor,
      size: selectedSize,
    }));
    Toast.show({
      type: 'success',
      text1: 'Added to cart',
      text2: `${quantity} ${quantity === 1 ? 'item' : 'items'} added`,
      position: 'bottom',
    });
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <Image source={{ uri: item }} style={styles.productImage} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleWishlistToggle} style={styles.headerButton}>
            <Heart
              size={24}
              color={isInWishlist ? theme.colors.accent : theme.colors.text}
              fill={isInWishlist ? theme.colors.accent : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Share size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <View style={styles.imageContainer}>
          <FlatList
            ref={imageScrollRef}
            data={product.images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
          />
          
          {/* Image Indicators */}
          {product.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {product.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: index === selectedImageIndex 
                        ? theme.colors.primary 
                        : theme.colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Discount Badge */}
          {product.originalPrice && (
            <View style={[styles.discountBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.discountText}>
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.text }]}>
            {product.name}
          </Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  color={star <= Math.floor(product.rating) ? theme.colors.warning : theme.colors.border}
                  fill={star <= Math.floor(product.rating) ? theme.colors.warning : 'transparent'}
                />
              ))}
              <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                {product.rating} ({product.reviews} reviews)
              </Text>
            </View>
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

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Color</Text>
              <View style={styles.colorOptions}>
                {product.colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.colorOption,
                      {
                        borderColor: selectedColor === color ? theme.colors.primary : theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    <Text style={[
                      styles.colorText,
                      { 
                        color: selectedColor === color ? theme.colors.primary : theme.colors.text,
                        fontWeight: selectedColor === color ? '600' : '400',
                      }
                    ]}>
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <View style={styles.optionSection}>
              <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Size</Text>
              <View style={styles.sizeOptions}>
                {product.sizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    style={[
                      styles.sizeOption,
                      {
                        borderColor: selectedSize === size ? theme.colors.primary : theme.colors.border,
                        backgroundColor: selectedSize === size ? theme.colors.primary : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text style={[
                      styles.sizeText,
                      { 
                        color: selectedSize === size ? '#fff' : theme.colors.text,
                        fontWeight: selectedSize === size ? '600' : '400',
                      }
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity */}
          <View style={styles.optionSection}>
            <Text style={[styles.optionTitle, { color: theme.colors.text }]}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={[styles.quantityButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Minus size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.quantityText, { color: theme.colors.text }]}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={[styles.quantityButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Plus size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {product.description}
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Features</Text>
            <View style={styles.featuresList}>
              {product.tags.map((tag, index) => (
                <View key={index} style={[styles.featureItem, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.featureText, { color: theme.colors.text }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleWishlistToggle}
          style={[styles.wishlistAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Heart
            size={24}
            color={isInWishlist ? theme.colors.accent : theme.colors.text}
            fill={isInWishlist ? theme.colors.accent : 'transparent'}
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleAddToCart}
          style={[styles.addToCartAction, { backgroundColor: theme.colors.primary }]}
        >
          <ShoppingCart size={20} color="#fff" />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    height: 400,
    position: 'relative',
  },
  productImage: {
    width: width,
    height: 400,
    resizeMode: 'cover',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 30,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
  },
  originalPrice: {
    fontSize: 20,
    textDecorationLine: 'line-through',
  },
  optionSection: {
    marginBottom: 24,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  colorText: {
    fontSize: 14,
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 14,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  wishlistAction: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartAction: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    gap: 8,
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});