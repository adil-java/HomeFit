const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
// Admin API endpoints
const ADMIN_API_BASE = `${API_BASE_URL}/admin`;
// Public API base (products, categories, etc.)
const PUBLIC_API_BASE = API_BASE_URL;

function getToken() {
  return localStorage.getItem('admin_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

async function publicRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  // include token if present (useful for protected product endpoints)
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${PUBLIC_API_BASE}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export const adminApi = {
  async login(email, password) {
    const data = await request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data;
  },
  async getUsers() {
    return request('/users');
  },
  async getUserById(id) {
    return request(`/user/${id}`);
  },
  async updateUserRole(id, role) {
    return request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
  async deleteUser(id) {
    return request(`/users/${id}`, { method: 'DELETE' });
  },
  async getProducts() {
    return publicRequest('/products');
  },
  async getProductById(id) {
    return publicRequest(`/products/${id}`);
  },
  async deleteProduct(id) {
    // Deleting a product is a privileged action; use the admin API base so
    // the admin JWT (not Firebase token) is used for authorization.
    return request(`/products/${id}`, { method: 'DELETE' });
  },
  async toggleProductStatus(id, field, value) {
    // Use admin route so admin JWT (adminJwtVerify) is accepted by backend
    // (we expose PATCH /api/admin/products/:id/status in the backend router).
    return request(`/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ field, value }),
    })
  },
  async getSellers() {
    return request('/sellers');
  },
  async listSellerRequests(status) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/seller-requests${qs}`);
  },
  async approveSellerRequest(id) {
    return request(`/seller-requests/${id}/approve`, { method: 'POST' });
  },
  async rejectSellerRequest(id) {
    return request(`/seller-requests/${id}/reject`, { method: 'POST' });
  },
  async analyticsSummary() {
    return request('/analytics/summary');
  },
  async analyticsRevenueMonthly() {
    return request('/analytics/revenue-monthly');
  },
  async analyticsTopProducts() {
    return request('/analytics/top-products');
  },
  async analyticsSalesBySeller(params = {}) {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append('startDate', params.startDate);
    if (params.endDate) qs.append('endDate', params.endDate);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/analytics/sales-by-seller${query}`);
  },
  async getAdminOrders(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.append('status', params.status);
    if (params.userId) qs.append('userId', params.userId);
    if (params.sellerId) qs.append('sellerId', params.sellerId);
    if (params.startDate) qs.append('startDate', params.startDate);
    if (params.endDate) qs.append('endDate', params.endDate);
    if (params.page) qs.append('page', params.page);
    if (params.limit) qs.append('limit', params.limit);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/orders${query}`);
  },
  async updateOrderStatus(orderId, status, notes) {
    return request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },
  
  // Categories
  async getCategories() {
    return request('/categories');
  },
  async createCategory(categoryData) {
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },
  async updateCategory(id, categoryData) {
    return request(`/categories/${id}`, {
      method: 'PUT', 
      body: JSON.stringify(categoryData),
    });
  },
  async deleteCategory(id) {
    return request(`/categories/${id}`, { method: 'DELETE' });
  },

  // Payments
  async getPayments(params = {}) {
    const qs = new URLSearchParams();
    // Add payment-specific filters
    if (params.status) qs.append('paymentStatus', params.status); // Use paymentStatus instead of status
    if (params.startDate) qs.append('startDate', params.startDate);
    if (params.endDate) qs.append('endDate', params.endDate);
    if (params.page) qs.append('page', params.page);
    if (params.limit) qs.append('limit', params.limit);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/orders${query}`); // Use orders as payment source
  },
  async getPaymentDetails(paymentId) {
    return request(`/orders/${paymentId}`);
  },
  async refundPayment(orderId, amount, reason) {
    return request(`/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  },
  
  // Simulate different payment statuses for testing
  async simulatePaymentStatuses() {
    return request('/simulate-payment-statuses', {
      method: 'POST',
    });
  },
  
  // Update payment status for a specific order
  async updatePaymentStatus(orderId, paymentStatus, status) {
    return request(`/orders/${orderId}/payment-status`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus, status }),
    });
  },
};
