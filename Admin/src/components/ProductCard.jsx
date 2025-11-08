import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  const handleOpen = () => {
    // Navigate to product details page by id
    navigate(`/products/${product.id}`);
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
      </div >
    </div>
  );
};

export default ProductCard;
