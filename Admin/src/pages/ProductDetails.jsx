import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Pill from '@/components/Pill';
import EmptyState from '@/components/EmptyState';
import { ArrowLeft, Trash2, Package, Box, ExternalLink, Star } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import { useProductDelete } from '@/lib/useProductDelete';
import { toast } from 'sonner';
import { formatRs, formatDateTime, formatNumber, imageList } from '@/lib/format';

const variantText = (options) => {
  const one = (o) => (typeof o === 'string' || typeof o === 'number' ? String(o) : o?.name || o?.value || JSON.stringify(o));
  return Array.isArray(options) ? options.map(one).join(', ') : one(options);
};

const Info = ({ label, children }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <div className="text-sm font-medium">{children ?? '—'}</div>
  </div>
);

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [saving, setSaving] = useState(null);
  const deleteProduct = useProductDelete();

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getProductById(id);
        setProduct(res?.data || null);
      } catch (err) {
        toast.error(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggle = async (field, value) => {
    setSaving(field);
    try {
      await adminApi.toggleProductStatus(product.id, field, value);
      setProduct((p) => ({ ...p, [field]: value }));
      toast.success(
        field === 'isActive' ? (value ? 'Product is live in the shop' : 'Product hidden from the shop') : value ? 'Marked as featured' : 'Removed from featured'
      );
    } catch (err) {
      toast.error(err.message || 'Could not update product');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    const result = await deleteProduct(product);
    if (result === 'deleted') navigate('/products');
    if (result === 'archived') setProduct((p) => ({ ...p, isActive: false, isFeatured: false }));
  };

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-96 animate-pulse rounded-lg bg-muted lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-lg bg-muted lg:col-span-3" />
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        icon={Package}
        title="Product not found"
        description="It may have been deleted."
        action={<Button onClick={() => navigate('/products')}>Back to products</Button>}
      />
    );
  }

  const images = imageList(product.images);
  const outOfStock = Number(product.quantity ?? 0) <= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/products')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Products
        </Button>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          {product.orderCount > 0 ? 'Hide product' : 'Delete product'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="shadow-none lg:col-span-2">
          <CardContent className="space-y-3 p-4">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted/50">
              {images[activeImage] ? (
                <img src={images[activeImage]} alt={product.name} className="h-full w-full object-contain p-4" />
              ) : (
                <Package className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-muted/50 ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Box className="h-4 w-4" />
                3D model for AR
              </div>
              {product.ARModelUrl ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={product.ARModelUrl} target="_blank" rel="noreferrer">
                      Download .glb
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </a>
                  </Button>
                  {product.objModelUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={product.objModelUrl} target="_blank" rel="noreferrer">
                        .obj
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No 3D model yet, so shoppers can't view this product in AR.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card className="shadow-none">
            <CardContent className="space-y-5 p-6">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Pill tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Live' : 'Hidden'}</Pill>
                  {product.isFeatured && <Pill tone="brand">Featured</Pill>}
                  {outOfStock && <Pill tone="danger">Out of stock</Pill>}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="text-2xl font-bold">{formatRs(product.price)}</p>
                  {product.comparePrice > product.price && <p className="text-sm text-muted-foreground line-through">{formatRs(product.comparePrice)}</p>}
                </div>
              </div>

              <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="active" className="cursor-pointer">
                    <p className="font-semibold">Show in shop</p>
                    <p className="text-xs font-normal text-muted-foreground">Hidden products can't be found or bought</p>
                  </Label>
                  <Switch id="active" checked={!!product.isActive} disabled={saving === 'isActive'} onCheckedChange={(v) => toggle('isActive', v)} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="featured" className="cursor-pointer">
                    <p className="font-semibold">Featured</p>
                    <p className="text-xs font-normal text-muted-foreground">Shown on the app's home screen</p>
                  </Label>
                  <Switch
                    id="featured"
                    checked={!!product.isFeatured}
                    disabled={saving === 'isFeatured' || !product.isActive}
                    onCheckedChange={(v) => toggle('isFeatured', v)}
                  />
                </div>
              </div>

              {product.description && <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{product.description}</p>}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
              <Info label="Seller">
                {product.seller ? (
                  <Link to={`/products?seller=${product.seller.id}`} className="text-primary hover:underline">
                    {product.seller.name || product.seller.email}
                  </Link>
                ) : (
                  'No seller'
                )}
              </Info>
              <Info label="Categories">{(product.categories || []).map((c) => c.name).join(', ') || '—'}</Info>
              <Info label="In stock">{formatNumber(product.quantity)}</Info>
              <Info label="Units sold">{formatNumber(product.unitsSold)}</Info>
              <Info label="Sales">{formatRs(product.salesValue)}</Info>
              <Info label="Rating">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-brand text-brand" />
                  {Number(product.averageRating || 0).toFixed(1)}
                  <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
                </span>
              </Info>
              <Info label="In wishlists">{formatNumber(product.wishlistCount)}</Info>
              <Info label="In carts now">{formatNumber(product.inCarts)}</Info>
              <Info label="SKU">{product.sku || '—'}</Info>
              <Info label="Added">{formatDateTime(product.createdAt)}</Info>
              <Info label="Last updated">{formatDateTime(product.updatedAt)}</Info>
            </CardContent>
          </Card>

          {product.variants?.length > 0 && (
            <Card className="shadow-none">
              <CardContent className="p-6">
                <p className="mb-3 text-sm font-semibold">Variants</p>
                <ul className="space-y-1 text-sm">
                  {product.variants.map((v) => (
                    <li key={v.id}>
                      <span className="font-medium">{v.name}</span>
                      {v.options != null && <span className="text-muted-foreground">: {variantText(v.options)}</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
