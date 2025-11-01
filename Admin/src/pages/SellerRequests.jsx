import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';

// Seller request shape is handled dynamically in JS

const SellerRequests = () => {
  const [requestData, setRequestData] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.listSellerRequests();
        const rows = (res?.data || []).map((r) => ({
          id: r.id,
          name: r.businessName || r.user?.name || r.user?.email || 'Unknown',
          email: r.user?.email || '',
          phone: r.user?.phoneNumber || '',
          status: (r.status || 'PENDING').toLowerCase(),
          requestDate: r.submittedAt ? new Date(r.submittedAt).toISOString().slice(0,10) : '',
          businessDoc: r.businessLicense || '-',
        }));
        setRequestData(rows);
      } catch (e) {
        toast.error(e?.message || 'Failed to load seller requests');
      }
    })();
  }, []);

  const handleApprove = async (id) => {
    try {
      await adminApi.approveSellerRequest(id);
      setRequestData(prev => prev.map(req => req.id === id ? { ...req, status: 'approved' } : req));
      toast.success('Seller request approved');
    } catch (e) {
      toast.error(e?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      await adminApi.rejectSellerRequest(id);
      setRequestData(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
      toast.error('Seller request rejected');
    } catch (e) {
      toast.error(e?.message || 'Failed to reject request');
    }
  };

  const columns = [
    { header: 'Business Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { 
      header: 'Status', 
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { header: 'Request Date', accessor: 'requestDate' },
    {
      header: 'Documents',
      accessor: (row) => (
        <Button variant="ghost" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          View
        </Button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          {row.status === 'pending' && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleApprove(row.id)}
                className="bg-accent hover:bg-accent/90"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleReject(row.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Seller Requests"
        description="Review and approve new seller applications"
      />

      <DataTable data={requestData} columns={columns} />
    </div>
  );
};

export default SellerRequests;
