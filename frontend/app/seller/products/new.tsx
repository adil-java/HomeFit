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
  ActivityIndicator,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Image as ImageIcon,
  Package,
  Tag,
  DollarSign,
  Hash,
  Plus,
  ChevronDown,
  Check,
  XCircle
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { apiService } from '@/services/api';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  cost: string;
  sku: string;
  barcode: string;
  quantity: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryIds: string[];
  generate3D: boolean;
  sizes: string[];
  colors: string[];
}

const createFormData = (data: any, files: any[] = []) => {
  const formData = new FormData();
  formData.append('productData', JSON.stringify(data));

  files.forEach((file, index) => {
    formData.append('files', {
      uri: file.uri,
      name: `image_${Date.now()}_${index}.jpg`,
      type: 'image/jpeg',
    } as any);
  });

  return formData;
};

function ProductForm() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const horizontalPadding = compact ? 12 : 16;
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [images, setImages] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [showSizes, setShowSizes] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const sizeOptions = ['Twin', 'Full', 'Queen', 'King', 'Small', 'Medium', 'Large'];
  const colorOptions = [
    { name: 'Black', hex: '#111827' },
    { name: 'White', hex: '#F9FAFB' },
    { name: 'Gray', hex: '#6B7280' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Green', hex: '#10B981' },
    { name: 'Brown', hex: '#8B5E3C' },
    { name: 'Beige', hex: '#D1BFA3' },
    { name: 'Walnut', hex: '#773F1A' },
  ];
  
  // Get color hex by name
  const getColorHex = (colorName: string) => {
    const color = colorOptions.find(c => c.name === colorName);
    return color ? color.hex : '#FFFFFF';
  };

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    cost: '',
    sku: '', // Will be auto-generated in the backend
    barcode: '', // Will be auto-generated in the backend
    quantity: '1',
    isActive: true,
    isFeatured: false,
    categoryIds: [],
    generate3D: false,
    sizes: [],
    colors: [],
  });

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const toggleColor = (colorName: string) => {
    setFormData(prev => {
      const newColors = prev.colors.includes(colorName)
        ? prev.colors.filter(c => c !== colorName)
        : [...prev.colors, colorName];
      
      // console.log('Updated colors:', newColors); // Debug log
      return {
        ...prev,
        colors: newColors
      };
    });
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiService.getCategories();
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        Alert.alert('Error', 'Failed to load categories');
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'We need camera roll permissions to upload images');
        }
      }
    })();
  }, []);

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormData(prev => ({
      ...prev,
      categoryIds: [category.id]
    }));
    setShowCategoryDropdown(false);
  };

  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.5,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset, index) => {
          // Ensure we're using the string URI
          const uri = typeof asset.uri === 'string' ? asset.uri : asset.uri?.uri || '';
          return {
            uri,
            name: `image_${Date.now()}_${index}.jpg`,
            type: 'image/jpeg',
          };
        }).filter(img => img.uri); // Filter out any invalid URIs
        
        if (newImages.length > 0) {
          setImages(prev => [...prev, ...newImages]);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';

    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (formData.comparePrice && (isNaN(Number(formData.comparePrice)) || Number(formData.comparePrice) <= 0)) {
      newErrors.comparePrice = 'Please enter a valid compare price';
    }

    if (formData.cost && (isNaN(Number(formData.cost)) || Number(formData.cost) < 0)) {
      newErrors.cost = 'Please enter a valid cost';
    }

    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(Number(formData.quantity)) || !Number.isInteger(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }

    if (images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    if (formData.categoryIds.length === 0) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    try {
      setSaving(true);

      // Prepare variants array from sizes and colors
      const variants = [
        ...formData.sizes.map(size => ({
          name: 'Size',
          value: size
        })),
        ...formData.colors.map(color => ({
          name: 'Color',
          value: color
        }))
      ];

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        // SKU and barcode will be auto-generated in the backend
        quantity: parseInt(formData.quantity, 10),
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        categoryIds: formData.categoryIds,
        generate3D: formData.generate3D,
        variants: variants,
      };

      const formDataToSend = createFormData(productData, images);
      const response = await apiService.createProduct(formDataToSend);

      if (response.success) {
        Alert.alert('Success', 'Product created successfully!', [
          {
            text: 'OK',
            onPress: () => router.replace('/seller/products')
          },
          {
            text: 'Add Another',
            onPress: () => {
              setFormData({
                name: '',
                description: '',
                price: '',
                comparePrice: '',
                cost: '',
                sku: '',
                barcode: '',
                quantity: '1',
                isActive: true,
                isFeatured: false,
                categoryIds: [],
                generate3D: false,
                sizes: [],
                colors: [],
              });
              setSelectedCategory(null);
              setImages([]);
            },
            style: 'default',
          },
        ]);
      } else {
        throw new Error(response.error || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      Alert.alert('Error', error.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const toggleSwitch = (field: 'isActive' | 'isFeatured' | 'generate3D') => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, paddingHorizontal: horizontalPadding }]}> 
          <HeaderBackButton onPress={() => router.back()} size={24} style={styles.backButton} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Create Product
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving}
          style={[
            styles.saveButton,
            compact && styles.saveButtonCompact,
            {
              backgroundColor: theme.colors.primary,
              opacity: saving ? 0.6 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Plus size={20} color="#fff" />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Product Images *
          </Text>
          <View style={styles.imageGrid}>
            {images.map((image, index) => (
              <View key={index} style={[styles.imagePreviewContainer, compact && styles.imagePreviewContainerCompact]}>
                <Image
                  source={{ uri: image.uri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                  onError={(e) => console.log('Failed to load image:', e.nativeEvent.error)}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <XCircle size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 10 && (
              <TouchableOpacity
                style={[styles.addImageButton, compact && styles.addImageButtonCompact, { borderColor: theme.colors.primary }]}
                onPress={handlePickImages}
                disabled={saving}
              >
                <Plus size={24} color={theme.colors.primary} />
                <Text style={[styles.addImageText, { color: theme.colors.primary }]}>
                  Add Image
                </Text>
                <Text style={[styles.imageLimitText, { color: theme.colors.text }]}>
                  {images.length}/10
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {errors.images && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.images}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Basic Information
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Product Name *</Text>
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
              placeholderTextColor={theme.dark ? '#666' : '#999'}
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              editable={!saving}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.name}
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
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
              placeholderTextColor={theme.dark ? '#666' : '#999'}
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Category *</Text>
            <TouchableOpacity
              style={[
                styles.selectInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: errors.category ? theme.colors.error : theme.colors.border
                }
              ]}
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              disabled={saving}
            >
              <Text style={[styles.selectText, {
                color: selectedCategory ? theme.colors.text : (theme.dark ? '#666' : '#999')
              }]}>
                {selectedCategory ? selectedCategory.name : 'Select a category'}
              </Text>
              <ChevronDown size={20} color={theme.colors.text} />
            </TouchableOpacity>
            {showCategoryDropdown && (
              <View style={[styles.dropdown, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.text
              }]}>
                <ScrollView style={styles.dropdownScroll}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.dropdownItem,
                        selectedCategory?.id === category.id && {
                          backgroundColor: `${theme.colors.primary}20`
                        }
                      ]}
                      onPress={() => handleSelectCategory(category)}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
                        {category.name}
                      </Text>
                      {selectedCategory?.id === category.id && (
                        <Check size={16} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {errors.category && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {errors.category}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Pricing
          </Text>

          <View style={[styles.row, compact && styles.rowCompact]}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: compact ? 0 : 12, marginBottom: compact ? 12 : 0 }]}> 
              <Text style={[styles.label, { color: theme.colors.text }]}>Price (Rs.) *</Text>
              <View style={[styles.inputWithIcon, {
                backgroundColor: theme.colors.surface,
                borderColor: errors.price ? theme.colors.error : theme.colors.border
              }]}>
                <DollarSign size={18} color={theme.colors.text} style={styles.iconMargin} />
                <TextInput
                  style={[styles.inputInside, { color: theme.colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.dark ? '#666' : '#999'}
                  value={formData.price}
                  onChangeText={(text) => handleChange('price', text.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
              {errors.price && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.price}
                </Text>
              )}
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}> 
              <Text style={[styles.label, { color: theme.colors.text }]}>Compare at Price (Rs.)</Text>
              <View style={[styles.inputWithIcon, {
                backgroundColor: theme.colors.surface,
                borderColor: errors.comparePrice ? theme.colors.error : theme.colors.border
              }]}>
                <DollarSign size={18} color={theme.colors.text} style={styles.iconMargin} />
                <TextInput
                  style={[styles.inputInside, { color: theme.colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.dark ? '#666' : '#999'}
                  value={formData.comparePrice}
                  onChangeText={(text) => handleChange('comparePrice', text.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
              {errors.comparePrice && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.comparePrice}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.row, compact && styles.rowCompact]}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: compact ? 0 : 12, marginBottom: compact ? 12 : 0 }]}> 
              <Text style={[styles.label, { color: theme.colors.text }]}>Cost per item (Rs.)</Text>
              <View style={[styles.inputWithIcon, {
                backgroundColor: theme.colors.surface,
                borderColor: errors.cost ? theme.colors.error : theme.colors.border
              }]}>
                <DollarSign size={18} color={theme.colors.text} style={styles.iconMargin} />
                <TextInput
                  style={[styles.inputInside, { color: theme.colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.dark ? '#666' : '#999'}
                  value={formData.cost}
                  onChangeText={(text) => handleChange('cost', text.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
              {errors.cost && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.cost}
                </Text>
              )}
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Quantity *</Text>
              <View style={[styles.inputWithIcon, {
                backgroundColor: theme.colors.surface,
                borderColor: errors.quantity ? theme.colors.error : theme.colors.border
              }]}>
                <Package size={18} color={theme.colors.text} style={styles.iconMargin} />
                <TextInput
                  style={[styles.inputInside, { color: theme.colors.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.dark ? '#666' : '#999'}
                  value={formData.quantity}
                  onChangeText={(text) => handleChange('quantity', text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  editable={!saving}
                />
              </View>
              {errors.quantity && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.quantity}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Inventory
          </Text>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 12 }]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>SKU *</Text>
              <View style={[styles.inputWithIcon, {
                backgroundColor: theme.colors.surface,
                borderColor: errors.sku ? theme.colors.error : theme.colors.border
              }]}>
                <Hash size={18} color={theme.colors.text} style={styles.iconMargin} />
                <TextInput
                  style={[styles.inputInside, { color: theme.colors.text }]}
                  placeholder="SKU-001"
                  placeholderTextColor={theme.dark ? '#666' : '#999'}
                  value={formData.sku}
                  onChangeText={(text) => handleChange('sku', text)}
                  editable={!saving}
                />
              </View>
              {errors.sku && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.sku}
                </Text>
              )}
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Barcode</Text>
              <View style={[styles.inputWithIcon, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }]}>
                <Hash size={18} color={theme.colors.text} style={styles.iconMargin} />
                <TextInput
                  style={[styles.inputInside, { color: theme.colors.text }]}
                  placeholder="123456789012"
                  placeholderTextColor={theme.dark ? '#666' : '#999'}
                  value={formData.barcode}
                  onChangeText={(text) => handleChange('barcode', text)}
                  editable={!saving}
                />
              </View>
            </View>
          </View>
        </View> */}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Variants
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Sizes</Text>
            <TouchableOpacity
              style={[styles.selectInput, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }]}
              onPress={() => setShowSizes(!showSizes)}
              disabled={saving}
            >
              <Text style={[styles.selectText, {
                color: formData.sizes.length ? theme.colors.text : (theme.dark ? '#666' : '#999')
              }]}>
                {formData.sizes.length ? formData.sizes.join(', ') : 'Select sizes'}
              </Text>
              <ChevronDown size={20} color={theme.colors.text} />
            </TouchableOpacity>
            {showSizes && (
              <View style={[styles.dropdown, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }]}>
                <View style={styles.chipsContainer}>
                  {sizeOptions.map(size => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.chip,
                        { borderColor: theme.colors.border },
                        formData.sizes.includes(size) && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary
                        }
                      ]}
                      onPress={() => toggleSize(size)}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: theme.colors.text },
                        formData.sizes.includes(size) && { color: '#fff' }
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Colors</Text>
            <TouchableOpacity
              style={[styles.selectInput, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }]}
              onPress={() => setShowColors(!showColors)}
              disabled={saving}
            >
              <View style={[styles.colorPreview, { flex: 1 }]}>
                {formData.colors.length > 0 ? (
                  <View style={{ 
                    flex: 1, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: 6, 
                    flexWrap: 'wrap',
                    maxHeight: 60,
                    overflow: 'hidden'
                  }}>
                    {formData.colors.slice(0, 2).map((colorName, index) => {
                      const color = colorOptions.find(c => c.name === colorName);
                      if (!color) return null;
                      
                      return (
                        <View key={index} style={[styles.selectedColorChip, { borderColor: theme.colors.border }]}>
                          <View style={[styles.colorDot, { backgroundColor: color.hex }]} />
                          <Text 
                            style={[{
                              fontSize: 14,
                              marginLeft: 6,
                              color: theme.colors.text
                            }]}
                            numberOfLines={1}
                          >
                            {color.name}
                          </Text>
                        </View>
                      );
                    })}
                    {formData.colors.length > 2 && (
                      <View style={[styles.moreColorsBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}>
+{formData.colors.length - 2}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.selectText, {
                    color: theme.dark ? '#666' : '#999'
                  }]}>
                    Select colors
                  </Text>
                )}
              </View>
              <ChevronDown size={20} color={theme.colors.text} />
            </TouchableOpacity>
            {showColors && (
              <View style={[styles.dropdown, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }]}>
                <View style={styles.colorsContainer}>
                  {colorOptions.map((color, index) => {
                    const isSelected = formData.colors.includes(color.name);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.colorOption,
                          isSelected && styles.selectedColor,
                          { borderColor: theme.colors.border }
                        ]}
                        onPress={() => toggleColor(color.name)}
                        activeOpacity={0.8}
                      >
                        <View style={[
                          styles.colorSwatch,
                          { backgroundColor: color.hex }
                        ]} />
                        <Text style={styles.colorName}>
                          {color.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.colorCheck}>
                            <Check size={10} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Product Status
          </Text>

          <View style={[styles.settingRow, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Active
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text }]}>
                When active, this product will be visible to customers.
              </Text>
            </View>
            <Switch
              value={formData.isActive}
              onValueChange={() => toggleSwitch('isActive')}
              disabled={saving}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
            />
          </View>

          <View style={[styles.settingRow, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Featured
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text }]}>
                Featured products will be shown on the homepage.
              </Text>
            </View>
            <Switch
              value={formData.isFeatured}
              onValueChange={() => toggleSwitch('isFeatured')}
              disabled={saving}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
            />
          </View>

          <View style={[styles.settingRow, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                Generate 3D Model
              </Text>
              <Text style={[styles.settingDescription, { color: theme.colors.text }]}>
                Enable to generate a 3D model from the first uploaded image.
              </Text>
            </View>
            <Switch
              value={formData.generate3D}
              onValueChange={() => toggleSwitch('generate3D')}
              disabled={saving}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.background}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default ProductForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    marginTop:44,
    marginBottom:4,
  },
  saveButtonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  imagePreviewContainer: {
    width: '31.33%',
    aspectRatio: 1,
    padding: 4,
    position: 'relative',
  },
  imagePreviewContainerCompact: {
    width: '48%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: '31.33%',
    aspectRatio: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  addImageButtonCompact: {
    width: '48%',
  },
  addImageText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  imageLimitText: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  iconMargin: {
    marginRight: 8,
    opacity: 0.7,
  },
  inputInside: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectText: {
    fontSize: 16,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    maxHeight: 280,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 6,
  },
  dropdownItemText: {
    fontSize: 16,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  rowCompact: {
    flexDirection: 'column',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  colorPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    flexWrap: 'wrap',
    marginRight: 8,
    overflow: 'hidden',
  },
  selectedColorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    maxWidth: '30%',
  },
  moreColorsBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 'auto',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 4,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    gap: 8,
    minWidth: 100,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  colorName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    flex: 1,
    color: '#333',
    marginLeft: 4,
  },
  selectedColor: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
  },
  colorCheck: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
