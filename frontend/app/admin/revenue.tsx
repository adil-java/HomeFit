import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text, Card, SegmentedButtons, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  User,
  CreditCard,
  PieChart as PieChartIcon,
  BarChart2,
  LineChart as LineChartIcon
} from 'lucide-react-native';

// Mock data - replace with actual API calls
const revenueData = {
  totalRevenue: 45600,
  monthlyGrowth: 12.5,
  totalOrders: 1245,
  averageOrderValue: 36.62,
  revenueByCategory: [
    { name: 'Electronics', value: 15980, color: '#FF6B6B', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Furniture', value: 12500, color: '#4ECDC4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Clothing', value: 8500, color: '#45B7D1', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Books', value: 5620, color: '#96CEB4', legendFontColor: '#7F7F7F', legendFontSize: 12 },
    { name: 'Other', value: 3000, color: '#FFEEAD', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  ],
  topSellers: [
    { id: '1', name: 'John\'s Electronics', revenue: 12500, orders: 342, growth: 8.2 },
    { id: '2', name: 'Smith Fashion', revenue: 9800, orders: 287, growth: 15.7 },
    { id: '3', name: 'Mike\'s Books', revenue: 7850, orders: 215, growth: 5.3 },
    { id: '4', name: 'Tech Haven', revenue: 6420, orders: 178, growth: 22.1 },
    { id: '5', name: 'Fashion Forward', revenue: 5230, orders: 156, growth: -3.4 },
  ],
  monthlyRevenue: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [12500, 18900, 15700, 23800, 38400, 45600],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }
    ]
  },
  revenueByChannel: {
    labels: ['Direct', 'Organic', 'Referral', 'Social', 'Email'],
    data: [0.4, 0.3, 0.15, 0.1, 0.05],
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD']
  }
};

const timeRanges = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '3M', value: '3m' },
  { label: '12M', value: '12m' },
  { label: 'All', value: 'all' },
];

