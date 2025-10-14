import { auth } from '../firebaseConfig';

// Prefer environment variable set via Expo (e.g., EXPO_PUBLIC_API_BASE_URL)
// Fallback to previous hardcoded value to avoid breaking existing setups
const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) || 'http://192.168.0.112:8080/api';

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async verifyToken() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/verify-token`, {
        method: 'POST',
        headers,
      });
      
      const json = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        const message = (json as any)?.error || 'Token verification failed';
        throw new Error(message);
      }
      
      return json;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  async login() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers,
      });
      
      const json = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        const message = (json as any)?.error || 'Backend login failed';
        throw new Error(message);
      }
      
      return json;
    } catch (error) {
      console.error('Backend login error:', error);
      throw error;
    }
  }

  async register() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers,
      });
      
      const json = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        const message = (json as any)?.error || 'Backend registration failed';
        throw new Error(message);
      }
      
      return json;
    } catch (error) {
      console.error('Backend registration error:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'GET',
        headers,
      });
      
      const json = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        const message = (json as any)?.error || 'Failed to fetch profile';
        throw new Error(message);
      }
      
      return json;
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw error;
    }
  }

  async applyForSeller(data: {
    businessName: string;
    businessType: string;
    description: string;
    phone?: string;
    address?: string;
    website?: string;
    taxId?: string;
    businessLicense?: string;
  }) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/apply-seller`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const json = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        const message = (json as any)?.error || 'Failed to submit seller application';
        throw new Error(message);
      }

      return json;
    } catch (error) {
      console.error('Apply for seller error:', error);
      throw error;
    }
  }

  async getSellerApplicationStatus() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/users/seller-application-status`, {
        method: 'GET',
        headers,
      });

      const json = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        const message = (json as any)?.error || 'Failed to fetch application status';
        throw new Error(message);
      }

      return json;
    } catch (error) {
      console.error('Get seller application status error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
