import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Ban, Trash2, Star, ShoppingCart, Package, DollarSign, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { adminApi } from '@/services/adminApi';

const Sellers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerData, setSellerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate summary statistics
  const sellerStats = {
    totalSellers: sellerData.length,
    activeSellers: sellerData.filter(s => s.status === 'active').length,
    totalProducts: sellerData.reduce((sum, s) => sum + s.productsCount, 0),
    totalOrders: sellerData.reduce((sum, s) => sum + s.orderCount, 0),
    totalRevenue: sellerData.reduce((sum, s) => sum + s.totalRevenue, 0),
    averageOrdersPerSeller: sellerData.length > 0 ? Math.round(sellerData.reduce((sum, s) => sum + s.orderCount, 0) / sellerData.length) : 0,
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await adminApi.getSellers();
        const rows = (res?.data || []).map((s) => ({
          id: s.id,
          name: s.name || s.email,
          email: s.email,
          phone: s.phoneNumber || '',
          status: 'active',
          productsCount: s.productCount || 0,
          orderCount: s.orderCount || 0,
          totalRevenue: s.totalRevenue || 0,
          rating: 0,
          joinedDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
        }));
        setSellerData(rows);
      } catch (e) {
        toast.error(e?.message || 'Failed to load sellers');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filteredSellers = sellerData.filter(
    (seller) =>
      seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSuspend = (id) => {
    setSellerData(sellerData.map(seller => 
      seller.id === id ? { ...seller, status: seller.status === 'active' ? 'inactive' : 'active' } : seller
    ));
    toast.success('Seller status updated');
  };

  const handleDelete = (id) => {
    setSellerData(sellerData.filter(seller => seller.id !== id));
    toast.success('Seller deleted successfully');
  };

  const columns = [
    { header: 'Business Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    {
      header: 'Status', 
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { header: 'Products', accessor: 'productsCount' },
    {
      header: 'Rating',
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span>{row.rating}</span>
        </div>
      ),
    },
    { header: 'Joined Date', accessor: 'joinedDate' },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSuspend(row.id)}
          >
            <Ban className="h-4 w-4 mr-1" />
            {row.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Seller Management"
        description="Manage all approved sellers with their performance metrics"
      />

      {/* Seller Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sellers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sellerStats.totalSellers}</div>
            <p className="text-xs text-muted-foreground">
              {sellerStats.activeSellers} active sellers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sellerStats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {sellerStats.totalSellers > 0 ? Math.round(sellerStats.totalProducts / sellerStats.totalSellers) : 0} avg per seller
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sellerStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {sellerStats.averageOrdersPerSeller} avg per seller
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {sellerStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Rs. {sellerStats.totalSellers > 0 ? Math.round(sellerStats.totalRevenue / sellerStats.totalSellers).toLocaleString() : 0} avg per seller
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sellers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeleton
          [...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-muted rounded"></div>
                  <div className="h-16 bg-muted rounded"></div>
                  <div className="h-16 bg-muted rounded"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-muted rounded flex-1"></div>
                  <div className="h-8 bg-muted rounded w-10"></div>
                </div>
              </div>
            </Card>
          ))
        ) : filteredSellers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sellers found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No sellers have been registered yet.'}
            </p>
          </div>
        ) : (
          filteredSellers.map((s) => (
            <div key={s.id} className="app-container-card p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-foreground">{s.name}</h4>
                    <p className="text-sm text-muted-foreground">{s.email}</p>
                    {s.phone && (
                      <p className="text-sm text-muted-foreground">{s.phone}</p>
                    )}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-lg font-semibold">{s.productsCount}</div>
                    <div className="text-xs text-muted-foreground">Products</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <div className="text-lg font-semibold">{s.orderCount}</div>
                    <div className="text-xs text-muted-foreground">Orders</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-sm font-semibold">Rs. {s.totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{s.rating}/5</span>
                  </div>
                  <div>Joined: {s.joinedDate}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSuspend(s.id)}
                  className="flex-1 mr-2"
                >
                  <Ban className="h-4 w-4 mr-1" />
                  {s.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sellers;
