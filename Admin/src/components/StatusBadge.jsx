import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig = {
  active: { label: 'Active', variant: 'default' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  delivered: { label: 'Delivered', variant: 'default' },
  shipped: { label: 'Shipped', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const StatusBadge = ({ status, className }) => {
  const config = statusConfig[status] || { label: status, variant: 'outline' };

  return (
    <Badge variant={config.variant} className={cn('capitalize', className)}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