export default function RevenueScreen() {
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('line');
  const [showChartMenu, setShowChartMenu] = useState(false);
  const [data, setData] = useState(revenueData);

  // Fetch revenue data based on selected time range
  const fetchRevenueData = async (range: string) => {
    setLoading(true);
    try {
      // Replace with actual API call
      // const response = await fetch(`/api/admin/revenue?range=${range}`);
      // const result = await response.json();
      // setData(result);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData(timeRange);
  }, [timeRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode, change?: number) => {
    const isPositive = change ? change >= 0 : false;
    
    return (
      <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.statHeader}>
            <View style={[styles.statIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
              {icon}
            </View>
            {change !== undefined && (
              <View style={[styles.changeBadge, { backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2' }]}>
                {isPositive ? (
                  <ArrowUpRight size={14} color="#065F46" />
                ) : (
                  <ArrowDownRight size={14} color="#B91C1C" />
                )}
                <Text style={[styles.changeText, { color: isPositive ? '#065F46' : '#B91C1C' }]}>
                  {Math.abs(change)}%
                </Text>
              </View>
            )}
          </View>
          <Text variant="titleLarge" style={[styles.statValue, { color: theme.colors.text }]}>
            {typeof value === 'number' && !isNaN(value) ? formatCurrency(value) : value}
          </Text>
          <Text variant="bodyMedium" style={[styles.statTitle, { color: theme.colors.secondary }]}>
            {title}
          </Text>
        </Card.Content>
      </Card>
    );
  };

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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.text }]}>
            Revenue Overview
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
            Track your sales and revenue performance
          </Text>
        </View>
        <SegmentedButtons
          value={timeRange}
          onValueChange={setTimeRange}
          buttons={timeRanges.map(range => ({
            value: range.value,
            label: range.label,
          }))}
          style={styles.segmentedButtons}
          density="small"
        />
      </View>

      <View style={styles.statsContainer}>
        {renderStatCard(
          'Total Revenue', 
          data.totalRevenue, 
          <DollarSign size={20} color={theme.colors.primary} />,
          data.monthlyGrowth
        )}
        {renderStatCard(
          'Total Orders', 
          data.totalOrders, 
          <ShoppingBag size={20} color={theme.colors.primary} />,
          5.3
        )}
        {renderStatCard(
          'Avg. Order Value', 
          data.averageOrderValue, 
          <CreditCard size={20} color={theme.colors.primary} />,
          2.8
        )}
        {renderStatCard(
          'Active Sellers', 
          data.topSellers.length, 
          <User size={20} color={theme.colors.primary} />,
          8.7
        )}
      </View>

      <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.text }]}>
              Revenue Trend
            </Text>
            <View style={styles.chartActions}>
              <Menu
                visible={showChartMenu}
                onDismiss={() => setShowChartMenu(false)}
                anchor={
                  <TouchableOpacity onPress={() => setShowChartMenu(true)}>
                    {chartType === 'line' && <LineChartIcon size={20} color={theme.colors.primary} />}
                    {chartType === 'bar' && <BarChart2 size={20} color={theme.colors.primary} />}
                    {chartType === 'pie' && <PieChartIcon size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>
                }
              >
                <Menu.Item 
                  onPress={() => { setChartType('line'); setShowChartMenu(false); }} 
                  title="Line Chart" 
                  leadingIcon={() => <LineChartIcon size={20} color={theme.colors.primary} />}
                />
                <Menu.Item 
                  onPress={() => { setChartType('bar'); setShowChartMenu(false); }} 
                  title="Bar Chart"
                  leadingIcon={() => <BarChart2 size={20} color={theme.colors.primary} />}
                />
                <Menu.Item 
                  onPress={() => { setChartType('pie'); setShowChartMenu(false); }} 
                  title="Pie Chart"
                  leadingIcon={() => <PieChartIcon size={20} color={theme.colors.primary} />}
                />
              </Menu>
              <TouchableOpacity style={styles.downloadButton}>
                <Download size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {chartType === 'line' && (
            <LineChart
              data={data.monthlyRevenue}
              width={Dimensions.get('window').width - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisLabel="$"
              yAxisSuffix=""
            />
          )}
          
          {chartType === 'bar' && (
            <BarChart
              data={{
                labels: data.monthlyRevenue.labels,
                datasets: data.monthlyRevenue.datasets,
              }}
              width={Dimensions.get('window').width - 48}
              height={220}
              yAxisLabel="$"
              chartConfig={chartConfig}
              style={styles.chart}
            />
          )}
          
          {chartType === 'pie' && (
            <View style={styles.pieChartContainer}>
              <PieChart
                data={data.revenueByCategory}
                width={Dimensions.get('window').width - 48}
                height={220}
                chartConfig={chartConfig}
                accessor={"value"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[0, 0]}
                absolute
              />
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.row}>
        <Card style={[styles.halfCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.text }]}>
              Revenue by Category
            </Text>
            <PieChart
              data={data.revenueByCategory}
              width={Dimensions.get('window').width / 2 - 36}
              height={180}
              chartConfig={chartConfig}
              accessor={"value"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[0, 0]}
              absolute
              style={styles.smallChart}
            />
            <View style={styles.legendContainer}>
              {data.revenueByCategory.map((category, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: category.color }]} />
                  <Text style={[styles.legendText, { color: theme.colors.text }]} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={[styles.legendValue, { color: theme.colors.primary }]}>
                    {formatCurrency(category.value)}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.halfCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.text }]}>
              Top Sellers
            </Text>
            <View style={styles.sellersList}>
              {data.topSellers.map((seller, index) => (
                <View key={seller.id} style={styles.sellerItem}>
                  <View style={styles.sellerInfo}>
                    <Text style={[styles.sellerName, { color: theme.colors.text }]} numberOfLines={1}>
                      {index + 1}. {seller.name}
                    </Text>
                    <Text style={[styles.sellerRevenue, { color: theme.colors.primary }]}>
                      {formatCurrency(seller.revenue)}
                    </Text>
                  </View>
                  <View style={[styles.growthBadge, { 
                    backgroundColor: seller.growth >= 0 ? '#D1FAE5' : '#FEE2E2' 
                  }]}>
                    {seller.growth >= 0 ? (
                      <ArrowUpRight size={12} color="#065F46" />
                    ) : (
                      <ArrowDownRight size={12} color="#B91C1C" />
                    )}
                    <Text style={[styles.growthText, { 
                      color: seller.growth >= 0 ? '#065F46' : '#B91C1C' 
                    }]}>
                      {Math.abs(seller.growth)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    marginTop: 50
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  segmentedButtons: {
    maxWidth: 300,
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
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
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
  chartCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontWeight: '600',
  },
  chartActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    marginLeft: 8,
    padding: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfCard: {
    width: '48%',
    borderRadius: 12,
    elevation: 2,
  },
  smallChart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  legendContainer: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    marginRight: 8,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  sellersList: {
    marginTop: 8,
  },
  sellerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  sellerInfo: {
    flex: 1,
    marginRight: 8,
  },
  sellerName: {
    fontSize: 13,
    marginBottom: 2,
  },
  sellerRevenue: {
    fontSize: 12,
    fontWeight: '600',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
});
