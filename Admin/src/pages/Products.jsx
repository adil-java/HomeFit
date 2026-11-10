import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { useProductDelete } from '@/lib/useProductDelete';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const sellerId = searchParams.get('seller');
  const deleteProduct = useProductDelete();

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getProducts();
        setProducts(res?.data || []);
      } catch (err) {
        toast.error(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sellerName = sellerId ? products.find((p) => p.seller?.id === sellerId)?.seller?.name : null;

  const counts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.isActive).length,
      hidden: products.filter((p) => !p.isActive).length,
      featured: products.filter((p) => p.isFeatured).length,
      no3d: products.filter((p) => !p.hasARModel).length,
      outOfStock: products.filter((p) => Number(p.quantity ?? 0) <= 0).length,
    }),
    [products]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = products
      .filter((p) => !sellerId || p.seller?.id === sellerId)
      .filter((p) => {
        if (tab === 'active') return p.isActive;
        if (tab === 'hidden') return !p.isActive;
        if (tab === 'featured') return p.isFeatured;
        if (tab === 'no3d') return !p.hasARModel;
        if (tab === 'outOfStock') return Number(p.quantity ?? 0) <= 0;
        return true;
      })
      .filter(
        (p) =>
          !term ||
          [p.name, p.sku, p.seller?.name, p.seller?.email, ...(p.categories || []).map((c) => c.name)]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(term))
      );
    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      best_selling: (a, b) => (b.unitsSold || 0) - (a.unitsSold || 0),
      stock_asc: (a, b) => (a.quantity ?? 0) - (b.quantity ?? 0),
    };
    return [...list].sort(sorters[sortBy] || sorters.newest);
  }, [products, search, tab, sortBy, sellerId]);

  const handleDelete = async (product) => {
    const result = await deleteProduct(product);
    if (result === 'deleted') setProducts((prev) => prev.filter((p) => p.id !== product.id));
    if (result === 'archived') setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: false, isFeatured: false } : p)));
  };

  return (
    <div>
      <PageHeader title="Products" description="Every product listed by sellers, including hidden ones." />

      <div className="mb-4 flex flex-col gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">Live ({counts.active})</TabsTrigger>
            <TabsTrigger value="hidden">Hidden ({counts.hidden})</TabsTrigger>
            <TabsTrigger value="featured">Featured ({counts.featured})</TabsTrigger>
            <TabsTrigger value="outOfStock">Out of stock ({counts.outOfStock})</TabsTrigger>
            <TabsTrigger value="no3d">No 3D model ({counts.no3d})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Name, SKU, seller or category" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="best_selling">Best selling</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="stock_asc">Lowest stock</SelectItem>
            </SelectContent>
          </Select>
          {sellerId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('seller');
                setSearchParams(next);
              }}
            >
              Seller: {sellerName || 'selected'}
              <X className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="h-72 animate-pulse bg-muted/40 shadow-none" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description={search || tab !== 'all' || sellerId ? 'Try a different search or filter.' : 'Products added by sellers will appear here.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
