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

const { width } = Dimensions.get('window');


// Mock data - replace with actual API calls
export const statsData = {
  totalUsers: 2540,
  activeUsers: 1840,
  totalRevenue: 486000,
  totalOrders: 920,
  monthlyGrowth: 14.2,

  revenueByCategory: [
    { name: 'Sofas', population: 30, color: '#FF6B6B', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Beds', population: 35, color: '#4ECDC4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Dining Tables', population: 25, color: '#45B7D1', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Chairs', population: 5, color: '#96CEB4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Other', population: 5, color: '#FFEEAD', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ],

  monthlyRevenue: {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      {
        data: [52000, 73500, 60200, 84500, 92800, 123000],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }
    ]
  },

  topProducts: [
    {
      id: '040f98bf-73ce-4ee0-abff-c90ee08b3b9d',
      name: 'Velvet Chesterfield Sofa',
      revenue: 182000,
      orders: 220,
      stock: 12
    },
    {
      id: 'f676bf63-db27-4eda-9b68-ee1ee3c591ec',
      name: 'Industrial Metal Canopy Bed',
      revenue: 156000,
      orders: 190,
      stock: 18
    },
    {
      id: 'c143a48f-cfb8-4c92-80cd-441beb447fa0',
      name: 'Modern Oak Dining Table',
      revenue: 98000,
      orders: 150,
      stock: 15
    }
  ],

  trendingProducts: [
    {
      id: '040f98bf-73ce-4ee0-abff-c90ee08b3b9d',
      name: 'Velvet Chesterfield Sofa',
      category: 'Sofas',
      price: 1499.99,
      sales: 220,
      revenue: 329997.8,
      growth: 22.5,
      stock: 12,
      rating: 4.7,
      image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760469014/ecommerce/products/zea2mvkeguferzogxjfq.jpg'
    },
    {
      id: 'f676bf63-db27-4eda-9b68-ee1ee3c591ec',
      name: 'Industrial Metal Canopy Bed',
      category: 'Beds',
      price: 999.99,
      sales: 190,
      revenue: 189998.1,
      growth: 18.3,
      stock: 18,
      rating: 4.8,
      image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760470454/ecommerce/products/khlt31mjw6ejdwmrz28t.jpg'
    },
    {
      id: 'c143a48f-cfb8-4c92-80cd-441beb447fa0',
      name: 'Modern Oak Dining Table',
      category: 'Dining',
      price: 899.99,
      sales: 150,
      revenue: 134998.5,
      growth: 16.4,
      stock: 15,
      rating: 4.5,
      image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760467967/ecommerce/products/uwutybzwqdyzbbnizsic.jpg'
    },
    {
      id: '7d38a558-5d35-496e-84ea-d5216a6f9dfc',
      name: 'Upholstered Linen Platform Bed',
      category: 'Beds',
      price: 749.99,
      sales: 175,
      revenue: 131248.25,
      growth: 20.1,
      stock: 25,
      rating: 4.4,
      image: 'https://res.cloudinary.com/dmpinsiam/image/upload/v1760468327/ecommerce/products/vxhlmqpx0wlkqmg8yeyj.webp'
    }
  ]
};

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(statsData);

    // Handle hardware back button press
    useEffect(() => {
      const backAction = () => {
        router.replace('/(tabs)');
        return true; // Prevent default behavior
      };
  
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );
  
      return () => backHandler.remove();
    }, []);

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

  const revenueByCategoryData = isDark
    ? stats.revenueByCategory.map((d) => ({ ...d, legendFontColor: '#E5E7EB' }))
    : stats.revenueByCategory;

  const StatCard = ({ title, value, icon: Icon, change, isCurrency = false }) => {
    const isPositive = change >= 0;
    
    return (
      <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
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
              {isPositive ? <ArrowUpRight size={14} color="#10B981" /> : <ArrowDownRight size={14} color="#EF4444" />}
              <Text style={[styles.statChangeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                {Math.abs(change)}%
              </Text>
            </View>
          </View>
          <Text variant="titleLarge" style={[styles.statValue, { color: theme.colors.text }]}>
            {isCurrency ? `Rs. ${value.toLocaleString()}` : value.toLocaleString()}
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
      <View style={styles.headerRow}>
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)')}
          style={[styles.backButtonInline, { backgroundColor: theme.colors.surface }]}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.text, marginBottom: 0 }]}>
          Dashboard
        </Text>
      </View>
      
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
              data={revenueByCategoryData}
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
            <TouchableOpacity onPress={() => router.push('/seller/products')}>
              <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '500' }}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsList}>
            {stats.trendingProducts.map((product, index) => (
              <TouchableOpacity 
                key={product.id}
                style={[
                  styles.productItem,
                  index !== stats.trendingProducts.length - 1 && styles.productItemBorder,
                  index !== stats.trendingProducts.length - 1 && { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                ]}
                onPress={() => router.push(`/seller/products/${product.id}`)}
              >
                <View style={[
                  styles.productImage,
                  { backgroundColor: isDark ? `${theme.colors.primary}26` : 'rgba(79, 70, 229, 0.1)' }
                ]}>
                  <Package size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <View style={styles.productMeta}>
                      <Text style={[
                        styles.productCategory,
                        { 
                          color: theme.colors.textSecondary,
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'
                        }
                      ]}>{product.category}</Text>
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
  statChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  backButtonInline: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
    elevation: 2,
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
