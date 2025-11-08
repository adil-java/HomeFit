import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ProductCard from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { products } from '@/utils/dummyData';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productData, setProductData] = useState(products);
  const [tab, setTab] = useState('all'); // order/filter tab
  const [sortBy, setSortBy] = useState(null); // 'price_asc' | 'price_desc' | 'newest'

  useEffect(() => {
    // try fetching real products from backend; fall back to dummy data on failure
    (async () => {
      try {
        const data = await adminApi.getProducts();
        // backend may return array or wrapper object
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        if (Array.isArray(list) && list.length) setProductData(list);
      } catch (err) {
        // keep dummy data if request fails
        // console.warn('adminApi.getProducts failed, using dummy data', err);
      }
    })();
  }, []);


  const filteredProducts = productData.filter((product) => {
    const name = product?.name ?? '';
    const seller = product?.seller ?? '';
    const category = product?.category ?? (product?.categories ? product.categories.map(c => c.name).join(' ') : '');
    const hay = `${name} ${seller} ${category}`.toLowerCase();
    return hay.includes(searchTerm.toLowerCase());
  });

  // apply tab filters
  const tabFiltered = filteredProducts.filter((p) => {
    if (tab === 'all') return true;
    if (tab === 'active') return !!p.isActive;
    if (tab === 'inactive') return !p.isActive;
    if (tab === 'featured') return !!p.isFeatured;
    return true;
  });

  // apply sorting
  const visibleProducts = [...tabFiltered].sort((a, b) => {
    if (sortBy === 'price_asc') return (Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === 'price_desc') return (Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    // default: preserve backend order
    return 0;
  });

  const handleDelete = (id) => {
    // keep backward-compatible immediate UI update but try to call backend
    (async () => {
      try {
        await adminApi.deleteProduct(id);
        setProductData((prev) => prev.filter((product) => product.id !== id));
        toast.success('Product deleted successfully');
      } catch (err) {
        // If API fails, still remove locally and surface error
        setProductData((prev) => prev.filter((product) => product.id !== id));
        toast.error(err.message || 'Failed to delete product (offline)');
      }
    })();
  };

  

  return (
    <div>
      <PageHeader
        title="Product Management"
        description="Manage all listed products"
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs: ordering and quick filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant={tab === 'all' && !sortBy ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTab('all'); setSortBy(null); }}>All</Button>
        <Button variant={tab === 'all' && sortBy === 'newest' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTab('all'); setSortBy('newest'); }}>Newest</Button>
        <Button variant={sortBy === 'price_asc' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTab('all'); setSortBy('price_asc'); }}>Price ↑</Button>
        <Button variant={sortBy === 'price_desc' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTab('all'); setSortBy('price_desc'); }}>Price ↓</Button>
        <Button variant={tab === 'active' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTab('active'); setSortBy(null); }}>Active</Button>
        <Button variant={tab === 'inactive' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTab('inactive'); setSortBy(null); }}>Inactive</Button>
        <Button variant={tab === 'featured' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTab('featured'); setSortBy(null); }}>Featured</Button>
      </div>

      {/* Grid of product cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleProducts.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">No products found</div>
        ) : (
          visibleProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))
        )}
      </div>

      
    </div>
  );
};

export default Products;
