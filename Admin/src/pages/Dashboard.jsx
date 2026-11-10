import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { OrderStatusPill, PaymentStatusPill } from '@/components/Pill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CreditCard,
  Wallet,
  Landmark,
  Truck,
  Users,
  Store,
  Package,
  UserCheck,
  Hourglass,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { formatRs, formatNumber, timeAgo } from '@/lib/format';

const compactRs = (v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

const ChartTooltip = ({ active, payload, label, money }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-popover-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {money ? formatRs(p.value) : `${formatNumber(p.value)} sold`}
          {p.payload.orders != null && money ? ` · ${p.payload.orders} orders` : ''}
        </p>
      ))}
    </div>
  );
};

const AttentionItem = ({ icon: Icon, title, detail, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors hover:bg-muted/60"
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block truncate text-xs text-muted-foreground">{detail}</span>
    </span>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </button>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [sellerSales, setSellerSales] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      adminApi.analyticsSummary(),
      adminApi.analyticsRevenueMonthly(),
      adminApi.analyticsTopProducts(),
      adminApi.analyticsSalesBySeller(),
      adminApi.getAdminOrders({ limit: 6 }),
    ]);
    const [s, r, t, ss, o] = results.map((x) => (x.status === 'fulfilled' ? x.value?.data : null));
    if (s) setStats(s);
    setRevenue(r || []);
    setTopProducts(t || []);
    setSellerSales(ss || []);
    setRecentOrders(o || []);
    if (results.some((x) => x.status === 'rejected')) toast.error('Some dashboard data could not be loaded');
    setUpdatedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const attention = [];
  if (stats?.pendingRequests > 0)
    attention.push({
      icon: UserCheck,
      title: `${stats.pendingRequests} seller request${stats.pendingRequests > 1 ? 's' : ''} to review`,
      detail: 'New sellers are waiting for approval',
      to: '/seller-requests',
    });
  if (stats?.ordersToShip > 0)
    attention.push({
      icon: Truck,
      title: `${stats.ordersToShip} paid order${stats.ordersToShip > 1 ? 's' : ''} not shipped yet`,
      detail: 'Pending or processing orders that customers have paid for',
      to: '/orders?payment=PAID',
    });
  if (stats?.payoutsOnHold > 0)
    attention.push({
      icon: Hourglass,
      title: `${formatRs(stats.payoutsOnHold)} in seller payouts on hold`,
      detail: "Sellers who haven't finished payout setup in the app",
      to: '/payments',
    });

  const hasRevenue = revenue.some((m) => m.revenue > 0);
  const fee = stats?.platformFeePercent ?? 8;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Loading…'}
        action={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Sales" icon={CreditCard} loading={!stats && loading} value={formatRs(stats?.grossSales)} hint={`${formatNumber(stats?.paidOrders)} paid orders`} onClick={() => navigate('/payments')} />
        <StatCard title="HomeFit earnings" icon={Wallet} tone="brand" loading={!stats && loading} value={formatRs(stats?.platformEarnings)} hint={`${fee}% fee on items sold`} onClick={() => navigate('/payments')} />
        <StatCard title="Paid to sellers" icon={Landmark} loading={!stats && loading} value={formatRs(stats?.payoutsPaid)} hint={stats?.payoutsOnHold > 0 ? `${formatRs(stats.payoutsOnHold)} on hold` : 'Nothing on hold'} onClick={() => navigate('/payments')} />
        <StatCard title="Orders to ship" icon={Truck} tone={stats?.ordersToShip > 0 ? 'warning' : undefined} loading={!stats && loading} value={formatNumber(stats?.ordersToShip)} hint={`${formatNumber(stats?.totalOrders)} orders in total`} onClick={() => navigate('/orders?payment=PAID')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Customers" icon={Users} loading={!stats && loading} value={formatNumber(stats?.customers)} onClick={() => navigate('/users')} />
        <StatCard title="Sellers" icon={Store} loading={!stats && loading} value={formatNumber(stats?.sellers)} onClick={() => navigate('/sellers')} />
        <StatCard title="Live products" icon={Package} loading={!stats && loading} value={formatNumber(stats?.activeProducts)} hint={`${formatNumber(stats?.totalProducts)} listed in total`} onClick={() => navigate('/products')} />
        <StatCard title="Seller requests" icon={UserCheck} tone={stats?.pendingRequests > 0 ? 'warning' : undefined} loading={!stats && loading} value={formatNumber(stats?.pendingRequests)} hint="Waiting for review" onClick={() => navigate('/seller-requests')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales, last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            {hasRevenue ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenue} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={compactRs} width={48} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltip money />} />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                {loading ? 'Loading…' : 'No paid orders in the last 6 months yet.'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!stats && loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)
            ) : !stats ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Couldn't load. Try Refresh.</p>
            ) : attention.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <p className="text-sm font-semibold">All caught up</p>
                <p className="text-xs text-muted-foreground">No requests, unshipped paid orders or held payouts.</p>
              </div>
            ) : (
              attention.map((a) => <AttentionItem key={a.title} {...a} onClick={() => navigate(a.to)} />)
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent orders</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
              All orders
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {recentOrders.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">{loading ? 'Loading…' : 'No orders yet'}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="hidden sm:table-cell">Payment</TableHead>
                      <TableHead className="pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => (
                      <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders?open=${o.id}`)}>
                        <TableCell className="pl-6">
                          <p className="font-mono text-xs font-semibold">{o.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo(o.createdAt)}</p>
                        </TableCell>
                        <TableCell className="text-sm">{o.user?.name || o.user?.email || '—'}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatRs(o.total)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <PaymentStatusPill status={o.paymentStatus} />
                        </TableCell>
                        <TableCell className="pr-6">
                          <OrderStatusPill status={o.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Best sellers</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{loading ? 'Loading…' : 'No sales yet'}</p>
            ) : (
              <ol className="space-y-3">
                {topProducts.map((p, i) => {
                  const max = topProducts[0]?.sales || 1;
                  return (
                    <li key={p.productId || p.name}>
                      <button type="button" className="w-full text-left" onClick={() => p.productId && navigate(`/products/${p.productId}`)}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium">
                            <span className="mr-2 text-muted-foreground">{i + 1}</span>
                            {p.name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatNumber(p.sales)} sold</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(6, (p.sales / max) * 100)}%` }} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {sellerSales.length > 0 && (
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Sales by seller</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sellers')}>
              All sellers
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(120, sellerSales.slice(0, 8).length * 40)}>
              <BarChart data={sellerSales.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={compactRs} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={130} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltip money />} />
                <Bar dataKey="totalSales" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
