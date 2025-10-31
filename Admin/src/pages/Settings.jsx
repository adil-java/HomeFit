import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DataTable from '@/components/DataTable';
import { Plus, Trash2, Edit } from 'lucide-react';
import { categories } from '@/utils/dummyData';
import { toast } from 'sonner';

const Settings = () => {
  const [categoryData, setCategoryData] = useState(categories);
  const [deliveryFee, setDeliveryFee] = useState('5.99');
  const [taxRate, setTaxRate] = useState('8.5');
  const [commissionRate, setCommissionRate] = useState('10');

  const handleSaveConfig = () => {
    toast.success('Configuration saved successfully');
  };

  const handleDeleteCategory = (id) => {
    setCategoryData(categoryData.filter(cat => cat.id !== id));
    toast.success('Category deleted');
  };

  const categoryColumns = [
    { header: 'Category Name', accessor: 'name' },
    { header: 'Product Count', accessor: 'productCount' },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteCategory(row.id)}
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
        title="Settings"
        description="Manage platform configuration and settings"
      />

      <div className="space-y-6">
        {/* Platform Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Configuration</CardTitle>
            <CardDescription>Set delivery fees, tax rates, and commission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  step="0.1"
                />
              </div>
            </div>
            <Button onClick={handleSaveConfig}>Save Configuration</Button>
          </CardContent>
        </Card>

        {/* Category Management */}
        <Card>
          <CardHeader>
            <CardTitle>Category Management</CardTitle>
            <CardDescription>Add, edit, or remove product categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Input placeholder="New category name" className="max-w-sm" />
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
            <DataTable data={categoryData} columns={categoryColumns} />
          </CardContent>
        </Card>

        {/* Website Content */}
        <Card>
          <CardHeader>
            <CardTitle>Website Content</CardTitle>
            <CardDescription>Update promotional text and banners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bannerText">Banner Text</Label>
              <Input
                id="bannerText"
                defaultValue="Get 20% off on all furniture this month!"
                placeholder="Enter banner text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promoText">Promotional Message</Label>
              <Textarea
                id="promoText"
                defaultValue="Welcome to our furniture marketplace. Find the best deals on quality furniture."
                placeholder="Enter promotional message"
                rows={4}
              />
            </div>
            <Button onClick={handleSaveConfig}>Save Content</Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure email and push notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Send email notifications for important events</p>
              </div>
              <Button variant="outline">Configure</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Send push notifications to mobile app users</p>
              </div>
              <Button variant="outline">Configure</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
