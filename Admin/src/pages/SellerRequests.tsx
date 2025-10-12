import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, X, FileText } from 'lucide-react';
import { sellerRequests } from '@/utils/dummyData';
import { toast } from 'sonner';

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
  const [requestData, setRequestData] = useState<SellerRequest[]>(sellerRequests);

  const handleApprove = (id: string) => {
    setRequestData(requestData.map(req => 
      req.id === id ? { ...req, status: 'approved' as const } : req
    ));
    toast.success('Seller request approved');
  };

  const handleReject = (id: string) => {
    setRequestData(requestData.map(req => 
      req.id === id ? { ...req, status: 'rejected' as const } : req
    ));
    toast.error('Seller request rejected');
  };

  const columns = [
    { header: 'Business Name', accessor: 'name' as const },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Phone', accessor: 'phone' as const },
    { 
      header: 'Status', 
      accessor: (row: typeof sellerRequests[0]) => <StatusBadge status={row.status} />
    },
    { header: 'Request Date', accessor: 'requestDate' as const },
    {
      header: 'Documents',
      accessor: (row: typeof sellerRequests[0]) => (
        <Button variant="ghost" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          View
        </Button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: typeof sellerRequests[0]) => (
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
