import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  CreditCard, 
  DollarSign, 
  RefreshCw, 
  Calendar,
  Filter,
  Eye,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [refundDialog, setRefundDialog] = useState({ open: false, payment: null });
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Payment statistics
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    refundedAmount: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, dateFilter]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const params = { limit: 1000 };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter.start) params.startDate = dateFilter.start;
      if (dateFilter.end) params.endDate = dateFilter.end;

      const res = await adminApi.getPayments(params);
      const orders = res?.data || [];
      
      // Transform orders to payment format
      const paymentData = orders.map(order => ({
        id: order.id,
        orderId: order.orderNumber || order.id,
        amount: Number(order.total || 0),
        currency: 'PKR',
        status: getPaymentStatus(order),
        method: order.paymentMethod || 'card',
        customer: {
          name: order.user?.name || 'Unknown',
          email: order.user?.email || '',
        },
        seller: {
          name: order.seller?.name || 'Direct Sale',
          email: order.seller?.email || '',
        },
        createdAt: order.createdAt,
        stripePaymentIntent: order.stripePaymentIntent,
        platformFee: order.platformFee || 0,
        sellerAmount: order.sellerAmount || 0,
        paymentStatus: order.paymentStatus,
        refundedAmount: 0, // TODO: Add from refunds table
      }));

      setPayments(paymentData);
      calculateStats(paymentData);
    } catch (error) {
      toast.error('Failed to fetch payments');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentStatus = (order) => {
    if (order.paymentStatus === 'PAID') return 'completed';
    if (order.paymentStatus === 'FAILED') return 'failed';
    if (order.paymentStatus === 'REFUNDED') return 'refunded';
    if (order.paymentStatus === 'PARTIALLY_REFUNDED') return 'partial_refund';
    return 'pending';
  };

  const calculateStats = (paymentData) => {
    const stats = paymentData.reduce((acc, payment) => {
      if (payment.status === 'completed') {
        acc.totalRevenue += payment.amount;
        acc.successfulPayments += 1;
      } else if (payment.status === 'pending') {
        acc.pendingPayments += 1;
      } else if (payment.status === 'refunded' || payment.status === 'partial_refund') {
        acc.refundedAmount += payment.refundedAmount || payment.amount;
      }
      return acc;
    }, {
      totalRevenue: 0,
      successfulPayments: 0,
      pendingPayments: 0,
      refundedAmount: 0,
    });

    setStats(stats);
  };

  const handleRefund = async () => {
    if (!refundDialog.payment || !refundAmount || !refundReason) {
      toast.error('Please fill in all refund details');
      return;
    }

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > refundDialog.payment.amount) {
      toast.error('Please enter a valid refund amount');
      return;
    }

    try {
      await adminApi.refundPayment(refundDialog.payment.id, amount, refundReason);
      toast.success('Refund processed successfully');
      await fetchPayments();
      setRefundDialog({ open: false, payment: null });
      setRefundAmount('');
      setRefundReason('');
    } catch (error) {
      toast.error(error.message || 'Failed to process refund');
    }
  };

  const openRefundDialog = (payment) => {
    setRefundDialog({ open: true, payment });
    setRefundAmount(payment.amount.toString());
    setRefundReason('CUSTOMER_REQUEST');
  };

  const filteredPayments = payments.filter(payment => {
    const searchMatch = !searchTerm || (
      payment.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return searchMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      case 'partial_refund': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'refunded': return <RotateCcw className="h-4 w-4" />;
      case 'partial_refund': return <RotateCcw className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Payment Management" description="Monitor and manage all payments" />
        <div className="text-center py-12 text-muted-foreground">Loading payments...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Payment Management"
        description="Monitor transactions, process refunds, and analyze payment data"
       
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">Rs. {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Successful Payments</p>
                <p className="text-2xl font-bold">{stats.successfulPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">{stats.pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <RotateCcw className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Refunded Amount</p>
                <p className="text-2xl font-bold">Rs. {stats.refundedAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, customer name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="PAID">Completed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Input
            type="date"
            placeholder="Start Date"
            value={dateFilter.start}
            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
            className="w-[150px]"
          />
          <Input
            type="date"
            placeholder="End Date"
            value={dateFilter.end}
            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
            className="w-[150px]"
          />
        </div>

        <Button variant="outline" onClick={() => {
          setDateFilter({ start: '', end: '' });
          setStatusFilter('');
          setSearchTerm('');
        }}>
          Clear Filters
        </Button>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payments found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter ? 'No payments match your filters.' : 'No payments have been processed yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Order ID</th>
                    <th className="text-left py-3 px-2">Customer</th>
                    <th className="text-left py-3 px-2">Amount</th>
                    <th className="text-left py-3 px-2">Method</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/20">
                      <td className="py-3 px-2">
                        <div className="font-mono text-sm">{payment.orderId}</div>
                        {payment.stripePaymentIntent && (
                          <div className="text-xs text-muted-foreground">
                            {payment.stripePaymentIntent.slice(0, 20)}...
                          </div>
                        )}
                      </td>
                      
                      <td className="py-3 px-2">
                        <div>{payment.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{payment.customer.email}</div>
                      </td>
                      
                      <td className="py-3 px-2">
                        <div className="font-semibold">Rs. {payment.amount.toLocaleString()}</div>
                        {payment.platformFee > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Fee: Rs. {payment.platformFee.toFixed(2)}
                          </div>
                        )}
                      </td>
                      
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">
                          {payment.method.toUpperCase()}
                        </Badge>
                      </td>
                      
                      <td className="py-3 px-2">
                        <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(payment.status)}
                            {payment.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </td>
                      
                      <td className="py-3 px-2 text-xs">
                        {new Date(payment.createdAt).toLocaleDateString()}
                        <div className="text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(payment.status === 'completed') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openRefundDialog(payment)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete information for order {selectedPayment?.orderId}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Payment ID</Label>
                  <p className="font-mono text-sm">{selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Order ID</Label>
                  <p className="font-mono text-sm">{selectedPayment.orderId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-semibold">Rs. {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedPayment.status)}>
                    {selectedPayment.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p>{selectedPayment.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.customer.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Seller</Label>
                  <p>{selectedPayment.seller.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayment.seller.email || 'Direct sale'}</p>
                </div>
              </div>

              {selectedPayment.platformFee > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Platform Fee</Label>
                      <p>Rs. {selectedPayment.platformFee.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Seller Amount</Label>
                      <p>Rs. {(selectedPayment.sellerAmount || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p>{selectedPayment.method.toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created At</Label>
                  <p>{new Date(selectedPayment.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedPayment.stripePaymentIntent && (
                <div>
                  <Label className="text-sm font-medium">Stripe Payment Intent</Label>
                  <p className="font-mono text-xs break-all">{selectedPayment.stripePaymentIntent}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <AlertDialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog({ open, payment: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Process a refund for order {refundDialog.payment?.orderId}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-amount">Refund Amount (Max: Rs. {refundDialog.payment?.amount || 0})</Label>
              <Input
                id="refund-amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                max={refundDialog.payment?.amount || 0}
                step="0.01"
              />
            </div>
            
            <div>
              <Label htmlFor="refund-reason">Reason</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER_REQUEST">Customer Request</SelectItem>
                  <SelectItem value="PRODUCT_DEFECTIVE">Product Defective</SelectItem>
                  <SelectItem value="NOT_AS_DESCRIBED">Not as Described</SelectItem>
                  <SelectItem value="DUPLICATE">Duplicate Payment</SelectItem>
                  <SelectItem value="FRAUD">Fraud</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} className="bg-red-600 hover:bg-red-700">
              Process Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payments;