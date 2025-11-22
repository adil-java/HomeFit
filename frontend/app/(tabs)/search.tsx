import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Animated,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setSearchQuery, setSelectedCategory, setSelectedTags } from '@/store/slices/productsSlice';
import { ProductCard } from '@/components/ProductCard';
import { useFocusEffect } from '@react-navigation/native';

export default function SearchScreen() {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { products, categories, searchQuery, selectedCategory, selectedTags } = useSelector(
    (state: RootState) => state.products
  );

  const [showFilters, setShowFilters] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [isFocused, setIsFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(fadeAnim, {
      toValue: 0.9,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset all filters including category
    setLocalSearchQuery('');
    dispatch(setSearchQuery(''));
    dispatch(setSelectedCategory(''));
    dispatch(setSelectedTags([]));
    setRefreshing(false);
  }, [dispatch]);

  // Reset search state when tab is focused, but keep the selected category
  useFocusEffect(
    React.useCallback(() => {
      // Only clear search query and tags, but keep the selected category
      setLocalSearchQuery('');
      dispatch(setSearchQuery(''));
      dispatch(setSelectedTags([]));
      return () => {};
    }, [dispatch])
  );

  // Filter products based on search query, category, and tags
  const filteredProducts = products.filter((product) => {
    const matchesSearch = localSearchQuery === '' ||
                         product.name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(localSearchQuery.toLowerCase());
    
    // Check if product matches selected category (either through direct category or categories array)
    const matchesCategory = !selectedCategory || 
                          product.category === selectedCategory || 
                          (product.categories && product.categories.some(cat => cat.id === selectedCategory));
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => product.tags?.includes(tag));
    
    return matchesSearch && matchesCategory && matchesTags;
  });

  const allTags = [...new Set(products.flatMap(product => product.tags))];

  const handleCategoryPress = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? '' : categoryId;
    dispatch(setSelectedCategory(newCategory));
  };

  const handleTagPress = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    dispatch(setSelectedTags(newTags));
  };

  const clearFilters = () => {
    dispatch(setSelectedCategory(''));
    dispatch(setSelectedTags([]));
    setLocalSearchQuery('');
    dispatch(setSearchQuery(''));
  };

  const handleSearch = (text: string) => {
    setLocalSearchQuery(text);
    dispatch(setSearchQuery(text));
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Enhanced Search Bar */}
          <Animated.View 
            style={[
              styles.searchContainer, 
              { 
                backgroundColor: theme.colors.surface,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isFocused ? 0.2 : 0.1,
                shadowRadius: isFocused ? 8 : 4,
                elevation: isFocused ? 6 : 2,
                transform: [{ scale: fadeAnim }]
              }
            ]}
          >
            <View style={styles.searchIconContainer}>
              <Search 
                size={20} 
                color={isFocused ? theme.colors.primary : theme.colors.textSecondary} 
              />
            </View>
            <TextInput
              style={[
                styles.searchInput, 
                { 
                  color: theme.colors.text,
                  paddingLeft: 12,
                  fontSize: 16,
                }
              ]}
              placeholder="Search products..."
              placeholderTextColor={theme.colors.textSecondary}
              value={localSearchQuery}
              onChangeText={handleSearch}
              onSubmitEditing={() => dispatch(setSearchQuery(localSearchQuery))}
              onFocus={handleFocus}
              onBlur={handleBlur}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {localSearchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  setLocalSearchQuery('');
                  dispatch(setSearchQuery(''));
                  Keyboard.dismiss();
                }}
              >
                <X 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.filterButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          {/* Filters */}
          {showFilters && (
            <View style={[styles.filtersContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.filtersHeader}>
                <Text style={[styles.filtersTitle, { color: theme.colors.text }]}>Filters</Text>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={[styles.clearFiltersText, { color: theme.colors.primary }]}>Clear All</Text>
                </TouchableOpacity>
              </View>

              {/* Categories */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Categories</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: selectedCategory === category.id ? theme.colors.primary : theme.colors.background,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => handleCategoryPress(category.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: selectedCategory === category.id ? '#fff' : theme.colors.text,
                          },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              
            </View>
          )}

          {/* Results */}
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultsText, { color: theme.colors.textSecondary }]}>
              {filteredProducts.length} products found
            </Text>
            
            <FlatList
              data={filteredProducts}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
              renderItem={({ item }) => (
                <View style={styles.productCardWrapper}>
                  <ProductCard 
                    product={item} 
                    showAddToCart 
                    style={styles.productCard}
                  />
                </View>
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productsContainer}
            />
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter-Regular',
  },
  clearButton: {
    padding: 8,
    marginRight: -8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filtersContainer: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsText: {
    fontSize: 14,
    marginBottom: 16,
  },
  productsContainer: {
    paddingBottom: 20,
    paddingHorizontal: 2,
    marginLeft: -4,
  },
  productCardWrapper: {
    width: '50%',
    padding: 2,
  },
  productCard: {
    margin: 0,
    width: '100%',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 4,
  },
});