import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(null);
  const [isFeatured, setIsFeatured] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getProductById(id);
        // backend returns { success: true, data: product }
        const data = res?.data || res;
        setProduct(data);
      } catch (err) {
        toast.error(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!product) return;
    try {
      await adminApi.deleteProduct(product.id);
      toast.success('Product deleted');
      navigate('/products');
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!product) return <div className="p-6">Product not found</div>;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="app-container-card p-4">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-80 object-contain rounded-md bg-white p-4" />
            ) : (
              <div className="w-full h-80 flex items-center justify-center bg-muted-foreground/10 rounded-md">No image</div>
            )}

            <div className="mt-4 flex gap-2">
              {product.ARModelUrl && (
                <a href="https://3dviewer.net/" target="_blank" rel="noreferrer" className="inline-block px-3 py-2 rounded-md bg-accent text-accent-foreground text-sm">Open AR</a>
              )}
              {product.objModelUrl && (
                <a href={product.objModelUrl} target="_blank" rel="noreferrer" className="inline-block px-3 py-2 rounded-md border text-sm">Download OBJ</a>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="app-container-card p-6">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <div className="mt-3 flex items-center gap-4">
              <p className="text-2xl font-bold">Rs. {Number(product.price ?? 0).toFixed(2)}</p>
              <StatusBadge status={product.isActive ? 'approved' : 'inactive'} />
              {/* Status controls */}
              <div className="ml-4 flex items-center gap-2">
                <select
                  className="rounded-md border px-2 py-1 text-sm"
                  value={String(isActive ?? product.isActive ?? true)}
                  onChange={async (e) => {
                    const val = e.target.value === 'true';
                    setIsActive(val);
                    setStatusUpdating(true);
                    try {
                      await adminApi.toggleProductStatus(product.id, 'isActive', val);
                      setProduct((p) => ({ ...p, isActive: val }));
                      toast.success('Product status updated');
                    } catch (err) {
                      toast.error(err.message || 'Failed to update status');
                    } finally {
                      setStatusUpdating(false);
                    }
                  }}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                <button
                  className={`text-sm px-3 py-1 rounded-md border ${isFeatured ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={async () => {
                    const next = !(isFeatured ?? product.isFeatured ?? false);
                    setIsFeatured(next);
                    setStatusUpdating(true);
                    try {
                      await adminApi.toggleProductStatus(product.id, 'isFeatured', next);
                      setProduct((p) => ({ ...p, isFeatured: next }));
                      toast.success('Featured flag updated');
                    } catch (err) {
                      toast.error(err.message || 'Failed to update featured');
                    } finally {
                      setStatusUpdating(false);
                    }
                  }}
                  disabled={statusUpdating}
                >
                  {isFeatured ?? product.isFeatured ? 'Featured' : 'Mark Featured'}
                </button>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <p>{product.description}</p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <p><strong>SKU:</strong> {product.sku ?? '—'}</p>
              <p><strong>Barcode:</strong> {product.barcode ?? '—'}</p>
              <p><strong>Quantity:</strong> {product.quantity ?? 0}</p>
              <p><strong>Created:</strong> {product.createdAt ? new Date(product.createdAt).toLocaleString() : ''}</p>
            </div>

            {product.variants && product.variants.length > 0 && (
              <div className="mt-6">
                <strong>Variants:</strong>
                <ul className="list-disc ml-6 mt-2">
                  {product.variants.map(v => (
                    <li key={v.id}>{v.name}: {Array.isArray(v.options) ? v.options.join(', ') : String(v.options)}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              <Button onClick={() => navigate('/products')}>Back</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
