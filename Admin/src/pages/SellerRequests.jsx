import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Check, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Seller request shape is handled dynamically in JS

const SellerRequests = () => {
  const [requestData, setRequestData] = useState([]);
  const [rawRequests, setRawRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.listSellerRequests();
        const apps = res?.data || [];
        setRawRequests(apps);
        const rows = apps.map((r) => ({
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
      setRawRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED', reviewedAt: new Date().toISOString() } : r));
      toast.success('Seller request approved');
    } catch (e) {
      toast.error(e?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      await adminApi.rejectSellerRequest(id);
      setRequestData(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
      setRawRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED', reviewedAt: new Date().toISOString() } : r));
      toast.error('Seller request rejected');
    } catch (e) {
      toast.error(e?.message || 'Failed to reject request');
    }
  };

  const openDetails = (id) => {
    const app = rawRequests.find(r => r.id === id);
    if (app) {
      setSelectedRequest(app);
      setDetailsOpen(true);
    } else {
      toast.error('Details not found');
    }
  };

  return (
    <div>
      <PageHeader
        title="Seller Requests"
        description="Review and approve new seller applications"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {requestData.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground">No seller requests</div>
        ) : (
          requestData.map((r) => (
            <div key={r.id} className="app-container-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">{r.name}</h4>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                    <p className="text-xs text-muted-foreground">{r.phone}</p>
                  </div>
                  <div>
                    <StatusBadge status={r.status} />
                    <div className="text-xs text-muted-foreground mt-1">{r.requestDate}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-muted-foreground">Document: {r.businessDoc || 'N/A'}</div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => openDetails(r.id)}>
                    <FileText className="h-4 w-4" />
                    View
                  </Button>
                </div>

                <div className="flex gap-2">
                  {r.status === 'pending' && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(r.id)}
                        className="bg-accent hover:bg-accent/90"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(r.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seller application details</DialogTitle>
            <DialogDescription>
              {selectedRequest ? selectedRequest.businessName : 'No application selected'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedRequest && (
              <>
                <div className="space-y-2">
                  <p><strong>Business Name:</strong> {selectedRequest.businessName}</p>
                  <p><strong>Business Type:</strong> {selectedRequest.businessType}</p>
                  <p><strong>Description:</strong> {selectedRequest.description}</p>
                  <p><strong>Phone:</strong> {selectedRequest.phone}</p>
                  <p><strong>Address:</strong> {selectedRequest.address}</p>
                  <p><strong>Website:</strong> {selectedRequest.website}</p>
                  <p><strong>Tax ID:</strong> {selectedRequest.taxId}</p>
                </div>

                <div className="space-y-2">
                  <p><strong>Submitted by:</strong> {selectedRequest.user?.name ?? selectedRequest.user?.email}</p>
                  <p><strong>User email:</strong> {selectedRequest.user?.email}</p>
                  <p><strong>Submitted at:</strong> {selectedRequest.submittedAt ? new Date(selectedRequest.submittedAt).toLocaleString() : '-'}</p>
                
                
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <div className="flex gap-2">
              {selectedRequest && selectedRequest.status === 'PENDING' && (
                <>
                  <Button variant="default" onClick={() => handleApprove(selectedRequest.id)}>
                    <Check className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleReject(selectedRequest.id)}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </>
              )}
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerRequests;
