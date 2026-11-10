import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { formatRs } from '@/lib/format';

const REASONS = [
  { value: 'CUSTOMER_REQUEST', label: 'Customer asked for a refund' },
  { value: 'PRODUCT_DEFECTIVE', label: 'Product damaged or defective' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'DUPLICATE', label: 'Duplicate payment' },
  { value: 'FRAUD', label: 'Fraudulent payment' },
  { value: 'OTHER', label: 'Other' },
];

/** Full refund of a paid order: takes back seller payouts, refunds the customer through Stripe. */
const RefundDialog = ({ order, open, onOpenChange, onRefunded }) => {
  const [reason, setReason] = useState('CUSTOMER_REQUEST');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('CUSTOMER_REQUEST');
      setNotes('');
    }
  }, [open]);

  if (!order) return null;
  const sentToSellers = Number(order.sellerAmount || 0) > 0 && order.payoutStatus !== 'on_hold';

  const submit = async () => {
    setBusy(true);
    try {
      await adminApi.refundOrder(order.id, reason, notes.trim() || undefined);
      toast.success(`Order ${order.orderNumber} refunded`, { description: `${formatRs(order.total)} is on its way back to the customer.` });
      onOpenChange(false);
      onRefunded?.();
    } catch (err) {
      toast.error(err.message || 'Could not refund this order');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund order {order.orderNumber}</DialogTitle>
          <DialogDescription>
            The customer gets back the full {formatRs(order.total)} on their card. This can't be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">What happens</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
              {sentToSellers ? (
                <li>The seller payout already sent ({formatRs(order.sellerAmount)}) is taken back from the seller's Stripe account first.</li>
              ) : (
                <li>Any seller payout on hold for this order is cancelled.</li>
              )}
              <li>Stripe refunds the customer. Cards usually show it in 5–10 business days.</li>
              <li>The order is marked Refunded.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-notes">Internal note (optional)</Label>
            <Textarea
              id="refund-notes"
              value={notes}
              maxLength={500}
              placeholder="e.g. Sofa arrived with a broken leg"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={submit}>
            {busy ? 'Refunding…' : `Refund ${formatRs(order.total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundDialog;
