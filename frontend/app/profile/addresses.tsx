import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MapPin, Pencil, Trash2, Home, Building, X, Phone } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import KeyboardAwareView from '@/components/Shared/KeyboardAwareView';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { RootState } from '@/store/store';
import type { AddressType, SavedAddress } from '@/services/api';
import {
  fetchAddresses,
  saveAddress,
  removeAddress,
  makeDefaultAddress,
} from '@/store/slices/addressesSlice';

const EMPTY_FORM = {
  type: 'home' as AddressType,
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Pakistan',
  phone: '',
};
type FormState = typeof EMPTY_FORM;

const TYPE_LABEL: Record<AddressType, string> = { home: 'Home', work: 'Work', other: 'Other' };

export default function AddressesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const dispatch = useAppDispatch();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const horizontalPadding = compact ? 14 : 20;

  // Opened from checkout with ?add=1 → open the form straight away
  const { add } = useLocalSearchParams<{ add?: string }>();

  const { items: addresses, loaded, loading, saving, error } = useSelector((s: RootState) => s.addresses);

  const [showForm, setShowForm] = useState(add === '1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (a: SavedAddress) => {
    setEditingId(a.id);
    setForm({
      type: a.type,
      street: a.street,
      city: a.city,
      state: a.state || '',
      postalCode: a.postalCode,
      country: a.country,
      phone: a.phone || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const validate = (f: FormState) => {
    if (!f.street.trim()) return 'Please enter your street address';
    if (!f.city.trim()) return 'Please enter your city';
    if (!f.postalCode.trim()) return 'Please enter your postal code';
    if (f.phone.replace(/[^\d]/g, '').length < 7) return 'Please enter a valid phone number';
    return '';
  };

  const handleSave = async () => {
    const problem = validate(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    const result = await dispatch(saveAddress({ id: editingId ?? undefined, address: form }));
    if (saveAddress.fulfilled.match(result)) {
      Toast.show({ type: 'success', text1: editingId ? 'Address updated' : 'Address saved', position: 'top' });
      closeForm();
      // Came from checkout to add one → go straight back
      if (add === '1' && router.canGoBack()) router.back();
    } else {
      setFormError(result.payload || 'Could not save the address');
    }
  };

  const handleDelete = (a: SavedAddress) => {
    Alert.alert('Delete address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await dispatch(removeAddress(a.id));
          if (removeAddress.rejected.match(result)) {
            Toast.show({ type: 'error', text1: result.payload || 'Could not delete the address', position: 'top' });
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    const result = await dispatch(makeDefaultAddress(id));
    if (makeDefaultAddress.rejected.match(result)) {
      Toast.show({ type: 'error', text1: result.payload || 'Could not change the default address', position: 'top' });
    }
  };

  const iconFor = (type: AddressType) => (type === 'home' ? Home : type === 'work' ? Building : MapPin);

  const field = (
    key: keyof Omit<FormState, 'type'>,
    label: string,
    props: Partial<React.ComponentProps<typeof TextInput>> = {}
  ) => (
    <View style={[styles.inputGroup, props.style as object]}>
      <Text style={[styles.inputLabel, { color: c.text }]}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
        placeholderTextColor={c.textSecondary}
        value={form[key]}
        onChangeText={(text) => {
          setForm((f) => ({ ...f, [key]: text }));
          if (formError) setFormError('');
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <HeaderBackButton onPress={() => router.back()} size={24} />
        <Text style={[styles.headerTitle, { color: c.text }]}>Addresses</Text>
        <TouchableOpacity onPress={openAdd} hitSlop={10} accessibilityLabel="Add address">
          <Plus size={24} color={c.primary} />
        </TouchableOpacity>
      </View>

      {!loaded && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={loaded && loading} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
        >
          {error && (
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.errorBanner, { backgroundColor: c.error + '18', borderColor: c.error + '55' }]}
            >
              <Text style={[styles.errorText, { color: c.error }]}>{error}. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {addresses.map((a) => {
            const Icon = iconFor(a.type);
            return (
              <View key={a.id} style={[styles.addressCard, { backgroundColor: c.surface, borderColor: a.isDefault ? c.primary : c.border }]}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressTypeContainer}>
                    <View style={[styles.typeIcon, { backgroundColor: c.primary + '1A' }]}>
                      <Icon size={16} color={c.primary} />
                    </View>
                    <Text style={[styles.addressType, { color: c.text }]}>{TYPE_LABEL[a.type] || 'Address'}</Text>
                    {a.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: c.primary }]}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      onPress={() => openEdit(a)}
                      disabled={saving}
                      style={[styles.actionButton, { backgroundColor: c.primary + '1A' }]}
                      accessibilityLabel="Edit address"
                    >
                      <Pencil size={15} color={c.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(a)}
                      disabled={saving}
                      style={[styles.actionButton, { backgroundColor: c.error + '1A' }]}
                      accessibilityLabel="Delete address"
                    >
                      <Trash2 size={15} color={c.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.addressText, { color: c.text }]}>{a.street}</Text>
                <Text style={[styles.addressText, { color: c.textSecondary }]}>
                  {[a.city, a.state].filter(Boolean).join(', ')} {a.postalCode}
                </Text>
                <Text style={[styles.addressText, { color: c.textSecondary }]}>{a.country}</Text>
                {!!a.phone && (
                  <View style={styles.phoneRow}>
                    <Phone size={13} color={c.textSecondary} />
                    <Text style={[styles.addressText, { color: c.textSecondary, marginBottom: 0 }]}>{a.phone}</Text>
                  </View>
                )}

                {!a.isDefault && (
                  <TouchableOpacity
                    onPress={() => handleSetDefault(a.id)}
                    disabled={saving}
                    style={[styles.setDefaultButton, { borderColor: c.border }]}
                  >
                    <Text style={[styles.setDefaultText, { color: c.primary }]}>Set as default</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {loaded && addresses.length === 0 && !error && (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: c.primary + '14' }]}>
                <MapPin size={40} color={c.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.text }]}>No saved addresses</Text>
              <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
                Add a delivery address to speed up checkout.
              </Text>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: c.primary }]} onPress={openAdd}>
                <Text style={styles.addButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add / edit form */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForm}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { paddingHorizontal: horizontalPadding, borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={closeForm} hitSlop={10} accessibilityLabel="Close">
              <X size={24} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: c.text }]}>{editingId ? 'Edit Address' : 'Add Address'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <KeyboardAwareView>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.modalContent, { paddingHorizontal: horizontalPadding }]}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.text }]}>Label</Text>
                <View style={styles.typeButtons}>
                  {(['home', 'work', 'other'] as AddressType[]).map((type) => {
                    const selected = form.type === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setForm((f) => ({ ...f, type }))}
                        style={[styles.typeButton, { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.border }]}
                      >
                        <Text style={[styles.typeButtonText, { color: selected ? '#fff' : c.text }]}>{TYPE_LABEL[type]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {field('street', 'Street address *', { placeholder: 'House no., street, area', autoComplete: 'street-address' })}

              <View style={[styles.row, compact && styles.rowCompact]}>
                {field('city', 'City *', { placeholder: 'Karachi', style: styles.rowItem })}
                {field('state', 'Province / State', { placeholder: 'Sindh', style: styles.rowItem })}
              </View>

              <View style={[styles.row, compact && styles.rowCompact]}>
                {field('postalCode', 'Postal code *', { placeholder: '75500', keyboardType: 'number-pad', maxLength: 10, style: styles.rowItem })}
                {field('country', 'Country', { placeholder: 'Pakistan', style: styles.rowItem })}
              </View>

              {field('phone', 'Phone number *', { placeholder: '03XX XXXXXXX', keyboardType: 'phone-pad', autoComplete: 'tel', maxLength: 20 })}

              <Text style={[styles.hint, { color: c.textSecondary }]}>
                The courier will call this number for delivery. Orders are addressed to the name on your account.
              </Text>

              {!!formError && <Text style={[styles.formError, { color: c.error }]}>{formError}</Text>}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
                style={[styles.saveButton, { backgroundColor: c.primary, opacity: saving ? 0.7 : 1 }]}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>{editingId ? 'Save Changes' : 'Save Address'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAwareView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 18, letterSpacing: -0.3, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  errorBanner: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 13, fontFamily: 'Manrope_500Medium' },
  addressCard: { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 14 },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addressTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  typeIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addressType: { fontSize: 16, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  defaultBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  defaultText: { fontSize: 11, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', color: '#fff' },
  addressActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  addressText: { fontSize: 14, marginBottom: 3, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  setDefaultButton: { alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  setDefaultText: { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, letterSpacing: -0.3, fontWeight: '700', fontFamily: 'Manrope_700Bold', marginTop: 20, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 28, fontFamily: 'Manrope_400Regular' },
  addButton: { paddingHorizontal: 32, paddingVertical: 15, borderRadius: 14 },
  addButtonText: { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold', color: '#fff' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  modalContent: { paddingTop: 20, paddingBottom: 40 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 , fontFamily: 'Manrope_400Regular'},
  row: { flexDirection: 'row', gap: 12 },
  rowCompact: { flexDirection: 'column', gap: 0 },
  rowItem: { flex: 1 },
  typeButtons: { flexDirection: 'row', gap: 10 },
  typeButton: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  typeButtonText: { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: -6, marginBottom: 16, fontFamily: 'Manrope_400Regular' },
  formError: { fontSize: 14, marginBottom: 12, fontFamily: 'Manrope_500Medium' },
  saveButton: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
