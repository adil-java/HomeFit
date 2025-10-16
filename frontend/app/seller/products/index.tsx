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
  Alert,
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

// Mock data - replace with actual API calls
const mockProducts = [
  {
    id: '1',
    name: 'Wireless Headphones',
    category: 'Electronics',
    price: 99.99,
    stock: 45,
    sku: 'WH-001',
    status: 'published',
    image: 'https://via.placeholder.com/80',
  },
  // Add more mock products...
];

export default function ProductsScreen() {
  const { theme } = useTheme();
  const [products, setProducts] = useState(mockProducts);
  const [filteredProducts, setFilteredProducts] = useState(mockProducts);
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

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In a real app, you would make an API call here
            setProducts(products.filter(p => p.id !== id));
          },
        },
      ]
    );
  };

  const renderProductItem = ({ item }) => (
    <View style={[styles.productCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.productImageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
      </View>
      <View style={styles.productInfo}>
        <View>
          <Text style={[styles.productName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.productSku, { color: theme.colors.textSecondary }]}>SKU: {item.sku}</Text>
          <View style={styles.productMeta}>
            <Text style={[styles.productCategory, { backgroundColor: `${theme.colors.primary}10` }]}>
              {item.category}
            </Text>
            <View style={[styles.statusBadge, { 
              backgroundColor: item.status === 'published' ? '#10B98120' : 
                              item.status === 'draft' ? '#F59E0B20' : '#EF444420',
              borderColor: item.status === 'published' ? '#10B981' : 
                          item.status === 'draft' ? '#F59E0B' : '#EF4444',
            }]}>
              <Text style={[styles.statusText, {
                color: item.status === 'published' ? '#10B981' : 
                       item.status === 'draft' ? '#F59E0B' : '#EF4444',
              }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.productFooter}>
          <Text style={[styles.productPrice, { color: theme.colors.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
          <Text style={[styles.productStock, { 
            color: item.stock > 10 ? '#10B981' : item.stock > 0 ? '#F59E0B' : '#EF4444' 
          }]}>
            {item.stock} in stock
          </Text>
        </View>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}10` }]}
          onPress={() => router.push(`/seller/products/${item.id}`)}
        >
          <Eye size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}10` }]}
          onPress={() => navigateToEditProduct(item.id)}
        >
          <Edit size={18} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#EF444410' }]}
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Products
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.card, marginRight: 8 }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} color={theme.colors.text} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
              {showFilters ? 'Hide Filters' : 'Filter'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={navigateToAddProduct}
          >
            <Plus size={18} color="white" />
            <Text style={[styles.actionButtonText, { color: 'white' }]}>
              Add Product
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search products..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: showFilters ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Sliders size={18} color={showFilters ? '#fff' : theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Category</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity 
              style={[styles.filterOption, !filters.category && { backgroundColor: theme.colors.primary }]}
              onPress={() => setFilters({...filters, category: ''})}
            >
              <Text style={[styles.filterOptionText, !filters.category && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity 
                key={category}
                style={[
                  styles.filterOption, 
                  filters.category === category && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => setFilters({...filters, category})}
              >
                <Text style={[styles.filterOptionText, filters.category === category && { color: '#fff' }]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Status</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity 
              style={[styles.filterOption, !filters.status && { backgroundColor: theme.colors.primary }]}
              onPress={() => setFilters({...filters, status: ''})}
            >
              <Text style={[styles.filterOptionText, !filters.status && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {statuses.map(status => (
              <TouchableOpacity 
                key={status}
                style={[
                  styles.filterOption, 
                  filters.status === status && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => setFilters({...filters, status})}
              >
                <Text style={[styles.filterOptionText, filters.status === status && { color: '#fff' }]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Price Range</Text>
          <View style={styles.priceRangeContainer}>
            <View style={[styles.priceInputContainer, { borderColor: theme.colors.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
              <TextInput
                style={[styles.priceInput, { color: theme.colors.text }]}
                placeholder="Min"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                value={filters.minPrice}
                onChangeText={text => setFilters({...filters, minPrice: text})}
              />
            </View>
            <Text style={[styles.priceRangeSeparator, { color: theme.colors.textSecondary }]}>to</Text>
            <View style={[styles.priceInputContainer, { borderColor: theme.colors.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>$</Text>
              <TextInput
                style={[styles.priceInput, { color: theme.colors.text }]}
                placeholder="Max"
                placeholderTextColor={theme.colors.textSecondary}
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
                borderColor: theme.colors.border,
              }
            ]}>
              {filters.inStock && <CheckSquare size={14} color="#fff" />}
            </View>
            <Text style={[styles.stockFilterText, { color: theme.colors.text }]}>
              In Stock Only
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity 
            style={[styles.filterButton, { borderColor: theme.colors.border }]}
            onPress={() => setFilters({
              category: '',
              status: '',
              minPrice: '',
              maxPrice: '',
              inStock: false,
            })}
          >
            <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>Reset Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, { backgroundColor: theme.colors.primary }]}
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
        contentContainerStyle={styles.productsList}
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
            <Package size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
              No products found
            </Text>
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />

      {/* Pagination */}
      <View style={[styles.pagination, { borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.paginationButton} disabled={true}>
          <ChevronLeft size={18} color={theme.colors.textSecondary} />
          <Text style={[styles.paginationText, { color: theme.colors.textSecondary }]}>Previous</Text>
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
                { color: theme.colors.text }
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:50
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
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
    borderColor: 'rgba(0,0,0,0.1)',
    margin: 4,
  },
  filterOptionText: {
    fontSize: 12,
    fontWeight: '500',
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
  filterButton: {
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
    backgroundColor: '#f5f5f5',
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
    marginBottom: 8,
  },
  productCategory: {
    fontSize: 10,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 6,
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
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  productStock: {
    fontSize: 12,
    fontWeight: '600',
  },
  productActions: {
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  },
});
