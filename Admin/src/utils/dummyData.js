// Dummy data for the admin panel

export const dashboardStats = {
  totalUsers: 1248,
  activeSellers: 89,
  pendingRequests: 12,
  totalProducts: 456,
  totalOrders: 892,
  revenue: 45678.50,
};

export const users = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '+1234567890', status: 'active', joinedDate: '2024-01-15', totalOrders: 8 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', status: 'active', joinedDate: '2024-02-20', totalOrders: 5 },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892', status: 'inactive', joinedDate: '2024-03-10', totalOrders: 0 },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', phone: '+1234567893', status: 'active', joinedDate: '2024-01-05', totalOrders: 12 },
  { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', phone: '+1234567894', status: 'active', joinedDate: '2024-02-28', totalOrders: 3 },
];

export const sellers = [
  { id: '1', name: 'Furniture Plus', email: 'contact@furnitureplus.com', phone: '+1234567800', status: 'active', joinedDate: '2024-01-10', productsCount: 45, rating: 4.5 },
  { id: '2', name: 'Modern Home', email: 'info@modernhome.com', phone: '+1234567801', status: 'active', joinedDate: '2024-01-20', productsCount: 32, rating: 4.8 },
  { id: '3', name: 'Classic Wood', email: 'sales@classicwood.com', phone: '+1234567802', status: 'inactive', joinedDate: '2024-02-15', productsCount: 18, rating: 4.2 },
  { id: '4', name: 'Luxury Furnish', email: 'hello@luxuryfurnish.com', phone: '+1234567803', status: 'active', joinedDate: '2024-02-01', productsCount: 67, rating: 4.9 },
];

export const sellerRequests = [
  { id: '1', name: 'New Furniture Co', email: 'new@furniture.com', phone: '+1234567810', status: 'pending', requestDate: '2024-03-15', businessDoc: 'business_license.pdf' },
  { id: '2', name: 'Urban Living', email: 'urban@living.com', phone: '+1234567811', status: 'pending', requestDate: '2024-03-18', businessDoc: 'business_license.pdf' },
  { id: '3', name: 'Comfort Chairs', email: 'comfort@chairs.com', phone: '+1234567812', status: 'pending', requestDate: '2024-03-20', businessDoc: 'business_license.pdf' },
];

export const products = [
  { id: '1', name: 'Modern Sofa', category: 'Sofas', price: 899.99, seller: 'Furniture Plus', status: 'approved', stock: 15, createdDate: '2024-02-10' },
  { id: '2', name: 'Dining Table Set', category: 'Dining', price: 1299.99, seller: 'Modern Home', status: 'approved', stock: 8, createdDate: '2024-02-15' },
  { id: '3', name: 'Office Chair', category: 'Office', price: 249.99, seller: 'Luxury Furnish', status: 'approved', stock: 32, createdDate: '2024-02-20' },
  { id: '4', name: 'Queen Bed Frame', category: 'Bedroom', price: 699.99, seller: 'Classic Wood', status: 'pending', stock: 5, createdDate: '2024-03-01' },
  { id: '5', name: 'Bookshelf', category: 'Storage', price: 189.99, seller: 'Furniture Plus', status: 'approved', stock: 20, createdDate: '2024-03-05' },
];

export const orders = [
  { id: '1', customer: 'John Doe', product: 'Modern Sofa', total: 899.99, status: 'delivered', orderDate: '2024-03-01', deliveryDate: '2024-03-10' },
  { id: '2', customer: 'Jane Smith', product: 'Dining Table Set', total: 1299.99, status: 'shipped', orderDate: '2024-03-05', deliveryDate: null },
  { id: '3', customer: 'Alice Brown', product: 'Office Chair', total: 249.99, status: 'pending', orderDate: '2024-03-18', deliveryDate: null },
  { id: '4', customer: 'Charlie Wilson', product: 'Bookshelf', total: 189.99, status: 'delivered', orderDate: '2024-03-10', deliveryDate: '2024-03-15' },
  { id: '5', customer: 'Bob Johnson', product: 'Queen Bed Frame', total: 699.99, status: 'cancelled', orderDate: '2024-03-12', deliveryDate: null },
];

export const categories = [
  { id: '1', name: 'Sofas', productCount: 45 },
  { id: '2', name: 'Dining', productCount: 32 },
  { id: '3', name: 'Bedroom', productCount: 56 },
  { id: '4', name: 'Office', productCount: 28 },
  { id: '5', name: 'Storage', productCount: 34 },
  { id: '6', name: 'Outdoor', productCount: 19 },
];

export const revenueData = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5800 },
  { month: 'Mar', revenue: 6500 },
  { month: 'Apr', revenue: 5200 },
  { month: 'May', revenue: 7800 },
  { month: 'Jun', revenue: 8900 },
];

export const topProducts = [
  { name: 'Modern Sofa', sales: 145 },
  { name: 'Dining Table Set', sales: 98 },
  { name: 'Office Chair', sales: 87 },
  { name: 'Queen Bed Frame', sales: 76 },
  { name: 'Bookshelf', sales: 65 },
];
