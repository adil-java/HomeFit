import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import OrderDetailsSheet from '@/components/OrderDetailsSheet';
import RefundDialog from '@/components/RefundDialog';
import { PaymentStatusPill, PayoutStatusPill } from '@/components/Pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, CreditCard, Wallet, Landmark, Hourglass, RotateCcw, RefreshCw, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { formatRs, formatDate } from '@/lib/format';

const Payments = () => {
  const [tab, setTab] = useState('payments');
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [dates, setDates] = useState({ start: '', end: '' });
  const [openId, setOpenId] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 500 };
      if (paymentFilter !== 'all') params.paymentStatus = paymentFilter;
      if (dates.start) params.startDate = dates.start;
      if (dates.end) params.endDate = dates.end;
      const [s, o, p] = await Promise.all([
        adminApi.analyticsSummary(),
        adminApi.getAdminOrders(params),
        adminApi.getPayouts(),
      ]);
      setSummary(s?.data || null);
      setOrders((o?.data || []).filter((x) => x.paymentMethod === 'card' || x.stripePaymentIntent));
      setPayouts(p?.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [paymentFilter, dates.start, dates.end]);

  const term = search.trim().toLowerCase();
  const visibleOrders = useMemo(
    () =>
      !term
        ? orders
        : orders.filter((o) =>
            [o.orderNumber, o.user?.name, o.user?.email, o.stripePaymentIntent].filter(Boolean).some((v) => v.toLowerCase().includes(term))
          ),
    [orders, term]
  );
  const visiblePayouts = useMemo(
    () =>
      payouts
        .filter((p) => payoutFilter === 'all' || p.status === payoutFilter)
        .filter(
          (p) =>
            !term ||
            [p.orderNumber, p.seller?.name, p.seller?.email, p.stripeTransferId].filter(Boolean).some((v) => v.toLowerCase().includes(term))
        ),
    [payouts, payoutFilter, term]
  );

  const fee = summary?.platformFeePercent ?? 8;

  return (
    <div>
      <PageHeader
        title="Payments"
        description={`Customers pay HomeFit through Stripe. Each seller is sent ${100 - fee}% of their items automatically; HomeFit keeps ${fee}%.`}
        action={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noreferrer">
                Stripe dashboard
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Collected" icon={CreditCard} loading={!summary && loading} value={formatRs(summary?.grossSales)} hint={`${summary?.paidOrders ?? 0} paid orders`} />
        <StatCard title="HomeFit earnings" icon={Wallet} tone="brand" loading={!summary && loading} value={formatRs(summary?.platformEarnings)} hint={`${fee}% of items sold`} />
        <StatCard title="Paid to sellers" icon={Landmark} loading={!summary && loading} value={formatRs(summary?.payoutsPaid)} hint="Sent by Stripe transfer" />
        <StatCard
          title="Payouts on hold"
          icon={Hourglass}
          tone={summary?.payoutsOnHold > 0 ? 'warning' : undefined}
          loading={!summary && loading}
          value={formatRs(summary?.payoutsOnHold)}
          hint="Sellers who haven't finished payout setup"
          onClick={() => {
            setTab('payouts');
            setPayoutFilter('on_hold');
          }}
        />
        <StatCard title="Refunded" icon={RotateCcw} loading={!summary && loading} value={formatRs(summary?.refundedAmount)} hint={`${summary?.refundedOrders ?? 0} orders`} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <TabsList>
            <TabsTrigger value="payments">Customer payments</TabsTrigger>
            <TabsTrigger value="payouts">Seller payouts</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tab === 'payments' ? 'Order, customer or Stripe ID' : 'Order, seller or transfer ID'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {tab === 'payments' ? (
            <div className="flex flex-wrap gap-2">
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Unpaid</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" aria-label="From date" className="w-[150px]" value={dates.start} onChange={(e) => setDates((d) => ({ ...d, start: e.target.value }))} />
              <Input type="date" aria-label="To date" className="w-[150px]" value={dates.end} onChange={(e) => setDates((d) => ({ ...d, end: e.target.value }))} />
              {(dates.start || dates.end || paymentFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDates({ start: '', end: '' });
                    setPaymentFilter('all');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          ) : (
            <Select value={payoutFilter} onValueChange={setPayoutFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payouts</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="payments" className="mt-0">
          <Card className="overflow-hidden shadow-none">
            {loading && orders.length === 0 ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={CreditCard} title="No payments found" description="Card payments from the app will appear here." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden text-right md:table-cell">HomeFit fee</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="hidden lg:table-cell">Seller payout</TableHead>
                      <TableHead className="w-[1%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleOrders.map((o) => (
                      <TableRow key={o.id} className="cursor-pointer" onClick={() => setOpenId(o.id)}>
                        <TableCell>
                          <p className="font-mono text-xs font-semibold">{o.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{o.user?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{o.user?.email}</p>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatRs(o.total)}</TableCell>
                        <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                          {o.platformFee > 0 ? formatRs(o.platformFee) : '—'}
                        </TableCell>
                        <TableCell>
                          <PaymentStatusPill status={o.paymentStatus} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <PayoutStatusPill status={o.payoutStatus} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {o.paymentStatus === 'PAID' && o.stripePaymentIntent && (
                            <Button variant="ghost" size="sm" onClick={() => setRefundOrder(o)}>
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                              Refund
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-0">
          <Card className="overflow-hidden shadow-none">
            {loading && payouts.length === 0 ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : visiblePayouts.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={Send} title="No payouts found" description="A payout is created for each seller when an order is paid." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="hidden text-right md:table-cell">Items</TableHead>
                      <TableHead className="hidden text-right md:table-cell">HomeFit fee</TableHead>
                      <TableHead className="text-right">Seller gets</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Stripe transfer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePayouts.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpenId(p.orderId)}>
                        <TableCell>
                          <p className="text-sm font-medium">{p.seller?.name || p.seller?.email || 'Seller'}</p>
                          <p className="text-xs text-muted-foreground">{p.seller?.email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-xs font-semibold">{p.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                        </TableCell>
                        <TableCell className="hidden text-right text-sm md:table-cell">{p.itemsValue != null ? formatRs(p.itemsValue) : '—'}</TableCell>
                        <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                          {p.platformFee != null ? formatRs(p.platformFee) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatRs(p.amount)}</TableCell>
                        <TableCell>
                          <PayoutStatusPill status={p.status} />
                          {p.status === 'on_hold' && <p className="mt-1 text-[11px] text-muted-foreground">Waiting for payout setup</p>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                          {p.stripeTransferId ? (
                            <a
                              href={`https://dashboard.stripe.com/connect/transfers/${p.stripeTransferId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                            >
                              {p.stripeTransferId.slice(0, 16)}…
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <OrderDetailsSheet orderId={openId} onOpenChange={(open) => !open && setOpenId(null)} onChanged={() => load()} />
      <RefundDialog order={refundOrder} open={!!refundOrder} onOpenChange={(v) => !v && setRefundOrder(null)} onRefunded={load} />
    </div>
  );
};

export default Payments;
