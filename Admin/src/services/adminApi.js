const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082/api/admin';

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

  const res = await fetch(`${API_BASE_URL}${path}`, {
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
};
