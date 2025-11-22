import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Store, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  UserCheck, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Clock,
  Eye,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  BarChart as BarChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { adminApi } from '@/services/adminApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    totalUsersExcludingAdmin: 0,
    activeSellers: 0,
    pendingRequests: 0,
    totalProducts: 0,
    totalOrders: 0,
    revenue: 0,
  });

  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesBySeller, setSalesBySeller] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Sample activity data - you can replace with real API data
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [
        statsRes,
        revenueRes,
        topProductsRes,
        salesBySellerRes,
        ordersRes,
        usersRes
      ] = await Promise.all([
        adminApi.analyticsSummary().catch((err) => {
          console.warn('Failed to fetch stats:', err);
          return { data: stats };
        }),
        adminApi.analyticsRevenueMonthly().catch((err) => {
          console.warn('Failed to fetch revenue data:', err);
          return { data: [] };
        }),
        adminApi.analyticsTopProducts().catch((err) => {
          console.warn('Failed to fetch top products:', err);
          return { data: [] };
        }),
        adminApi.analyticsSalesBySeller().catch((err) => {
          console.warn('Failed to fetch sales by seller:', err);
          return { data: [] };
        }),
        adminApi.getAdminOrders({ limit: 5 }).catch((err) => {
          console.warn('Failed to fetch recent orders:', err);
          return { data: [] };
        }),
        adminApi.getUsers().catch((err) => {
          console.warn('Failed to fetch users:', err);
          return { data: [] };
        })
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      setRevenueData(revenueRes?.data || []);
      setTopProducts(topProductsRes?.data || []);
      setSalesBySeller(salesBySellerRes?.data || []);
      setRecentOrders(ordersRes?.data || []);
      setRecentUsers((usersRes?.data || []).slice(0, 5));
      
      // Generate recent activity from various data sources
      const activities = [];
      
      // Add recent orders to activity
      (ordersRes?.data || []).slice(0, 3).forEach(order => {
        activities.push({
          id: `order-${order.id}`,
          action: 'New Order',
          details: `Order #${order.orderNumber || order.id.slice(0, 8)} - Rs. ${Number(order.total).toLocaleString()}`,
          time: formatTimeAgo(order.createdAt),
          type: 'order',
          status: order.status
        });
      });

      // Add recent users to activity
      (usersRes?.data || []).slice(0, 2).forEach(user => {
        if (user.role !== 'ADMIN') {
          activities.push({
            id: `user-${user.id}`,
            action: user.role === 'SELLER' ? 'New Seller Joined' : 'New Customer Registered',
            details: user.name || user.email,
            time: formatTimeAgo(user.createdAt),
            type: user.role === 'SELLER' ? 'seller' : 'user',
            status: 'active'
          });
        }
      });

      // Add system activities for demonstration
      if (activities.length < 3) {
        activities.push({
          id: 'system-1',
          action: 'System Update',
          details: 'Dashboard refreshed successfully',
          time: 'Just now',
          type: 'system',
          status: 'completed'
        });
      }

      setRecentActivity(activities.sort((a, b) => new Date(b.time) - new Date(a.time)));
      setLastUpdated(new Date());
      
      toast.success('Dashboard data updated successfully');
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load some dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type, status) => {
    switch (type) {
      case 'order':
        return status === 'COMPLETED' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
               status === 'CANCELLED' ? <XCircle className="h-4 w-4 text-red-600" /> :
               <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'seller':
        return <Store className="h-4 w-4 text-purple-600" />;
      case 'user':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'product':
        return <Package className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (isLoading && revenueData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Admin Dashboard"
            description="Loading dashboard data..."
          />
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Admin Dashboard"
          description="Comprehensive overview of your e-commerce platform"
        />
        <div className="flex items-center gap-3">
          {/* Notification indicator */}
          {stats.pendingRequests > 0 && (
            <Button 
              onClick={() => navigate('/seller-requests')} 
              variant="outline" 
              size="sm"
              className="relative"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                {stats.pendingRequests}
              </Badge>
            </Button>
          )}
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button 
            onClick={fetchDashboardData} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`Rs. ${Number(stats.revenue).toLocaleString()}`}
          description="Total platform revenue"
          icon={DollarSign}
          trend={{ value: '23% from last month', isPositive: true }}
          iconColor="text-green-600"
        />
        <StatCard
          title="Active Users"
          value={stats.totalUsersExcludingAdmin}
          description={`${stats.adminCount} admin${stats.adminCount !== 1 ? 's' : ''} excluded`}
          icon={Users}
          trend={{ value: '12% from last month', isPositive: true }}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          description="Orders processed"
          icon={ShoppingCart}
          trend={{ value: '15% from last month', isPositive: true }}
          iconColor="text-purple-600"
        />
        <StatCard
          title="Active Products"
          value={stats.totalProducts}
          description="Listed products"
          icon={Package}
          trend={{ value: '8% from last month', isPositive: true }}
          iconColor="text-orange-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seller Management</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{stats.activeSellers}</span>
                <Badge variant="secondary">Active Sellers</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Requests</span>
                <Badge className={stats.pendingRequests > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}>
                  {stats.pendingRequests}
                </Badge>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/sellers')}
              >
                Manage Sellers
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/products')}>
                <Package className="h-4 w-4 mr-2" />
                View Products
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/orders')}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Manage Orders
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/categories')}>
                <UserCheck className="h-4 w-4 mr-2" />
                Categories
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">System Status</span>
                <Badge className="bg-green-100 text-green-800">Online</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Database</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Payment Gateway</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  interval={0}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Orders
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
                <Eye className="h-4 w-4 mr-1" />
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No recent orders
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">#{order.orderNumber || order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.user?.name || 'Unknown Customer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">Rs. {Number(order.total).toLocaleString()}</p>
                      <Badge className={`text-xs ${getStatusBadgeColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </span>
              <div className="text-xs text-muted-foreground">
                Live Updates
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No recent activity
                </div>
              ) : (
                recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type, activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.details}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Seller Chart */}
      {salesBySeller.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Sales Performance by Seller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesBySeller.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="totalSales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
