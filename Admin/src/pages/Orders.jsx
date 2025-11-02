import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { orders } from '@/utils/dummyData';
import { toast } from 'sonner';

// Order status string values handled at runtime

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderData, setOrderData] = useState(orders);

  const filteredOrders = orderData.filter(
    (order) =>
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = (id, newStatus) => {
    setOrderData(orderData.map(order => 
      order.id === id ? { ...order, status: newStatus } : order
    ));
    toast.success('Order status updated');
  };

  const columns = [
    { header: 'Order ID', accessor: 'id' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Product', accessor: 'product' },
    { 
      header: 'Total', 
      accessor: (row) => `Rs. ${row.total.toFixed(2)}`
    },
    { 
      header: 'Status', 
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { header: 'Order Date', accessor: 'orderDate' },
    {
      header: 'Delivery Date',
      accessor: (row) => row.deliveryDate || 'N/A',
    },
    {
      header: 'Update Status',
      accessor: (row) => (
        <Select
          value={row.status}
          onValueChange={(value) => handleStatusChange(row.id, value)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Order Management"
        description="Manage all customer orders"
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable data={filteredOrders} columns={columns} />
    </div>
  );
};

export default Orders;
