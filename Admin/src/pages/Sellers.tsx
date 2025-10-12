import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Ban, Trash2, Star } from 'lucide-react';
import { sellers } from '@/utils/dummyData';
import { toast } from 'sonner';

const Sellers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerData, setSellerData] = useState(sellers);

  const filteredSellers = sellerData.filter(
    (seller) =>
      seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSuspend = (id: string) => {
    setSellerData(sellerData.map(seller => 
      seller.id === id ? { ...seller, status: seller.status === 'active' ? 'inactive' as const : 'active' as const } : seller
    ));
    toast.success('Seller status updated');
  };

  const handleDelete = (id: string) => {
    setSellerData(sellerData.filter(seller => seller.id !== id));
    toast.success('Seller deleted successfully');
  };

  const columns = [
    { header: 'Business Name', accessor: 'name' as const },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Phone', accessor: 'phone' as const },
    { 
      header: 'Status', 
      accessor: (row: typeof sellers[0]) => <StatusBadge status={row.status} />
    },
    { header: 'Products', accessor: 'productsCount' as const },
    {
      header: 'Rating',
      accessor: (row: typeof sellers[0]) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span>{row.rating}</span>
        </div>
      ),
    },
    { header: 'Joined Date', accessor: 'joinedDate' as const },
    {
      header: 'Actions',
      accessor: (row: typeof sellers[0]) => (
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

      <DataTable data={filteredSellers} columns={columns} />
    </div>
  );
};

export default Sellers;
