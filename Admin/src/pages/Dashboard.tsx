import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Store, Package, ShoppingCart, DollarSign, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { adminApi } from '@/services/adminApi';

const Dashboard = () => {
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

  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sales: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.analyticsSummary();
        if (res?.data) {
          setStats(res.data);
        }
      } catch (e) {}

      try {
        const rev = await adminApi.analyticsRevenueMonthly();
        setRevenueData(rev?.data || []);
      } catch (e) {}

      try {
        const top = await adminApi.analyticsTopProducts();
        setTopProducts(top?.data || []);
      } catch (e) {}
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your furniture marketplace"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsersExcludingAdmin}
          description={`Registered customers (excl. ${stats.adminCount} admin)`}
          icon={Users}
          trend={{ value: '12% from last month', isPositive: true }}
        />
        <StatCard
          title="Active Sellers"
          value={stats.activeSellers}
          description="Approved sellers"
          icon={Store}
          trend={{ value: '5% from last month', isPositive: true }}
          iconColor="text-accent"
        />
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          description="Seller applications"
          icon={UserCheck}
          iconColor="text-warning"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          description="Listed items"
          icon={Package}
          trend={{ value: '8% from last month', isPositive: true }}
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          description="All time orders"
          icon={ShoppingCart}
          trend={{ value: '15% from last month', isPositive: true }}
        />
        <StatCard
          title="Revenue"
          value={`$${Number(stats.revenue).toLocaleString()}`}
          description="Total revenue"
          icon={DollarSign}
          trend={{ value: '23% from last month', isPositive: true }}
          iconColor="text-accent"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
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
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="sales" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'New seller request', details: 'New Furniture Co', time: '2 minutes ago', type: 'request' },
              { action: 'Order completed', details: 'Order #892 delivered', time: '1 hour ago', type: 'order' },
              { action: 'Product approved', details: 'Modern Sofa by Furniture Plus', time: '3 hours ago', type: 'product' },
              { action: 'New user registered', details: 'john@example.com', time: '5 hours ago', type: 'user' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.details}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
