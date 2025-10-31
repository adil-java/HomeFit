import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Edit, Trash2 } from 'lucide-react';
import { products } from '@/utils/dummyData';
import { toast } from 'sonner';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productData, setProductData] = useState(products);

  const filteredProducts = productData.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.seller.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id) => {
    setProductData(productData.filter(product => product.id !== id));
    toast.success('Product deleted successfully');
  };

  const columns = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'Category', accessor: 'category' },
    { 
      header: 'Price', 
      accessor: (row) => `$${row.price.toFixed(2)}`
    },
    { header: 'Seller', accessor: 'seller' },
    { 
      header: 'Status', 
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { header: 'Stock', accessor: 'stock' },
    { header: 'Created Date', accessor: 'createdDate' },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
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

      <DataTable data={filteredProducts} columns={columns} />
    </div>
  );
};

export default Products;
