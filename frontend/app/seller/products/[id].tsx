import React, { useCallback, useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Check, ChevronDown, Plus, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/services/api';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import KeyboardAwareView from '@/components/Shared/KeyboardAwareView';
import { friendlyError } from '@/utils/errorMessages';
import { logger } from '@/utils/logger';

interface Category {
  id: string;
  name: string;
}

type Photo = { kind: 'existing'; url: string } | { kind: 'new'; uri: string };

const MAX_PHOTOS = 5;
const SIZE_OPTIONS = ['Twin', 'Full', 'Queen', 'King', 'Small', 'Medium', 'Large'];
// Same names as "Add product" (colours are stored by name)
const COLOR_OPTIONS = [
  { name: 'Black', hex: '#111827' },
  { name: 'White', hex: '#F9FAFB' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Brown', hex: '#8B5E3C' },
  { name: 'Beige', hex: '#D1BFA3' },
  { name: 'Walnut', hex: '#773F1A' },
];

const asArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const pad = width < 360 ? 14 : 20;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError('');
    try {
      const [productRes, categoryRes] = await Promise.all([
        apiService.getProductById(String(id)),
        apiService.getCategories(),
      ]);
      // getProductById wraps the API body: { success, data: { success, data: product } }
      const product = productRes?.data?.data ?? productRes?.data;
      if (!productRes?.success || !product?.id) {
        throw new Error(productRes?.error || 'Could not load this product');
      }

      setCategories(Array.isArray(categoryRes?.data) ? categoryRes.data : []);
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price != null ? String(product.price) : '');
      setComparePrice(product.comparePrice ? String(product.comparePrice) : '');
      setQuantity(product.quantity != null ? String(product.quantity) : '0');
      setIsActive(product.isActive !== false);
      setCategoryId(product.categories?.[0]?.id || '');
      const variants: { name: string; options: unknown }[] = product.variants || [];
      setSizes(asArray(variants.find((v) => v.name === 'Size')?.options));
      setColors(asArray(variants.find((v) => v.name === 'Color')?.options));
      setPhotos(asArray(product.images).map((url) => ({ kind: 'existing', url })));
    } catch (e) {
      logger.error('Error loading product for edit:', e);
      setLoadError(friendlyError(e, 'Could not load this product.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert('Photo limit reached', `A product can have up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Allow photo access', 'To add product photos, allow HomeFit to access your photos in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.6,
    });
    if (result.canceled) return;
    const picked: Photo[] = result.assets
      .filter((a) => !!a.uri)
      .slice(0, remaining)
      .map((a) => ({ kind: 'new', uri: a.uri }));
    setPhotos((prev) => [...prev, ...picked]);
    clearError('photos');
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Product name is required';
    const p = Number(price);
    if (!price || !Number.isFinite(p) || p <= 0) next.price = 'Please enter a valid price';
    if (comparePrice) {
      const cp = Number(comparePrice);
      if (!Number.isFinite(cp) || cp <= 0) next.comparePrice = 'Please enter a valid price';
    }
    const q = Number(quantity);
    if (quantity === '' || !Number.isInteger(q) || q < 0) next.quantity = 'Please enter a valid stock quantity';
    if (!categoryId) next.category = 'Please select a category';
    if (photos.length === 0) next.photos = 'Add at least one photo';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        quantity: parseInt(quantity, 10),
        isActive,
        categoryIds: [categoryId],
        // Existing photos the seller kept (new ones are uploaded as files)
        images: photos.filter((p): p is { kind: 'existing'; url: string } => p.kind === 'existing').map((p) => p.url),
        variants: [
          ...sizes.map((value) => ({ name: 'Size', value })),
          ...colors.map((value) => ({ name: 'Color', value })),
        ],
      };

      const form = new FormData();
      form.append('productData', JSON.stringify(productData));
      photos.forEach((p, index) => {
        if (p.kind === 'new') {
          form.append('files', { uri: p.uri, name: `image_${Date.now()}_${index}.jpg`, type: 'image/jpeg' } as any);
        }
      });

      const result = await apiService.updateProductForm(String(id), form);
      if (!result.success) throw new Error(result.error || 'Could not save your changes');

      Alert.alert('Product updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.back() }, // list refreshes itself on focus
      ]);
    } catch (e) {
      logger.error('Error updating product:', e);
      Alert.alert('Could not save', friendlyError(e, 'Could not save your changes. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field?: string) => [
    styles.input,
    { backgroundColor: c.surface, color: c.text, borderColor: field && errors[field] ? c.error : c.border },
  ];
  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? <Text style={[styles.fieldError, { color: c.error }]}>{errors[field]}</Text> : null;

  const header = (
    <View style={[styles.header, { paddingHorizontal: pad, borderBottomColor: c.border }]}>
      <HeaderBackButton onPress={() => router.back()} size={24} />
      <Text style={[styles.headerTitle, { color: c.text }]}>Edit product</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        {header}
        <View style={[styles.center, { paddingHorizontal: pad }]}>
          <Text style={[styles.loadError, { color: c.text }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.retry, { borderColor: c.border }]} onPress={load}>
            <Text style={[styles.retryText, { color: c.primary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const selectedCategory = categories.find((cat) => cat.id === categoryId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      {header}
      <KeyboardAwareView>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
        >
          {/* Photos */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((p, index) => (
              <View key={p.kind === 'existing' ? p.url : p.uri} style={[styles.photo, { borderColor: c.border }]}>
                <Image source={{ uri: p.kind === 'existing' ? p.url : p.uri }} style={styles.photoImage} />
                {index === 0 && (
                  <View style={styles.coverTag}>
                    <Text style={styles.coverText}>Cover</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(index)}
                  hitSlop={8}
                  accessibilityLabel="Remove photo"
                >
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                style={[styles.photo, styles.addPhoto, { borderColor: c.border, backgroundColor: c.surface }]}
                onPress={pickPhotos}
                activeOpacity={0.7}
              >
                <Plus size={22} color={c.textSecondary} />
                <Text style={[styles.addPhotoText, { color: c.textSecondary }]}>Add photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <FieldError field="photos" />

          {/* Details */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>Details</Text>

          <Text style={[styles.label, { color: c.text }]}>Product name</Text>
          <TextInput
            style={inputStyle('name')}
            value={name}
            onChangeText={(t) => {
              setName(t);
              clearError('name');
            }}
            placeholder="e.g. Oak dining table"
            placeholderTextColor={c.textSecondary}
            maxLength={120}
          />
          <FieldError field="name" />

          <Text style={[styles.label, { color: c.text }]}>Description</Text>
          <TextInput
            style={[...inputStyle(), styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Materials, dimensions, care…"
            placeholderTextColor={c.textSecondary}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={[styles.label, { color: c.text }]}>Price (Rs.)</Text>
              <TextInput
                style={inputStyle('price')}
                value={price}
                onChangeText={(t) => {
                  setPrice(t.replace(/[^0-9.]/g, ''));
                  clearError('price');
                }}
                placeholder="0"
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
              />
              <FieldError field="price" />
            </View>
            <View style={styles.rowItem}>
              <Text style={[styles.label, { color: c.text }]}>Was (optional)</Text>
              <TextInput
                style={inputStyle('comparePrice')}
                value={comparePrice}
                onChangeText={(t) => {
                  setComparePrice(t.replace(/[^0-9.]/g, ''));
                  clearError('comparePrice');
                }}
                placeholder="—"
                placeholderTextColor={c.textSecondary}
                keyboardType="decimal-pad"
              />
              <FieldError field="comparePrice" />
            </View>
          </View>

          <Text style={[styles.label, { color: c.text }]}>Stock quantity</Text>
          <TextInput
            style={inputStyle('quantity')}
            value={quantity}
            onChangeText={(t) => {
              setQuantity(t.replace(/\D/g, ''));
              clearError('quantity');
            }}
            placeholder="0"
            placeholderTextColor={c.textSecondary}
            keyboardType="number-pad"
          />
          <FieldError field="quantity" />

          {/* Category */}
          <Text style={[styles.label, { color: c.text }]}>Category</Text>
          <TouchableOpacity
            style={[...inputStyle('category'), styles.select]}
            onPress={() => setShowCategories((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectText, { color: selectedCategory ? c.text : c.textSecondary }]}>
              {selectedCategory?.name || 'Select a category'}
            </Text>
            <ChevronDown size={18} color={c.textSecondary} />
          </TouchableOpacity>
          {showCategories && (
            <View style={[styles.dropdown, { backgroundColor: c.surface, borderColor: c.border }]}>
              {categories.length === 0 ? (
                <Text style={[styles.dropdownEmpty, { color: c.textSecondary }]}>No categories available</Text>
              ) : (
                categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setShowCategories(false);
                      clearError('category');
                    }}
                  >
                    <Text style={[styles.dropdownText, { color: c.text }]}>{cat.name}</Text>
                    {cat.id === categoryId && <Check size={16} color={c.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
          <FieldError field="category" />

          {/* Options */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>Options</Text>
          <Text style={[styles.label, { color: c.text }]}>Sizes</Text>
          <View style={styles.chips}>
            {SIZE_OPTIONS.map((s) => {
              const on = sizes.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggle(sizes, setSizes, s)}
                  style={[styles.chip, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : c.surface }]}
                >
                  <Text style={[styles.chipText, { color: on ? '#fff' : c.text }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: c.text }]}>Colours</Text>
          <View style={styles.chips}>
            {COLOR_OPTIONS.map((col) => {
              const on = colors.includes(col.name);
              return (
                <TouchableOpacity
                  key={col.name}
                  onPress={() => toggle(colors, setColors, col.name)}
                  style={[styles.chip, styles.colorChip, { borderColor: on ? c.primary : c.border, backgroundColor: c.surface }]}
                >
                  <View style={[styles.swatch, { backgroundColor: col.hex }]} />
                  <Text style={[styles.chipText, { color: c.text }]}>{col.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Visibility */}
          <View style={[styles.switchRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchTitle, { color: c.text }]}>Visible in store</Text>
              <Text style={[styles.switchHint, { color: c.textSecondary }]}>
                {isActive ? 'Buyers can see and order this product' : 'Hidden from buyers'}
              </Text>
            </View>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: c.primary, false: c.border }} />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: c.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold' },
  content: { paddingTop: 8, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },

  loadError: { fontSize: 15, fontFamily: 'Manrope_500Medium', textAlign: 'center' },
  retry: { marginTop: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },

  sectionTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold', marginTop: 24, marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 12,
  },
  textArea: { minHeight: 100 },
  fieldError: { fontSize: 13, fontFamily: 'Manrope_500Medium', marginTop: -6, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },

  photoRow: { gap: 10, paddingBottom: 4 },
  photo: { width: 96, height: 96, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  addPhoto: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', gap: 4 },
  addPhotoText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  coverTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverText: { color: '#fff', fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { fontSize: 16, fontFamily: 'Manrope_500Medium', flex: 1 },
  dropdown: { borderWidth: 1, borderRadius: 12, marginTop: -4, marginBottom: 12, overflow: 'hidden' },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: { fontSize: 15, fontFamily: 'Manrope_500Medium' },
  dropdownEmpty: { padding: 14, fontSize: 14, fontFamily: 'Manrope_500Medium' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  colorChip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.25)' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 24,
  },
  switchTitle: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  switchHint: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 2 },

  saveButton: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
