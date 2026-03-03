import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';

export interface CartItem {
  // Product identifier
  id: string;
  // Server-side cart item identifier (used for update/delete endpoints)
  cartItemId?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  maxQuantity?: number;
  color?: string;
  size?: string;
  options?: Record<string, string>;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  pendingActions: Record<string, boolean>;
  isInitialized: boolean;
}

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  loading: false,
  error: null,
  lastUpdated: null,
  pendingActions: {},
  isInitialized: false,
};

// Utility
const genId = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const normalizeOptions = (opts?: Record<string, string>) => {
  if (!opts) return '';
  return Object.keys(opts)
    .map(k => k.trim().toLowerCase())
    .sort()
    .map(k => `${k}:${String((opts as any)[k]).trim().toLowerCase()}`)
    .join('|');
};

// Thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiService.getCart();
      const items: CartItem[] = Array.isArray(res?.items)
        ? res.items.map((it: any) => ({
            id: it.productId || it.product?.id || it.id,
            cartItemId: it.id,
            name: it.product?.name || it.name || 'Unknown',
            price: it.product?.price ?? it.price ?? 0,
            image: it.product?.images?.[0] || it.image || '',
            quantity: it.quantity ?? 1,
            maxQuantity: it.product?.quantity ?? it.product?.stock ?? undefined,
            options: it.options || (it.color || it.size ? { color: it.color, size: it.size } : undefined),
            color: (it.options?.color || it.color) ?? undefined,
            size: (it.options?.size || it.size) ?? undefined,
          }))
        : [];
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const itemCount = items.reduce((s, i) => s + i.quantity, 0);
      return { items, total, itemCount, timestamp: Date.now() };
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to fetch cart');
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async (
    payload: Omit<CartItem, 'quantity'> & { quantity?: number },
    { dispatch, getState, rejectWithValue }
  ) => {
    const actionId = genId('add');
    const { id, name, price, image, quantity = 1, color, size, options } = payload;
    const state = getState() as any;
    const normalizedOptions = normalizeOptions(options ?? { color, size });
    const existingQty = (state?.cart?.items || [])
      .filter((i: CartItem) => i.id === id && normalizeOptions(i.options) === normalizedOptions)
      .reduce((sum: number, i: CartItem) => sum + i.quantity, 0);

    const product = (state?.products?.products || []).find((p: any) => p.id === id);
    const stockLimitRaw = product?.quantity ?? product?.stock;
    const stockLimit = typeof stockLimitRaw === 'number' && stockLimitRaw > 0 ? stockLimitRaw : undefined;

    let quantityToAdd = Math.max(1, quantity);
    if (stockLimit !== undefined) {
      const remaining = stockLimit - existingQty;
      if (remaining <= 0) {
        return rejectWithValue(`Only ${stockLimit} items available in stock`);
      }
      quantityToAdd = Math.min(quantityToAdd, remaining);
    }

    // optimistic
    dispatch(cartSlice.actions.setPendingAction({ id: actionId, status: true }));
    dispatch(
      cartSlice.actions.addItemOptimistic({
        id,
        name,
        price,
        image,
        quantity: quantityToAdd,
        maxQuantity: stockLimit,
        color,
        size,
        options,
      })
    );
    try {
      const res = await apiService.addToCart(id, quantityToAdd, options ?? { color, size });
      if (res && Array.isArray(res.items)) {
        const mapped: CartItem[] = res.items.map((it: any) => ({
          id: it.productId || it.product?.id || it.id,
          cartItemId: it.id,
          name: it.product?.name || it.name || 'Unknown',
          price: it.product?.price ?? it.price ?? 0,
          image: it.product?.images?.[0] || it.image || '',
          quantity: it.quantity ?? 1,
          maxQuantity: it.product?.quantity ?? it.product?.stock ?? undefined,
          options: it.options || (it.color || it.size ? { color: it.color, size: it.size } : undefined),
          color: (it.options?.color || it.color) ?? undefined,
          size: (it.options?.size || it.size) ?? undefined,
        }));
        const total = mapped.reduce((s, i) => s + i.price * i.quantity, 0);
        const itemCount = mapped.reduce((s, i) => s + i.quantity, 0);
        dispatch(cartSlice.actions.setCartFromServer({ items: mapped, total, itemCount, timestamp: Date.now() }));
      }
      return { actionId };
    } catch (e: any) {
      // rollback
      dispatch(cartSlice.actions.removeItemOptimistic(id));
      return rejectWithValue(e.message || 'Failed to add to cart');
    } finally {
      dispatch(cartSlice.actions.clearPendingAction(actionId));
    }
  }
);

