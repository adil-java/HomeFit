import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  rating: number;
}

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  pendingActions: Record<string, boolean>; // Track pending optimistic updates
  isInitialized: boolean; // Track if initial data has been loaded
  isRefreshing: boolean; // Track if we're refreshing the data
}

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
  lastUpdated: null,
  pendingActions: {},
  isInitialized: false,
  isRefreshing: false,
};

// Utility function to generate unique ID for pending actions
const generateActionId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Async thunks
interface FetchWishlistOptions {
  forceRefresh?: boolean;
}

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async ({ forceRefresh = false }: FetchWishlistOptions = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { wishlist: WishlistState };
      
      // Don't refetch if we already have data and it's not a force refresh
      if (!forceRefresh && state.wishlist.isInitialized && !state.wishlist.isRefreshing) {
        return {
          items: state.wishlist.items,
          isInitialized: true,
          timestamp: state.wishlist.lastUpdated || Date.now(),
          isRefreshing: false
        };
      }
      
      const startTime = performance.now();
      const response = await apiService.getWishlist();
      const duration = performance.now() - startTime;
      console.log(`[Performance] fetchWishlist took ${Math.round(duration)}ms`);
      
      // Always return an array, even if response.items is undefined
      return {
        items: Array.isArray(response?.items) ? response.items : [],
        isInitialized: true,
        timestamp: Date.now(),
        isRefreshing: false
      };
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);
      return rejectWithValue({
        error: error.message || 'Failed to fetch wishlist',
        isInitialized: true,
        isRefreshing: false
      });
    }
  }
);

