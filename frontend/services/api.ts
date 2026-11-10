import { auth } from '../firebaseConfig';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://home-fit-backend.onrender.com/api';

// Debug: Log API base URL on startup
// logger.log('[API DEBUG] API_BASE_URL:', API_BASE_URL);
// logger.log('[API DEBUG] EXPO_PUBLIC_API_BASE_URL env:', process.env.EXPO_PUBLIC_API_BASE_URL);

export type AddressType = 'home' | 'work' | 'other';

export interface SavedAddress {
  id: string;
  type: AddressType;
  street: string;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

export type AddressInput = Omit<SavedAddress, 'id' | 'isDefault'> & { isDefault?: boolean };

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
      // logger.log('[API DEBUG] User UID:', user.uid);
      // logger.log('[API DEBUG] User Email:', user.email);
      // logger.log('[API DEBUG] Token (first 50 chars):', token.substring(0, 50) + '...');
    } else {
      // logger.log('[API DEBUG] No user logged in - no auth token');
    }

    return headers;
  }

  // Order related methods
  async updateOrderStatus(orderId: string, status: string, notes: string = '') {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, notes })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update order status');
      }
      return json;
    } catch (error) {
      logger.error('Update order status error:', error);
      throw error;
    }
  }

  async verifyToken() {
    try {
      // logger.log('[API DEBUG] verifyToken - Starting token verification');
      // logger.log('[API DEBUG] verifyToken - API URL:', `${API_BASE_URL}/users/verify-token`);
      const headers = await this.getAuthHeaders();
      // logger.log('[API DEBUG] verifyToken - Headers (excluding token):', { 'Content-Type': headers['Content-Type'] });
      
      const response = await fetch(`${API_BASE_URL}/users/verify-token`, {
        method: 'POST',
        headers,
      });

      // logger.log('[API DEBUG] verifyToken - Response status:', response.status);
      // logger.log('[API DEBUG] verifyToken - Response ok:', response.ok);
      
      const json = await response.json().catch(() => ({ success: false }));
      // logger.log('[API DEBUG] verifyToken - Response body:', JSON.stringify(json).substring(0, 200));
      
      if (!response.ok) {
        const message = (json as any)?.error || 'Token verification failed';
        logger.error('[API DEBUG] verifyToken - FAILED with error:', message);
        throw new Error(message);
      }

      // logger.log('[API DEBUG] verifyToken - SUCCESS');
      return json;
    } catch (error) {
      logger.warn(
        'Token verification error (network/API unavailable):',
        error
      );
      // Throw the error to be handled by the auth context
      throw new Error(
        'Unable to verify token. Please check your connection and try again.'
      );
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
      logger.error('Login error:', error);
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
      logger.warn(
        'Backend registration error (network/API unavailable):',
        error
      );
      throw error;
    }
  }

    async getProducts(limit: number = 50) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/?limit=${limit}`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      });
      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch products:', error);
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
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  async getProductById(productId: string) {
  try {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch product');
    }

    return { 
      success: true, 
      data 
    };
  } catch (error) {
    logger.error('Error fetching product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch product' 
    };
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
      logger.warn('Profile fetch error (network/API unavailable):', error);
      // Return a mock profile for build environments or when backend is unavailable
      return {
        success: true,
        user: {
          id: 'mock-user-id',
          email: 'user@example.com',
          name: 'Mock User',
          role: 'seller',
        },
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
        const message =
          (json as any)?.error || 'Failed to submit seller application';
        throw new Error(message);
      }

      return json;
    } catch (error) {
      logger.warn('Apply for seller error (network/API unavailable):', error);
      // Return a mock response for build environments or when backend is unavailable
      return {
        success: true,
        message: 'Seller application submitted (offline mode)',
      };
    }
  }

  async getSellerApplicationStatus() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/users/seller-application/status`,
        {
          method: 'GET',
          headers,
        }
      );

      const json = await response.json().catch(() => ({ success: false }));
      if (!response.ok) {
        const message =
          (json as any)?.error || 'Failed to fetch application status';
        throw new Error(message);
      }

      return json;
    } catch (error) {
      logger.warn(
        'Get seller application status error (network/API unavailable):',
        error
      );
      // Return a mock response for build environments or when backend is unavailable
      return {
        success: true,
        status: 'pending',
        message: 'Application status unavailable (offline mode)',
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
      logger.error('Error fetching categories:', error);
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
      logger.error('Error fetching categories:', error);
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
          const derivedRating =
            p?.rating ?? p?.averageRating ?? p?.averagerating ?? 0;
          return {
            id: item.productId,
            name: p?.name || 'Unknown Product',
            price: p?.price || 0,
            image: p?.images?.[0] || '',
            rating: derivedRating,
            product: item.product,
          };
        }),
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
          product: item.product, // Include full product details
        })),
      };
    }

    return { items: [] };
  }

  async removeFromWishlist(productId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/wishlist/items/${productId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

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
          product: item.product, // Include full product details
        })),
      };
    }

    return { items: [] };
  }

  async isInWishlist(productId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/wishlist/check/${productId}`,
      {
        method: 'GET',
        headers,
      }
    );

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

  async addToCart(
    productId: string,
    quantity: number = 1,
    options: any = null
  ) {
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

  async getSellerProducts(
    sellerId: string,
    page: number = 1,
    limit: number = 10
  ) {
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
      logger.error('Error fetching seller products:', error);
      throw error;
    }
  }

  /** Edit a product: FormData with a JSON "productData" part + optional "files" (new photos). */
  async updateProductForm(productId: string, formData: FormData) {
    try {
      const headers = await this.getAuthHeaders();
      // Let fetch set the multipart boundary
      // @ts-ignore
      delete headers['Content-Type'];
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'PUT',
        headers,
        body: formData,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || 'Could not save your changes');
      }
      return { success: true, data: json?.data ?? json };
    } catch (error) {
      logger.error('Error updating product:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Could not save your changes',
      };
    }
  }

  async updateProduct(productId: string, productData: any, files: any[] = []) {
    try {
      const headers = await this.getAuthHeaders();
      // Remove Content-Type header to let the browser set it with the correct boundary
      // @ts-ignore - We're intentionally removing the Content-Type header
      delete headers['Content-Type'];
      
      const formData = new FormData();
      
      // Append all product data fields to formData
      Object.keys(productData).forEach(key => {
        if (key === 'images' && Array.isArray(productData[key])) {
          // Handle images array
          formData.append(key, JSON.stringify(productData[key]));
        } else if (key === 'categoryIds' && Array.isArray(productData[key])) {
          // Handle categoryIds array
          formData.append(key, JSON.stringify(productData[key]));
        } else if (key === 'variants' && Array.isArray(productData[key])) {
          // Handle variants array
          formData.append(key, JSON.stringify(productData[key]));
        } else if (productData[key] !== undefined && productData[key] !== null) {
          formData.append(key, productData[key]);
        }
      });

      // Append files if any
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          // @ts-ignore - File type is compatible with FormData
          formData.append('files', file);
        });
      }

      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'PUT',
        headers,
        body: formData,
      });

      const json = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        const error = json.error || 'Failed to update product';
        throw new Error(error);
      }

      return { success: true, data: json };
    } catch (error) {
      logger.error('Error updating product:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update product' 
      };
    }
  }

  async deleteProduct(productId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'DELETE',
        headers,
      });

      const json = await response.json();
      if (!response.ok) {
        const message = json?.error || 'Failed to delete product';
        throw new Error(message);
      }

      return json;
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  async startSellerOnboarding(businessName: string, email: string, appReturnUrl?: string) {
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
          isMobile: Platform.OS !== 'web',
          // Where Stripe's "done" page sends the seller back to (deep link)
          appReturnUrl,
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

      if (
        !responseData.data?.onboardingUrl &&
        !responseData.data?.isOnboarded
      ) {
        throw new Error('No onboarding URL received from server');
      }

      return responseData.data;
    } catch (error) {
      logger.error('Start seller onboarding error:', error);
      throw error;
    }
  }

  async getSellerStatus(sellerId: string) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/Stripe/connect/status/${sellerId}`,
        {
          method: 'GET',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = await response.json().catch(() => ({}));

      // Handle 401 Unauthorized - user is not a seller yet
      if (response.status === 401) {
        return {
          isOnboarded: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          requirements: ['Complete seller registration'],
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
        ...responseData.data,
        // "Onboarded" = the seller has submitted their details to Stripe.
        // (Previously always true, which showed "Verification in progress"
        // to sellers who had never started.)
        isOnboarded: !!responseData.data?.detailsSubmitted,
        chargesEnabled: responseData.data?.chargesEnabled || false,
        detailsSubmitted: responseData.data?.detailsSubmitted || false,
        requirements: responseData.data?.requirements || [],
      };
    } catch (error) {
      logger.error('Get seller status error:', error);
      throw error;
    }
  }

  /** Seller's share of their sales (Rs.): paid out, on hold, recent orders. */
  async getSellerEarnings(): Promise<{
    currency: string;
    feePercent: number;
    paid: number;
    onHold: number;
    recent: { id: string; orderNumber?: string; date: string; amount: number; itemsValue: number | null; status: 'paid' | 'on_hold' | 'cancelled' }[];
  }> {
    const headers = await this.getAuthHeaders();
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/Stripe/earnings`, { headers });
    } catch {
      throw Object.assign(new Error('No internet connection'), { kind: 'offline' });
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.success) {
      const kind = response.status === 401 || response.status === 403 ? 'auth' : 'server';
      throw Object.assign(new Error(json?.error || 'Earnings unavailable'), { kind });
    }
    return json.data;
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
      logger.error('Get seller balance error:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe payment for the cart. The server prices the items itself
   * (same calculation as the order), so the amount can't be changed by the app.
   */
  async createPaymentIntentnew(
    items: { productId: string; quantity: number }[],
    currency: string = 'PKR'
  ) {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${API_BASE_URL}/stripe/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items,
            currency: currency.toLowerCase(),
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        logger.error('Payment intent error response:', responseData);
        throw new Error(
          responseData.message || 'Failed to create payment intent'
        );
      }

      if (!responseData.success) {
        throw new Error(
          responseData.message || 'Payment intent creation failed'
        );
      }

      return {
        paymentIntent: responseData.paymentIntent,
        paymentIntentId: responseData.paymentIntentId as string | undefined,
        breakdown: responseData.breakdown,
        ephemeralKey: responseData.ephemeralKey,
        customer: responseData.customer,
        publishableKey: responseData.publishableKey,
        amount: responseData.amount,
        currency: responseData.currency,
      };
    } catch (error) {
      logger.error('Create payment intent error:', error);
      throw error;
    }
  }

  async createOrder(orderData: any) {
    try {
      const headers = await this.getAuthHeaders();
      // logger.log(
      //   'Creating order with data:',
      //   JSON.stringify(orderData, null, 2)
      // );

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Extract and format validation errors if they exist
        const errorDetails = responseData.errors
          ? `Validation errors: ${JSON.stringify(responseData.errors, null, 2)}`
          : 'No additional error details';

        logger.error('Order creation failed:', {
          status: response.status,
          statusText: response.statusText,
          response: responseData,
          requestData: orderData,
          errorDetails: errorDetails,
        });

        // Create a more detailed error message
        const errorMessage =
          responseData.message ||
          (responseData.errors
            ? 'Validation failed'
            : 'Failed to create order');
        const error = new Error(
          `${errorMessage} (${response.status})`
        ) as Error & {
          response?: any;
          status?: number;
        };
        error.response = responseData;
        error.status = response.status;
        throw error;
      }

      return responseData;
    } catch (error) {
      logger.error('Error in createOrder:', error);
      throw error;
    }
  }

  async confirmPayment(orderId: string, paymentIntentId: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/orders/${orderId}/confirm-payment`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ paymentIntentId }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to confirm payment');
    }

    return response.json();
  }

  async getUserOrders(
    filters: { status?: string; page?: number; limit?: number } = {}
  ) {
    try {
      const { status, page = 1, limit = 10 } = filters;
      const queryParams = new URLSearchParams();

      if (status) queryParams.append('status', status);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/orders?${queryParams}`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching user orders:', error);
      throw error;
    }
  }

  async getOrderDetails(orderId: string) {
    if (!orderId) {
      logger.error('No order ID provided to getOrderDetails');
      throw new Error('Order ID is required');
    }

    try {
      // logger.log('Fetching order with ID:', orderId);
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers,
      });

      // logger.log('Response status:', response.status);
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        logger.error('Error response data:', responseData);
        throw new Error(
          responseData.message || 'Failed to fetch order details'
        );
      }

      // logger.log('Order details response:', responseData);

      // Handle both nested data and direct response
      const orderData = responseData.data || responseData;

      if (!orderData) {
        throw new Error('No order data received from server');
      }

      return orderData;
    } catch (error) {
      logger.error('Error in getOrderDetails:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to fetch order details');
    }
  }

  async getSellerOrders(
    filters: { status?: string; page?: number; limit?: number } = {}
  ) {
    try {
      const { status, page = 1, limit = 10 } = filters;
      const queryParams = new URLSearchParams();

      if (status) queryParams.append('status', status);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/orders/seller/orders?${queryParams}`,
        {
          headers,
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch seller orders');
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching seller orders:', error);
      throw error;
    }
  }

  async getSellerOrderDetails(orderId: string) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers,
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to fetch seller order details'
        );
      }

      const responseData = await response.json();
      return responseData.data || responseData;
    } catch (error) {
      logger.error('Error fetching seller order details:', error);
      throw error;
    }
  }

  // Seller Dashboard API methods
  async getSellerDashboardStats() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sellerDashboard/stats`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch dashboard stats');
      }

      const responseData = await response.json();
      return responseData.data || responseData;
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getRevenueByCategory() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/sellerDashboard/revenue-by-category`,
        {
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Failed to fetch revenue by category'
        );
      }

      const responseData = await response.json();
      return responseData.data || responseData;
    } catch (error) {
      logger.error('Error fetching revenue by category:', error);
      throw error;
    }
  }

  async getMonthlyRevenue() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/sellerDashboard/monthly-revenue`,
        {
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch monthly revenue');
      }

      const responseData = await response.json();
      return responseData.data || responseData;
    } catch (error) {
      logger.error('Error fetching monthly revenue:', error);
      throw error;
    }
  }

  async getTopProducts() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/sellerDashboard/top-products`,
        {
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch top products');
      }

      const responseData = await response.json();
      return responseData.data || responseData;
    } catch (error) {
      logger.error('Error fetching top products:', error);
      throw error;
    }
  }

  // ---------- Saved addresses ----------
  // Every call returns the user's full, updated address list.

  private async addressRequest(path: string, method: string, body?: unknown): Promise<SavedAddress[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/addresses${path}`, {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.success) {
      throw new Error(json.error || json.message || 'Could not update your addresses');
    }
    return json.data as SavedAddress[];
  }

  getAddresses() {
    return this.addressRequest('', 'GET');
  }

  createAddress(address: AddressInput) {
    return this.addressRequest('', 'POST', address);
  }

  updateAddress(id: string, address: AddressInput) {
    return this.addressRequest(`/${encodeURIComponent(id)}`, 'PUT', address);
  }

  setDefaultAddress(id: string) {
    return this.addressRequest(`/${encodeURIComponent(id)}/default`, 'PATCH');
  }

  deleteAddress(id: string) {
    return this.addressRequest(`/${encodeURIComponent(id)}`, 'DELETE');
  }

  /** Update the signed-in user's own profile. `photo` is a data URI (base64 image). */
  async updateMe(changes: { name?: string; phoneNumber?: string; photo?: string }) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.success) {
      throw new Error(json.error || json.message || 'Could not update your profile');
    }
    return json.user as { id: string; email: string; name: string; phoneNumber?: string | null; photoURL?: string | null; role: string };
  }
}

export const apiService = new ApiService();
