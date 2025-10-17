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
import { addComment, deleteComment } from '@/store/slices/commentsSlice';
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
  const comments = useSelector((state: RootState) =>
    state.comments.comments.filter(c => c.productId === id)
  );
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentRating, setNewCommentRating] = useState(5);
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
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      color: selectedColor,
      size: selectedSize,
    };

    for (let i = 0; i < quantity; i++) {
      dispatch(addToCart(cartItem));
    }

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

  const handleAddComment = () => {
    if (!newComment.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a comment',
        position: 'bottom',
      });
      return;
    }

    const comment = {
      id: Date.now().toString(),
      productId: product.id,
      userId: 'current_user', // In a real app, this would come from authentication
      userName: 'You',
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face',
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
      position: 'bottom',
    });
  };

  const handleDeleteComment = (commentId: string) => {
    dispatch(deleteComment(commentId));
    Toast.show({
      type: 'info',
      text1: 'Comment deleted',
      position: 'bottom',
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

          {/* 3D Preview Button */}
          <View style={styles.previewButtonContainer}>
            <ARPreviewButton
              onPress={() => {
                // For now, using a placeholder model URL. In production, use product.modelUrl
                const modelUrl = 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760470451/ecommerce/3d-models/ccrynqbf0tkelb1lbco7.glb'; // Replace with actual model URL from product
                router.push(`/product/ar?modelUrl=${encodeURIComponent(modelUrl)}`);
              }}
            />
          </View>
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
  previewButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
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