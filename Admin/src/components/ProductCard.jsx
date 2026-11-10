import { useNavigate } from 'react-router-dom';
import Pill from '@/components/Pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Package, Box } from 'lucide-react';
import { formatRs, firstImage } from '@/lib/format';

/** Product tile. Deleting is handled (and confirmed) by the parent through onDelete(product). */
const ProductCard = ({ product, onDelete }) => {
  const navigate = useNavigate();
  const open = () => navigate(`/products/${product.id}`);
  const image = firstImage(product.images);
  const lowStock = Number(product.quantity ?? 0) <= 0;

  return (
    <Card onClick={open} className="group cursor-pointer overflow-hidden shadow-none transition-colors hover:border-primary/40">
      <div className="relative flex h-44 items-center justify-center bg-muted/50">
        {image ? (
          <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-3" />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {!product.isActive && <Pill tone="neutral">Hidden</Pill>}
          {product.isFeatured && <Pill tone="brand">Featured</Pill>}
        </div>
        {product.hasARModel && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <Box className="h-3 w-3" />
            3D
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold">{product.name}</h3>
          <p className="truncate text-xs text-muted-foreground">{product.seller?.name || product.seller?.email || 'No seller'}</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-bold">{formatRs(product.price)}</p>
            <p className={`text-xs ${lowStock ? 'text-destructive' : 'text-muted-foreground'}`}>
              {lowStock ? 'Out of stock' : `${product.quantity} in stock`}
              {product.unitsSold > 0 ? ` · ${product.unitsSold} sold` : ''}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Delete ${product.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(product);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