export const updateQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async (
    { id, quantity }: { id: string; quantity: number },
    { dispatch, getState, rejectWithValue }
  ) => {
    const actionId = genId('update');
    const state = getState() as { cart: CartState };
    const prev = state.cart.items.find(i => {
      const composite = `${i.id}::${Object.keys(i.options || {})
        .sort()
        .map(k => `${k}:${(i.options as any)[k]}`)
        .join('|')}`;
      return i.id === id || i.cartItemId === id || composite === id;
    });
    dispatch(cartSlice.actions.setPendingAction({ id: actionId, status: true }));
    dispatch(cartSlice.actions.updateQuantityOptimistic({ id, quantity }));
    try {
      // Prefer server cartItemId when present
      const serverId = prev?.cartItemId || id;
      await apiService.updateCartItem(serverId, quantity);
      await dispatch(fetchCart());
      return { actionId };
    } catch (e: any) {
      // rollback to previous quantity if we had one
      if (prev) {
        dispatch(cartSlice.actions.updateQuantityOptimistic({ id, quantity: prev.quantity }));
      }
      return rejectWithValue(e.message || 'Failed to update cart item');
    } finally {
      dispatch(cartSlice.actions.clearPendingAction(actionId));
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (id: string, { dispatch, getState, rejectWithValue }) => {
    const actionId = genId('remove');
    const state = getState() as { cart: CartState };
    const prev = state.cart.items.find(i => {
      const composite = `${i.id}::${Object.keys(i.options || {})
        .sort()
        .map(k => `${k}:${(i.options as any)[k]}`)
        .join('|')}`;
      return i.id === id || i.cartItemId === id || composite === id;
    });
    dispatch(cartSlice.actions.setPendingAction({ id: actionId, status: true }));
    const removeKey = prev?.cartItemId || `${prev?.id}::${Object.keys(prev?.options || {})
  .map(k => k.trim().toLowerCase())
  .sort()
  .map(k => `${k}:${String((prev?.options as any)[k]).trim().toLowerCase()}`)
  .join('|')}`;

dispatch(cartSlice.actions.removeItemOptimistic(removeKey));

    try {
      let serverId = prev?.cartItemId || id;
      // If we don't have a server cartItemId yet (optimistic-only), resolve it by fetching cart
      if (!prev?.cartItemId) {
        const fresh = await apiService.getCart();
        if (Array.isArray(fresh?.items)) {
          const norm = (opts?: Record<string, string>) =>
            Object.keys(opts || {})
              .map(k => k.trim().toLowerCase())
              .sort()
              .map(k => `${k}:${String((opts as any)[k]).trim().toLowerCase()}`)
              .join('|');
          const targetKey = `${prev?.id}::${norm(prev?.options)}`;
          const match = fresh.items.find((it: any) => {
            const key = `${it.productId || it.product?.id || it.id}::${norm(it.options || (it.color || it.size ? { color: it.color, size: it.size } : undefined))}`;
            return key === targetKey;
          });
          if (match?.id) {
            serverId = match.id;
          }
        }
      }
      const res = await apiService.removeCartItem(serverId);
      if (res && Array.isArray(res.items)) {
        const mapped: CartItem[] = res.items.map((it: any) => ({
          id: it.productId || it.product?.id || it.id,
          cartItemId: it.id,
          name: it.product?.name || it.name || 'Unknown',
          price: it.product?.price ?? it.price ?? 0,
          image: it.product?.images?.[0] || it.image || '',
          quantity: it.quantity ?? 1,
          maxQuantity: it.product?.quantity ?? it.product?.stock ?? undefined,
          options: it.options || (it.color || it.size ? { color: it.color, size: it.size } : undefined),
          color: (it.options?.color || it.color) ?? undefined,
          size: (it.options?.size || it.size) ?? undefined,
        }));
        const total = mapped.reduce((s, i) => s + i.price * i.quantity, 0);
        const itemCount = mapped.reduce((s, i) => s + i.quantity, 0);
        dispatch(cartSlice.actions.setCartFromServer({ items: mapped, total, itemCount, timestamp: Date.now() }));
      }
      return { actionId };
    } catch (e: any) {
      // rollback
      if (prev) {
        dispatch(cartSlice.actions.addItemOptimistic(prev));
      }
      return rejectWithValue(e.message || 'Failed to remove cart item');
    } finally {
      dispatch(cartSlice.actions.clearPendingAction(actionId));
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { dispatch, rejectWithValue, getState }) => {
    const actionId = genId('clear');
    const state = getState() as { cart: CartState };
    const snapshot = state.cart.items;
    dispatch(cartSlice.actions.setPendingAction({ id: actionId, status: true }));
    dispatch(cartSlice.actions.clearCartOptimistic());
    try {
      await apiService.clearCart();
      await dispatch(fetchCart());
      return { actionId };
    } catch (e: any) {
      // rollback
      snapshot.forEach(item => dispatch(cartSlice.actions.addItemOptimistic(item)));
      return rejectWithValue(e.message || 'Failed to clear cart');
    } finally {
      dispatch(cartSlice.actions.clearPendingAction(actionId));
    }
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Optimistic reducers
    addItemOptimistic: (state, action: PayloadAction<CartItem>) => {
      const isSameVariant = (a: CartItem, b: CartItem) =>
        a.id === b.id && normalizeOptions(a.options) === normalizeOptions(b.options);
      const existingItem = state.items.find(i => isSameVariant(i, action.payload));
      if (existingItem) {
        const maxAllowed =
          typeof action.payload.maxQuantity === 'number' && action.payload.maxQuantity > 0
            ? action.payload.maxQuantity
            : existingItem.maxQuantity;
        existingItem.quantity += action.payload.quantity;
        if (typeof maxAllowed === 'number') {
          existingItem.maxQuantity = maxAllowed;
          existingItem.quantity = Math.min(existingItem.quantity, maxAllowed);
        }
      } else {
        const maxAllowed =
          typeof action.payload.maxQuantity === 'number' && action.payload.maxQuantity > 0
            ? action.payload.maxQuantity
            : undefined;
        state.items.push({
          ...action.payload,
          quantity: maxAllowed ? Math.min(action.payload.quantity, maxAllowed) : action.payload.quantity,
          maxQuantity: maxAllowed,
        });
      }
      state.total = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
      state.itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
      state.lastUpdated = Date.now();
    },
    removeItemOptimistic: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      state.items = state.items.filter(i => {
        const composite = `${i.id}::${Object.keys(i.options || {})
          .map(k => k.trim().toLowerCase())
          .sort()
          .map(k => `${k}:${String((i.options as any)[k]).trim().toLowerCase()}`)
          .join('|')}`;
        // Remove only exact variant: cartItemId or composite key
        return i.cartItemId !== key && composite !== key;
      });
      state.total = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
      state.itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
      state.lastUpdated = Date.now();
    },
    updateQuantityOptimistic: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const key = action.payload.id;
      const item = state.items.find(i => {
        const composite = `${i.id}::${Object.keys(i.options || {})
          .map(k => k.trim().toLowerCase())
          .sort()
          .map(k => `${k}:${String((i.options as any)[k]).trim().toLowerCase()}`)
          .join('|')}`;
        return i.cartItemId === key || composite === key;
      });
      if (item) {
        const maxAllowed = item.maxQuantity;
        item.quantity =
          typeof maxAllowed === 'number' && maxAllowed > 0
            ? Math.min(action.payload.quantity, maxAllowed)
            : action.payload.quantity;
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => {
            const composite = `${i.id}::${Object.keys(i.options || {})
              .map(k => k.trim().toLowerCase())
              .sort()
              .map(k => `${k}:${String((i.options as any)[k]).trim().toLowerCase()}`)
              .join('|')}`;
            return !(i.cartItemId === key || composite === key);
          });
        }
      }
      state.total = state.items.reduce((s, i) => s + i.price * i.quantity, 0);
      state.itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
      state.lastUpdated = Date.now();
    },
    clearCartOptimistic: (state) => {
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
      state.lastUpdated = Date.now();
    },
    setCartFromServer: (state, action: PayloadAction<{ items: CartItem[]; total: number; itemCount: number; timestamp?: number }>) => {
      const incomingTs = action.payload.timestamp ?? Date.now();
      const hasPending = Object.keys(state.pendingActions || {}).length > 0;
      if ((state.lastUpdated && incomingTs < state.lastUpdated) || hasPending) {
        return;
      }
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.itemCount = action.payload.itemCount;
      state.isInitialized = true;
      state.error = null;
      state.lastUpdated = incomingTs;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPendingAction: (state, action: PayloadAction<{ id: string; status: boolean }>) => {
      state.pendingActions[action.payload.id] = action.payload.status;
    },
    clearPendingAction: (state, action: PayloadAction<string>) => {
      delete state.pendingActions[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.itemCount = action.payload.itemCount;
        state.isInitialized = true;
        state.lastUpdated = action.payload.timestamp;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch cart';
        state.isInitialized = true;
      })
      .addCase(addToCart.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to add to cart';
      })
      .addCase(updateQuantity.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(updateQuantity.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to update cart item';
      })
      .addCase(removeFromCart.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to remove cart item';
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to clear cart';
      });
  },
});

export const {
  addItemOptimistic,
  removeItemOptimistic,
  updateQuantityOptimistic,
  clearCartOptimistic,
  setCartFromServer,
  setError,
  setPendingAction,
  clearPendingAction,
} = cartSlice.actions;

export default cartSlice.reducer;