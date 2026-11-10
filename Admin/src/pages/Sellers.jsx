import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { PaymentSetupPill } from '@/components/Pill';
import { useConfirm } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Store, Package, Landmark, Hourglass, MoreHorizontal, UserX, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { formatRs, formatDate, formatNumber } from '@/lib/format';

const Metric = ({ label, value }) => (
  <div className="rounded-md bg-muted/60 px-3 py-2">
    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sharePercent, setSharePercent] = useState(92);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSellers();
      setSellers(res?.data || []);
      if (res?.sellerSharePercent) setSharePercent(res.sellerSharePercent);
    } catch (e) {
      toast.error(e?.message || 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(
    () => ({
      count: sellers.length,
      ready: sellers.filter((s) => s.paymentSetup === 'ready').length,
      sales: sellers.reduce((t, s) => t + s.totalSales, 0),
      paid: sellers.reduce((t, s) => t + s.payoutsPaid, 0),
      onHold: sellers.reduce((t, s) => t + s.payoutsOnHold, 0),
    }),
    [sellers]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sellers;
    return sellers.filter((s) => [s.businessName, s.name, s.email, s.phoneNumber].filter(Boolean).some((v) => v.toLowerCase().includes(term)));
  }, [sellers, search]);

  const handleRevoke = async (s) => {
    const name = s.businessName || s.name || s.email;
    const ok = await confirm({
      title: `Remove seller access for ${name}?`,
      description: (
        <>
          <p>
            The account goes back to being a normal customer, and all {s.activeProductCount} of their live products are hidden from the shop.
          </p>
          <p>Orders, payouts and order history are kept. To sell again they'd need to apply again, and you'd need to re-show their products.</p>
        </>
      ),
      confirmText: 'Remove seller access',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await adminApi.revokeSeller(s.id);
      setSellers((prev) => prev.filter((x) => x.id !== s.id));
      toast.success(`${name} is no longer a seller`, {
        description: res?.data?.productsHidden ? `${res.data.productsHidden} products hidden from the shop.` : undefined,
      });
    } catch (e) {
      toast.error(e?.message || 'Could not remove seller access');
    }
  };

  return (
    <div>
      <PageHeader title="Sellers" description={`Approved sellers, their sales and payouts. Sellers receive ${sharePercent}% of each item they sell.`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Sellers" icon={Store} loading={loading} value={totals.count} hint={`${totals.ready} can receive payouts`} />
        <StatCard title="Sales" icon={ShoppingCart} loading={loading} value={formatRs(totals.sales)} hint="Items sold in paid orders" />
        <StatCard title="Paid to sellers" icon={Landmark} loading={loading} value={formatRs(totals.paid)} />
        <StatCard
          title="Payouts on hold"
          icon={Hourglass}
          tone={totals.onHold > 0 ? 'warning' : undefined}
          loading={loading}
          value={formatRs(totals.onHold)}
          hint="Released once payout setup is finished"
        />
      </div>

      <div className="mb-4">
        <div className="relative sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Business, name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/40 shadow-none" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No sellers found"
          description={search ? 'Try a different search.' : 'Approve a seller request to add the first seller.'}
          action={!search && <Button onClick={() => navigate('/seller-requests')}>Seller requests</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <Card key={s.id} className="shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.businessName || s.name || s.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.businessName && s.name ? `${s.name} · ` : ''}
                      {s.email}
                    </p>
                    {s.phoneNumber && <p className="text-xs text-muted-foreground">{s.phoneNumber}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Seller actions" className="-mr-2 -mt-1 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/products?seller=${s.id}`)}>
                        <Package className="mr-2 h-4 w-4" />
                        View products
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRevoke(s)}>
                        <UserX className="mr-2 h-4 w-4" />
                        Remove seller access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PaymentSetupPill status={s.paymentSetup} />
                  {s.businessType && <span className="text-xs text-muted-foreground">{s.businessType}</span>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Products (live)" value={`${s.activeProductCount} / ${s.productCount}`} />
                  <Metric label="Orders" value={formatNumber(s.orderCount)} />
                  <Metric label="Sales" value={formatRs(s.totalSales)} />
                  <Metric label="Paid out" value={formatRs(s.payoutsPaid)} />
                </div>

                {s.payoutsOnHold > 0 && (
                  <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    {formatRs(s.payoutsOnHold)} on hold until this seller finishes payout setup in the app.
                  </p>
                )}

                <p className="text-xs text-muted-foreground">Joined {formatDate(s.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sellers;
