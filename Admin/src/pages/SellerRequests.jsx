import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Pill from '@/components/Pill';
import { useConfirm } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, FileText, UserCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { formatDate, formatDateTime } from '@/lib/format';

const STATUS = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

const Field = ({ label, value, link }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    {value ? (
      link ? (
        <a href={/^https?:\/\//.test(value) ? value : `https://${value}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-sm text-primary hover:underline">
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <p className="whitespace-pre-line break-words text-sm">{value}</p>
      )
    ) : (
      <p className="text-sm text-muted-foreground">—</p>
    )}
  </div>
);

const SellerRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const confirm = useConfirm();

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.listSellerRequests();
        setRequests(res?.data || []);
      } catch (e) {
        toast.error(e?.message || 'Failed to load seller requests');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const c = { PENDING: 0, APPROVED: 0, REJECTED: 0, all: requests.length };
    requests.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [requests]);

  const visible = tab === 'all' ? requests : requests.filter((r) => r.status === tab);

  const update = (id, patch) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSelected((s) => (s?.id === id ? { ...s, ...patch } : s));
  };

  const handleApprove = async (r) => {
    const ok = await confirm({
      title: `Approve ${r.businessName}?`,
      description: (
        <>
          <p>{r.user?.name || r.user?.email} becomes a seller and can list products right away.</p>
          <p>They'll need to finish payout setup in the app before they can receive money.</p>
        </>
      ),
      confirmText: 'Approve seller',
    });
    if (!ok) return;
    setBusyId(r.id);
    try {
      await adminApi.approveSellerRequest(r.id);
      update(r.id, { status: 'APPROVED', reviewedAt: new Date().toISOString() });
      toast.success(`${r.businessName} approved`);
    } catch (e) {
      toast.error(e?.message || 'Failed to approve request');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (r) => {
    const notes = await confirm({
      title: `Reject ${r.businessName}?`,
      description: <p>The applicant stays a customer. You can add a short reason for your records.</p>,
      input: { label: 'Reason (optional)', placeholder: 'e.g. Business details could not be verified' },
      confirmText: 'Reject request',
      destructive: true,
    });
    if (notes === false) return;
    setBusyId(r.id);
    try {
      await adminApi.rejectSellerRequest(r.id, notes || undefined);
      update(r.id, { status: 'REJECTED', reviewedAt: new Date().toISOString(), ...(notes ? { adminNotes: notes } : {}) });
      toast.success('Request rejected');
    } catch (e) {
      toast.error(e?.message || 'Failed to reject request');
    } finally {
      setBusyId(null);
    }
  };

  const Actions = ({ r, size = 'sm' }) =>
    r.status === 'PENDING' ? (
      <div className="flex gap-2">
        <Button size={size} variant="outline" disabled={busyId === r.id} onClick={() => handleReject(r)}>
          <X className="mr-1 h-4 w-4" />
          Reject
        </Button>
        <Button size={size} disabled={busyId === r.id} onClick={() => handleApprove(r)}>
          <Check className="mr-1 h-4 w-4" />
          Approve
        </Button>
      </div>
    ) : null;

  return (
    <div>
      <PageHeader title="Seller requests" description="People who applied to sell on HomeFit. Approving a request turns their account into a seller account." />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="PENDING">Pending ({counts.PENDING})</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved ({counts.APPROVED})</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected ({counts.REJECTED})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted/40 shadow-none" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={UserCheck} title={tab === 'PENDING' ? 'No requests waiting' : 'Nothing here'} description={tab === 'PENDING' ? 'New seller applications from the app will show up here.' : undefined} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <Card key={r.id} className="shadow-none">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.businessName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.user?.name ? `${r.user.name} · ` : ''}
                      {r.user?.email}
                    </p>
                  </div>
                  <Pill tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label || r.status}</Pill>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Type: </span>
                    {r.businessType || '—'}
                  </p>
                  <p className="line-clamp-2 text-muted-foreground">{r.description}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied {formatDate(r.submittedAt)}
                  {r.reviewedAt && r.status !== 'PENDING' ? ` · reviewed ${formatDate(r.reviewedAt)}` : ''}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    Details
                  </Button>
                  <Actions r={r} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selected.businessName}
                  <Pill tone={STATUS[selected.status]?.tone}>{STATUS[selected.status]?.label}</Pill>
                </DialogTitle>
                <DialogDescription>Applied {formatDateTime(selected.submittedAt)}</DialogDescription>
              </DialogHeader>
              <div className="grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-2">
                <Field label="Business type" value={selected.businessType} />
                <Field label="Applicant" value={[selected.user?.name, selected.user?.email].filter(Boolean).join(' · ')} />
                <Field label="Business phone" value={selected.phone || selected.user?.phoneNumber} />
                <Field label="Website" value={selected.website} link />
                <Field label="Address" value={selected.address} />
                <Field label="Tax ID" value={selected.taxId} />
                <Field label="Business licence" value={selected.businessLicense} link={/^https?:\/\//.test(selected.businessLicense || '')} />
                <div className="sm:col-span-2">
                  <Field label="About the business" value={selected.description} />
                </div>
                {selected.adminNotes && (
                  <div className="sm:col-span-2">
                    <Field label="Admin note" value={selected.adminNotes} />
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Actions r={selected} size="default" />
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerRequests;
