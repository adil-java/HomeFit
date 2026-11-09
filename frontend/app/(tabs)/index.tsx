import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { ProductCard } from '@/components/ProductCard';
import { CategoryCard } from '@/components/CategoryCard';
import { useFocusEffect } from 'expo-router';
import { fetchWishlist } from '@/store/slices/wishlistSlice';
import { fetchCart } from '@/store/slices/cartSlice';
import { apiService } from '@/services/api';
import { useResponsive } from '@/hooks/useResponsive';
import { setProducts, setCategories, Category } from '@/store/slices/productsSlice';
import { HeroBanner } from '@/components/HeroBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import { logger } from '@/utils/logger';

export default function HomeScreen() {
  const { theme } = useTheme();
  // Grid: 2 columns on phones, 3 on large foldables/small tablets, 4 on tablets.
  // Card width is computed exactly (page padding 20 matches the section titles).
  const { gridColumns, gridItemWidth } = useResponsive();
  const GRID_GAP = 12;
  const GRID_PADDING = 20;
  const cardWidth = gridItemWidth(gridColumns, GRID_GAP, GRID_PADDING);
  const { user, isLoading, authBusy } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { products, categories } = useSelector((state: RootState) => state.products);
  const typedCategories = categories as Category[];
  
  // Get featured products (first 4 products)
  const featuredProducts = products.slice(0, 4);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch fresh data
      await Promise.all([
        fetchProducts(true),
        fetchCategories(true),
        dispatch(fetchWishlist({ forceRefresh: true }) as any),
        dispatch(fetchCart() as any)
      ]);
    } catch (error) {
      logger.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // Fetch initial data
  useEffect(() => {
    // Signed out (not while signing in/out — those flows navigate themselves)
    if (!isLoading && !user && !authBusy) {
      router.replace('/auth');
    } else if (user) {
      fetchProducts();
      fetchCategories();
      // Initial wishlist & cart fetch (force a fresh sync on app open)
      dispatch(fetchWishlist({ forceRefresh: true }) as any).catch(() => {});
      dispatch(fetchCart() as any).catch(() => {});
    }
    // Keyed on the account id: the profile object is refreshed after a reload
    // (cached → fresh) and that must not reload everything twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading, authBusy]);

  // Refresh wishlist when returning to Home. Skips the first focus: the effect
  // above already loads it on open, and running both sent the request twice.
  const hasFocusedOnce = useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (user && hasFocusedOnce.current) {
        // Refresh lightweightly when returning to Home (uses the cache if loaded)
        dispatch(fetchWishlist({ forceRefresh: false }) as any).catch(() => {});
      }
      hasFocusedOnce.current = true;
    }, [user])
  );
  
  const fetchCategories = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setIsLoadingCategories(true);
      }
      const categories = await apiService.getCategoriesWithImages();
      // Update Redux state with full category objects
      dispatch(setCategories(categories));
    } catch (err) {
      logger.error('Error fetching categories:', err);
      // Handle error (you might want to show a user-friendly message)
    } finally {
      if (!isRefreshing) {
        setIsLoadingCategories(false);
      }
    }
  };
  
  const fetchProducts = async (isRefreshing = false) => {
    try {
      // Pull-to-refresh has its own indicator; the full-screen loader is only
      // for the very first load (see render below).
      if (!isRefreshing) setIsLoadingProducts(true);
      setError(null);
      const response = await apiService.getProducts();
      // Debug: inspect raw products payload and rating-related fields
      try {
        // logger.log('[Products][Fetch] raw response keys:', response && Object.keys(response));
        const sample = Array.isArray(response?.data) ? response.data[0] : null;
        // if (sample) {
        //   logger.log('[Products][Fetch] sample product fields:', {
        //     id: sample.id,
        //     name: sample.name,
        //     rating: sample.rating,
        //     category: sample.category,
        //     averageRating: sample.averageRating,
        //     averagerating: sample.averagerating,
        //   });
        // }
      } catch (e) {
        // logger.log('[Products][Fetch] logging error:', e);
      }
      if (response.success) {
        // Normalize product data for consistent UI
        const normalized = (response.data || []).map((p: any) => ({
          ...p,
          modelUrl: p?.ARModelUrl,
          // Use the first category's name as the main category for display
          category: p?.categories?.[0]?.name,
          // Keep the full categories array
          categories: p?.categories || [],
          rating: p?.rating ?? p?.averageRating ?? p?.averagerating ?? 0,
          inStock: p?.inStock ?? ((p?.stock ?? p?.quantity ?? 0) > 0),
        }));
        
        // Debug: log the first few normalized products
        try {
          const preview = normalized.slice(0, 5).map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            categories: p.categories,
            rating: p.rating,
            modelUrl: p.modelUrl,
            inStock: p.inStock
          }));
          // logger.log('[Products][Fetch] normalized products preview:', preview);
        } catch (e) {
          // logger.log('[Products][Fetch] error logging normalized products:', e);
        }
        
        dispatch(setProducts(normalized));
      } else {
        setError('Failed to load products');
        logger.error('Failed to load products:', response.error);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      logger.error('Error fetching products:', err);
    } finally {
      // Always set loading to false, regardless of whether it was a refresh or not
      setIsLoadingProducts(false);
    }
  };

  // Products already in Redux (from an earlier visit) are shown straight away
  // while fresh data loads; the full-screen loader is only for an empty store.
  const hasProducts = products.length > 0;

  if (isLoading || (isLoadingProducts && !hasProducts)) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  
  // A failed background refresh keeps showing the products we already have.
  if (error && !hasProducts) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => fetchProducts()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  const renderHeader = () => (
    <>
      <HeroBanner />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12}]}>Categories</Text>
        {isLoadingCategories ? (
          <View style={styles.centered}>
            <Text style={{ color: theme.colors.text }}>Loading categories...</Text>
          </View>
        ) : categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {typedCategories.map((category) => (
              <CategoryCard
                key={category.id}
                categoryId={category.id}
                category={category.name}
                image={category.image}
              />
            ))}
            <View style={styles.endPadding} />
          </ScrollView>
        ) : (
          <View style={styles.centered}>
            <Text style={{ color: theme.colors.text }}>No categories available</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Featured Products</Text>
          <TouchableOpacity onPress={() => router.push('/search')}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        {featuredProducts.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.productsContent}
          >
            {featuredProducts.map((product: any) => (
              <ProductCard key={product._id || product.id} product={product} />
            ))}
            <View style={styles.endPadding} />
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No products available</Text>
          </View>
        )}
      </View>

      {!['seller', 'admin'].includes(user?.role?.toLowerCase()) && (
        <View style={[styles.section, { paddingHorizontal: 20, marginBottom: 30 }]}> 
          <LinearGradient
            colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealsBanner}
          >
            <View style={styles.dealsContent}>
              <Text style={styles.dealsBannerTitle}>Become a Seller</Text>
              <Text style={styles.dealsBannerSubtitle}>
                List your products and earn money with our platform
              </Text>
              <TouchableOpacity style={styles.dealsButton} onPress={() => router.push('/seller-application')}>
                <Text style={styles.dealsButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 16 }]}>All Products</Text>
      </View>
    </>
  );

  const renderProductItem = ({ item }: { item: any }) => (
    <View style={styles.productCardWrapper}>
      <ProductCard product={item} showAddToCart style={styles.productCard} width={cardWidth} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={products}
        keyExtractor={(item: any) => String(item._id || item.id)}
        // FlatList can't change numColumns on the fly; a new key remounts it
        key={`grid-${gridColumns}`}
        numColumns={gridColumns}
        renderItem={renderProductItem}
        columnWrapperStyle={[styles.productsRow, { paddingHorizontal: GRID_PADDING, gap: GRID_GAP }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>No products available</Text>
          </View>
        }
        contentContainerStyle={styles.productsListContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    paddingBottom: 20,
  },
  productsListContainer: {
    paddingBottom: 20,
  },
  productsRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  productCardWrapper: {
    paddingBottom: 12,
  },
  productCard: {
    margin: 0,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoriesContent: {
    paddingHorizontal: 1,
  },
  productsContent: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    gap: 6,
    flexDirection: 'row',
  },
  endPadding: {
    width: 20,
  },
  dealsBanner: {
    height: 200,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dealsContent: {
    alignItems: 'center',
    textAlign: 'center',
  },
  dealsBannerTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  dealsBannerSubtitle: {
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 22,
  },
  dealsButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dealsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    color: '#000',
  },
});