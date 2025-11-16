import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { revenueData, topProducts, sellers } from '@/utils/dummyData';
import { adminApi } from '@/services/adminApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const Reports = () => {
  const [sellerSales, setSellerSales] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async (filters = {}) => {
    try {
      const res = await adminApi.analyticsSalesBySeller(filters);
      setSellerSales(res?.data || []);
    } catch (e) {
      // fallback to empty
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onApplyFilters = () => {
    fetchData({ startDate, endDate });
  };

  const onClearFilters = () => {
    setStartDate('');
    setEndDate('');
    fetchData();
  };

  const exportCsv = () => {
    const rows = [
      ['Seller Name', 'Email', 'Orders', 'Total Sales (PKR)'],
      ...sellerSales.map(s => [
        s.name || s.email || s.sellerId,
        s.email || '',
        String(s.orderCount || 0),
        String(Number(s.totalSales || 0))
      ])
    ];
    const csv = rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seller-sales-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sellerStats = sellers.map(seller => ({
    name: seller.name,
    products: seller.productsCount,
  }));

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive insights and analytics"
      />

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">Start Date</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button onClick={onApplyFilters}>Apply</Button>
        <Button variant="outline" onClick={onClearFilters}>Clear</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Seller</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sellerSales.map(s => ({
                name: s.name || s.email || s.sellerId,
                totalSales: Number(s.totalSales || 0),
                orderCount: Number(s.orderCount || 0)
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                  formatter={(value, name) => name === 'totalSales' ? [`Rs. ${Number(value).toLocaleString()}`, 'Sales'] : [value, 'Orders']}
                />
                <Bar dataKey="totalSales" name="Sales" fill="hsl(var(--primary))" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by Seller</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sellerSales.map(s => ({
                name: s.name || s.email || s.sellerId,
                orders: Number(s.orderCount || 0)
              }))}>
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
                <Bar dataKey="orders" name="Orders" fill="hsl(var(--accent))" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (6 Months)</CardTitle>
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
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products by Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={100} />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sales" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Seller Table + CSV Export */}
      <Card className="mb-6">
        <CardHeader className="flex md:flex-row md:items-center md:justify-between">
          <CardTitle>Seller Summary</CardTitle>
          <Button onClick={exportCsv} variant="outline" size="sm">Export CSV</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Seller</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-right py-2">Orders</th>
                  <th className="text-right py-2">Total Sales (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {sellerSales.map((s, idx) => (
                  <tr key={s.sellerId || s.email || idx} className="border-b hover:bg-muted/30">
                    <td className="py-2">{s.name || s.email || s.sellerId}</td>
                    <td className="py-2">{s.email || '-'}</td>
                    <td className="py-2 text-right">{Number(s.orderCount || 0).toLocaleString()}</td>
                    <td className="py-2 text-right">{Number(s.totalSales || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {sellerSales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Products by Seller</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sellerStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="products"
                >
                  {sellerStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-medium">Total Sales (6 months)</span>
                <span className="text-2xl font-bold text-primary">
                  ${revenueData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-medium">Average Monthly Revenue</span>
                <span className="text-2xl font-bold text-accent">
                  ${(revenueData.reduce((acc, curr) => acc + curr.revenue, 0) / revenueData.length).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-medium">Best Performing Month</span>
                <span className="text-2xl font-bold text-primary">
                  {revenueData.reduce((max, curr) => curr.revenue > max.revenue ? curr : max).month}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
