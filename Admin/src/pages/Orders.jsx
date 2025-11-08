import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
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

      {/* Orders as cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">No orders found</div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="app-container-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Order #{order.id}</h4>
                    <p className="text-xs text-muted-foreground">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">Rs. {order.total.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{order.orderDate}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-muted-foreground line-clamp-3">
                  {order.product}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <div className="text-xs text-muted-foreground">Delivery: {order.deliveryDate || 'N/A'}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusChange(order.id, value)}
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
                </div>

                <div>
                  <Button size="sm" variant="ghost">View</Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Orders;
