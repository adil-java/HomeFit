import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { ProductCard } from '@/components/ProductCard';
import { CategoryCard } from '@/components/CategoryCard';
import { apiService } from '@/services/api';
import { setProducts, setCategories, Category } from '@/store/slices/productsSlice';
import { Product } from '@/types';
import { HeroBanner } from '@/components/HeroBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { products, categories } = useSelector((state: RootState) => state.products);
  const typedCategories = categories as Category[];
  
  // Get featured products (first 4 products)
  const featuredProducts = products.slice(0, 4);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    } else if (user) {
      fetchProducts();
      fetchCategories();
    }
  }, [user, isLoading]);
  
  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const categories = await apiService.getCategories();
      // Update Redux state with full category objects
      dispatch(setCategories(categories));
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Handle error (you might want to show a user-friendly message)
    } finally {
      setIsLoadingCategories(false);
    }
  };
  
  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      setError(null);
      const response = await apiService.getProducts();
      if (response.success) {
        dispatch(setProducts(response.data));
      } else {
        setError('Failed to load products');
        console.error('Failed to load products:', response.error);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  if (isLoading || isLoadingProducts) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading...
        </Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={fetchProducts}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <HeroBanner />

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12}]}>
            Categories
          </Text>
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

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Featured Products
            </Text>
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          {featuredProducts.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.horizontalScroll}
              contentContainerStyle={styles.productsContent}
            >
              {featuredProducts.map((product: Product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))}
              <View style={styles.endPadding} />
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                No products available
              </Text>
            </View>
          )}
        </View>

        {/* Deals Section */}
        {!['seller', 'admin'].includes(user?.role?.toLowerCase()) && (
        <View style={styles.section}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealsBanner}
          >
            <Text style={styles.dealsBannerTitle}>Become a Seller</Text>
            <Text style={styles.dealsBannerSubtitle}>List your products and earn money</Text>
            <TouchableOpacity
              style={styles.dealsButton}
              onPress={() => router.push('/seller-application')}
            >
              <Text style={styles.dealsButtonText}>Apply Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoriesContent: {
    paddingHorizontal: 1,
  },
  productsContent: {
    paddingHorizontal: 1,
  },
  endPadding: {
    width: 20,
  },
  dealsBanner: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  dealsBannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  dealsBannerSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  dealsButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
  },
  dealsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});