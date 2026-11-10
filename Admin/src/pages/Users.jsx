import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Pill from '@/components/Pill';
import { useConfirm } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Trash2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/services/adminApi';
import { formatRs, formatDate } from '@/lib/format';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const confirm = useConfirm();

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getUsers();
        setUsers(res?.data || []);
      } catch (e) {
        toast.error(e?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(
    () => ({
      all: users.length,
      CUSTOMER: users.filter((u) => u.role === 'CUSTOMER').length,
      SELLER: users.filter((u) => u.role === 'SELLER').length,
    }),
    [users]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => role === 'all' || u.role === role)
      .filter((u) => !term || [u.name, u.email, u.phoneNumber].filter(Boolean).some((v) => v.toLowerCase().includes(term)));
  }, [users, search, role]);

  const deleteBlockReason = (u) => {
    if (u.orderCount > 0) return `Has ${u.orderCount} order${u.orderCount > 1 ? 's' : ''}. Deleting would erase order history.`;
    if (u.productCount > 0) return 'Seller with products. Remove seller access first.';
    return null;
  };

  const handleDelete = async (u) => {
    const ok = await confirm({
      title: `Delete ${u.name || u.email}?`,
      description: (
        <>
          <p>This permanently deletes the account, its sign-in, saved addresses, cart, wishlist and reviews.</p>
          <p>It can't be undone.</p>
        </>
      ),
      confirmText: 'Delete account',
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminApi.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success('Account deleted');
    } catch (e) {
      toast.error(e?.message || 'Failed to delete account');
    }
  };

  return (
    <div>
      <PageHeader title="Customers" description="Everyone who has signed up in the app. Admin accounts are not listed." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={role} onValueChange={setRole}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="CUSTOMER">Customers ({counts.CUSTOMER})</TabsTrigger>
            <TabsTrigger value="SELLER">Sellers ({counts.SELLER})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="overflow-hidden shadow-none">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={UsersIcon} title="No accounts found" description={search ? 'Try a different search.' : 'New sign-ups will appear here.'} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Spent</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="w-[1%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((u) => {
                  const blocked = deleteBlockReason(u);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{u.name || '—'}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">{u.phoneNumber || '—'}</TableCell>
                      <TableCell>
                        <Pill tone={u.role === 'SELLER' ? 'brand' : 'neutral'}>{u.role === 'SELLER' ? 'Seller' : 'Customer'}</Pill>
                      </TableCell>
                      <TableCell className="text-right">{u.orderCount}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{u.totalSpent > 0 ? formatRs(u.totalSpent) : '—'}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${u.name || u.email}`}
                                disabled={!!blocked}
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{blocked || 'Delete account'}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Users;
