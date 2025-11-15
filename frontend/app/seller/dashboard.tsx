import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  CreditCard,
  Package,
  Clock,
  CheckCircle,
  Truck,
  RefreshCw
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { BackHandler } from 'react-native';
import { apiService } from '@/services/api';

const { width } = Dimensions.get('window');

// Types for our dashboard data
type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalOrders: number;
  monthlyGrowth: number;
};

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
};

const defaultRevenueByCategory: RevenueByCategory = [];

const defaultMonthlyRevenue: MonthlyRevenue = {
  labels: [],
  datasets: [{
    data: [],
    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
    strokeWidth: 2
  }]
};

const defaultTopProducts: TopProduct[] = [];

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ size: number; color: string }>;
  change: number;
  isCurrency?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  isCurrency = false 
}) => {
  const isPositive = change >= 0;
  const { theme } = useTheme();
  
  return (
    <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content style={styles.statCardContent}>
        <View style={styles.statHeader}>
          <View style={[styles.statIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Icon size={20} color={theme.colors.primary} />
          </View>
          <View
            style={[
              styles.statChangeBadge,
              {
                backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                borderColor: isPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
              }
            ]}
          >
            {isPositive ? <ArrowUpRight size={12} color="#10B981" /> : <ArrowDownRight size={12} color="#EF4444" />}
            <Text style={[styles.statChangeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
              {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        </View>
        <Text variant="titleLarge" style={[styles.statValue, { color: theme.colors.text }]}>
          {isCurrency ? `${value.toLocaleString()}` : value.toLocaleString()}
        </Text>
        <Text variant="bodySmall" style={[styles.statTitle, { color: theme.colors.secondary }]}>
          {title}
        </Text>
      </Card.Content>
    </Card>
  );
};

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory>(defaultRevenueByCategory);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue>(defaultMonthlyRevenue);
  const [topProducts, setTopProducts] = useState<TopProduct[]>(defaultTopProducts);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [statsData, revenueData, monthlyData, productsData] = await Promise.all([
        apiService.getSellerDashboardStats(),
        apiService.getRevenueByCategory(),
        apiService.getMonthlyRevenue(),
        apiService.getTopProducts()
      ]);

      // Update state with fetched data
      setStats({
        totalUsers: statsData.totalUsers || 0,
        activeUsers: statsData.activeUsers || 0,
        totalRevenue: statsData.totalRevenue || 0,
        totalOrders: statsData.totalOrders || 0,
        monthlyGrowth: statsData.monthlyGrowth || 0,
      });

      // Format revenue by category for the chart
      if (Array.isArray(revenueData)) {
        const formattedCategories = revenueData.map((item, index) => ({
          ...item,
          population: item.revenue,
          color: [
            '#FF6B6B',
            '#4ECDC4',
            '#45B7D1',
            '#96CEB4',
            '#FFEEAD'
          ][index % 5] || `#${Math.floor(Math.random()*16777215).toString(16)}`,
          legendFontColor: isDark ? '#E5E7EB' : '#7F7F7F',
          legendFontSize: 12
        }));
        setRevenueByCategory(formattedCategories);
      }

      // Format monthly revenue data
      if (monthlyData && monthlyData.labels && monthlyData.datasets) {
        setMonthlyRevenue({
          labels: monthlyData.labels,
          datasets: [{
            data: monthlyData.datasets[0]?.data || [],
            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
            strokeWidth: 2
          }]
        });
      }

      // Set top products
      if (Array.isArray(productsData)) {
        setTopProducts(productsData);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Setup refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      router.replace('/(tabs)');
      return true;
    };
  
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
  
    return () => backHandler.remove();
  }, []);

  // Show loading indicator
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show error message if any
  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error, marginBottom: 16, textAlign: 'center', paddingHorizontal: 20 }}>
          {error}
        </Text>
        <Button mode="contained" onPress={fetchDashboardData}>
          Retry
        </Button>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  // Format revenue by category for the pie chart
  const revenueByCategoryData = revenueByCategory.map((item, index) => ({
    ...item,
    population: item.revenue,
    color: [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEEAD'
    ][index % 5] || `#${Math.floor(Math.random()*16777215).toString(16)}`,
    legendFontColor: isDark ? '#E5E7EB' : '#7F7F7F',
    legendFontSize: 12
  }));

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)')}
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.text }]}>
          Dashboard
        </Text>
      </View>
      
      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={Users} 
          change={stats.monthlyGrowth} 
        />
        <StatCard 
          title="Active Users" 
          value={stats.activeUsers} 
          icon={Users} 
          change={stats.monthlyGrowth * 0.8} 
        />
        <StatCard 
          title="Total Revenue" 
          value={stats.totalRevenue} 
          icon={DollarSign} 
          isCurrency 
          change={stats.monthlyGrowth} 
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders} 
          icon={ShoppingBag} 
          change={stats.monthlyGrowth * 0.6} 
        />
      </View>

      {/* Monthly Revenue Chart */}
      <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.text }]}>
            Monthly Revenue
          </Text>
          {monthlyRevenue.labels.length > 0 ? (
            <LineChart
              data={monthlyRevenue}
              width={width - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={{ color: theme.colors.textSecondary }}>No revenue data available</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Revenue by Category Chart */}
      <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.text }]}>
            Revenue by Category
          </Text>
          {revenueByCategoryData.length > 0 ? (
            <View style={styles.pieChartWrapper}>
              <PieChart
                data={revenueByCategoryData}
                width={width - 64}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={true}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={{ color: theme.colors.textSecondary }}>No category data available</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Top Products */}
      <Card style={[styles.productsCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Top Products
            </Text>
          </View>
          
          {topProducts.length > 0 ? (
            <View style={styles.productsList}>
              {topProducts.map((product, index) => (
                <TouchableOpacity 
                  key={product.id}
                  style={[
                    styles.productItem,
                    index !== topProducts.length - 1 && styles.productItemBorder,
                    { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                  ]}
                  onPress={() => router.push(`/seller/products/${product.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.productImage,
                    { 
                      backgroundColor: isDark ? `${theme.colors.primary}26` : 'rgba(79, 70, 229, 0.1)',
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }
                  ]}>
                    {product.image ? (
                      <Image 
                        source={{ uri: product.image }} 
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Package size={20} color={theme.colors.primary} />
                    )}
                  </View>
                  
                  <View style={styles.productContent}>
                    <Text 
                      style={[styles.productName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>
                    
                    <View style={styles.productStats}>
                      <View style={styles.productStatItem}>
                        <Text style={[styles.productStatLabel, { color: theme.colors.textSecondary }]}>
                          Revenue
                        </Text>
                        <Text style={[styles.productStatValue, { color: theme.colors.primary }]}>
                          PKR {product.revenue?.toLocaleString() || '0'}
                        </Text>
                      </View>
                      
                      <View style={styles.productStatItem}>
                        <Text style={[styles.productStatLabel, { color: theme.colors.textSecondary }]}>
                          Orders
                        </Text>
                        <Text style={[styles.productStatValue, { color: theme.colors.primary }]}>
                          {product.orders?.toLocaleString() || '0'}
                        </Text>
                      </View>
                      
                      <View style={styles.productStatItem}>
                        <Text style={[styles.productStatLabel, { color: theme.colors.textSecondary }]}>
                          Stock
                        </Text>
                        <Text style={[styles.productStatValue, { color: theme.colors.primary }]}>
                          {product.stock?.toLocaleString() || '0'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={{ color: theme.colors.textSecondary }}>No products data available</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentContainer: {
    marginTop: 50,
    padding: 16,
    paddingBottom: 32,
  },
  
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontWeight: '700',
    flex: 1,
  },
  
  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statChangeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  
  // Charts
  chartCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  
  // Products Section
  productsCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  productsList: {
    marginTop: 8,
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  productItemBorder: {
    borderBottomWidth: 1,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productContent: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productStatItem: {
    flex: 1,
  },
  productStatLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  productStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});