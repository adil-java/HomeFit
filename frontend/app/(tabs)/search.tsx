import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { setSearchQuery, setSelectedCategory, setSelectedTags } from '@/store/slices/productsSlice';
import { ProductCard } from '@/components/ProductCard';

export default function SearchScreen() {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { products, categories, searchQuery, selectedCategory, selectedTags } = useSelector(
    (state: RootState) => state.products
  );
  
  const [showFilters, setShowFilters] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Filter products based on search query, category, and tags
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(localSearchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => product.tags.includes(tag));
    
    return matchesSearch && matchesCategory && matchesTags;
  });

  const allTags = [...new Set(products.flatMap(product => product.tags))];

  const handleCategoryPress = (category: string) => {
    dispatch(setSelectedCategory(selectedCategory === category ? '' : category));
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Search Products</Text>
        
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search for products..."
            placeholderTextColor={theme.colors.textSecondary}
            value={localSearchQuery}
            onChangeText={handleSearch}
          />
          {localSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle */}
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={theme.colors.text} />
          <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>Filters</Text>
          {(selectedCategory || selectedTags.length > 0) && (
            <View style={[styles.filterBadge, { backgroundColor: theme.colors.accent }]} />
          )}
        </TouchableOpacity>
      </View>

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
                  key={category}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedCategory === category ? theme.colors.primary : theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => handleCategoryPress(category)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: selectedCategory === category ? '#fff' : theme.colors.text,
                      },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tags */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>Tags</Text>
            <View style={styles.tagsContainer}>
              {allTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedTags.includes(tag) ? theme.colors.accent : theme.colors.background,
                      borderColor: theme.colors.border,
                      marginBottom: 8,
                    },
                  ]}
                  onPress={() => handleTagPress(tag)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: selectedTags.includes(tag) ? '#fff' : theme.colors.text,
                      },
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
          renderItem={({ item }) => <ProductCard product={item} showAddToCart />}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.productsContainer}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
  },
  row: {
    justifyContent: 'space-between',
  },
});