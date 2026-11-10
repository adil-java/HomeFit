import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Package, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { useConfirm } from '@/components/ConfirmDialog';
import RefundDialog from '@/components/RefundDialog';
import Pill, { OrderStatusPill, PaymentStatusPill, PayoutStatusPill, ORDER_STATUS_OPTIONS } from '@/components/Pill';
import { formatRs, formatDateTime, firstImage } from '@/lib/format';

const Row = ({ label, children, strong }) => (
  <div className="flex items-start justify-between gap-4 py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={strong ? 'font-semibold' : ''}>{children}</span>
  </div>
);

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
    {children}
  </section>
);

const addressLines = (a) => {
  if (!a || typeof a !== 'object') return [];
  return [
    a.name,
    a.street,
    [a.city, a.state, a.postalCode].filter(Boolean).join(', '),
    a.country,
    a.phone,
    a.email,
  ].filter(Boolean);
};

const SHARE_STATUS = { COMPLETED: 'paid', PENDING: 'on_hold', CANCELLED: 'cancelled' };

/**
 * Side panel with everything about one order, plus status change and refund.
 * `orderId` opens it; `onChanged(order)` is called after an update.
 */
const OrderDetailsSheet = ({ orderId, onOpenChange, onChanged }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const confirm = useConfirm();

  const load = async (id) => {
    setLoading(true);
    try {
      const res = await adminApi.getOrder(id);
      setOrder(res?.data || null);
      return res?.data;
    } catch (err) {
      toast.error(err.message || 'Could not load order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) load(orderId);
    else setOrder(null);
  }, [orderId]);

  const changeStatus = async (status) => {
    if (!order || status === order.status) return;
    if (status === 'CANCELLED') {
      const paid = order.paymentStatus === 'PAID';
      const ok = await confirm({
        title: `Cancel order ${order.orderNumber}?`,
        description: paid ? (
          <>
            <p>The customer and seller will see this order as cancelled.</p>
            <p className="font-medium text-foreground">
              Cancelling does not give the money back. To return the {formatRs(order.total)} payment, use Refund instead.
            </p>
          </>
        ) : (
          <p>The customer and seller will see this order as cancelled.</p>
        ),
        confirmText: 'Cancel order',
        cancelText: 'Keep order',
        destructive: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await adminApi.updateOrderStatus(order.id, status);
      const fresh = await load(order.id);
      toast.success(`Order marked ${ORDER_STATUS_OPTIONS.find((o) => o.value === status)?.label.toLowerCase()}`);
      if (fresh) onChanged?.(fresh);
    } catch (err) {
      toast.error(err.message || 'Could not update status');
    } finally {
      setSaving(false);
    }
  };

  const shares = (order?.transactions || []).filter((t) => t.type === 'TRANSFER');
  const sellerById = new Map((order?.sellers || []).map((s) => [s.id, s]));
  const canRefund = order?.paymentStatus === 'PAID' && !!order?.stripePaymentIntent;

  return (
    <>
      <Sheet open={!!orderId} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {loading && !order ? (
            <div className="space-y-3 pt-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !order ? null : (
            <div className="space-y-6">
              <SheetHeader className="space-y-2 text-left">
                <SheetTitle className="font-mono text-lg">{order.orderNumber}</SheetTitle>
                <SheetDescription>Placed {formatDateTime(order.createdAt)}</SheetDescription>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusPill status={order.status} />
                  <PaymentStatusPill status={order.paymentStatus} />
                  {order.payoutStatus !== 'none' && <PayoutStatusPill status={order.payoutStatus} />}
                </div>
              </SheetHeader>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={order.status} onValueChange={changeStatus} disabled={saving || order.status === 'REFUNDED'}>
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                    {order.status === 'REFUNDED' && <SelectItem value="REFUNDED">Refunded</SelectItem>}
                  </SelectContent>
                </Select>
                {canRefund && (
                  <Button variant="outline" size="sm" className="h-9" onClick={() => setRefundOpen(true)}>
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Refund
                  </Button>
                )}
              </div>

              <Separator />

              <Section title={`Items (${order.items?.length || 0})`}>
                <ul className="divide-y rounded-md border">
                  {(order.items || []).map((it) => {
                    const img = firstImage(it.product?.images);
                    return (
                      <li key={it.id} className="flex gap-3 p-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{it.productName || it.product?.name || 'Product'}</p>
                          <p className="text-xs text-muted-foreground">
                            Seller: {it.product?.seller?.name || it.product?.seller?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {it.quantity} × {formatRs(it.price)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{formatRs(it.price * it.quantity)}</p>
                      </li>
                    );
                  })}
                </ul>
                <div className="rounded-md border p-3">
                  <Row label="Subtotal">{formatRs(order.subtotal)}</Row>
                  {Number(order.discount) > 0 && <Row label="Discount">− {formatRs(order.discount)}</Row>}
                  <Row label="Shipping">{Number(order.shipping) > 0 ? formatRs(order.shipping) : 'Free'}</Row>
                  {Number(order.tax) > 0 && <Row label="Tax">{formatRs(order.tax)}</Row>}
                  <Separator className="my-1" />
                  <Row label="Total" strong>
                    {formatRs(order.total)}
                  </Row>
                </div>
              </Section>

              <Section title="Customer">
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-semibold">{order.user?.name || 'Customer'}</p>
                  <p className="text-muted-foreground">{order.user?.email}</p>
                  {order.user?.phoneNumber && <p className="text-muted-foreground">{order.user.phoneNumber}</p>}
                </div>
              </Section>

              <Section title="Delivery address">
                <div className="rounded-md border p-3 text-sm">
                  {addressLines(order.shippingAddress).length ? (
                    addressLines(order.shippingAddress).map((l, i) => (
                      <p key={i} className={i === 0 ? 'font-semibold' : 'text-muted-foreground'}>
                        {l}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No address on this order</p>
                  )}
                </div>
              </Section>

              <Section title="Payment">
                <div className="rounded-md border p-3">
                  <Row label="Method">{(order.paymentMethod || '—').toUpperCase()}</Row>
                  <Row label="Status">
                    <PaymentStatusPill status={order.paymentStatus} />
                  </Row>
                  {order.paymentConfirmedAt && <Row label="Paid on">{formatDateTime(order.paymentConfirmedAt)}</Row>}
                  {order.platformFee > 0 && <Row label="Platform fee (HomeFit)">{formatRs(order.platformFee)}</Row>}
                  {order.stripePaymentIntent && (
                    <Row label="Stripe payment">
                      <a
                        className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                        href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntent}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {order.stripePaymentIntent.slice(0, 18)}…
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Row>
                  )}
                </div>
              </Section>

              {shares.length > 0 && (
                <Section title="Seller payouts">
                  <ul className="divide-y rounded-md border">
                    {shares.map((s) => {
                      const seller = sellerById.get(s.metadata?.sellerId);
                      const status = s.metadata?.reversedAt ? 'reversed' : SHARE_STATUS[s.status] || 'none';
                      return (
                        <li key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{seller?.name || seller?.email || 'Seller'}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.metadata?.itemsValue != null && `Items ${formatRs(s.metadata.itemsValue)} · `}
                              {status === 'on_hold' ? 'Waiting for the seller to finish payout setup' : s.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatRs(s.amount)}</p>
                            <PayoutStatusPill status={status} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {(order.refunds || []).length > 0 && (
                <Section title="Refund">
                  {order.refunds.map((r) => (
                    <div key={r.id} className="rounded-md border p-3">
                      <Row label="Amount">{formatRs(r.amount)}</Row>
                      <Row label="Reason">{r.reason.replace(/_/g, ' ').toLowerCase()}</Row>
                      <Row label="Date">{formatDateTime(r.processedAt)}</Row>
                      {r.notes && <p className="pt-1 text-sm text-muted-foreground">{r.notes}</p>}
                    </div>
                  ))}
                </Section>
              )}

              {(order.statusHistory || []).length > 0 && (
                <Section title="History">
                  <ol className="space-y-2 border-l pl-4">
                    {order.statusHistory.map((h, i) => (
                      <li key={i} className="relative text-sm">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                        <OrderStatusPill status={h.status} />
                        <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

              {order.paymentStatus === 'PENDING' && (
                <Pill tone="warning" className="whitespace-normal">
                  This order was never paid. Don't ship it until payment is confirmed.
                </Pill>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <RefundDialog
        order={order}
        open={refundOpen}
        onOpenChange={setRefundOpen}
        onRefunded={async () => {
          const fresh = await load(order.id);
          if (fresh) onChanged?.(fresh);
        }}
      />
    </>
  );
};

export default OrderDetailsSheet;
