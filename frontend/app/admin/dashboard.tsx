import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Package,
  Clock,
  CheckCircle,
  Truck,
  RefreshCw
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock data - replace with actual API calls
const statsData = {
  totalUsers: 1245,
  activeUsers: 843,
  totalRevenue: 12500,
  totalOrders: 356,
  monthlyGrowth: 12.5,
  revenueByCategory: [
    { name: 'Electronics', population: 35, color: '#FF6B6B', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Furniture', population: 25, color: '#4ECDC4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Clothing', population: 20, color: '#45B7D1', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Books', population: 15, color: '#96CEB4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Other', population: 5, color: '#FFEEAD', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ],
  monthlyRevenue: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [2000, 4500, 2800, 8000, 9900, 12500],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }
    ]
  },
  topProducts: [
    { id: '1', name: 'Wireless Earbuds Pro', revenue: 3200, orders: 45, stock: 28 },
    { id: '2', name: 'Smart Watch X', revenue: 2800, orders: 32, stock: 15 },
    { id: '3', name: 'Bluetooth Speaker', revenue: 1850, orders: 27, stock: 12 },
  ],
  trendingProducts: [
    {
      id: '1',
      name: 'Wireless Earbuds Pro',
      category: 'Electronics',
      price: 129.99,
      sales: 1280,
      revenue: 166387.20,
      growth: 24.5,
      stock: 42,
      rating: 4.8
    },
    {
      id: '2',
      name: 'Smart Watch X',
      category: 'Wearables',
      price: 199.99,
      sales: 845,
      revenue: 168991.55,
      growth: 18.2,
      stock: 36,
      rating: 4.7
    },
    {
      id: '3',
      name: 'Bluetooth Speaker',
      category: 'Audio',
      price: 79.99,
      sales: 1560,
      revenue: 124784.40,
      growth: 32.1,
      stock: 28,
      rating: 4.6
    },
    {
      id: '4',
      name: 'Fitness Tracker',
      category: 'Wearables',
      price: 59.99,
      sales: 2100,
      revenue: 125979.00,
      growth: 41.3,
      stock: 15,
      rating: 4.5
    },
    {
      id: '5',
      name: 'Wireless Charger',
      category: 'Accessories',
      price: 29.99,
      sales: 3250,
      revenue: 97467.50,
      growth: 28.7,
      stock: 64,
      rating: 4.4
    }
  ]
};

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(statsData);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const StatCard = ({ title, value, icon: Icon, change, isCurrency = false }) => {
    const isPositive = change >= 0;
    
    return (
      <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Icon size={20} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statChange, { color: isPositive ? '#10B981' : '#EF4444' }]}>
              {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {Math.abs(change)}%
            </Text>
          </View>
          <Text variant="titleLarge" style={[styles.statValue, { color: theme.colors.text }]}>
            {isCurrency ? `$${value.toLocaleString()}` : value.toLocaleString()}
          </Text>
          <Text variant="bodyMedium" style={[styles.statTitle, { color: theme.colors.secondary }]}>
            {title}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.text }]}>
        Dashboard
      </Text>
      
      <View style={styles.statsContainer}>
        <StatCard 
          title="Total Revenue" 
          value={stats.totalRevenue} 
          icon={DollarSign} 
          change={8.2} 
        />
        <StatCard 
          title="Conversion Rate" 
          value={stats.totalOrders} 
          icon={TrendingUp} 
          change={12.5} 
        />
        <StatCard 
          title="Avg. Order Value" 
          value={stats.totalRevenue} 
          icon={CreditCard} 
          change={stats.monthlyGrowth} 
          isCurrency
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders} 
          icon={ShoppingBag} 
          change={5.3} 
        />
      </View>

      <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.text }]}>
            Monthly Revenue
          </Text>
          <LineChart
            data={stats.monthlyRevenue}
            width={width - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>

      <View style={styles.row}>
        <Card style={[styles.pieChartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.text }]}>
              Revenue by Category
            </Text>
            <PieChart
              data={stats.revenueByCategory}
              width={width - 48}
              height={200}
              chartConfig={chartConfig}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[0, 0]}
              absolute
              style={styles.chart}
            />
          </Card.Content>
        </Card>
      </View>

      {/* Top Trending Products Section */}
      <Card style={[styles.trendingCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Top Trending Products
            </Text>
            <TouchableOpacity onPress={() => router.push('/admin/products')}>
              <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '500' }}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsList}>
            {stats.trendingProducts.map((product, index) => (
              <TouchableOpacity 
                key={product.id}
                style={[styles.productItem, index !== stats.trendingProducts.length - 1 && styles.productItemBorder]}
                onPress={() => router.push(`/admin/products/${product.id}`)}
              >
                <View style={styles.productImage}>
                  <Package size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <View style={styles.productMeta}>
                      <Text style={[styles.productCategory, { color: theme.colors.textSecondary }]}>{product.category}</Text>
                      <View style={styles.ratingContainer}>
                        <Text style={[styles.ratingText, { color: '#F59E0B' }]}>{product.rating}</Text>
                        <Text style={[styles.ratingIcon, { color: '#F59E0B' }]}>★</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.productStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sales</Text>
                      <Text style={[styles.statValue, { color: theme.colors.primary }]}>{product.sales.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Revenue</Text>
                      <Text style={[styles.statValue, { color: theme.colors.primary }]}>${(product.revenue / 1000).toFixed(1)}K</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Growth</Text>
                      <View style={styles.growthBadge}>
                        <ArrowUpRight size={12} color="#10B981" />
                        <Text style={[styles.growthText, { color: '#10B981' }]}>{product.growth}%</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    marginTop:50,
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 24,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  pieChartCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  chartTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
  },
  trendingCard: {
    marginBottom: 16,
    borderRadius: 12,
    marginTop: 12,
    elevation: 2,
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
    borderRadius: 8,
    overflow: 'hidden',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  productItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCategory: {
    fontSize: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
  },
  ratingIcon: {
    fontSize: 11,
    lineHeight: 16,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  growthText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
});
