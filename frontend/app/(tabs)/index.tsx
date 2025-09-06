import React, { useEffect } from 'react';
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
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { ProductCard } from '@/components/ProductCard';
import { CategoryCard } from '@/components/CategoryCard';
import { HeroBanner } from '@/components/HeroBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import logo from '@/assets/images/logo.png';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();
  const { featuredProducts, categories } = useSelector((state: RootState) => state.products);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image 
              source={logo} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={[styles.buyText, { color: theme.colors.primary, fontSize: 24, fontWeight: '800', letterSpacing: 1, marginLeft: 8 }]}>
              HomeFit
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.searchButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => router.push('/search')}
          >
            <Bell size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero Banner */}
        <HeroBanner />

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 12}]}>
            Categories
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category, index) => (
              <CategoryCard key={index} category={category} />
            ))}
            <View style={styles.endPadding} />
          </ScrollView>
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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            contentContainerStyle={styles.productsContent}
          >
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            <View style={styles.endPadding} />
          </ScrollView>
        </View>

        {/* Deals Section */}
        <View style={styles.section}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dealsBanner}
          >
            <Text style={styles.dealsBannerTitle}>Flash Sale</Text>
            <Text style={styles.dealsBannerSubtitle}>Up to 50% off on selected items</Text>
            <TouchableOpacity
              style={styles.dealsButton}
              onPress={() => router.push('/search')}
            >
              <Text style={styles.dealsButtonText}>Shop Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Admin Quick Access */}
        {user.role === 'admin' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.adminButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => router.push('/admin')}
            >
              <Text style={[styles.adminButtonText, { color: theme.colors.primary }]}>
                Admin Panel
              </Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  buyText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  afterPreviewText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  adminButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});