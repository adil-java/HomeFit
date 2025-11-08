import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Image as ImageIcon,
  Package,
  Tag,
  DollarSign,
  Hash,
  List,
  CheckSquare,
  XCircle,
  AlertCircle,
  Plus
} from 'lucide-react-native';

// Mock API function - replace with actual API calls
const saveProduct = async (productData: any, isUpdate = false) => {
  console.log('Saving product:', productData);
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: isUpdate ? 'Product updated successfully' : 'Product created successfully',
        data: { ...productData, id: isUpdate ? productData.id : Math.random().toString() }
      });
    }, 1000);
  });
};
// No edit data fetching needed on the create screen

export default function ProductForm() {
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    sku: '',
    status: 'draft',
    image: '',
    sizes: [] as string[],
    colors: [] as string[],
  });

  const sizeOptions = ['Twin', 'Full', 'Queen', 'King', 'Small', 'Medium', 'Large'];
  const colorOptions = [
    { name: 'Black', value: '#111827' },
    { name: 'White', value: '#F9FAFB' },
    { name: 'Gray', value: '#6B7280' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Brown', value: '#8B5E3C' },
    { name: 'Beige', value: '#D1BFA3' },
    { name: 'Walnut', value: '#773F1A' },
  ];
  const categoryOptions = ['Beds', 'Sofas', 'Dining', 'Chairs', 'Tables'];

  const [showSizes, setShowSizes] = useState(false);
  const [showColors, setShowColors] = useState(true);
  const [showCategory, setShowCategory] = useState(false);

  // No edit-mode effects or data loading for create screen

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const toggleColor = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const selectCategory = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    setShowCategory(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price) newErrors.price = 'Price is required';
    if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) 
      newErrors.price = 'Please enter a valid price';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.stock) newErrors.stock = 'Stock is required';
    if (isNaN(Number(formData.stock)) || !Number.isInteger(Number(formData.stock)) || Number(formData.stock) < 0)
      newErrors.stock = 'Please enter a valid stock number';
    if (!formData.sku) newErrors.sku = 'SKU is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      const result = await saveProduct({
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
      }, false);
      
      if (result.success) {
        Alert.alert('Success', result.message, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // No loading state on create screen

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Create Product
        </Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={saving}
          style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Plus size={20} color={theme.colors.primary} />
          )}
          <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
            {saving ? 'Saving...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Image */}
        <View style={styles.imageSection}>
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.surface }]}>
            {formData.image ? (
              <Image 
                source={{ uri: formData.image }} 
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <ImageIcon size={40} color={theme.colors.text} />
            )}
          </View>
          <TouchableOpacity 
            style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {/* Implement image upload */}}
          >
            <Text style={styles.uploadButtonText}>Upload Image</Text>
          </TouchableOpacity>
        </View>

        {/* Product Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Product Information
          </Text>
          
          {/* Name */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <Package size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Product Name
              </Text>
            </View>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: errors.name ? theme.colors.error : theme.colors.border
                }
              ]}
              placeholder="Enter product name"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
            />
            {errors.name && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.name}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <List size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Description
              </Text>
            </View>
            <TextInput
              style={[
                styles.textArea, 
                { 
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }
              ]}
              placeholder="Enter product description"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <DollarSign size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Price
              </Text>
            </View>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: errors.price ? theme.colors.error : theme.colors.border
                }
              ]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.price}
              onChangeText={(text) => handleChange('price', text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
            />
            {errors.price && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.price}
                </Text>
              </View>
            )}
          </View>

          {/* Sizes */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <Tag size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Sizes</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowSizes(!showSizes)}
              style={[styles.selectContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.selectInput, { color: theme.colors.text }]}>
                {formData.sizes.length ? formData.sizes.join(', ') : 'Select sizes'}
              </Text>
            </TouchableOpacity>
            {showSizes && (
              <View style={[styles.dropdownPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                <View style={styles.chipsWrap}>
                  {sizeOptions.map(sz => (
                    <TouchableOpacity
                      key={sz}
                      onPress={() => toggleSize(sz)}
                      style={[styles.chip, formData.sizes.includes(sz) && { backgroundColor: theme.colors.primary }]}
                    >
                      <Text style={[styles.chipText, { color: formData.sizes.includes(sz) ? '#fff' : theme.colors.text }]}>{sz}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
          

          {/* Colors */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <Tag size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Colors</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowColors(!showColors)}
              style={[styles.selectContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {formData.colors.length ? (
                  <>
                    {formData.colors.slice(0, 3).map(c => (
                      <View key={c} style={[styles.colorDot, { backgroundColor: c }]} />
                    ))}
                    {formData.colors.length > 3 && (
                      <Text style={{ color: theme.colors.text }}>+{formData.colors.length - 3}</Text>
                    )}
                  </>
                ) : null}
                <Text style={[styles.selectInput, { color: theme.colors.text }]}> 
                  {formData.colors.length ? 'Selected colors' : 'Select colors'}
                </Text>
              </View>
            </TouchableOpacity>
            {showColors && (
              <View style={[styles.dropdownPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                <View style={styles.colorsWrap}>
                  {colorOptions.map(c => (
                    <TouchableOpacity key={c.value} style={[styles.colorItem, formData.colors.includes(c.value) && { borderColor: theme.colors.primary }]} onPress={() => toggleColor(c.value)}>
                      <View style={[styles.colorSwatch, { backgroundColor: c.value, borderColor: formData.colors.includes(c.value) ? theme.colors.primary : 'rgba(0,0,0,0.1)' }]} />
                      <Text style={[styles.colorName, { color: theme.colors.text }]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>


          {/* Category */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <Tag size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Category
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowCategory(!showCategory)}
              style={[styles.selectContainer, { backgroundColor: theme.colors.surface, borderColor: errors.category ? theme.colors.error : theme.colors.border }]}
            >
              <Text style={[styles.selectInput, { color: theme.colors.text }]}>
                {formData.category ? formData.category : 'Select category'}
              </Text>
            </TouchableOpacity>
            {showCategory && (
              <View style={[styles.dropdownPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                {categoryOptions.map(opt => (
                  <TouchableOpacity key={opt} style={styles.optionItem} onPress={() => selectCategory(opt)}>
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.category && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}> 
                  {errors.category}
                </Text>
              </View>
            )}
          </View>

          {/* Stock */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <Hash size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Stock Quantity
              </Text>
            </View>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: errors.stock ? theme.colors.error : theme.colors.border
                }
              ]}
              placeholder="0"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.stock}
              onChangeText={(text) => handleChange('stock', text.replace(/\D/g, ''))}
              keyboardType="numeric"
            />
            {errors.stock && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.stock}
                </Text>
              </View>
            )}
          </View>

          {/* SKU */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <Tag size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                SKU (Stock Keeping Unit)
              </Text>
            </View>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: errors.sku ? theme.colors.error : theme.colors.border
                }
              ]}
              placeholder="SKU-12345"
              placeholderTextColor={theme.colors.text + '80'}
              value={formData.sku}
              onChangeText={(text) => handleChange('sku', text)}
            />
            {errors.sku && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.sku}
                </Text>
              </View>
            )}
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelContainer}>
              <CheckSquare size={16} color={theme.colors.text} style={styles.inputIcon} />
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Status
              </Text>
            </View>
            <View style={[
              styles.selectContainer, 
              { 
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }
            ]}>
              <TextInput
                style={[styles.selectInput, { color: theme.colors.text }]}
                value={formData.status}
                onChangeText={(text) => handleChange('status', text)}
                placeholder="Select status"
                placeholderTextColor={theme.colors.text + '80'}
              />
              {/* In a real app, you'd have a dropdown/picker here */}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  imageSection: {
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectContainer: {
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  selectInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  dropdownPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    margin: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    margin: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorName: {
    fontSize: 12,
    fontWeight: '500',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 4,
  },
});
