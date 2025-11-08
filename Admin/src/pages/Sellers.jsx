import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Ban, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { adminApi } from '@/services/adminApi';

const Sellers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerData, setSellerData] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getSellers();
        const rows = (res?.data || []).map((s) => ({
          id: s.id,
          name: s.name || s.email,
          email: s.email,
          phone: s.phoneNumber || '',
          status: 'active',
          productsCount: 0,
          rating: 0,
          joinedDate: s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : '',
        }));
        setSellerData(rows);
      } catch (e) {
        toast.error(e?.message || 'Failed to load sellers');
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
        description="Manage all approved sellers"
      />

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
        {filteredSellers.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">No sellers found</div>
        ) : (
          filteredSellers.map((s) => (
            <div key={s.id} className="app-container-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">{s.name}</h4>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    <p className="text-xs text-muted-foreground">{s.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">Products: {s.productsCount}</div>
                    <div className="text-xs text-muted-foreground">Joined: {s.joinedDate}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <div className="text-xs text-muted-foreground">Rating: {s.rating}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleSuspend(s.id)}>
                    <Ban className="h-4 w-4 mr-1" />
                    {s.status === 'active' ? 'Suspend' : 'Activate'}
                  </Button>
                </div>
                <div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sellers;
