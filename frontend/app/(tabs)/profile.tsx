import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Settings,
  MapPin,
  ShoppingBag,
  LogOut,
  ChevronRight,
  Moon,
  Heart,
  Package,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchCart } from '@/store/slices/cartSlice';
import { fetchWishlist } from '@/store/slices/wishlistSlice';

type RowProps = {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
};

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 14 : 20;
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const cartCount = useAppSelector((state) => state.cart.items?.length || 0);
  const wishlistCount = useAppSelector((state) => state.wishlist.items?.length || 0);

  useEffect(() => {
    dispatch(fetchCart());
    dispatch(fetchWishlist({}));
  }, [dispatch]);

  const isSeller = user?.role?.toLowerCase() === 'seller';
  const displayName = user?.name || 'Your account';
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const Row = ({ icon: Icon, title, subtitle, onPress, right, last }: RowProps) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
      style={styles.row}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <Icon size={20} color={c.text} strokeWidth={1.8} />
      <View style={[styles.rowBody, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
          {!!subtitle && <Text style={[styles.rowSubtitle, { color: c.textSecondary }]}>{subtitle}</Text>}
        </View>
        {right ?? (onPress ? <ChevronRight size={18} color={c.textSecondary} /> : null)}
      </View>
    </TouchableOpacity>
  );

  const Group = ({ label, children }: { label?: string; children: React.ReactNode }) => (
    <View style={styles.group}>
      {!!label && <Text style={[styles.groupLabel, { color: c.textSecondary }]}>{label}</Text>}
      <View style={[styles.groupCard, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
      >
        {/* Identity */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/profile/personal-info')}
          style={styles.identity}
        >
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.identityText}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[styles.email, { color: c.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
            {isSeller && (
              <View style={[styles.roleChip, { borderColor: c.border }]}>
                <Text style={[styles.roleChipText, { color: c.text }]}>Seller account</Text>
              </View>
            )}
          </View>
          <ChevronRight size={18} color={c.textSecondary} />
        </TouchableOpacity>

        {/* Counts */}
        <View style={[styles.stats, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TouchableOpacity style={styles.stat} onPress={() => router.navigate('/(tabs)/cart')} activeOpacity={0.6}>
            <Text style={[styles.statNumber, { color: c.text }]}>{cartCount}</Text>
            <View style={styles.statLabelRow}>
              <ShoppingBag size={14} color={c.textSecondary} />
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>In cart</Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <TouchableOpacity style={styles.stat} onPress={() => router.navigate('/(tabs)/wishlist')} activeOpacity={0.6}>
            <Text style={[styles.statNumber, { color: c.text }]}>{wishlistCount}</Text>
            <View style={styles.statLabelRow}>
              <Heart size={14} color={c.textSecondary} />
              <Text style={[styles.statLabel, { color: c.textSecondary }]}>Saved</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Group label="Account">
          <Row icon={User} title="Personal information" onPress={() => router.push('/profile/personal-info')} />
          <Row icon={MapPin} title="Addresses" subtitle="Delivery addresses" onPress={() => router.push('/profile/addresses')} last />
        </Group>

        <Group label="Shopping">
          <Row icon={Package} title="My orders" onPress={() => router.push('/orders')} last />
        </Group>

        <Group label="Preferences">
          <Row
            icon={Moon}
            title="Dark mode"
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                thumbColor="#FFFFFF"
                trackColor={{ false: c.border, true: c.primary }}
                ios_backgroundColor={c.border}
              />
            }
          />
          <Row icon={Settings} title="Settings" subtitle="Notifications, privacy, security" onPress={() => router.push('/profile/settings')} last />
        </Group>

        <Group>
          <TouchableOpacity onPress={confirmLogout} activeOpacity={0.6} style={styles.row} accessibilityRole="button">
            <LogOut size={20} color={c.error} strokeWidth={1.8} />
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: c.error }]}>Log out</Text>
            </View>
          </TouchableOpacity>
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 32, width: '100%', maxWidth: 640, alignSelf: 'center' },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitials: { color: '#fff', fontSize: 20, letterSpacing: -0.3, fontFamily: 'Manrope_700Bold' },
  identityText: { flex: 1 },
  name: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.4 },
  email: { fontSize: 14, marginTop: 2, fontFamily: 'Manrope_500Medium' },
  roleChip: { alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  roleChipText: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },

  stats: { flexDirection: 'row', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 28 },
  stat: { flex: 1, paddingVertical: 16, paddingHorizontal: 18 },
  statNumber: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.5 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statLabel: { fontSize: 13, fontFamily: 'Manrope_500Medium' },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 14 },

  group: { marginBottom: 24 },
  groupLabel: {
    fontSize: 12, fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, gap: 14 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingVertical: 10, paddingRight: 14 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  rowSubtitle: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 1 },
});
