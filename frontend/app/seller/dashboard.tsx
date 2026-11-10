import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Users, ShoppingBag, Wallet, Package, ArrowUpRight, ArrowDownRight, Truck, ChevronRight, AlertCircle } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import HeaderBackButton from '@/components/Shared/HeaderBackButton';
import { apiService } from '@/services/api';
import { useScreenCache } from '@/hooks/useScreenCache';
import { formatPrice, formatPKR } from '@/constants/pricing';
import { logger } from '@/utils/logger';

// Calm, related colours for chart slices (brand navy, oak, sage, clay, slate)
const CATEGORY_COLORS = ['#2F3C7E', '#B8925F', '#5B8C85', '#C08A7E', '#7D8597'];

// Types for our dashboard data
type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number; // value of your items sold (paid, not cancelled)
  totalOrders: number;
  monthlyGrowth: number;
  pendingOrders: number; // paid, still to ship
  earnings: { paid: number; onHold: number; feePercent: number };
};

// Payment setup state for the banner
type PayState = 'unknown' | 'not_set_up' | 'payouts_pending' | 'ready';

type RevenueByCategory = Array<{
  name: string;
  revenue: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
  population?: number;
}>;

type MonthlyRevenue = {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: (opacity?: number) => string;
    strokeWidth: number;
  }>;
};

type TopProduct = {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  stock: number;
  image?: string;
};

// Default data structure to prevent undefined errors
const defaultStats: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  totalRevenue: 0,
  totalOrders: 0,
  monthlyGrowth: 0,
  pendingOrders: 0,
  earnings: { paid: 0, onHold: 0, feePercent: 8 },
};

const defaultRevenueByCategory: RevenueByCategory = [];

const defaultMonthlyRevenue: MonthlyRevenue = {
  labels: [],
  datasets: [{
    data: [],
    color: (opacity = 1) => `rgba(47, 60, 126, ${opacity})`,
    strokeWidth: 2
  }]
};

const defaultTopProducts: TopProduct[] = [];

// Raw responses from the four dashboard endpoints (plain JSON → safe to cache).
interface DashboardRaw {
  statsData: any;
  revenueData: any;
  monthlyData: any;
  productsData: any;
}

