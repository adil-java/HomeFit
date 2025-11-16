import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedSellers, setExpandedSellers] = useState(new Set());

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { limit: 1000 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getAdminOrders(params);
      setOrderData(res?.data || []);
    } catch (err) {
      toast.error('Failed to fetch orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminApi.updateOrderStatus(id, newStatus);
      setOrderData(orderData.map(order => 
        order.id === id ? { ...order, status: newStatus } : order
      ));
      toast.success('Order status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const toggleSeller = (sellerId) => {
    const newExpanded = new Set(expandedSellers);
    if (newExpanded.has(sellerId)) {
      newExpanded.delete(sellerId);
    } else {
      newExpanded.add(sellerId);
    }
    setExpandedSellers(newExpanded);
  };

  // Group orders by seller
  const ordersBySeller = orderData.reduce((acc, order) => {
    const sellerId = order.sellerId || 'no-seller';
    const sellerName = order.seller?.name || order.seller?.email || 'Unknown Seller';
    const sellerEmail = order.seller?.email || '';
    
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerId,
        sellerName,
        sellerEmail,
        orders: [],
        totalOrders: 0,
        totalRevenue: 0,
      };
    }
    
    acc[sellerId].orders.push(order);
    acc[sellerId].totalOrders += 1;
    acc[sellerId].totalRevenue += Number(order.total || 0);
    
    return acc;
  }, {});

  // Apply search filter
  const filteredSellers = Object.values(ordersBySeller).filter(seller => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      seller.sellerName.toLowerCase().includes(term) ||
      seller.sellerEmail.toLowerCase().includes(term) ||
      seller.orders.some(o => 
        o.id.toLowerCase().includes(term) ||
        o.user?.name?.toLowerCase().includes(term) ||
        o.user?.email?.toLowerCase().includes(term)
      )
    );
  });


  if (loading) {
    return (
      <div>
        <PageHeader title="Order Management" description="Manage all customer orders" />
        <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Order Management"
        description="Manage all customer orders grouped by seller"
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sellers or orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Seller-wise grouped orders */}
      <div className="space-y-4">
        {filteredSellers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No orders found</div>
        ) : (
          filteredSellers.map((seller) => {
            const isExpanded = expandedSellers.has(seller.sellerId);
            return (
              <Card key={seller.sellerId}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleSeller(seller.sellerId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      <div>
                        <CardTitle className="text-lg">{seller.sellerName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{seller.sellerEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{seller.totalOrders} Orders</div>
                      <div className="text-sm text-muted-foreground">Rs. {seller.totalRevenue.toLocaleString()}</div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2">Order ID</th>
                            <th className="text-left py-3 px-2">Customer</th>
                            <th className="text-left py-3 px-2">Date</th>
                            <th className="text-right py-3 px-2">Total</th>
                            <th className="text-left py-3 px-2">Payment</th>
                            <th className="text-left py-3 px-2">Status</th>
                            <th className="text-left py-3 px-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seller.orders.map((order) => (
                            <tr key={order.id} className="border-b hover:bg-muted/20">
                              <td className="py-3 px-2 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                              <td className="py-3 px-2">
                                <div>{order.user?.name || 'N/A'}</div>
                                <div className="text-xs text-muted-foreground">{order.user?.email || ''}</div>
                              </td>
                              <td className="py-3 px-2 text-xs">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-2 text-right font-semibold">
                                Rs. {Number(order.total || 0).toLocaleString()}
                              </td>
                              <td className="py-3 px-2">
                                <span className="text-xs px-2 py-1 rounded bg-muted">
                                  {order.paymentMethod || 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <StatusBadge status={order.status?.toLowerCase() || 'pending'} />
                              </td>
                              <td className="py-3 px-2">
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => handleStatusChange(order.id, value)}
                                >
                                  <SelectTrigger className="w-[130px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="PROCESSING">Processing</SelectItem>
                                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Orders;
