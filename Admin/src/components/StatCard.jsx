import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** A single number with a label. `hint` is a short real explanation, never a made-up trend. */
const StatCard = ({ title, value, description, hint, icon: Icon, onClick, tone, loading }) => (
  <Card
    onClick={onClick}
    className={cn('shadow-none', onClick && 'cursor-pointer transition-colors hover:border-primary/40')}
  >
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <Icon
            className={cn(
              'h-4 w-4 shrink-0',
              tone === 'brand' ? 'text-brand' : tone === 'warning' ? 'text-warning' : 'text-muted-foreground'
            )}
          />
        )}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      )}
      {(description || hint) && <p className="mt-1 text-xs text-muted-foreground">{description || hint}</p>}
    </CardContent>
  </Card>
);

export default StatCard;
