import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';

type SellerRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  businessDoc: string;
};

const SellerRequests = () => {
  const [requestData, setRequestData] = useState<SellerRequest[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.listSellerRequests();
        const rows: SellerRequest[] = (res?.data || []).map((r: any) => ({
          id: r.id,
          name: r.businessName || r.user?.name || r.user?.email || 'Unknown',
          email: r.user?.email || '',
          phone: r.user?.phoneNumber || '',
          status: (r.status || 'PENDING').toLowerCase(),
          requestDate: r.submittedAt ? new Date(r.submittedAt).toISOString().slice(0,10) : '',
          businessDoc: r.businessLicense || '-',
        }));
        setRequestData(rows);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load seller requests');
      }
    })();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveSellerRequest(id);
      setRequestData(prev => prev.map(req => req.id === id ? { ...req, status: 'approved' } : req));
      toast.success('Seller request approved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await adminApi.rejectSellerRequest(id);
      setRequestData(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
      toast.error('Seller request rejected');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject request');
    }
  };

  const columns = [
    { header: 'Business Name', accessor: 'name' as const },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Phone', accessor: 'phone' as const },
    { 
      header: 'Status', 
      accessor: (row: SellerRequest) => <StatusBadge status={row.status} />
    },
    { header: 'Request Date', accessor: 'requestDate' as const },
    {
      header: 'Documents',
      accessor: (row: SellerRequest) => (
        <Button variant="ghost" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          View
        </Button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: SellerRequest) => (
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