// Turns raw API responses into the screen's state. Fields are undefined when the
// response wasn't in the expected shape, so the caller keeps its previous value.
function buildDashboardState(raw: DashboardRaw, isDark: boolean) {
  const { statsData, revenueData, monthlyData, productsData } = raw;

  const stats: DashboardStats = {
    totalUsers: statsData?.totalUsers || 0,
    activeUsers: statsData?.activeUsers || 0,
    totalRevenue: statsData?.totalRevenue || 0,
    totalOrders: statsData?.totalOrders || 0,
    monthlyGrowth: statsData?.monthlyGrowth || 0,
    pendingOrders: statsData?.pendingOrders || 0,
    earnings: {
      paid: statsData?.earnings?.paid || 0,
      onHold: statsData?.earnings?.onHold || 0,
      feePercent: statsData?.earnings?.feePercent ?? 8,
    },
  };

  // Format revenue by category for the chart
  const revenueByCategory: RevenueByCategory | undefined = Array.isArray(revenueData)
    ? revenueData.map((item: any, index: number) => ({
        ...item,
        population: item.revenue,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        legendFontColor: isDark ? '#E5E7EB' : '#7F7F7F',
        legendFontSize: 12
      }))
    : undefined;

  // Format monthly revenue data
  const monthlyRevenue: MonthlyRevenue | undefined =
    monthlyData && monthlyData.labels && monthlyData.datasets
      ? {
          labels: monthlyData.labels,
          datasets: [{
            data: monthlyData.datasets[0]?.data || [],
            color: (opacity = 1) => `rgba(47, 60, 126, ${opacity})`,
            strokeWidth: 2
          }]
        }
      : undefined;

  const topProducts: TopProduct[] | undefined = Array.isArray(productsData) ? productsData : undefined;

  return { stats, revenueByCategory, monthlyRevenue, topProducts };
}

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const c = theme.colors;
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuth();
  // Raw API responses from the last successful load (kept in Redux while the app is open).
  // Chart objects contain functions, so we cache the raw data and rebuild them.
  const [cachedRaw, saveCachedRaw] = useScreenCache<DashboardRaw>(
    user?.uid ? `sellerDashboard:${user.uid}` : null
  );
  const initial = cachedRaw ? buildDashboardState(cachedRaw, isDark) : null;
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(() => initial?.stats ?? defaultStats);
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory>(
    () => initial?.revenueByCategory ?? defaultRevenueByCategory
  );
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue>(
    () => initial?.monthlyRevenue ?? defaultMonthlyRevenue
  );
  const [topProducts, setTopProducts] = useState<TopProduct[]>(() => initial?.topProducts ?? defaultTopProducts);
  const [error, setError] = useState<string | null>(null);
  const [payState, setPayState] = useState<PayState>('unknown');

  const loadPayState = async () => {
    if (!user?.uid) return;
    try {
      const st: any = await apiService.getSellerStatus(user.uid);
      setPayState(!st?.chargesEnabled ? 'not_set_up' : st?.payoutsEnabled ? 'ready' : 'payouts_pending');
    } catch {
      // Banner just stays hidden
    }
  };

  // background = refresh behind data already on screen: no spinner, and on
  // failure keep showing that data instead of the error screen.
  const fetchDashboardData = async (background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);

      const [statsData, revenueData, monthlyData, productsData] = await Promise.all([
        apiService.getSellerDashboardStats(),
        apiService.getRevenueByCategory(),
        apiService.getMonthlyRevenue(),
        apiService.getTopProducts(),
      ]);

      loadPayState(); // banner, not awaited
      const raw: DashboardRaw = { statsData, revenueData, monthlyData, productsData };
      const next = buildDashboardState(raw, isDark);
      setStats(next.stats);
      if (next.revenueByCategory) setRevenueByCategory(next.revenueByCategory);
      if (next.monthlyRevenue) setMonthlyRevenue(next.monthlyRevenue);
      if (next.topProducts) setTopProducts(next.topProducts);
      saveCachedRaw(raw);
    } catch (err) {
      logger.error('Error fetching dashboard data:', err);
      if (!background) setError('Could not load your dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cached data is already on screen → refresh behind it.
    fetchDashboardData(!!cachedRaw);
    // Refresh every 5 minutes, quietly in the background
    const interval = setInterval(() => fetchDashboardData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(true);
    setRefreshing(false);
  };

  // Hardware back goes home — only while this screen is focused
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.dismissTo('/(tabs)');
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  const pad = screenWidth < 360 ? 14 : 20;
  const contentWidth = Math.min(screenWidth, 720) - pad * 2;
  const chartWidth = contentWidth - 32; // card padding
  const tileWidth = screenWidth < 360 ? contentWidth : (contentWidth - 12) / 2;

  const header = (
    <View style={[styles.header, { paddingHorizontal: pad, borderBottomColor: c.border }]}>
      <HeaderBackButton onPress={() => router.dismissTo('/(tabs)')} />
      <Text style={[styles.headerTitle, { color: c.text }]}>Dashboard</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
        {header}
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: c.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: c.primary }]} onPress={() => fetchDashboardData()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ink = (opacity = 1) => (isDark ? `rgba(244, 243, 240, ${opacity})` : `rgba(28, 27, 25, ${opacity})`);
  const chartConfig = {
    backgroundColor: c.surface,
    backgroundGradientFrom: c.surface,
    backgroundGradientTo: c.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => ink(opacity * 0.9),
    labelColor: (opacity = 1) => ink(opacity * 0.55),
    propsForBackgroundLines: { stroke: c.border, strokeDasharray: '' },
    propsForDots: { r: '3.5', strokeWidth: '2', stroke: c.primary, fill: c.surface },
    propsForLabels: { fontFamily: 'Manrope_500Medium' },
  };
  const lineData = {
    ...monthlyRevenue,
    datasets: monthlyRevenue.datasets.map((d) => ({ ...d, color: () => c.primary, strokeWidth: 2.5 })),
  };
  const pieData = revenueByCategory.map((item, index) => ({
    ...item,
    population: item.revenue,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    legendFontColor: c.textSecondary,
    legendFontSize: 12,
  }));

  const growth = stats.monthlyGrowth;
  const tiles: { label: string; value: string; icon: any; growth?: number; onPress?: () => void }[] = [
    { label: 'Total sales', value: formatPrice(stats.totalRevenue), icon: Wallet, growth },
    { label: 'Paid orders', value: stats.totalOrders.toLocaleString(), icon: ShoppingBag, onPress: () => router.navigate('/seller/orders') },
    { label: 'To ship', value: stats.pendingOrders.toLocaleString(), icon: Truck, onPress: () => router.navigate('/seller/orders') },
    { label: 'Customers', value: stats.totalUsers.toLocaleString(), icon: Users },
  ];
  const { earnings } = stats;
  const banner =
    payState === 'not_set_up'
      ? { title: 'Set up payments to get paid', text: 'Your earnings are kept on hold until you connect a bank account.' }
      : payState === 'payouts_pending'
        ? { title: 'One more step for bank payouts', text: 'Stripe needs a few details before it can send money to your bank.' }
        : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}
      >
        <Text style={[styles.greeting, { color: c.textSecondary }]}>
          {user?.name ? `Hi ${user.name.split(' ')[0]}, here's how your store is doing.` : "Here's how your store is doing."}
        </Text>

        {/* Payment setup reminder */}
        {banner && (
          <TouchableOpacity
            style={[styles.banner, { backgroundColor: c.warning + '18', borderColor: c.warning + '55' }]}
            onPress={() => router.navigate('/seller/onboarding')}
            activeOpacity={0.7}
          >
            <AlertCircle size={18} color={c.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: c.text }]}>{banner.title}</Text>
              <Text style={[styles.bannerText, { color: c.textSecondary }]}>{banner.text}</Text>
            </View>
            <ChevronRight size={18} color={c.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Earnings */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.navigate('/seller/sellerBalance')}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.earnHeader}>
            <Text style={[styles.cardTitle, { color: c.text, marginBottom: 0 }]}>Your earnings</Text>
            <View style={styles.earnLink}>
              <Text style={[styles.earnLinkText, { color: c.primary }]}>Details</Text>
              <ChevronRight size={16} color={c.primary} />
            </View>
          </View>
          <View style={styles.earnRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.earnLabel, { color: c.textSecondary }]}>Paid to you</Text>
              <Text style={[styles.earnValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatPKR(earnings.paid)}
              </Text>
            </View>
            <View style={[styles.earnDivider, { backgroundColor: c.border }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.earnLabel, { color: c.textSecondary }]}>On hold</Text>
              <Text style={[styles.earnValue, { color: earnings.onHold > 0 ? c.warning : c.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatPKR(earnings.onHold)}
              </Text>
            </View>
          </View>
          <Text style={[styles.earnNote, { color: c.textSecondary }]}>
            You keep {100 - earnings.feePercent}% of every sale. Your share is sent automatically when a buyer pays.
          </Text>
        </TouchableOpacity>

        {/* Key numbers */}
        <View style={styles.tiles}>
          {tiles.map(({ label, value, icon: Icon, growth: g, onPress }) => (
            <TouchableOpacity
              key={label}
              disabled={!onPress}
              onPress={onPress}
              activeOpacity={0.7}
              style={[styles.tile, { width: tileWidth, backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={styles.tileTop}>
                <Icon size={18} color={c.textSecondary} strokeWidth={1.8} />
                {typeof g === 'number' && g !== 0 && (
                  <View style={styles.growth}>
                    {g > 0 ? <ArrowUpRight size={13} color={c.success} /> : <ArrowDownRight size={13} color={c.error} />}
                    <Text style={[styles.growthText, { color: g > 0 ? c.success : c.error }]}>{Math.abs(g).toFixed(1)}%</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {value}
              </Text>
              <Text style={[styles.tileLabel, { color: c.textSecondary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monthly revenue */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Sales by month</Text>
          {monthlyRevenue.labels.length > 0 ? (
            <LineChart
              data={lineData}
              width={chartWidth}
              height={200}
              chartConfig={chartConfig}
              bezier
              withVerticalLines={false}
              withOuterLines={false}
              style={styles.chart}
            />
          ) : (
            <Text style={[styles.empty, { color: c.textSecondary }]}>No sales yet. Paid orders will show here.</Text>
          )}
        </View>

        {/* Revenue by category */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Sales by category</Text>
          {pieData.length > 0 ? (
            <PieChart
              data={pieData}
              width={chartWidth}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute
              hasLegend
            />
          ) : (
            <Text style={[styles.empty, { color: c.textSecondary }]}>No category data yet.</Text>
          )}
        </View>

        {/* Top products */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, paddingBottom: 4 }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Top products</Text>
          {topProducts.length > 0 ? (
            topProducts.map((product, index) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productRow,
                  index !== topProducts.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
                ]}
                onPress={() => router.push(`/seller/products/${product.id}`)}
                activeOpacity={0.6}
              >
                <View style={[styles.productImage, { backgroundColor: c.background }]}>
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.productImageFill} resizeMode="cover" />
                  ) : (
                    <Package size={18} color={c.textSecondary} />
                  )}
                </View>
                <View style={styles.productBody}>
                  <Text style={[styles.productName, { color: c.text }]} numberOfLines={1}>{product.name}</Text>
                  <Text style={[styles.productMeta, { color: c.textSecondary }]}>
                    {(product.orders || 0).toLocaleString()} orders · {(product.stock || 0).toLocaleString()} in stock
                  </Text>
                </View>
                <Text style={[styles.productRevenue, { color: c.text }]}>{formatPrice(product.revenue || 0)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.empty, { color: c.textSecondary, marginBottom: 12 }]}>Your best sellers will appear here.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold' },
  content: { paddingTop: 16, paddingBottom: 32, width: '100%', maxWidth: 720, alignSelf: 'center' },
  greeting: { fontSize: 14, fontFamily: 'Manrope_500Medium', marginBottom: 16 },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  tile: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  growth: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  growthText: { fontSize: 12, fontFamily: 'Manrope_700Bold' },
  tileValue: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.5 },
  tileLabel: { fontSize: 13, fontFamily: 'Manrope_500Medium', marginTop: 2 },

  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', marginBottom: 12 },
  chart: { marginLeft: -12, borderRadius: 8 },
  empty: { fontSize: 14, lineHeight: 20, fontFamily: 'Manrope_400Regular', paddingVertical: 8 },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  productImage: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  productImageFill: { width: '100%', height: '100%' },
  productBody: { flex: 1 },
  productName: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  productMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  productRevenue: { fontSize: 14, fontFamily: 'Manrope_700Bold' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  bannerText: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 2, lineHeight: 18 },

  earnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  earnLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  earnLinkText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  earnDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  earnLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  earnValue: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.5, marginTop: 2 },
  earnNote: { fontSize: 12, lineHeight: 17, fontFamily: 'Manrope_400Regular', marginTop: 12 },

  errorText: { fontSize: 15, textAlign: 'center', marginBottom: 16, fontFamily: 'Manrope_500Medium' },
  retryButton: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontSize: 15, fontFamily: 'Manrope_700Bold' },
});
