import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success/10 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-destructive/10 text-destructive border-destructive/25',
  info: 'bg-info/10 text-info border-info/25',
  brand: 'bg-brand/10 text-brand border-brand/25',
};

/** Small status label that reads well in light and dark themes. */
const Pill = ({ tone = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold',
      TONES[tone] || TONES.neutral,
      className
    )}
  >
    {children}
  </span>
);

export default Pill;

const ORDER_STATUS = {
  PENDING: { label: 'Pending', tone: 'warning' },
  PROCESSING: { label: 'Processing', tone: 'info' },
  SHIPPED: { label: 'Shipped', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
};

const PAYMENT_STATUS = {
  PAID: { label: 'Paid', tone: 'success' },
  PENDING: { label: 'Unpaid', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  PARTIALLY_REFUNDED: { label: 'Part refunded', tone: 'neutral' },
};

const PAYOUT_STATUS = {
  paid: { label: 'Paid to seller', tone: 'success' },
  on_hold: { label: 'On hold', tone: 'warning' },
  partial: { label: 'Partly paid', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  reversed: { label: 'Reversed', tone: 'neutral' },
  none: { label: '—', tone: 'neutral' },
};

const PAYMENT_SETUP = {
  ready: { label: 'Payouts ready', tone: 'success' },
  incomplete: { label: 'Setup incomplete', tone: 'warning' },
  not_started: { label: 'No payout account', tone: 'danger' },
};

const make = (map) =>
  function StatusPill({ status, className }) {
    const cfg = map[status] || { label: status || '—', tone: 'neutral' };
    return (
      <Pill tone={cfg.tone} className={className}>
        {cfg.label}
      </Pill>
    );
  };

export const OrderStatusPill = make(ORDER_STATUS);
export const PaymentStatusPill = make(PAYMENT_STATUS);
export const PayoutStatusPill = make(PAYOUT_STATUS);
export const PaymentSetupPill = make(PAYMENT_SETUP);
export const ORDER_STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((value) => ({
  value,
  label: ORDER_STATUS[value].label,
}));
