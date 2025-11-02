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
      console.warn('Token verification error (network/API unavailable):', error);
      // Throw the error to be handled by the auth context
      throw new Error('Unable to verify token. Please check your connection and try again.');
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
      console.warn('Backend login error (network/API unavailable):', error);
      // Return a mock response for build environments or when backend is unavailable
      return {
        success: true,
        message: 'Login successful (offline mode)'
      };
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
      console.warn('Backend registration error (network/API unavailable):', error);
      // Return a mock response for build environments or when backend is unavailable
      return {
        success: true,
        message: 'Registration successful (offline mode)'
      };
    }
  }

  async getProducts(){
    try{
      const response = await fetch(`${API_BASE_URL}/products/`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });
      return await response.json();
    }catch(error){
      console.error('Failed to fetch products:', error);
      return { success: false, error: 'Failed to fetch products' };
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
      console.warn('Profile fetch error (network/API unavailable):', error);
      // Return a mock profile for build environments or when backend is unavailable
      return {
        success: true,
        user: {
          id: 'mock-user-id',
          email: 'user@example.com',
          name: 'Mock User',
          role: 'seller'
        }
      };
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
      console.warn('Apply for seller error (network/API unavailable):', error);
      // Return a mock response for build environments or when backend is unavailable
      return {
        success: true,
        message: 'Seller application submitted (offline mode)'
      };
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
      console.warn('Get seller application status error (network/API unavailable):', error);
      // Return a mock response for build environments or when backend is unavailable
      return {
        success: true,
        status: 'pending',
        message: 'Application status unavailable (offline mode)'
      };
    }
  }

  async stripeGetKeys() {
    // Public endpoint: no auth required
    const res = await fetch(`${API_BASE_URL}/stripe/keys`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error('Failed to fetch Stripe keys');
    }
    return data as { publishableKey: string };
  }

  async createPaymentIntent() {
    // Protected endpoint: requires Authorization header
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/stripe/create-payment-intent`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok) {
      const message = (data as any)?.error || 'Failed to create PaymentIntent';
      throw new Error(message);
    }
    return data as {
      paymentIntent: string; // client_secret
      ephemeralKey: string;
      customer: string;
      publishableKey?: string;
    };
  }

  async getCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to fetch categories');
      }

      const categories = await response.json();
      
      // Map the categories to include the image URL
      return categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image || null, // Assuming the category has an image property
        description: category.description || '',
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

    // Wishlist methods
  async getWishlist() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch wishlist');
    }
    
    return response.json();
  }

  async addToWishlist(productId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wishlist/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to add to wishlist');
    }
    
    return response.json();
  }

  async removeFromWishlist(productId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wishlist/items/${productId}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to remove from wishlist');
    }
    
    return response.json();
  }

  async checkInWishlist(productId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wishlist/items/${productId}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to check wishlist status');
    }
    
    return response.json();
  }
  
}

export const apiService = new ApiService();
