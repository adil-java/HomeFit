import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const ProductCard = ({ product, onDelete }) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    // Navigate to product details page by id
    navigate(`/products/${product.id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    try {
      await adminApi.deleteProduct(product.id);
      toast.success('Product deleted');
      if (onDelete) onDelete(product.id);
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const image = (product.images && product.images[0]) || '';

  return (
    <div onClick={handleOpen} className="app-container-card overflow-hidden transform transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-48 bg-gradient-to-b from-white/60 to-muted/30 flex items-center justify-center">
        {image ? (
          <img src={image} alt={product.name} className="h-full w-full object-contain p-4" />
        ) : (
          <div className="text-sm text-muted-foreground">No image</div>
        )}

        {/* price badge */}

      </div>

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold line-clamp-2">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.seller ?? 'Unknown seller'}</p>
          </div>
          <div className="ml-2">
            <StatusBadge status={product.isActive || product.status ? (product.isActive ? 'active' : 'inactive') : product.status} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{product.description}</p>
        
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleOpen}>View</Button>
          <Button size="sm" variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div >
    </div>
  );
};

export default ProductCard;
