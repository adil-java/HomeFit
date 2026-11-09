import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronRight, Lock, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import KeyboardAwareView from '@/components/Shared/KeyboardAwareView';
import { friendlyError } from '@/utils/errorMessages';

export default function PersonalInfoScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const pad = width < 360 ? 14 : 20;
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  // New photo picked but not saved yet: preview uri + data uri for upload
  const [photo, setPhoto] = useState<{ uri: string; dataUri: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dirty = useMemo(
    () => !!photo || name.trim() !== (user?.name || '') || phone.trim() !== (user?.phone || ''),
    [photo, name, phone, user]
  );

  const initials =
    (name || user?.email || 'U')
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Allow photo access', 'To change your profile photo, allow HomeFit to access your photos in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // Compressed on the phone; the server crops it to 512×512
      quality: 0.35,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType && /image\/(jpeg|png|webp)/.test(asset.mimeType) ? asset.mimeType : 'image/jpeg';
    setPhoto({ uri: asset.uri, dataUri: `data:${mime};base64,${asset.base64}` });
    setError('');
  };

  const validate = () => {
    const n = name.trim();
    if (n.length < 2) return 'Please enter your name';
    const p = phone.trim();
    if (p && p.replace(/[^\d]/g, '').length < 7) return 'Please enter a valid phone number';
    return '';
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const changes: { name?: string; phoneNumber?: string; photo?: string } = {};
      if (name.trim() !== (user?.name || '')) changes.name = name.trim();
      if (phone.trim() !== (user?.phone || '')) changes.phoneNumber = phone.trim();
      if (photo) changes.photo = photo.dataUri;
      await updateProfile(changes);
      setPhoto(null);
      Toast.show({ type: 'success', text1: 'Profile updated', position: 'top' });
    } catch (e) {
      setError(friendlyError(e, 'Could not update your profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = photo?.uri || user?.photoURL || null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingHorizontal: pad, borderBottomColor: c.border }]}>
        <HeaderBackButton onPress={() => router.back()} size={24} />
        <Text style={[styles.headerTitle, { color: c.text }]}>Personal information</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareView>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
        >
          {/* Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8} accessibilityLabel="Change profile photo">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Camera size={15} color={c.text} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickPhoto} hitSlop={8}>
              <Text style={[styles.changePhoto, { color: c.primary }]}>{photo ? 'Choose a different photo' : 'Change photo'}</Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <Text style={[styles.label, { color: c.text }]}>Full name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError('');
            }}
            placeholder="Your name"
            placeholderTextColor={c.textSecondary}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={60}
          />

          <Text style={[styles.label, { color: c.text }]}>Phone number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              setError('');
            }}
            placeholder="03XX XXXXXXX"
            placeholderTextColor={c.textSecondary}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={20}
          />

          <Text style={[styles.label, { color: c.text }]}>Email</Text>
          <View style={[styles.input, styles.readOnly, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.readOnlyText, { color: c.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
            <Lock size={14} color={c.textSecondary} />
          </View>
          <Text style={[styles.help, { color: c.textSecondary }]}>Your email is used to sign in and can't be changed here.</Text>

          <TouchableOpacity
            style={[styles.linkRow, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/profile/addresses')}
            activeOpacity={0.6}
          >
            <MapPin size={18} color={c.text} strokeWidth={1.8} />
            <Text style={[styles.linkText, { color: c.text }]}>Delivery addresses</Text>
            <ChevronRight size={18} color={c.textSecondary} />
          </TouchableOpacity>

          {!!error && <Text style={[styles.error, { color: c.error }]}>{error}</Text>}

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: c.primary, opacity: !dirty || saving ? 0.5 : 1 }]}
            onPress={save}
            disabled={!dirty || saving}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold' },
  content: { paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },

  photoSection: { alignItems: 'center', marginBottom: 28 },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: '#fff', fontSize: 32, fontFamily: 'Manrope_700Bold' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: { marginTop: 12, fontSize: 14, fontFamily: 'Manrope_700Bold' },

  label: { fontSize: 14, fontFamily: 'Manrope_600SemiBold', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 18,
  },
  readOnly: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  readOnlyText: { flex: 1, fontSize: 16, fontFamily: 'Manrope_500Medium' },
  help: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginBottom: 24 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  linkText: { flex: 1, fontSize: 15, fontFamily: 'Manrope_600SemiBold' },

  error: { fontSize: 14, fontFamily: 'Manrope_500Medium', marginBottom: 12 },
  saveButton: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
