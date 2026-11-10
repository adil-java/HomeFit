import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import OrderDetailsSheet from '@/components/OrderDetailsSheet';
import { OrderStatusPill, PaymentStatusPill, ORDER_STATUS_OPTIONS } from '@/components/Pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ShoppingCart, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { formatRs, formatDate } from '@/lib/format';

const PAGE_SIZE = 20;

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || 'all');
  const [page, setPage] = useState(1);
  const openId = searchParams.get('open');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { limit: 500 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentFilter !== 'all') params.paymentStatus = paymentFilter;
      const res = await adminApi.getAdminOrders(params);
      setOrders(res?.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    setPage(1);
  }, [statusFilter, paymentFilter]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o) =>
      [
        o.orderNumber,
        o.id,
        o.user?.name,
        o.user?.email,
        ...(o.sellers || []).flatMap((s) => [s.name, s.email]),
        ...(o.items || []).map((i) => i.productName),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [orders, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setOpen = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('open', id);
    else next.delete('open');
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order on HomeFit. Open one to see items, delivery address, payment and seller payouts."
        action={
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Order number, customer, seller or product"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="sm:w-[170px]">
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
      </div>

      <Card className="overflow-hidden shadow-none">
        {loading && orders.length === 0 ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ShoppingCart}
              title="No orders found"
              description={searchTerm || statusFilter !== 'all' || paymentFilter !== 'all' ? 'Try a different search or filter.' : 'Orders placed in the app will appear here.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead className="hidden lg:table-cell">Seller</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((o) => {
                  const names = (o.items || []).map((i) => i.productName).filter(Boolean);
                  const sellers = (o.sellers || []).map((s) => s.name || s.email);
                  return (
                    <TableRow key={o.id} className="cursor-pointer" onClick={() => setOpen(o.id)}>
                      <TableCell>
                        <p className="font-mono text-xs font-semibold">{o.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{o.user?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{o.user?.email}</p>
                      </TableCell>
                      <TableCell className="hidden max-w-[220px] md:table-cell">
                        <p className="truncate text-sm">{names[0] || '—'}</p>
                        {names.length > 1 && <p className="text-xs text-muted-foreground">+{names.length - 1} more</p>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-sm">{sellers[0] || '—'}</p>
                        {sellers.length > 1 && <p className="text-xs text-muted-foreground">+{sellers.length - 1} more</p>}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatRs(o.total)}</TableCell>
                      <TableCell>
                        <PaymentStatusPill status={o.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <OrderStatusPill status={o.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <OrderDetailsSheet
        orderId={openId}
        onOpenChange={(open) => !open && setOpen(null)}
        onChanged={(fresh) => setOrders((prev) => prev.map((o) => (o.id === fresh.id ? fresh : o)))}
      />
    </div>
  );
};

export default Orders;