export const addToWishlist = createAsyncThunk(
  'wishlist/addToWishlist',
  async (product: WishlistItem, { dispatch, rejectWithValue, getState }) => {
    const actionId = generateActionId('add');
    const startTime = performance.now();
    const { items } = (getState() as { wishlist: WishlistState }).wishlist;
    
    // Check if already in wishlist
    const alreadyExists = items.some(item => item.id === product.id);
    if (alreadyExists) {
      return rejectWithValue('Item already in wishlist');
    }

    // Optimistic update
    dispatch(wishlistSlice.actions.setPendingAction({ id: actionId, status: true }));
    dispatch(wishlistSlice.actions.addItemOptimistic(product));

    try {
      // Fire and forget the API call
      apiService.addToWishlist(product.id)
        .then(() => {
          const duration = performance.now() - startTime;
          console.log(`[Performance] addToWishlist API call took ${Math.round(duration)}ms`);
        })
        .catch(error => {
          console.error('Failed to add to wishlist:', error);
          // Revert the optimistic update
          dispatch(wishlistSlice.actions.removeItemOptimistic(product.id));
          dispatch(wishlistSlice.actions.setError(error.message || 'Failed to add to wishlist'));
        })
        .finally(() => {
          dispatch(wishlistSlice.actions.clearPendingAction(actionId));
        });
      
      return { product, actionId };
    } catch (error: any) {
      dispatch(wishlistSlice.actions.clearPendingAction(actionId));
      return rejectWithValue(error.message || 'Failed to add to wishlist');
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  'wishlist/removeFromWishlist',
  async (productId: string, { dispatch, rejectWithValue, getState }) => {
    const actionId = generateActionId('remove');
    const startTime = performance.now();
    const state = getState() as { wishlist: WishlistState };
    const itemToRemove = state.wishlist.items.find(item => item.id === productId);
    
    if (!itemToRemove) {
      return rejectWithValue({
        message: 'Item not found in wishlist',
        code: 'NOT_FOUND'
      });
    }

    // Optimistic update
    dispatch(wishlistSlice.actions.setPendingAction({ id: actionId, status: true }));
    dispatch(wishlistSlice.actions.removeItemOptimistic(productId));

    try {
      // Fire and forget the API call
      const promise = apiService.removeFromWishlist(productId)
        .then(() => {
          const duration = performance.now() - startTime;
          console.log(`[Performance] removeFromWishlist API call took ${Math.round(duration)}ms`);
        })
        .catch((error: any) => {
          console.error('Failed to remove from wishlist:', error);
          
          // Only revert for network errors or server errors (not 404)
          if (error.status !== 404) {
            // Revert the optimistic update
            if (itemToRemove) {
              dispatch(wishlistSlice.actions.addItemOptimistic(itemToRemove));
            }
            
            // Show error message for non-404 errors
            const errorMessage = error.message || 'Failed to remove from wishlist';
            dispatch(wishlistSlice.actions.setError(errorMessage));
          } else {
            // For 404, the item was already removed on the server
            console.log('Item already removed from wishlist on server');
          }
        })
        .finally(() => {
          dispatch(wishlistSlice.actions.clearPendingAction(actionId));
        });

      // Return the promise for proper error handling in the component
      await promise;
      
      return { productId, actionId };
    } catch (error: any) {
      dispatch(wishlistSlice.actions.clearPendingAction(actionId));
      return rejectWithValue(error.message || 'Failed to remove from wishlist');
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlist: (state) => {
      state.items = [];
      state.error = null;
      state.lastUpdated = Date.now();
      state.pendingActions = {};
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Optimistic update reducers
    addItemOptimistic: (state, action: PayloadAction<WishlistItem>) => {
      const exists = state.items.some(item => item.id === action.payload.id);
      if (!exists) {
        state.items.push(action.payload);
        state.lastUpdated = Date.now();
      }
    },
    removeItemOptimistic: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.lastUpdated = Date.now();
    },
    // Pending actions tracking
    setPendingAction: (state, action: PayloadAction<{ id: string; status: boolean }>) => {
      state.pendingActions[action.payload.id] = action.payload.status;
    },
    clearPendingAction: (state, action: PayloadAction<string>) => {
      delete state.pendingActions[action.payload];
    },
  },
  extraReducers: (builder) => {
    // Fetch wishlist
    builder
      .addCase(fetchWishlist.pending, (state, action) => {
        // Only clear items on initial load or force refresh
        if (!state.isInitialized || action.meta.arg?.forceRefresh) {
          state.isRefreshing = true;
          if (!state.isInitialized) {
            state.items = [];
          }
        }
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.isRefreshing = false;
        // Only update items if we got a valid response
        if (action.payload) {
          state.items = action.payload.items;
          state.isInitialized = true;
          state.lastUpdated = action.payload.timestamp || Date.now();
        }
        state.error = null;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.isRefreshing = false;
        state.isInitialized = true; // Mark as initialized even on error
        state.error = (action.payload as any)?.error || 'Failed to fetch wishlist';
        // Keep existing items if we have them, but mark as potentially stale
        state.lastUpdated = state.lastUpdated || 0;
      });

    // Add to wishlist - optimistic updates are handled by the thunk
    builder
      .addCase(addToWishlist.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.loading = false;
        // Error is already handled in the thunk with optimistic rollback
        state.error = action.payload as string;
      });

    // Remove from wishlist - optimistic updates are handled by the thunk
    builder
      .addCase(removeFromWishlist.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.loading = false;
        // Error is already handled in the thunk with optimistic rollback
        state.error = action.payload as string;
      });
  },
});

// Export actions and selectors
export const { 
  clearWishlist, 
  setError,
  addItemOptimistic,
  removeItemOptimistic,
  setPendingAction,
  clearPendingAction,
} = wishlistSlice.actions;

// Export selectors
export const selectWishlistItems = (state: { wishlist: WishlistState }) => state.wishlist.items;

export const selectIsInWishlist = (productId: string) => 
  (state: { wishlist: WishlistState }) => 
    state.wishlist.items.some(item => item.id === productId);

export const selectIsWishlistActionPending = (actionId: string) =>
  (state: { wishlist: WishlistState }) =>
    state.wishlist.pendingActions[actionId] || false;

export default wishlistSlice.reducer;