import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  Sliders,
  X,
  Package,
  Tag,
  CheckSquare,
  XCircle,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react-native';
import { BackHandler } from 'react-native';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';

import { apiService } from '@/services/api';
import { useAuth, User } from '@/contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  categories: any[];
  price: number;
  quantity: number;
  sku: string;
  description: string;
  images: string[];
  averageRating: number;
  ARModelUrl: string | null;
  objModelUrl: string | null;
  barcode: string;
  comparePrice: number;
  cost: number;
  isActive: boolean;
  isFeatured: boolean;
  slug: string;
  sellerId: string;
  variants: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ProductsScreen() {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const horizontalPadding = compact ? 12 : 16;
  const { user } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    inStock: false,
  });

    // Handle hardware back button press
    useEffect(() => {
      const backAction = () => {
        router.replace('/(tabs)');
        return true;
      };
    
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );
    
      return () => backHandler.remove();
    }, []);
  
  const fetchProducts = async () => {
    if (!user?.uid) {
      // console.log('No user UID found', user);
      return;
    }
    
    try {
      // console.log('Fetching products for user:', user.uid);
      setLoading(true);
      const result = await apiService.getSellerProducts(user.uid);
      // console.log('API Response:', result);
      
      if (result && result.success && Array.isArray(result.data)) {
        // console.log(`Found ${result.data.length} products`);
        setProducts(result.data);
        setFilteredProducts(result.data);
      } else {
        // console.log('No products found or invalid response format');
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Failed to fetch products:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      Alert.alert('Error', errorMessage);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    // await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const navigateToAddProduct = () => {
    router.push('/seller/products/new');
  };
  
  const navigateToEditProduct = (productId: string) => {
    router.push(`/seller/products/${productId}`);
  };

  const categories = [...new Set(products.map(p => p.category))];
  const statuses = ['published', 'draft', 'archived'];

  useEffect(() => {
    filterProducts();
  }, [searchQuery, filters, products]);

  const filterProducts = () => {
    let result = [...products];
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(query) || 
             p.sku.toLowerCase().includes(query) ||
             p.category.toLowerCase().includes(query)
      );
    }
    
    // Apply filters
    if (filters.category) {
      result = result.filter(p => p.category === filters.category);
    }
    
    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }
    
    if (filters.minPrice) {
      result = result.filter(p => p.price >= Number(filters.minPrice));
    }
    
    if (filters.maxPrice) {
      result = result.filter(p => p.price <= Number(filters.maxPrice));
    }
    
    if (filters.inStock) {
      result = result.filter(p => p.stock > 0);
    }
    
    setFilteredProducts(result);
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await apiService.deleteProduct(productToDelete);
      if (result.success) {
        // Update local state to remove the deleted product
        setProducts(products.filter(p => p.id !== productToDelete));
        setFilteredProducts(filteredProducts.filter(p => p.id !== productToDelete));
        // Show success message
        setDeleteModalVisible(false);
        // You can add a toast or other success feedback here
      } else {
        console.error('Delete failed:', result.error);
      }
    } catch (error) {
      console.error('Delete product error:', error);
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setProductToDelete(null);
  };

  const renderProductItem = ({ item }) => (
    <View key={item.id} style={[styles.productCard, { 
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.surface,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border,
      padding: compact ? 10 : 12,
    }]}>
      <View style={[
        styles.productImageContainer,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5' }
      ]}>
        {item.images && item.images.length > 0 && (
          <Image 
            source={{ uri: item.images[0] }} 
            style={styles.productImage} 
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.productInfo}>
        <View>
          <Text style={[styles.productName, compact && styles.productNameCompact, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.productSku, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : theme.colors.textSecondary }]}>
            SKU: {item.sku}
          </Text>
          
          <View style={[styles.productMeta, compact && styles.productMetaCompact]}>
            {item.categories && item.categories.length > 0 && (
              <Text style={[styles.productCategory, { 
                backgroundColor: `${theme.colors.primary}${isDark ? '25' : '10'}`,
                color: isDark ? '#FFFFFF' : theme.colors.text 
              }]}>
                {item.categories[0].name || 'Uncategorized'}
              </Text>
            )}
            
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingText, { color: isDark ? '#FBBF24' : '#F59E0B' }]}>
                ★ {item.averageRating?.toFixed(1) || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.productFooter}>
          <Text style={[styles.productPrice, { color: theme.colors.primary }]}>
            Rs. {item.price.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.productStock, { 
            color: item.quantity > 10 ? '#10B981' : item.quantity > 0 ? '#F59E0B' : '#EF4444' 
          }]}>
            {item.quantity} in stock
          </Text>
        </View>
      </View>
      <View style={styles.productActions}>
        {/* <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: `${theme.colors.primary}${isDark ? '20' : '10'}` }]}
          onPress={() => router.push(`/seller/products/${item.id}`)}
        >
          <Eye size={18} color={theme.colors.primary} />
        </TouchableOpacity> */}
        <TouchableOpacity 
          style={[styles.iconButton, compact && styles.iconButtonCompact, { backgroundColor: `${theme.colors.primary}${isDark ? '20' : '10'}` }]}
          onPress={() => navigateToEditProduct(item.id)}
        >
          <Edit size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.iconButton, compact && styles.iconButtonCompact, { backgroundColor: isDark ? '#EF444420' : '#EF444410' }]}
          onPress={() => handleDelete(item.id)}
        >
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border, paddingHorizontal: horizontalPadding, paddingVertical: compact ? 12 : 16 }]}> 
        <View style={styles.headerLeft}>
          <HeaderBackButton
            onPress={() => router.replace('/(tabs)')}
            size={20}
            style={styles.backButtonInline}
          />
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : theme.colors.text }]}> 
            Products
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.addButton, compact && styles.addButtonCompact, { backgroundColor: theme.colors.primary }]}
            onPress={navigateToAddProduct}
          >
            <Plus size={18} color="white" />
            <Text style={[styles.addButtonText, compact && styles.addButtonTextCompact]}>
              Add Product
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={[styles.searchContainer, { paddingHorizontal: horizontalPadding }]}> 
        <View style={[styles.searchBar, { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.surface, 
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border 
        }]}>
          <Search size={18} color={isDark ? 'rgba(255, 255, 255, 0.5)' : theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#FFFFFF' : theme.colors.text }]}
            placeholder="Search products..."
            placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={isDark ? 'rgba(255, 255, 255, 0.5)' : theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { 
            backgroundColor: showFilters ? theme.colors.primary : (isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.surface), 
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border 
          }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Sliders size={18} color={showFilters ? '#fff' : theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.surface, 
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border,
          paddingHorizontal: horizontalPadding,
        }]}>
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>Category</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity 
              style={[
                styles.filterOption,
                { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border },
                !filters.category && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}
              onPress={() => setFilters({...filters, category: ''})}
            >
              <Text style={[styles.filterOptionText, { color: isDark ? '#FFFFFF' : theme.colors.text }, !filters.category && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity 
                key={category}
                style={[
                  styles.filterOption,
                  { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border },
                  filters.category === category && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => setFilters({...filters, category})}
              >
                <Text style={[styles.filterOptionText, { color: isDark ? '#FFFFFF' : theme.colors.text }, filters.category === category && { color: '#fff' }]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>Status</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity 
              style={[
                styles.filterOption,
                { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border },
                !filters.status && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
              ]}
              onPress={() => setFilters({...filters, status: ''})}
            >
              <Text style={[styles.filterOptionText, { color: isDark ? '#FFFFFF' : theme.colors.text }, !filters.status && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {statuses.map(status => (
              <TouchableOpacity 
                key={status}
                style={[
                  styles.filterOption,
                  { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border },
                  filters.status === status && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
                onPress={() => setFilters({...filters, status})}
              >
                <Text style={[styles.filterOptionText, { color: isDark ? '#FFFFFF' : theme.colors.text }, filters.status === status && { color: '#fff' }]}> 
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>Price Range</Text>
          <View style={styles.priceRangeContainer}>
            <View style={[styles.priceInputContainer, { 
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
            }]}>
              <Text style={[styles.currencySymbol, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>$</Text>
              <TextInput
                style={[styles.priceInput, { color: isDark ? '#FFFFFF' : theme.colors.text }]}
                placeholder="Min"
                placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : theme.colors.textSecondary}
                keyboardType="numeric"
                value={filters.minPrice}
                onChangeText={text => setFilters({...filters, minPrice: text})}
              />
            </View>
            <Text style={[styles.priceRangeSeparator, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : theme.colors.textSecondary }]}>to</Text>
            <View style={[styles.priceInputContainer, { 
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
            }]}>
              <Text style={[styles.currencySymbol, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>$</Text>
              <TextInput
                style={[styles.priceInput, { color: isDark ? '#FFFFFF' : theme.colors.text }]}
                placeholder="Max"
                placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : theme.colors.textSecondary}
                keyboardType="numeric"
                value={filters.maxPrice}
                onChangeText={text => setFilters({...filters, maxPrice: text})}
              />
            </View>
          </View>
        </View>

        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.stockFilter}
            onPress={() => setFilters({...filters, inStock: !filters.inStock})}
          >
            <View style={[
              styles.checkbox, 
              { 
                backgroundColor: filters.inStock ? theme.colors.primary : 'transparent',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border,
              }
            ]}>
              {filters.inStock && <CheckSquare size={14} color="#fff" />}
            </View>
            <Text style={[styles.stockFilterText, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>
              In Stock Only
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity 
            style={[styles.filterActionButton, { 
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
            }]}
            onPress={() => setFilters({
              category: '',
              status: '',
              minPrice: '',
              maxPrice: '',
              inStock: false,
            })}
          >
            <Text style={[styles.filterButtonText, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>Reset Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterActionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowFilters(false)}
          >
            <Text style={[styles.filterButtonText, { color: '#fff' }]}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.productsList, { paddingHorizontal: horizontalPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color={isDark ? 'rgba(255, 255, 255, 0.3)' : theme.colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: isDark ? '#FFFFFF' : theme.colors.text }]}>
              No products found
            </Text>
            <Text style={[styles.emptyStateText, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : theme.colors.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />

      {/* Pagination */}
      <View style={[styles.pagination, { 
        borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
        paddingHorizontal: horizontalPadding,
      }]}>
        <TouchableOpacity style={styles.paginationButton} disabled={true}>
          <ChevronLeft size={18} color={isDark ? 'rgba(255, 255, 255, 0.3)' : theme.colors.textSecondary} />
          <Text style={[styles.paginationText, { color: isDark ? 'rgba(255, 255, 255, 0.3)' : theme.colors.textSecondary }]}>Previous</Text>
        </TouchableOpacity>
        <View style={styles.pageNumbers}>
          {[1, 2, 3, 4, 5].map(page => (
            <TouchableOpacity 
              key={page}
              style={[
                styles.pageNumber, 
                page === 1 && { backgroundColor: theme.colors.primary }
              ]}
            >
              <Text style={[
                styles.pageNumberText, 
                page === 1 && { color: '#fff' },
                { color: isDark ? '#FFFFFF' : theme.colors.text }
              ]}>
                {page}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={[styles.paginationButton, { opacity: 1 }]}>
          <Text style={[styles.paginationText, { color: theme.colors.primary }]}>Next</Text>
          <ChevronRightIcon size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={cancelDelete}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={cancelDelete}
        >
          <Pressable style={[styles.modalContent, { 
            backgroundColor: isDark ? theme.colors.surface : '#fff',
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'
          }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#1a1a1a' }]}>
              Delete Product
            </Text>
            <Text style={[styles.modalMessage, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#666' }]}>
              Are you sure you want to delete this product? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton, { borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#e0e0e0' }]}
                onPress={cancelDelete}
                disabled={isDeleting}
              >
                <Text style={[styles.buttonText, { color: isDark ? '#fff' : '#1a1a1a' }]}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.deleteButton, { opacity: isDeleting ? 0.7 : 1 }]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  container: {
    flex: 1,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  addButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  addButtonCompact: {
    paddingHorizontal: 12,
    height: 36,
  },
  addButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  addButtonTextCompact: {
    fontSize: 12,
    marginLeft: 4,
  },
  backButtonInline: {
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 0,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersPanel: {
    padding: 16,
    borderBottomWidth: 1,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  filterOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    margin: 4,
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  currencySymbol: {
    marginRight: 4,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  priceInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  priceRangeSeparator: {
    marginHorizontal: 8,
    fontSize: 14,
  },
  stockFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stockFilterText: {
    fontSize: 14,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  filterActionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  productNameCompact: {
    fontSize: 13,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  productSku: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 6,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    justifyContent: 'space-between',
  },
  productMetaCompact: {
    flexWrap: 'wrap',
    rowGap: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 2,
  },
  productCategory: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  productStock: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  productActions: {
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconButtonCompact: {
    width: 28,
    height: 28,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    marginHorizontal: 4,
  },
  pageNumbers: {
    flexDirection: 'row',
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
});