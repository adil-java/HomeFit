import { auth } from '../firebaseConfig';

const API_BASE_URL = 'http://localhost:8080/api'; // Backend server URL

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
      
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      
      return await response.json();
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
      
      if (!response.ok) {
        throw new Error('Backend login failed');
      }
      
      return await response.json();
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
      
      if (!response.ok) {
        throw new Error('Backend registration failed');
      }
      
      return await response.json();
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
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
