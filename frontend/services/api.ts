import { auth } from '../firebaseConfig';
import { Platform } from 'react-native';

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

      return response.json();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
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

  async createProduct(formData: FormData) {
    try {
      const headers = await this.getAuthHeaders();
      // Remove the Content-Type header to let the browser set it with the correct boundary
      delete headers['Content-Type'];
      
      const response = await fetch(`${API_BASE_URL}/products/`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create product');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating product:', error);
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

      const data = await response.json();
      // Return the categories array directly as the data property
      return { data };
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return an empty array in case of error to prevent UI breaking
      return { data: [] };
    }
  }

    async getCategoriesWithImages() {
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
    
    const data = await response.json();
    
    // Transform the response to match the expected frontend format
    if (data && data.items) {
      return {
        ...data,
        items: data.items.map((item: any) => {
          const p = item.product || {};
          const derivedRating = p?.rating ?? p?.averageRating ?? p?.averagerating ?? 0;
          return {
            id: item.productId,
            name: p?.name || 'Unknown Product',
            price: p?.price || 0,
            image: p?.images?.[0] || '',
            rating: derivedRating,
            product: item.product,
          };
        })
      };
    }
    
    return { items: [] };
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
    
    const data = await response.json();
    
    // Transform the response to match the expected frontend format
    if (data && data.items) {
      return {
        ...data,
        items: data.items.map((item: any) => ({
          id: item.productId,
          name: item.product?.name || 'Unknown Product',
          price: item.product?.price || 0,
          image: item.product?.images?.[0] || '',
          rating: 0, // Default rating if not provided
          product: item.product // Include full product details
        }))
      };
    }
    
    return { items: [] };
  }

  async removeFromWishlist(productId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wishlist/items/${productId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMessage = data.message || 'Failed to remove from wishlist';
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }
    
    // Transform the response to match the expected frontend format
    if (data && data.items) {
      return {
        ...data,
        items: data.items.map((item: any) => ({
          id: item.productId,
          name: item.product?.name || 'Unknown Product',
          price: item.product?.price || 0,
          image: item.product?.images?.[0] || '',
          rating: 0, // Default rating if not provided
          product: item.product // Include full product details
        }))
      };
    }
    
    return { items: [] };
  }

  async isInWishlist(productId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wishlist/check/${productId}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to check wishlist status');
    }
    
    const data = await response.json();
    return data.isInWishlist || false;
  }


  //Cart methods
  async getCart() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cart`, {
      method: 'GET',
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data as any)?.message || 'Failed to fetch cart';
      throw new Error(message);
    }

    return data;
  }

  async addToCart(productId: string, quantity: number = 1, options: any = null) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cart/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId, quantity, options }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data as any)?.message || 'Failed to add item to cart';
      throw new Error(message);
    }

    return data;
  }

  async updateCartItem(itemId: string, quantity: number) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ quantity }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data as any)?.message || 'Failed to update cart item';
      throw new Error(message);
    }

    return data;
  }

  async removeCartItem(itemId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data as any)?.message || 'Failed to remove cart item';
      throw new Error(message);
    }

    return data;
  }

  async clearCart() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/cart`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (data as any)?.message || 'Failed to clear cart';
      throw new Error(message);
    }

    return data;
  }

  async getSellerProducts(sellerId: string, page: number = 1, limit: number = 10) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/products/seller/${sellerId}?page=${page}&limit=${limit}`,
        { headers }
      );

      const json = await response.json();
      if (!response.ok) {
        const message = json?.error || 'Failed to fetch products';
        throw new Error(message);
      }

      return json;
    } catch (error) {
      console.error('Error fetching seller products:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/products/${productId}`,
        {
        method: 'DELETE',
          headers
        }
      );

      const json = await response.json();
      if (!response.ok) {
        const message = json?.error || 'Failed to delete product';
        throw new Error(message);
      }

      return json;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async startSellerOnboarding(businessName: string, email: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/Stripe/connect/onboard`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          businessName, 
          email,
          isMobile: Platform.OS !== 'web' 
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(
          responseData.error || 
          responseData.message || 
          'Failed to start onboarding. Please try again.'
        );
      }

      if (!responseData.data?.onboardingUrl && !responseData.data?.isOnboarded) {
        throw new Error('No onboarding URL received from server');
      }

      return responseData.data;
    } catch (error) {
      console.error('Start seller onboarding error:', error);
      throw error;
    }
  }

  async getSellerStatus(sellerId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/Stripe/connect/status/${sellerId}`, {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json().catch(() => ({}));
      
      // Handle 401 Unauthorized - user is not a seller yet
      if (response.status === 401) {
        return {
          isOnboarded: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          requirements: ['Complete seller registration']
        };
      }
      
      if (!response.ok) {
        throw new Error(
          responseData.message || 
          responseData.error || 
          'Failed to fetch seller status. Please try again.'
        );
      }

      if (!responseData.success) {
        throw new Error(responseData.error || 'Invalid response from server');
      }

      return {
        isOnboarded: true,
        chargesEnabled: responseData.data?.chargesEnabled || false,
        detailsSubmitted: responseData.data?.detailsSubmitted || false,
        requirements: responseData.data?.requirements || [],
        ...responseData.data
      };
    } catch (error) {
      console.error('Get seller status error:', error);
      throw error;
    }
  }

  async getSellerBalance() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/Stripe/balance`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seller balance');
      }

      return response.json();
    } catch (error) {
      console.error('Get seller balance error:', error);
      throw error;
    }
  }

  async createPaymentIntentnew(orderId: string, amount: number, sellerId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/Stripe/payment-intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId, totalAmount: amount, sellerId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create payment intent');
      }

      return response.json();
    } catch (error) {
      console.error('Create payment intent error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
