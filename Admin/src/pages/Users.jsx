import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Ban, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { adminApi } from '@/services/adminApi';

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [userData, setUserData] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getUsers();
        const rows = (res?.data || []).map((u) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
          phone: u.phoneNumber || '',
          status: 'active',
          joinedDate: u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
          totalOrders: 0,
        }));
        setUserData(rows);
      } catch (e) {
        toast.error(e?.message || 'Failed to load users');
      }
    })();
  }, []);

  const filteredUsers = userData.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeactivate = (id) => {
    setUserData(userData.map(user => 
      user.id === id ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' } : user
    ));
    toast.success('User status updated');
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteUser(id);
      setUserData(userData.filter(user => user.id !== id));
      toast.success('User deleted successfully');
    } catch (e) {
      toast.error(e?.message || 'Failed to delete user');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { header: 'Phone', accessor: 'phone' },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { header: 'Joined Date', accessor: 'joinedDate' },
    { header: 'Total Orders', accessor: 'totalOrders' },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeactivate(row.id)}
          >
            <Ban className="h-4 w-4 mr-1" />
            {row.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage all registered customers"
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable data={filteredUsers} columns={columns} />
    </div>
  );
};

export default Users;
