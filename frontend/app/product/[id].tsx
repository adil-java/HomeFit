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
  TextInput,
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
import { addComment, deleteComment, makeSelectCommentsByProductId } from '@/store/slices/commentsSlice';
import { ARPreviewButton } from '@/components/ARPreviewButton';
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
  // Memoized comments selector to avoid returning a new array every render
  const selectCommentsByProductId = React.useMemo(makeSelectCommentsByProductId, []);
  const comments = useSelector((state: RootState) => selectCommentsByProductId(state as any, String(id)));
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentRating, setNewCommentRating] = useState(5);
  const imageScrollRef = useRef<FlatList>(null);
  
  const isInWishlist = wishlist.some(item => item.id === id);
  
  // Format price with currency
  const formatPrice = (price: number) => {
    return `Rs. ${price.toFixed(2)}`;
  };

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
        position: 'top',
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
        position: 'top',
      });
    }
  };

  const handleAddToCart = () => {
    const opts = Object.fromEntries(
      Object.entries(selectedOptions).map(([k, v]) => [String(k).toLowerCase(), v])
    );
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      color: (opts as any).color,
      size: (opts as any).size,
      sku: product.sku,
      quantity: 1,
      options: opts,
    } as any;

    for (let i = 0; i < quantity; i++) {
      dispatch(addToCart(cartItem));
    }

    Toast.show({
      type: 'success',
      text1: 'Added to cart',
      text2: `${quantity} ${quantity === 1 ? 'item' : 'items'} added`,
      position: 'top',
    });
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <Image source={{ uri: item }} style={styles.productImage} />
  );

  const handleAddComment = () => {
    if (!newComment.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a comment',
        position: 'top',
      });
      return;
    }

    const comment = {
      id: Date.now().toString(),
      productId: product.id,
      userId: 'current_user', 
      userName: 'You',
      userAvatar: 'https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcSB8YG1B2XziV21lROluErcnlysdyrhddEaEpjEVs5zR15rSu452WFwq034o63Qy-UXmPsACdI8xO42N2fNsCwgPC1xbuOD7yiNSZUJklKzwC3NsyU',
      rating: newCommentRating,
      text: newComment.trim(),
      date: new Date().toISOString().split('T')[0],
      helpful: 0,
    };

    dispatch(addComment(comment));
    setNewComment('');
    setNewCommentRating(5);
    setShowCommentForm(false);

    Toast.show({
      type: 'success',
      text1: 'Comment added',
      position: 'top',
    });
  };

  const handleDeleteComment = (commentId: string) => {
    dispatch(deleteComment(commentId));
    Toast.show({
      type: 'info',
      text1: 'Comment deleted',
      position: 'top',
    });
  };

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
          {/* <TouchableOpacity style={styles.headerButton}>
            <Share size={24} color={theme.colors.text} />
          </TouchableOpacity> */}
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

          {/* 3D Preview Button */}
          <View style={styles.previewButtonContainer}>
            <ARPreviewButton modelUrl={product.modelUrl} />
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.colors.text }]}>
            {product.name}
          </Text>
           <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {product.description}
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
              <Text style={[styles.productPrice, { color: theme.colors.accent, fontSize: 24, fontWeight: '700' }]}>
                {formatPrice(product.price)}
              </Text>
              {product.comparePrice && product.comparePrice > product.price && (
                <Text style={[styles.comparePrice, { color: theme.colors.textSecondary }]}>
                  {formatPrice(product.comparePrice)}
                </Text>
              )}
            </View>

            <View style={styles.descriptionSection}>
            
            
            <View style={[
              styles.stockBadge, 
              { 
                backgroundColor: product.quantity > 0 
                  ? (theme.dark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)') 
                  : (theme.dark ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.1)'),
                borderColor: product.quantity > 0 ? '#4CAF50' : '#F44336',
                borderWidth: 1,
              }
            ]}>
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: product.quantity > 0 ? '#4CAF50' : '#F44336',
              }} />
              <Text style={[
                styles.stockText, 
                { color: product.quantity > 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {product.quantity > 0 ? `In Stock (${product.quantity} available)` : 'Out of Stock'}
              </Text>
            </View>
           
          </View>

          {/* Product Variants */}
          {product.variants?.map((variant: any) => (
            <View key={variant.id} style={[
              styles.variantSection, 
              { 
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceVariant
              }
            ]}>
              <View style={styles.variantHeader}>
                <Text style={[styles.variantTitle, { color: theme.colors.text }]}>
                  {variant.name}
                  <Text style={styles.variantRequired}> *</Text>
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: theme.colors.textSecondary
                }}>
                  {selectedOptions[variant.name] || ''}
                </Text>
              </View>
              <View style={styles.variantOptions}>
                {variant.options.map((option: string, index: number) => {
                  const isSelected = selectedOptions[variant.name] === option;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.variantOption,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                        },
                        isSelected && styles.variantOptionSelected,
                        variant.name === 'non' && {
                          backgroundColor: option.toLowerCase(),
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedOptions(prev => ({ ...prev, [variant.name]: option }));
                      }}
                    >
                      {(
                        <Text style={[
                          styles.variantOptionText,
                          isSelected ? styles.variantOptionSelectedText : { color: theme.colors.text },
                          { fontWeight: isSelected ? '600' : '500' }
                        ]}>
                          {option}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}



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
                onPress={() => {
                  if (product.quantity && quantity < product.quantity) {
                    setQuantity(quantity + 1);
                  } else {
                    Toast.show({
                      type: 'info',
                      text1: 'Maximum quantity reached',
                      text2: `Only ${product.quantity} items available in stock`,
                      position: 'top',
                    });
                  }
                }}
                style={[
                  styles.quantityButton, 
                  { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.border,
                    opacity: (product.quantity && quantity >= product.quantity) ? 0.5 : 1
                  }
                ]}
                disabled={product.quantity && quantity >= product.quantity}
              >
                <Plus 
                  size={20} 
                  color={product.quantity && quantity >= product.quantity 
                    ? theme.colors.textSecondary 
                    : theme.colors.text} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          

          {/* Features */}
          {product.tags && product.tags.length > 0 && (
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
          )}

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Reviews & Comments ({comments.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowCommentForm(!showCommentForm)}
                style={[styles.addCommentButton, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.addCommentText}>Write a Review</Text>
              </TouchableOpacity>
            </View>

            {/* Comment Form */}
            {showCommentForm && (
              <View style={[styles.commentForm, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.ratingInput}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Rating</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setNewCommentRating(star)}
                      >
                        <Star
                          size={24}
                          color={star <= newCommentRating ? theme.colors.warning : theme.colors.border}
                          fill={star <= newCommentRating ? theme.colors.warning : 'transparent'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.commentInputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Your Review</Text>
                  <TextInput
                    style={[styles.commentInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                    placeholder="Share your thoughts about this product..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.commentFormActions}>
                  <TouchableOpacity
                    onPress={() => setShowCommentForm(false)}
                    style={[styles.cancelButton, { backgroundColor: theme.colors.border }]}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddComment}
                    style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                  >
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Comments List */}
            {comments.length > 0 ? (
              <View style={styles.commentsList}>
                {comments.map((comment) => (
                  <View key={comment.id} style={[styles.commentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentUser}>
                        <Image source={{ uri: comment.userAvatar }} style={styles.userAvatar} />
                        <View>
                          <Text style={[styles.userName, { color: theme.colors.text }]}>{comment.userName}</Text>
                          <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>{comment.date}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(comment.id)}
                        style={styles.deleteButton}
                      >
                        <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.commentRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          color={star <= comment.rating ? theme.colors.warning : theme.colors.border}
                          fill={star <= comment.rating ? theme.colors.warning : 'transparent'}
                        />
                      ))}
                    </View>

                    <Text style={[styles.commentText, { color: theme.colors.text }]}>{comment.text}</Text>

                    <TouchableOpacity style={styles.helpfulButton}>
                      <Text style={[styles.helpfulText, { color: theme.colors.textSecondary }]}>
                        👍 Helpful ({comment.helpful})
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noComments}>
                <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                  No reviews yet. Be the first to review this product!
                </Text>
              </View>
            )}
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  comparePrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginLeft: 8,
    opacity: 0.7,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: -5,
    marginBottom: -16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    marginLeft: 4,
  },
  detailsContainer: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  variantSection: {
    marginTop: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  variantRequired: {
    fontSize: 12,
    color: '#F44336',
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  variantOption: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  variantOptionText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  variantOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  variantOptionSelectedText: {
    color: '#fff',
  },
  arContainer: {
    marginTop: 20,
    alignItems: 'center',
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
    fontFamily: 'Inter_500Medium',
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
  previewButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  productInfo: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
    lineHeight: 30,
  },
  ratingContainer: {
    marginTop:10,
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
    fontFamily: 'Inter_800ExtraBold',
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
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_600SemiBold',
    minWidth: 32,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_500Medium',
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
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  commentsSection: {
    marginBottom: 24,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCommentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addCommentText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  commentForm: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  ratingInput: {
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  commentInputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  commentFormActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  commentsList: {
    gap: 16,
  },
  commentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  commentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  commentRating: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 2,
  },
  commentText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  helpfulButton: {
    alignSelf: 'flex-start',
  },
  helpfulText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCommentsText: {
    fontSize: 16,
    textAlign: 'center',
  },
});